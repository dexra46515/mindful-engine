/**
 * Behavioral Engine SDK
 * 
 * A lightweight SDK for mobile apps to communicate with the behavioral engine.
 * Works with React Native, Capacitor, Expo, or web applications.
 * 
 * @example
 * ```typescript
 * import { SDK } from '@/sdk';
 * 
 * // Initialize
 * await SDK.init({
 *   supabaseUrl: 'https://xxx.supabase.co',
 *   supabaseAnonKey: 'xxx',
 * });
 * 
 * // Authenticate
 * await SDK.auth.setToken(token, userId);
 * 
 * // Start session
 * await SDK.sessions.start();
 * 
 * // Track events
 * await SDK.events.trackScroll(2500);
 * await SDK.events.trackReopen();
 * 
 * // Get interventions
 * const { interventions } = await SDK.interventions.get();
 * 
 * // Respond to intervention
 * await SDK.interventions.acknowledge(interventions[0].id);
 * 
 * // Subscribe to realtime
 * SDK.realtime.subscribe({
 *   onInterventionReceived: (i) => showModal(i),
 *   onRiskStateChanged: (r) => updateUI(r),
 * });
 * ```
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Config
import { setApiBase, ENDPOINTS } from './config/endpoints';
import { apiRequest } from './config/client';

// Auth
import { TokenManager, StorageAdapter } from './auth/tokenManager';

// Sessions
import { SessionManager } from './sessions/sessionManager';

// Events
import {
  sendEvent,
  trackAppOpen,
  trackAppClose,
  trackScreenView,
  trackScroll,
  trackTap,
  trackReopen,
  trackBackground,
  trackForeground,
} from './events/sendEvent';
import type { BehavioralEventType, EventMetadata, EventResponse } from './events/eventTypes';

// Interventions
import { getInterventions, getInterventionById, initSupabaseClient, setSupabaseClient } from './interventions/getIntervention';
import { 
  sendInterventionResponse, 
  acknowledgeIntervention, 
  dismissIntervention, 
  snoozeIntervention,
  markActionTaken,
} from './interventions/sendResponse';
import type { Intervention, InterventionType, InterventionStatus, InterventionResponseAction } from './interventions/interventionTypes';

// Feedback
import { sendFeedback, rateIntervention, reportTiming, FeedbackType, FeedbackEvent } from './feedback/sendFeedback';

// Risk
import { getRiskState, getRiskHistory, setRiskSupabaseClient } from './risk/getRiskState';
import type { RiskState, RiskLevel, RiskFactors } from './risk/getRiskState';

// Realtime
import { subscribe, unsubscribe, isSubscribed, setRealtimeClient, RealtimeCallbacks } from './realtime/subscriptions';

// Utils
import { setDeviceInfo, getDeviceInfo, DeviceInfo } from './utils/device';
import { now, timestamp, formatDuration } from './utils/time';
import { log, warn, error, info, setLogLevel } from './utils/logger';

// Storage
import { createMemoryStorage, createWebStorage } from './storage/secureStore';

// ============================================
// SDK INITIALIZATION
// ============================================

export interface SDKConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  deviceInfo?: Partial<DeviceInfo>;
  storageAdapter?: StorageAdapter;
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
}

let supabaseClient: SupabaseClient | null = null;
let initialized = false;

/**
 * Initialize the SDK
 */
async function init(config: SDKConfig): Promise<{ success: boolean; error?: string }> {
  try {
    // Set API base URL
    setApiBase(`${config.supabaseUrl}/functions/v1`);

    // Set log level
    if (config.logLevel) {
      setLogLevel(config.logLevel);
    }

    // Set device info if provided
    if (config.deviceInfo) {
      setDeviceInfo(config.deviceInfo);
    }

    // Set storage adapter if provided
    if (config.storageAdapter) {
      TokenManager.setStorageAdapter(config.storageAdapter);
    }

    // Initialize token manager (loads persisted token)
    await TokenManager.initialize();

    // Create Supabase client
    supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    // Set Supabase client on modules that need it
    setSupabaseClient(supabaseClient);
    setRiskSupabaseClient(supabaseClient);
    setRealtimeClient(supabaseClient);

    initialized = true;
    log('[SDK] Initialized');

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    error('[SDK] Init failed:', message);
    return { success: false, error: message };
  }
}

