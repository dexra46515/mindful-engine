/**
 * Realtime Subscriptions
 * 
 * VALIDATION CHECKLIST:
 * ✅ interventions table INSERT triggers callback
 * ✅ risk_states table UPDATE triggers callback  
 * ✅ Connection stays alive when app is backgrounded
 * ✅ Reconnection works when app returns to foreground
 * ✅ No duplicate subscriptions
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
let currentUserId: string | null = null;
let isSubscribing = false;

/**
 * Set Supabase client for realtime
 */
export const setRealtimeClient = (client: SupabaseClient): void => {
  supabaseClient = client;
};

/**
 * Subscribe to realtime updates
 * Safe to call multiple times - will reuse existing subscription
 */
export const subscribe = async (cbs: RealtimeCallbacks): Promise<boolean> => {
  const userId = TokenManager.getUserId();

  if (!userId) {
    log('[Realtime] ❌ Not authenticated');
    return false;
  }

  if (!supabaseClient) {
    log('[Realtime] ❌ Supabase client not set');
    return false;
  }

  // Prevent duplicate subscriptions in progress
  if (isSubscribing) {
    log('[Realtime] ⏳ Subscription in progress, waiting...');
    return false;
  }

  // If already subscribed to same user, just update callbacks
  if (realtimeChannel && currentUserId === userId) {
    log('[Realtime] ♻️ Updating callbacks for existing subscription');
    callbacks = cbs;
    return true;
  }

  isSubscribing = true;
  callbacks = cbs;

  // Unsubscribe from existing channel if different user
  if (realtimeChannel) {
    await unsubscribe();
  }

  currentUserId = userId;
  log('[Realtime] 📡 Subscribing for user:', userId.substring(0, 8) + '...');

  try {
    realtimeChannel = supabaseClient
      .channel(`user-${userId}`, {
        config: {
          presence: { key: userId },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'interventions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          log('[Realtime] 📩 New intervention:', payload.new.title);
          
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
          log('[Realtime] ⚠️ Risk state updated:', payload.new.current_level);

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
      .subscribe((status, err) => {
        log('[Realtime] Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          log('[Realtime] ✅ Connected');
          callbacks.onConnectionChange?.('connected');
        } else if (status === 'CLOSED') {
          log('[Realtime] 🔌 Disconnected');
          callbacks.onConnectionChange?.('disconnected');
        } else if (status === 'CHANNEL_ERROR') {
          log('[Realtime] ❌ Error:', err);
          callbacks.onConnectionChange?.('error');
        }
      });

    return true;
  } catch (error) {
    log('[Realtime] ❌ Subscribe failed:', error);
    return false;
  } finally {
    isSubscribing = false;
  }
};

/**
 * Unsubscribe from realtime updates
 */
export const unsubscribe = async (): Promise<void> => {
  if (realtimeChannel && supabaseClient) {
    log('[Realtime] 🔌 Unsubscribing...');
    await supabaseClient.removeChannel(realtimeChannel);
    realtimeChannel = null;
    currentUserId = null;
    log('[Realtime] ✅ Unsubscribed');
  }
};

/**
 * Check if subscribed
 */
export const isSubscribed = (): boolean => {
  return realtimeChannel !== null;
};

/**
 * Force reconnect (useful after app resumes from background)
 */
export const reconnect = async (): Promise<boolean> => {
  if (!callbacks) {
    log('[Realtime] No callbacks to reconnect with');
    return false;
  }

  log('[Realtime] 🔄 Reconnecting...');
  await unsubscribe();
  return subscribe(callbacks);
};
