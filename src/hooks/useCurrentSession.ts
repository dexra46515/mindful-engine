/**
 * Hook to track the current active session
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SessionInfo {
  id: string;
  startedAt: string;
  state: 'active' | 'paused' | 'ended';
  reopenCount: number;
  durationSeconds: number;
}

interface UseCurrentSessionReturn {
  session: SessionInfo | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useCurrentSession(userId: string | null): UseCurrentSessionReturn {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    if (!userId) {
      setSession(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('state', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch session:', error);
        setSession(null);
      } else if (data) {
        setSession({
          id: data.id,
          startedAt: data.started_at,
          state: data.state as SessionInfo['state'],
          reopenCount: data.reopen_count || 0,
          durationSeconds: data.duration_seconds || 0,
        });
      } else {
        setSession(null);
      }
    } catch (err) {
      console.error('Session fetch error:', err);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Subscribe to session updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`session-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Session] Realtime update:', payload);
          // Refetch to get latest active session
          fetchSession();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchSession]);

  return { session, loading, refetch: fetchSession };
}
