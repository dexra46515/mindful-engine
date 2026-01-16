/**
 * Risk State Queries
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { TokenManager } from '../auth/tokenManager';
import { log } from '../utils/logger';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskFactors {
  sessionDuration: number;
  reopenFrequency: number;
  lateNight: number;
  scrollVelocity: number;
}

export interface RiskState {
  score: number;
  level: RiskLevel;
  factors: RiskFactors;
  lastEvaluatedAt: string;
}

export interface RiskStateResult {
  success: boolean;
  riskState?: RiskState;
  error?: string;
}

let supabaseClient: SupabaseClient | null = null;

/**
 * Set Supabase client for queries
 */
export function setRiskSupabaseClient(client: SupabaseClient): void {
  supabaseClient = client;
}

/**
 * Get current risk state for the user
 */
export async function getRiskState(): Promise<RiskStateResult> {
  const userId = TokenManager.getUserId();

  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!supabaseClient) {
    return { success: false, error: 'Supabase client not initialized' };
  }

  try {
    const { data, error } = await supabaseClient
      .from('risk_states')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      log('[RiskState] Query error:', error);
      return { success: false, error: error.message };
    }

    // Return default state if no data
    if (!data) {
      return {
        success: true,
        riskState: {
          score: 0,
          level: 'low',
          factors: {
            sessionDuration: 0,
            reopenFrequency: 0,
            lateNight: 0,
            scrollVelocity: 0,
          },
          lastEvaluatedAt: new Date().toISOString(),
        },
      };
    }

    const riskState: RiskState = {
      score: data.score || 0,
      level: data.current_level || 'low',
      factors: {
        sessionDuration: data.session_duration_factor || 0,
        reopenFrequency: data.reopen_frequency_factor || 0,
        lateNight: data.late_night_factor || 0,
        scrollVelocity: data.scroll_velocity_factor || 0,
      },
      lastEvaluatedAt: data.last_evaluated_at || data.updated_at,
    };

    log('[RiskState] Current:', riskState.level, riskState.score);
    return { success: true, riskState };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Get risk history for the user
 */
export async function getRiskHistory(limit: number = 10): Promise<{
  success: boolean;
  history?: Array<{
    score: number;
    level: RiskLevel;
    previousLevel: RiskLevel | null;
    triggeredBy: string | null;
    createdAt: string;
  }>;
  error?: string;
}> {
  const userId = TokenManager.getUserId();

  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!supabaseClient) {
    return { success: false, error: 'Supabase client not initialized' };
  }

  try {
    const { data, error } = await supabaseClient
      .from('risk_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    const history = (data || []).map((row) => ({
      score: row.score,
      level: row.new_level as RiskLevel,
      previousLevel: row.previous_level as RiskLevel | null,
      triggeredBy: row.triggered_by,
      createdAt: row.created_at,
    }));

    return { success: true, history };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
