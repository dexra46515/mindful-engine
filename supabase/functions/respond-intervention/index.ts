import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResponsePayload {
  intervention_id: string;
  action: 'acknowledge' | 'dismiss' | 'request_extension' | 'snooze';
  context?: Record<string, unknown>;
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
    const payload: ResponsePayload = await req.json();

    console.log('[RespondIntervention] User:', userId, 'Action:', payload.action);

    // ========================================
    // VALIDATE INTERVENTION BELONGS TO USER
    // ========================================

    const { data: intervention, error: fetchError } = await supabase
      .from('interventions')
      .select('*')
      .eq('id', payload.intervention_id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !intervention) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Intervention not found or access denied' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================
    // PROCESS USER ACTION
    // ========================================

    let newStatus: string;
    let feedbackType: string;
    let additionalUpdates: Record<string, unknown> = {};

    switch (payload.action) {
      case 'acknowledge':
        newStatus = 'acknowledged';
        feedbackType = 'effective';
        additionalUpdates.acknowledged_at = new Date().toISOString();
        break;
      
      case 'dismiss':
        newStatus = 'dismissed';
        feedbackType = 'ineffective';
        additionalUpdates.dismissed_at = new Date().toISOString();
        break;
      
      case 'request_extension':
        // This would need parent approval in a real app
        newStatus = 'acknowledged';
        feedbackType = 'effective';
        additionalUpdates.acknowledged_at = new Date().toISOString();
        additionalUpdates.user_response = { 
          ...payload.context, 
          requested_extension: true 
        };
        break;
      
      case 'snooze':
        // Keep as pending but delay
        newStatus = 'pending';
        feedbackType = 'ignored';
        additionalUpdates.user_response = { 
          ...payload.context, 
          snoozed_at: new Date().toISOString(),
          snooze_count: (intervention.user_response?.snooze_count || 0) + 1,
        };
        break;
      
      default:
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid action' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Update intervention
    const { error: updateError } = await supabase
      .from('interventions')
      .update({
        status: newStatus,
        ...additionalUpdates,
      })
      .eq('id', payload.intervention_id);

    if (updateError) {
      throw new Error(`Failed to update intervention: ${updateError.message}`);
    }

    console.log('[RespondIntervention] Updated status to:', newStatus);

    // ========================================
    // TRIGGER FEEDBACK AGENT
    // ========================================

    const feedbackResponse = await supabase.functions.invoke('feedback-agent', {
      body: {
        user_id: userId,
        intervention_id: payload.intervention_id,
        feedback_type: feedbackType,
        context: {
          action: payload.action,
          intervention_type: intervention.type,
          risk_level: intervention.risk_level_at_trigger,
          ...payload.context,
        },
      },
    });

    if (feedbackResponse.error) {
      console.error('[RespondIntervention] Feedback agent error:', feedbackResponse.error);
    }

    // ========================================
    // TRIGGER ORCHESTRATOR FOR STATE UPDATE
    // ========================================

    const eventType = payload.action === 'acknowledge' 
      ? 'intervention_acknowledged' 
      : 'intervention_dismissed';

    await supabase.functions.invoke('orchestrator', {
      body: {
        user_id: userId,
        session_id: intervention.session_id,
        event_type: eventType,
        event_data: {
          intervention_id: payload.intervention_id,
          action: payload.action,
        },
      },
    });

    const executionTime = Date.now() - startTime;
    console.log('[RespondIntervention] Completed in', executionTime, 'ms');

    return new Response(JSON.stringify({
      success: true,
      intervention_id: payload.intervention_id,
      new_status: newStatus,
      feedback_recorded: !feedbackResponse.error,
      execution_time_ms: executionTime,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[RespondIntervention] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
