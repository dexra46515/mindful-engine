import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EventPayload {
  event_type: string;
  device_identifier: string;
  device_name?: string;
  platform?: string;
  os_version?: string;
  app_version?: string;
  screen_name?: string;
  event_data?: Record<string, unknown>;
  timestamp?: string;
}

interface BatchEventPayload {
  events: EventPayload[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    console.log('[IngestEvent] User:', userId);

    // Parse payload - support single event or batch
    const body = await req.json();
    const events: EventPayload[] = body.events || [body];

    console.log('[IngestEvent] Processing', events.length, 'events');

    const results = [];
    let activeSessionId: string | null = null;
    let activeDeviceId: string | null = null;

    for (const eventPayload of events) {
      // ========================================
      // ENSURE DEVICE EXISTS
      // ========================================

      const { data: device, error: deviceError } = await supabase
        .from('devices')
        .upsert({
          user_id: userId,
          device_identifier: eventPayload.device_identifier,
          device_name: eventPayload.device_name,
          platform: eventPayload.platform,
          os_version: eventPayload.os_version,
          app_version: eventPayload.app_version,
          last_seen_at: new Date().toISOString(),
          is_active: true,
        }, { onConflict: 'user_id,device_identifier' })
        .select()
        .single();

      if (deviceError) {
        console.error('[IngestEvent] Device upsert error:', deviceError);
        results.push({ success: false, error: deviceError.message });
        continue;
      }

      activeDeviceId = device.id;

      // ========================================
      // HANDLE SESSION MANAGEMENT
      // ========================================

      if (eventPayload.event_type === 'session_start' || eventPayload.event_type === 'app_open') {
        // Check for existing active session
        const { data: existingSession } = await supabase
          .from('sessions')
          .select('id, reopen_count')
          .eq('user_id', userId)
          .eq('device_id', device.id)
          .eq('state', 'active')
          .single();

        if (existingSession) {
          // This is a reopen
          activeSessionId = existingSession.id;
          await supabase
            .from('sessions')
            .update({
              reopen_count: existingSession.reopen_count + 1,
            })
            .eq('id', existingSession.id);

          // Also log as reopen event
          await supabase.from('behavioral_events').insert({
            user_id: userId,
            device_id: device.id,
            session_id: activeSessionId,
            event_type: 'reopen',
            event_data: eventPayload.event_data,
            screen_name: eventPayload.screen_name,
            timestamp: eventPayload.timestamp || new Date().toISOString(),
          });
        } else {
          // Create new session
          const { data: newSession, error: sessionError } = await supabase
            .from('sessions')
            .insert({
              user_id: userId,
              device_id: device.id,
              state: 'active',
              started_at: eventPayload.timestamp || new Date().toISOString(),
            })
            .select()
            .single();

          if (sessionError) {
            console.error('[IngestEvent] Session creation error:', sessionError);
          } else {
            activeSessionId = newSession.id;
          }
        }
      } else if (eventPayload.event_type === 'session_end' || eventPayload.event_type === 'app_close') {
        // End active session
        const { data: activeSession } = await supabase
          .from('sessions')
          .select('id, started_at')
          .eq('user_id', userId)
          .eq('device_id', device.id)
          .eq('state', 'active')
          .single();

        if (activeSession) {
          activeSessionId = activeSession.id;
          const durationSeconds = Math.floor(
            (Date.now() - new Date(activeSession.started_at).getTime()) / 1000
          );

          await supabase
            .from('sessions')
            .update({
              state: 'ended',
              ended_at: new Date().toISOString(),
              duration_seconds: durationSeconds,
            })
            .eq('id', activeSession.id);
        }
      } else {
        // Get current active session for other events
        const { data: activeSession } = await supabase
          .from('sessions')
          .select('id')
          .eq('user_id', userId)
          .eq('device_id', device.id)
          .eq('state', 'active')
          .single();

        activeSessionId = activeSession?.id || null;
      }

      // ========================================
      // INSERT BEHAVIORAL EVENT
      // ========================================

      const { data: event, error: eventError } = await supabase
        .from('behavioral_events')
        .insert({
          user_id: userId,
          device_id: device.id,
          session_id: activeSessionId,
          event_type: eventPayload.event_type,
          event_data: eventPayload.event_data,
          screen_name: eventPayload.screen_name,
          timestamp: eventPayload.timestamp || new Date().toISOString(),
          processed: false,
        })
        .select()
        .single();

      if (eventError) {
        console.error('[IngestEvent] Event insert error:', eventError);
        results.push({ success: false, error: eventError.message });
        continue;
      }

      results.push({ success: true, event_id: event.id });

      // ========================================
      // TRIGGER ORCHESTRATOR (async, fire-and-forget)
      // ========================================

      // Don't await - let it run in background
      supabase.functions.invoke('orchestrator', {
        body: {
          user_id: userId,
          session_id: activeSessionId,
          event_type: eventPayload.event_type,
          event_data: eventPayload.event_data,
        },
      }).then(response => {
        if (response.error) {
          console.error('[IngestEvent] Orchestrator invocation error:', response.error);
        } else {
          console.log('[IngestEvent] Orchestrator triggered successfully');
        }
      }).catch(err => {
        console.error('[IngestEvent] Orchestrator invocation failed:', err);
      });

      // Mark event as processed
      await supabase
        .from('behavioral_events')
        .update({ processed: true })
        .eq('id', event.id);
    }

    const executionTime = Date.now() - startTime;
    console.log('[IngestEvent] Processed', results.length, 'events in', executionTime, 'ms');

    return new Response(JSON.stringify({
      success: true,
      session_id: activeSessionId,
      device_id: activeDeviceId,
      results,
      execution_time_ms: executionTime,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[IngestEvent] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
