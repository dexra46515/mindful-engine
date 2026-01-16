import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InterventionInput {
  user_id: string;
  session_id?: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  current_state: string;
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

    const input: InterventionInput = await req.json();
    console.log('[InterventionAgent] Processing for user:', input.user_id, 'risk:', input.risk_level);

    // ========================================
    // CHECK COOLDOWNS - Prevent intervention spam
    // ========================================

    const { data: recentInterventions } = await supabase
      .from('interventions')
      .select('*, intervention_templates!inner(cooldown_minutes)')
      .eq('user_id', input.user_id)
      .in('status', ['pending', 'delivered'])
      .order('created_at', { ascending: false })
      .limit(10);

    // Check if any recent intervention is still in cooldown
    const now = Date.now();
    const activeCooldowns: string[] = [];

    if (recentInterventions) {
      for (const intervention of recentInterventions) {
        const cooldownMinutes = intervention.intervention_templates?.cooldown_minutes || 30;
        const cooldownEnd = new Date(intervention.created_at).getTime() + (cooldownMinutes * 60 * 1000);
        
        if (now < cooldownEnd) {
          activeCooldowns.push(intervention.type);
          console.log('[InterventionAgent] Active cooldown for type:', intervention.type);
        }
      }
    }

    // ========================================
    // SELECT APPROPRIATE INTERVENTION TEMPLATE
    // ========================================

    // Map risk level to intervention types
    const interventionTypeMap: Record<string, string[]> = {
      'low': [],
      'medium': ['soft_nudge'],
      'high': ['soft_nudge', 'medium_friction'],
      'critical': ['medium_friction', 'hard_block', 'parent_alert'],
    };

    const allowedTypes = interventionTypeMap[input.risk_level] || [];
    const availableTypes = allowedTypes.filter(t => !activeCooldowns.includes(t));

    if (availableTypes.length === 0) {
      console.log('[InterventionAgent] No available intervention types (all in cooldown or low risk)');
      return new Response(JSON.stringify({
        success: true,
        intervention_triggered: false,
        reason: input.risk_level === 'low' ? 'Low risk - no intervention needed' : 'All interventions in cooldown',
        cooldowns: activeCooldowns,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the most appropriate template
    const { data: templates } = await supabase
      .from('intervention_templates')
      .select('*')
      .in('type', availableTypes)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (!templates || templates.length === 0) {
      console.log('[InterventionAgent] No templates found for types:', availableTypes);
      return new Response(JSON.stringify({
        success: false,
        error: 'No intervention templates configured',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Select template based on risk score within the allowed types
    let selectedTemplate = templates[0];
    for (const template of templates) {
      if (input.risk_score >= 75 && template.type === 'parent_alert') {
        selectedTemplate = template;
        break;
      } else if (input.risk_score >= 50 && template.type === 'hard_block') {
        selectedTemplate = template;
        break;
      } else if (input.risk_score >= 35 && template.type === 'medium_friction') {
        selectedTemplate = template;
        break;
      }
    }

    console.log('[InterventionAgent] Selected template:', selectedTemplate.name, selectedTemplate.type);

    // ========================================
    // CREATE INTERVENTION RECORD
    // ========================================

    const { data: intervention, error: insertError } = await supabase
      .from('interventions')
      .insert({
        user_id: input.user_id,
        template_id: selectedTemplate.id,
        session_id: input.session_id,
        type: selectedTemplate.type,
        status: 'pending',
        risk_level_at_trigger: input.risk_level,
        risk_score_at_trigger: input.risk_score,
        title: selectedTemplate.title,
        message: selectedTemplate.message,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create intervention: ${insertError.message}`);
    }

    console.log('[InterventionAgent] Created intervention:', intervention.id);

    // ========================================
    // HANDLE PARENT ALERT (if critical)
    // ========================================

    let parentNotified = false;
    if (selectedTemplate.type === 'parent_alert') {
      // Get parent link
      const { data: familyLink } = await supabase
        .from('family_links')
        .select('parent_id')
        .eq('youth_id', input.user_id)
        .eq('is_active', true)
        .single();

      if (familyLink) {
        // In a real implementation, this would send a push notification or email
        // For now, we log it and could add to a notifications table
        console.log('[InterventionAgent] Notifying parent:', familyLink.parent_id);
        parentNotified = true;
        
        // Update intervention status
        await supabase
          .from('interventions')
          .update({ 
            status: 'delivered',
            delivered_at: new Date().toISOString(),
          })
          .eq('id', intervention.id);
      }
    }

    // ========================================
    // CHECK ESCALATION RULES
    // ========================================

    // Get policy for escalation settings
    const { data: policy } = await supabase
      .from('policies')
      .select('escalation_enabled, escalation_delay_minutes, parent_alert_threshold')
      .or(`target_user_id.eq.${input.user_id},is_system_default.eq.true`)
      .eq('is_active', true)
      .order('is_system_default', { ascending: true })
      .limit(1)
      .single();

    let escalationScheduled = false;
    if (policy?.escalation_enabled && input.risk_level !== 'critical') {
      // Check if we should schedule escalation
      const dismissedCount = recentInterventions?.filter(
        i => i.status === 'dismissed' && 
        new Date(i.created_at).getTime() > now - 3600000 // last hour
      ).length || 0;

      if (dismissedCount >= 2) {
        console.log('[InterventionAgent] Multiple dismissals detected, escalation may be needed');
        escalationScheduled = true;
      }
    }

    // ========================================
    // LOG AGENT EXECUTION
    // ========================================

    const executionTime = Date.now() - startTime;

    await supabase.from('agent_logs').insert({
      agent_type: 'intervention_agent',
      user_id: input.user_id,
      session_id: input.session_id,
      input_data: input,
      output_data: {
        intervention_id: intervention.id,
        template: selectedTemplate.name,
        type: selectedTemplate.type,
        parent_notified: parentNotified,
        escalation_scheduled: escalationScheduled,
      },
      execution_time_ms: executionTime,
      success: true,
    });

    console.log('[InterventionAgent] Completed in', executionTime, 'ms');

    return new Response(JSON.stringify({
      success: true,
      intervention_triggered: true,
      intervention: {
        id: intervention.id,
        type: selectedTemplate.type,
        title: selectedTemplate.title,
        message: selectedTemplate.message,
        action_label: selectedTemplate.action_label,
        action_url: selectedTemplate.action_url,
      },
      parent_notified: parentNotified,
      escalation_scheduled: escalationScheduled,
      execution_time_ms: executionTime,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[InterventionAgent] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
