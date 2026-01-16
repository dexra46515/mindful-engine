import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParentAction {
  action: 'get_children' | 'get_child_stats' | 'update_policy' | 'link_child' | 'get_interventions';
  child_id?: string;
  policy_data?: Record<string, unknown>;
  invite_code?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    const parentId = user.id;

    // Verify parent role
    const { data: roleCheck } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', parentId)
      .eq('role', 'parent')
      .single();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: 'Parent role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload: ParentAction = await req.json();
    console.log('[ParentAPI] Action:', payload.action, 'Parent:', parentId);

    // ========================================
    // ACTION: GET CHILDREN
    // ========================================

    if (payload.action === 'get_children') {
      const { data: children, error } = await supabase
        .from('family_links')
        .select(`
          youth_id,
          is_active,
          created_at,
          profiles!family_links_youth_id_fkey(display_name, avatar_url)
        `)
        .eq('parent_id', parentId)
        .eq('is_active', true);

      if (error) {
        throw new Error(error.message);
      }

      // Get risk states for each child
      const childIds = children?.map(c => c.youth_id) || [];
      const { data: riskStates } = await supabase
        .from('risk_states')
        .select('user_id, current_level, score, last_evaluated_at')
        .in('user_id', childIds);

      const riskMap = new Map(riskStates?.map(r => [r.user_id, r]) || []);

      const enrichedChildren = children?.map(child => {
        const profile = child.profiles as unknown as { display_name: string; avatar_url: string } | null;
        return {
          id: child.youth_id,
          display_name: profile?.display_name,
          avatar_url: profile?.avatar_url,
          linked_at: child.created_at,
          risk_state: riskMap.get(child.youth_id) || { current_level: 'low', score: 0 },
        };
      });

      return new Response(JSON.stringify({
        success: true,
        children: enrichedChildren,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================
    // ACTION: GET CHILD STATS
    // ========================================

    if (payload.action === 'get_child_stats') {
      if (!payload.child_id) {
        throw new Error('child_id required');
      }

      // Verify parent-child relationship
      const { data: link } = await supabase
        .from('family_links')
        .select('id')
        .eq('parent_id', parentId)
        .eq('youth_id', payload.child_id)
        .eq('is_active', true)
        .single();

      if (!link) {
        return new Response(JSON.stringify({ error: 'Not authorized to view this child' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get risk state
      const { data: riskState } = await supabase
        .from('risk_states')
        .select('*')
        .eq('user_id', payload.child_id)
        .single();

      // Get recent sessions (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: sessions } = await supabase
        .from('sessions')
        .select('started_at, ended_at, duration_seconds, reopen_count')
        .eq('user_id', payload.child_id)
        .gte('started_at', sevenDaysAgo)
        .order('started_at', { ascending: false });

      // Get recent interventions
      const { data: interventions } = await supabase
        .from('interventions')
        .select('type, status, risk_level_at_trigger, created_at')
        .eq('user_id', payload.child_id)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(20);

      // Calculate stats
      const totalScreenTime = sessions?.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) || 0;
      const totalReopens = sessions?.reduce((sum, s) => sum + (s.reopen_count || 0), 0) || 0;
      const avgSessionDuration = sessions?.length 
        ? Math.round(totalScreenTime / sessions.length) 
        : 0;

      const interventionStats = {
        total: interventions?.length || 0,
        acknowledged: interventions?.filter(i => i.status === 'acknowledged').length || 0,
        dismissed: interventions?.filter(i => i.status === 'dismissed').length || 0,
        by_type: {} as Record<string, number>,
      };

      interventions?.forEach(i => {
        interventionStats.by_type[i.type] = (interventionStats.by_type[i.type] || 0) + 1;
      });

      // Get risk history
      const { data: riskHistory } = await supabase
        .from('risk_history')
        .select('new_level, score, created_at')
        .eq('user_id', payload.child_id)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: true });

      return new Response(JSON.stringify({
        success: true,
        child_id: payload.child_id,
        risk_state: riskState,
        stats: {
          period_days: 7,
          total_screen_time_seconds: totalScreenTime,
          total_screen_time_hours: Math.round(totalScreenTime / 3600 * 10) / 10,
          session_count: sessions?.length || 0,
          avg_session_duration_seconds: avgSessionDuration,
          total_reopens: totalReopens,
          interventions: interventionStats,
        },
        risk_history: riskHistory,
        recent_sessions: sessions?.slice(0, 10),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================
    // ACTION: UPDATE POLICY
    // ========================================

    if (payload.action === 'update_policy') {
      if (!payload.child_id || !payload.policy_data) {
        throw new Error('child_id and policy_data required');
      }

      // Verify parent-child relationship
      const { data: link } = await supabase
        .from('family_links')
        .select('id')
        .eq('parent_id', parentId)
        .eq('youth_id', payload.child_id)
        .eq('is_active', true)
        .single();

      if (!link) {
        return new Response(JSON.stringify({ error: 'Not authorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Upsert policy
      const { data: policy, error } = await supabase
        .from('policies')
        .upsert({
          owner_id: parentId,
          target_user_id: payload.child_id,
          name: `Policy for child`,
          is_active: true,
          ...payload.policy_data,
        }, { onConflict: 'owner_id,target_user_id' })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return new Response(JSON.stringify({
        success: true,
        policy,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================
    // ACTION: GET INTERVENTIONS
    // ========================================

    if (payload.action === 'get_interventions') {
      // Get all children's interventions
      const { data: links } = await supabase
        .from('family_links')
        .select('youth_id')
        .eq('parent_id', parentId)
        .eq('is_active', true);

      const childIds = links?.map(l => l.youth_id) || [];

      if (childIds.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          interventions: [],
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: interventions } = await supabase
        .from('interventions')
        .select(`
          *,
          profiles!interventions_user_id_fkey(display_name)
        `)
        .in('user_id', childIds)
        .order('created_at', { ascending: false })
        .limit(50);

      return new Response(JSON.stringify({
        success: true,
        interventions: interventions?.map(i => ({
          ...i,
          child_name: i.profiles?.display_name,
        })),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');

  } catch (error: unknown) {
    console.error('[ParentAPI] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
