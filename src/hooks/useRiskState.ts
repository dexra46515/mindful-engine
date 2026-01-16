/**
 * Hook to fetch and subscribe to risk state updates
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RiskState {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    sessionDuration: number;
    reopenFrequency: number;
    lateNight: number;
    scrollVelocity: number;
  };
  lastEvaluatedAt: string | null;
}

interface UseRiskStateReturn {
  riskState: RiskState | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const defaultRiskState: RiskState = {
  score: 0,
  level: 'low',
  factors: {
    sessionDuration: 0,
    reopenFrequency: 0,
    lateNight: 0,
    scrollVelocity: 0,
  },
  lastEvaluatedAt: null,
};

export function useRiskState(userId: string | null): UseRiskStateReturn {
  const [riskState, setRiskState] = useState<RiskState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRiskState = useCallback(async () => {
    if (!userId) {
      setRiskState(defaultRiskState);
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('risk_states')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (!data) {
        setRiskState(defaultRiskState);
      } else {
        setRiskState({
          score: data.score || 0,
          level: (data.current_level as RiskState['level']) || 'low',
          factors: {
            sessionDuration: data.session_duration_factor || 0,
            reopenFrequency: data.reopen_frequency_factor || 0,
            lateNight: data.late_night_factor || 0,
            scrollVelocity: data.scroll_velocity_factor || 0,
          },
          lastEvaluatedAt: data.last_evaluated_at,
        });
      }
      setError(null);
    } catch (err) {
      console.error('Failed to fetch risk state:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch');
      setRiskState(defaultRiskState);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchRiskState();
  }, [fetchRiskState]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`risk-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'risk_states',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[RiskState] Realtime update:', payload);
          if (payload.new && typeof payload.new === 'object' && 'score' in payload.new) {
            const data = payload.new as Record<string, unknown>;
            setRiskState({
              score: (data.score as number) || 0,
              level: (data.current_level as RiskState['level']) || 'low',
              factors: {
                sessionDuration: (data.session_duration_factor as number) || 0,
                reopenFrequency: (data.reopen_frequency_factor as number) || 0,
                lateNight: (data.late_night_factor as number) || 0,
                scrollVelocity: (data.scroll_velocity_factor as number) || 0,
              },
              lastEvaluatedAt: data.last_evaluated_at as string || null,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { riskState, loading, error, refetch: fetchRiskState };
}
