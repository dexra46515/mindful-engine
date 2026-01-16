/**
 * Realtime Subscriptions
 * 
 * Subscribe to real-time updates for interventions and risk state changes
 */

import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { TokenManager } from '../auth/tokenManager';
import { log } from '../utils/logger';
import type { Intervention } from '../interventions/interventionTypes';
import type { RiskState, RiskLevel } from '../risk/getRiskState';

export interface RealtimeCallbacks {
  onInterventionReceived?: (intervention: Intervention) => void;
  onRiskStateChanged?: (riskState: RiskState) => void;
  onConnectionChange?: (status: 'connected' | 'disconnected' | 'error') => void;
}

let supabaseClient: SupabaseClient | null = null;
let realtimeChannel: RealtimeChannel | null = null;
let callbacks: RealtimeCallbacks = {};

/**
 * Set Supabase client for realtime
 */
export const setRealtimeClient = (client: SupabaseClient): void => {
  supabaseClient = client;
};

/**
 * Subscribe to realtime updates
 */
export const subscribe = async (cbs: RealtimeCallbacks): Promise<boolean> => {
  const userId = TokenManager.getUserId();

  if (!userId) {
    log('[Realtime] Not authenticated');
    return false;
  }

  if (!supabaseClient) {
    log('[Realtime] Supabase client not set');
    return false;
  }

  callbacks = cbs;

  // Unsubscribe from existing channel
  if (realtimeChannel) {
    await unsubscribe();
  }

  log('[Realtime] Subscribing for user:', userId);

  realtimeChannel = supabaseClient
    .channel(`user-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'interventions',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        log('[Realtime] New intervention:', payload.new);
        
        const intervention: Intervention = {
          id: payload.new.id,
          type: payload.new.type,
          status: payload.new.status,
          title: payload.new.title,
          message: payload.new.message,
          actionLabel: payload.new.action_label,
          actionUrl: payload.new.action_url,
          riskLevelAtTrigger: payload.new.risk_level_at_trigger,
          riskScoreAtTrigger: payload.new.risk_score_at_trigger,
          createdAt: payload.new.created_at,
        };

        callbacks.onInterventionReceived?.(intervention);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'risk_states',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        log('[Realtime] Risk state updated:', payload.new);

        const riskState: RiskState = {
          score: payload.new.score || 0,
          level: (payload.new.current_level as RiskLevel) || 'low',
          factors: {
            sessionDuration: payload.new.session_duration_factor || 0,
            reopenFrequency: payload.new.reopen_frequency_factor || 0,
            lateNight: payload.new.late_night_factor || 0,
            scrollVelocity: payload.new.scroll_velocity_factor || 0,
          },
          lastEvaluatedAt: payload.new.last_evaluated_at || payload.new.updated_at,
        };

        callbacks.onRiskStateChanged?.(riskState);
      }
    )
    .subscribe((status) => {
      log('[Realtime] Subscription status:', status);
      
      if (status === 'SUBSCRIBED') {
        callbacks.onConnectionChange?.('connected');
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        callbacks.onConnectionChange?.(status === 'CHANNEL_ERROR' ? 'error' : 'disconnected');
      }
    });

  return true;
};

/**
 * Unsubscribe from realtime updates
 */
export const unsubscribe = async (): Promise<void> => {
  if (realtimeChannel && supabaseClient) {
    await supabaseClient.removeChannel(realtimeChannel);
    realtimeChannel = null;
    log('[Realtime] Unsubscribed');
  }
};

/**
 * Check if subscribed
 */
export const isSubscribed = (): boolean => {
  return realtimeChannel !== null;
};
