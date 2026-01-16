import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeedbackInput {
  user_id: string;
  intervention_id?: string;
  feedback_type: 'effective' | 'ineffective' | 'ignored' | 'escalated';
  context?: Record<string, unknown>;
}

interface LearningInsight {
  pattern: string;
  confidence: number;
  recommendation: string;
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

    const input: FeedbackInput = await req.json();
    console.log('[FeedbackAgent] Processing feedback for user:', input.user_id);

    // ========================================
    // RECORD FEEDBACK EVENT
    // ========================================

    const { data: feedbackEvent, error: insertError } = await supabase
      .from('feedback_events')
      .insert({
        user_id: input.user_id,
        intervention_id: input.intervention_id,
        feedback_type: input.feedback_type,
        context: input.context || {},
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to record feedback: ${insertError.message}`);
    }

    console.log('[FeedbackAgent] Recorded feedback event:', feedbackEvent.id);

    // ========================================
    // UPDATE INTERVENTION STATUS
    // ========================================

    if (input.intervention_id) {
      const statusMap: Record<string, string> = {
        'effective': 'acknowledged',
        'ineffective': 'dismissed',
        'ignored': 'dismissed',
        'escalated': 'escalated',
      };

      const timestampField = {
        'effective': 'acknowledged_at',
        'ineffective': 'dismissed_at',
        'ignored': 'dismissed_at',
        'escalated': 'escalated_at',
      };

      await supabase
        .from('interventions')
        .update({
          status: statusMap[input.feedback_type],
          [timestampField[input.feedback_type]]: new Date().toISOString(),
          user_response: input.context,
        })
        .eq('id', input.intervention_id);

      console.log('[FeedbackAgent] Updated intervention status to:', statusMap[input.feedback_type]);
    }

    // ========================================
    // ANALYZE PATTERNS (Learning Loop)
    // ========================================

    const insights: LearningInsight[] = [];

    // Get historical feedback for this user
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: historicalFeedback } = await supabase
      .from('feedback_events')
      .select('*, interventions(type, risk_level_at_trigger)')
      .eq('user_id', input.user_id)
      .gte('created_at', thirtyDaysAgo);

    if (historicalFeedback && historicalFeedback.length >= 5) {
      // Calculate effectiveness rates by intervention type
      const typeStats: Record<string, { effective: number; total: number }> = {};
      
      for (const feedback of historicalFeedback) {
        const type = feedback.interventions?.type || 'unknown';
        if (!typeStats[type]) {
          typeStats[type] = { effective: 0, total: 0 };
        }
        typeStats[type].total++;
        if (feedback.feedback_type === 'effective') {
          typeStats[type].effective++;
        }
      }

      // Generate insights
      for (const [type, stats] of Object.entries(typeStats)) {
        if (stats.total >= 3) {
          const effectivenessRate = stats.effective / stats.total;
          
          if (effectivenessRate < 0.3) {
            insights.push({
              pattern: `${type}_low_effectiveness`,
              confidence: Math.min(0.9, stats.total / 10),
              recommendation: `Consider reducing ${type} interventions for this user - low effectiveness (${Math.round(effectivenessRate * 100)}%)`,
            });
          } else if (effectivenessRate > 0.7) {
            insights.push({
              pattern: `${type}_high_effectiveness`,
              confidence: Math.min(0.9, stats.total / 10),
              recommendation: `${type} interventions work well for this user (${Math.round(effectivenessRate * 100)}% effective)`,
            });
          }
        }
      }

      // Time-based patterns
      const feedbackByHour: Record<number, { effective: number; total: number }> = {};
      for (const feedback of historicalFeedback) {
        const hour = new Date(feedback.created_at).getHours();
        if (!feedbackByHour[hour]) {
          feedbackByHour[hour] = { effective: 0, total: 0 };
        }
        feedbackByHour[hour].total++;
        if (feedback.feedback_type === 'effective') {
          feedbackByHour[hour].effective++;
        }
      }

      // Find best/worst hours
      let bestHour = -1;
      let worstHour = -1;
      let bestRate = 0;
      let worstRate = 1;

      for (const [hour, stats] of Object.entries(feedbackByHour)) {
        if (stats.total >= 2) {
          const rate = stats.effective / stats.total;
          if (rate > bestRate) {
            bestRate = rate;
            bestHour = parseInt(hour);
          }
          if (rate < worstRate) {
            worstRate = rate;
            worstHour = parseInt(hour);
          }
        }
      }

      if (bestHour !== -1 && bestRate > 0.6) {
        insights.push({
          pattern: 'time_effectiveness',
          confidence: 0.7,
          recommendation: `Interventions most effective around ${bestHour}:00`,
        });
      }

      if (worstHour !== -1 && worstRate < 0.3) {
        insights.push({
          pattern: 'time_ineffectiveness',
          confidence: 0.7,
          recommendation: `Consider avoiding interventions around ${worstHour}:00`,
        });
      }
    }

    console.log('[FeedbackAgent] Generated insights:', insights.length);

    // ========================================
    // ESCALATION DETECTION
    // ========================================

    let escalationTriggered = false;

    if (input.feedback_type === 'ignored' || input.feedback_type === 'ineffective') {
      // Check for pattern of ignored interventions
      const recentIgnored = historicalFeedback?.filter(
        f => (f.feedback_type === 'ignored' || f.feedback_type === 'ineffective') &&
        new Date(f.created_at).getTime() > Date.now() - 3600000 // last hour
      ) || [];

      if (recentIgnored.length >= 3) {
        console.log('[FeedbackAgent] Escalation pattern detected - multiple ignored interventions');
        escalationTriggered = true;

        // Trigger escalation by calling intervention agent with higher priority
        // This could also update the user's risk state
        await supabase
          .from('risk_states')
          .update({
            current_level: 'high',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', input.user_id)
          .lt('current_level', 'high');
      }
    }

    // ========================================
    // LOG AGENT EXECUTION
    // ========================================

    const executionTime = Date.now() - startTime;

    await supabase.from('agent_logs').insert({
      agent_type: 'feedback_agent',
      user_id: input.user_id,
      input_data: input,
      output_data: {
        feedback_event_id: feedbackEvent.id,
        insights,
        escalation_triggered: escalationTriggered,
        historical_count: historicalFeedback?.length || 0,
      },
      execution_time_ms: executionTime,
      success: true,
    });

    console.log('[FeedbackAgent] Completed in', executionTime, 'ms');

    return new Response(JSON.stringify({
      success: true,
      feedback_event_id: feedbackEvent.id,
      insights,
      escalation_triggered: escalationTriggered,
      patterns_analyzed: historicalFeedback?.length || 0,
      execution_time_ms: executionTime,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[FeedbackAgent] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
