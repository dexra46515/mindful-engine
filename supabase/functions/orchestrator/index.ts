import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrchestratorInput {
  user_id: string;
  session_id?: string;
  event_type: string;
  event_data?: Record<string, unknown>;
}

interface AgentResult {
  agent: string;
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  execution_time_ms: number;
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

    const input: OrchestratorInput = await req.json();
    console.log('[Orchestrator] Received input:', JSON.stringify(input));

    if (!input.user_id || !input.event_type) {
      throw new Error('Missing required fields: user_id, event_type');
    }

    const results: AgentResult[] = [];

    // ========================================
    // STEP 1: Get or create agent state
    // ========================================
    const { data: agentState, error: stateError } = await supabase
      .from('agent_states')
      .select('*')
      .eq('user_id', input.user_id)
      .single();

    if (stateError && stateError.code !== 'PGRST116') {
      console.error('[Orchestrator] Error fetching agent state:', stateError);
    }

    let currentState = agentState?.current_state || 'idle';
    const stateData = agentState?.state_data || {};

    console.log('[Orchestrator] Current state:', currentState, stateData);

    // ========================================
    // STEP 2: State machine transitions
    // ========================================
    const stateTransitions: Record<string, Record<string, string>> = {
      'idle': {
        'app_open': 'monitoring',
        'session_start': 'monitoring',
      },
      'monitoring': {
        'app_close': 'idle',
        'session_end': 'idle',
        'high_risk_detected': 'intervening',
        'critical_risk_detected': 'escalating',
      },
      'intervening': {
        'intervention_acknowledged': 'monitoring',
        'intervention_dismissed': 'monitoring',
        'escalation_triggered': 'escalating',
        'app_close': 'idle',
      },
      'escalating': {
        'parent_notified': 'monitoring',
        'app_close': 'idle',
      },
    };

    // ========================================
    // STEP 3: Call Risk Agent
    // ========================================
    const riskAgentStart = Date.now();
    let riskResult: AgentResult;

    try {
      const riskResponse = await supabase.functions.invoke('risk-agent', {
        body: {
          user_id: input.user_id,
          session_id: input.session_id,
          event_type: input.event_type,
          event_data: input.event_data,
        },
      });

      if (riskResponse.error) {
        throw new Error(riskResponse.error.message);
      }

      riskResult = {
        agent: 'risk_agent',
        success: true,
        data: riskResponse.data,
        execution_time_ms: Date.now() - riskAgentStart,
      };
      console.log('[Orchestrator] Risk Agent result:', riskResult);
    } catch (error: unknown) {
      riskResult = {
        agent: 'risk_agent',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        execution_time_ms: Date.now() - riskAgentStart,
      };
      console.error('[Orchestrator] Risk Agent error:', error);
    }
    results.push(riskResult);

    // ========================================
    // STEP 4: Determine if intervention needed
    // ========================================
    let interventionResult: AgentResult | null = null;
    const riskLevel = riskResult.data?.risk_level as string;
    const riskScore = riskResult.data?.score as number;

    if (riskResult.success && (riskLevel === 'medium' || riskLevel === 'high' || riskLevel === 'critical')) {
      console.log('[Orchestrator] Risk level triggers intervention:', riskLevel);

      // Update state machine
      if (riskLevel === 'critical') {
        currentState = stateTransitions[currentState]?.['critical_risk_detected'] || currentState;
      } else if (riskLevel === 'high') {
        currentState = stateTransitions[currentState]?.['high_risk_detected'] || currentState;
      }

      // Call Intervention Agent
      const interventionStart = Date.now();
      try {
        const interventionResponse = await supabase.functions.invoke('intervention-agent', {
          body: {
            user_id: input.user_id,
            session_id: input.session_id,
            risk_level: riskLevel,
            risk_score: riskScore,
            current_state: currentState,
          },
        });

        if (interventionResponse.error) {
          throw new Error(interventionResponse.error.message);
        }

        interventionResult = {
          agent: 'intervention_agent',
          success: true,
          data: interventionResponse.data,
          execution_time_ms: Date.now() - interventionStart,
        };
        console.log('[Orchestrator] Intervention Agent result:', interventionResult);
      } catch (error: unknown) {
        interventionResult = {
          agent: 'intervention_agent',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          execution_time_ms: Date.now() - interventionStart,
        };
        console.error('[Orchestrator] Intervention Agent error:', error);
      }
      results.push(interventionResult);
    }

    // ========================================
    // STEP 5: Call Feedback Agent (async, for learning)
    // ========================================
    if (input.event_type === 'intervention_acknowledged' || input.event_type === 'intervention_dismissed') {
      const feedbackStart = Date.now();
      try {
        const feedbackResponse = await supabase.functions.invoke('feedback-agent', {
          body: {
            user_id: input.user_id,
            intervention_id: input.event_data?.intervention_id,
            feedback_type: input.event_type === 'intervention_acknowledged' ? 'effective' : 'ineffective',
            context: input.event_data,
          },
        });

        results.push({
          agent: 'feedback_agent',
          success: !feedbackResponse.error,
          data: feedbackResponse.data,
          execution_time_ms: Date.now() - feedbackStart,
        });
      } catch (error: unknown) {
        results.push({
          agent: 'feedback_agent',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          execution_time_ms: Date.now() - feedbackStart,
        });
      }
    }

    // ========================================
    // STEP 6: Update agent state
    // ========================================
    const newStateData = {
      ...stateData,
      last_event: input.event_type,
      last_risk_level: riskLevel,
      last_risk_score: riskScore,
    };

    await supabase
      .from('agent_states')
      .upsert({
        user_id: input.user_id,
        current_state: currentState,
        state_data: newStateData,
        last_transition_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    // ========================================
    // STEP 7: Log orchestrator execution
    // ========================================
    const totalExecutionTime = Date.now() - startTime;

    await supabase.from('agent_logs').insert({
      agent_type: 'orchestrator',
      user_id: input.user_id,
      session_id: input.session_id,
      input_data: input,
      output_data: {
        results,
        final_state: currentState,
        risk_level: riskLevel,
      },
      execution_time_ms: totalExecutionTime,
      success: true,
    });

    console.log('[Orchestrator] Completed in', totalExecutionTime, 'ms');

    return new Response(JSON.stringify({
      success: true,
      state: currentState,
      risk_level: riskLevel,
      risk_score: riskScore,
      intervention: interventionResult?.data || null,
      agent_results: results,
      execution_time_ms: totalExecutionTime,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[Orchestrator] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
