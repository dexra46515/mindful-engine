import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RiskAgentInput {
  user_id: string;
  session_id?: string;
  event_type: string;
  event_data?: Record<string, unknown>;
}

interface RiskFactors {
  session_duration_factor: number;
  reopen_frequency_factor: number;
  late_night_factor: number;
  scroll_velocity_factor: number;
}

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const input: RiskAgentInput = await req.json();
    console.log('[RiskAgent] Evaluating user:', input.user_id);

    // ========================================
    // FETCH USER DATA FOR RISK CALCULATION
    // ========================================

    // Get current session data
    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', input.user_id)
      .eq('state', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    // Get recent events (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentEvents } = await supabase
      .from('behavioral_events')
      .select('*')
      .eq('user_id', input.user_id)
      .gte('timestamp', oneHourAgo)
      .order('timestamp', { ascending: false });

    // Get user's timezone for late-night detection
    const { data: profile } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('user_id', input.user_id)
      .single();

    // Get applicable policy
    const { data: policy } = await supabase
      .from('policies')
      .select('*')
      .or(`target_user_id.eq.${input.user_id},is_system_default.eq.true`)
      .eq('is_active', true)
      .order('is_system_default', { ascending: true })
      .limit(1)
      .single();

    // ========================================
    // RISK FACTOR CALCULATIONS
    // ========================================

    const factors: RiskFactors = {
      session_duration_factor: 0,
      reopen_frequency_factor: 0,
      late_night_factor: 0,
      scroll_velocity_factor: 0,
    };

    // 1. SESSION DURATION FACTOR (0-25 points)
    if (session) {
      const sessionDurationMinutes = Math.floor(
        (Date.now() - new Date(session.started_at).getTime()) / 60000
      );
      const sessionLimit = policy?.session_limit_minutes || 60;
      
      if (sessionDurationMinutes >= sessionLimit * 2) {
        factors.session_duration_factor = 25;
      } else if (sessionDurationMinutes >= sessionLimit * 1.5) {
        factors.session_duration_factor = 20;
      } else if (sessionDurationMinutes >= sessionLimit) {
        factors.session_duration_factor = 15;
      } else if (sessionDurationMinutes >= sessionLimit * 0.75) {
        factors.session_duration_factor = 10;
      } else if (sessionDurationMinutes >= sessionLimit * 0.5) {
        factors.session_duration_factor = 5;
      }
      console.log('[RiskAgent] Session duration:', sessionDurationMinutes, 'min, factor:', factors.session_duration_factor);
    }

    // 2. REOPEN FREQUENCY FACTOR (0-25 points)
    if (recentEvents) {
      const reopenEvents = recentEvents.filter(e => e.event_type === 'reopen' || e.event_type === 'app_open');
      const reopenCount = reopenEvents.length;
      const reopenThreshold = policy?.reopen_threshold || 5;

      if (reopenCount >= reopenThreshold * 3) {
        factors.reopen_frequency_factor = 25;
      } else if (reopenCount >= reopenThreshold * 2) {
        factors.reopen_frequency_factor = 20;
      } else if (reopenCount >= reopenThreshold) {
        factors.reopen_frequency_factor = 15;
      } else if (reopenCount >= reopenThreshold * 0.6) {
        factors.reopen_frequency_factor = 8;
      }
      console.log('[RiskAgent] Reopen count:', reopenCount, ', factor:', factors.reopen_frequency_factor);
    }

    // 3. LATE NIGHT FACTOR (0-25 points)
    const now = new Date();
    const userTimezone = profile?.timezone || 'UTC';
    
    // Convert to user's local time
    const userLocalTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
    const hour = userLocalTime.getHours();
    
    const bedtimeStart = policy?.bedtime_start ? parseInt(policy.bedtime_start.split(':')[0]) : 22;
    const bedtimeEnd = policy?.bedtime_end ? parseInt(policy.bedtime_end.split(':')[0]) : 7;

    if (hour >= bedtimeStart || hour < bedtimeEnd) {
      // In bedtime window
      if (hour >= 0 && hour < 5) {
        factors.late_night_factor = 25; // Very late, highest risk
      } else if (hour >= 23 || hour < 6) {
        factors.late_night_factor = 20;
      } else {
        factors.late_night_factor = 10;
      }
      console.log('[RiskAgent] Late night hour:', hour, ', factor:', factors.late_night_factor);
    }

    // 4. SCROLL VELOCITY FACTOR (0-25 points)
    // Check both current event and recent scroll events for velocity
    const currentVelocity = (input.event_data?.scroll_velocity || input.event_data?.velocity) as number | undefined;
    const recentScrollEvents = recentEvents?.filter(e => e.event_type === 'scroll') || [];
    
    // Get max velocity from recent scroll events or current event
    let maxVelocity = currentVelocity || 0;
    for (const scrollEvent of recentScrollEvents) {
      const eventData = scrollEvent.event_data as Record<string, unknown> | null;
      const v = (eventData?.velocity || eventData?.scroll_velocity) as number | undefined;
      if (v && v > maxVelocity) {
        maxVelocity = v;
      }
    }

    if (maxVelocity > 0) {
      const threshold = policy?.scroll_velocity_threshold || 1000;

      if (maxVelocity >= threshold * 2) {
        factors.scroll_velocity_factor = 25;
      } else if (maxVelocity >= threshold * 1.5) {
        factors.scroll_velocity_factor = 15;
      } else if (maxVelocity >= threshold) {
        factors.scroll_velocity_factor = 10;
      }
      console.log('[RiskAgent] Max scroll velocity:', maxVelocity, ', factor:', factors.scroll_velocity_factor);
    }

    // ========================================
    // CALCULATE TOTAL SCORE & RISK LEVEL
    // ========================================

    const totalScore = 
      factors.session_duration_factor +
      factors.reopen_frequency_factor +
      factors.late_night_factor +
      factors.scroll_velocity_factor;

    let riskLevel: RiskLevel;
    if (totalScore >= 75) {
      riskLevel = 'critical';
    } else if (totalScore >= 50) {
      riskLevel = 'high';
    } else if (totalScore >= 25) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    console.log('[RiskAgent] Total score:', totalScore, ', level:', riskLevel);

    // ========================================
    // UPDATE RISK STATE
    // ========================================

    const { data: existingRiskState } = await supabase
      .from('risk_states')
      .select('current_level')
      .eq('user_id', input.user_id)
      .single();

    const previousLevel = existingRiskState?.current_level || 'low';

    await supabase.from('risk_states').upsert({
      user_id: input.user_id,
      current_level: riskLevel,
      score: totalScore,
      session_duration_factor: factors.session_duration_factor,
      reopen_frequency_factor: factors.reopen_frequency_factor,
      late_night_factor: factors.late_night_factor,
      scroll_velocity_factor: factors.scroll_velocity_factor,
      last_evaluated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    // Log risk history if level changed
    if (previousLevel !== riskLevel) {
      await supabase.from('risk_history').insert({
        user_id: input.user_id,
        previous_level: previousLevel,
        new_level: riskLevel,
        score: totalScore,
        factors,
        triggered_by: input.event_type,
      });
    }

    // ========================================
    // LOG AGENT EXECUTION
    // ========================================

    const executionTime = Date.now() - startTime;

    await supabase.from('agent_logs').insert({
      agent_type: 'risk_agent',
      user_id: input.user_id,
      session_id: input.session_id,
      input_data: input,
      output_data: {
        score: totalScore,
        risk_level: riskLevel,
        factors,
        previous_level: previousLevel,
      },
      execution_time_ms: executionTime,
      success: true,
    });

    console.log('[RiskAgent] Completed in', executionTime, 'ms');

    return new Response(JSON.stringify({
      success: true,
      user_id: input.user_id,
      score: totalScore,
      risk_level: riskLevel,
      factors,
      previous_level: previousLevel,
      level_changed: previousLevel !== riskLevel,
      execution_time_ms: executionTime,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[RiskAgent] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