/**
 * Check if SDK is initialized
 */
function isInitialized(): boolean {
  return initialized;
}

/**
 * Get Supabase client
 */
function getClient(): SupabaseClient | null {
  return supabaseClient;
}

/**
 * Cleanup SDK (call on app shutdown)
 */
async function cleanup(): Promise<void> {
  await unsubscribe();
  await SessionManager.end();
  SessionManager.clear();
  log('[SDK] Cleanup complete');
}

// ============================================
// EXPORT SDK
// ============================================

export const SDK = {
  // Lifecycle
  init,
  isInitialized,
  getClient,
  cleanup,

  // Auth
  auth: {
    setToken: TokenManager.setToken.bind(TokenManager),
    getToken: TokenManager.getToken.bind(TokenManager),
    getUserId: TokenManager.getUserId.bind(TokenManager),
    isAuthenticated: TokenManager.isAuthenticated.bind(TokenManager),
    clearToken: TokenManager.clearToken.bind(TokenManager),
    setStorageAdapter: TokenManager.setStorageAdapter.bind(TokenManager),
  },

  // Sessions
  sessions: {
    start: SessionManager.start.bind(SessionManager),
    end: SessionManager.end.bind(SessionManager),
    pause: SessionManager.pause.bind(SessionManager),
    resume: SessionManager.resume.bind(SessionManager),
    getInfo: SessionManager.getSessionInfo.bind(SessionManager),
    isActive: SessionManager.isActive.bind(SessionManager),
  },

  // Events
  events: {
    send: sendEvent,
    trackAppOpen,
    trackAppClose,
    trackScreenView,
    trackScroll,
    trackTap,
    trackReopen,
    trackBackground,
    trackForeground,
  },

  // Interventions
  interventions: {
    get: getInterventions,
    getById: getInterventionById,
    respond: sendInterventionResponse,
    acknowledge: acknowledgeIntervention,
    dismiss: dismissIntervention,
    snooze: snoozeIntervention,
    markActionTaken,
  },

  // Feedback
  feedback: {
    send: sendFeedback,
    rateIntervention,
    reportTiming,
  },

  // Risk
  risk: {
    getState: getRiskState,
    getHistory: getRiskHistory,
  },

  // Realtime
  realtime: {
    subscribe,
    unsubscribe,
    isSubscribed,
  },

  // Utils
  utils: {
    setDeviceInfo,
    getDeviceInfo,
    now,
    timestamp,
    formatDuration,
    setLogLevel,
  },

  // Storage adapters
  storage: {
    createMemoryStorage,
    createWebStorage,
  },
};

// ============================================
// NAMED EXPORTS
// ============================================

export {
  // Config
  ENDPOINTS,
  apiRequest,
  
  // Auth
  TokenManager,
  
  // Sessions
  SessionManager,
  
  // Events
  sendEvent,
  trackAppOpen,
  trackAppClose,
  trackScreenView,
  trackScroll,
  trackTap,
  trackReopen,
  trackBackground,
  trackForeground,
  
  // Interventions
  getInterventions,
  getInterventionById,
  sendInterventionResponse,
  acknowledgeIntervention,
  dismissIntervention,
  snoozeIntervention,
  markActionTaken,
  
  // Feedback
  sendFeedback,
  rateIntervention,
  reportTiming,
  
  // Risk
  getRiskState,
  getRiskHistory,
  
  // Realtime
  subscribe,
  unsubscribe,
  isSubscribed,
  
  // Utils
  setDeviceInfo,
  getDeviceInfo,
  now,
  timestamp,
  formatDuration,
  log,
  warn,
  error,
  info,
  setLogLevel,
  
  // Storage
  createMemoryStorage,
  createWebStorage,
};

// ============================================
// TYPE EXPORTS
// ============================================

export type {
  // Events
  BehavioralEventType,
  EventMetadata,
  EventResponse,
  
  // Interventions
  Intervention,
  InterventionType,
  InterventionStatus,
  InterventionResponseAction,
  
  // Feedback
  FeedbackType,
  FeedbackEvent,
  
  // Risk
  RiskState,
  RiskLevel,
  RiskFactors,
  
  // Realtime
  RealtimeCallbacks,
  
  // Device
  DeviceInfo,
  
  // Storage
  StorageAdapter,
};

// Default export
export default SDK;
