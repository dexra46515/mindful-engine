/**
 * Hook to fetch insights data for charts
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DailyStats {
  date: string;
  sessions: number;
  interventions: number;
  avgRiskScore: number;
  totalEvents: number;
}

interface RiskHistoryPoint {
  timestamp: string;
  score: number;
  level: string;
  triggeredBy: string;
}

interface FactorTrend {
  date: string;
  sessionDuration: number;
  reopenFrequency: number;
  scrollVelocity: number;
  lateNight: number;
}

export interface InsightsData {
  dailyStats: DailyStats[];
  riskHistory: RiskHistoryPoint[];
  factorTrends: FactorTrend[];
  summary: {
    avgRiskScore: number;
    totalSessions: number;
    totalInterventions: number;
    mostCommonTrigger: string;
    trendDirection: 'improving' | 'stable' | 'worsening';
  };
}

export function useInsightsData(userId: string | null, days: number = 7) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      // Fetch risk history
      const { data: riskHistoryData, error: riskError } = await supabase
        .from('risk_history')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (riskError) throw riskError;

      // Fetch sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('started_at, duration_seconds')
        .eq('user_id', userId)
        .gte('started_at', startDate.toISOString());

      if (sessionsError) throw sessionsError;

      // Fetch interventions
      const { data: interventionsData, error: interventionsError } = await supabase
        .from('interventions')
        .select('created_at, type, status')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

      if (interventionsError) throw interventionsError;

      // Process risk history
      const riskHistory: RiskHistoryPoint[] = (riskHistoryData || []).map(r => ({
        timestamp: r.created_at,
        score: r.score,
        level: r.new_level,
        triggeredBy: r.triggered_by || 'unknown',
      }));

      // Group by day for daily stats
      const dailyMap = new Map<string, DailyStats>();
      
      // Initialize days
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        dailyMap.set(dateKey, {
          date: dateKey,
          sessions: 0,
          interventions: 0,
          avgRiskScore: 0,
          totalEvents: 0,
        });
      }

      // Count sessions per day
      (sessionsData || []).forEach(s => {
        const dateKey = new Date(s.started_at).toISOString().split('T')[0];
        const existing = dailyMap.get(dateKey);
        if (existing) {
          existing.sessions++;
        }
      });

      // Count interventions per day
      (interventionsData || []).forEach(i => {
        const dateKey = new Date(i.created_at).toISOString().split('T')[0];
        const existing = dailyMap.get(dateKey);
        if (existing) {
          existing.interventions++;
        }
      });

      // Calculate avg risk score per day
      const riskByDay = new Map<string, number[]>();
      (riskHistoryData || []).forEach(r => {
        const dateKey = new Date(r.created_at).toISOString().split('T')[0];
        if (!riskByDay.has(dateKey)) {
          riskByDay.set(dateKey, []);
        }
        riskByDay.get(dateKey)!.push(r.score);
      });

      riskByDay.forEach((scores, dateKey) => {
        const existing = dailyMap.get(dateKey);
        if (existing) {
          existing.avgRiskScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }
      });

      const dailyStats = Array.from(dailyMap.values())
        .sort((a, b) => a.date.localeCompare(b.date));

      // Extract factor trends from risk history
      const factorTrends: FactorTrend[] = (riskHistoryData || []).map(r => {
        const factors = r.factors as Record<string, number> || {};
        return {
          date: new Date(r.created_at).toLocaleString(undefined, { 
            month: 'short', 
            day: 'numeric',
            hour: 'numeric',
          }),
          sessionDuration: factors.session_duration_factor || 0,
          reopenFrequency: factors.reopen_frequency_factor || 0,
          scrollVelocity: factors.scroll_velocity_factor || 0,
          lateNight: factors.late_night_factor || 0,
        };
      });

      // Calculate summary
      const allScores = riskHistory.map(r => r.score);
      const avgRiskScore = allScores.length > 0 
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : 0;

      // Count triggers
      const triggerCounts = new Map<string, number>();
      riskHistory.forEach(r => {
        const count = triggerCounts.get(r.triggeredBy) || 0;
        triggerCounts.set(r.triggeredBy, count + 1);
      });
      
      let mostCommonTrigger = 'none';
      let maxCount = 0;
      triggerCounts.forEach((count, trigger) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommonTrigger = trigger;
        }
      });

      // Determine trend direction
      let trendDirection: 'improving' | 'stable' | 'worsening' = 'stable';
      if (riskHistory.length >= 3) {
        const recentScores = riskHistory.slice(-3).map(r => r.score);
        const earlierScores = riskHistory.slice(0, 3).map(r => r.score);
        const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
        const earlierAvg = earlierScores.reduce((a, b) => a + b, 0) / earlierScores.length;
        
        if (recentAvg < earlierAvg - 5) trendDirection = 'improving';
        else if (recentAvg > earlierAvg + 5) trendDirection = 'worsening';
      }

      setData({
        dailyStats,
        riskHistory,
        factorTrends,
        summary: {
          avgRiskScore,
          totalSessions: sessionsData?.length || 0,
          totalInterventions: interventionsData?.length || 0,
          mostCommonTrigger,
          trendDirection,
        },
      });
    } catch (err) {
      console.error('Failed to fetch insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch insights');
    } finally {
      setLoading(false);
    }
  }, [userId, days]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return { data, loading, error, refetch: fetchInsights };
}
