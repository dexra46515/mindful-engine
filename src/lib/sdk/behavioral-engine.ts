/**
 * Behavioral Engine Mobile SDK
 * 
 * A lightweight SDK for mobile apps to communicate with the behavioral engine.
 * Works with React Native, Capacitor, or any JavaScript-based mobile framework.
 * 
 * Usage:
 * ```typescript
 * import { BehavioralEngineSDK } from '@/lib/sdk/behavioral-engine';
 * 
 * const sdk = new BehavioralEngineSDK({
 *   supabaseUrl: 'https://xxx.supabase.co',
 *   supabaseAnonKey: 'xxx',
 *   deviceInfo: {
 *     deviceIdentifier: 'unique-device-id',
 *     platform: 'ios',
 *   },
 *   onInterventionReceived: (intervention) => {
 *     // Show intervention UI
 *   },
 * });
 * 
 * await sdk.initialize(userId);
 * await sdk.startSession();
 * await sdk.sendEvent('scroll', { velocity: 2500 });
 * ```
 */

import { createClient, SupabaseClient, User, RealtimeChannel } from '@supabase/supabase-js';
import type {
  SDKConfig,
  SDKResponse,
  SessionInfo,
  EventType,
  EventMetadata,
  Intervention,
  RiskState,
  InterventionResponseAction,
} from './types';

export class BehavioralEngineSDK {
  private supabase: SupabaseClient;
  private config: SDKConfig;
  private user: User | null = null;
  private currentSession: SessionInfo | null = null;
  private deviceId: string | null = null;
  private realtimeChannel: RealtimeChannel | null = null;
  private initialized = false;

  constructor(config: SDKConfig) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        storage: typeof window !== 'undefined' ? localStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  // ========================================
  // INITIALIZATION
  // ========================================

  /**
   * Initialize the SDK with an authenticated user.
   * Call this after the user logs in.
   */
  async initialize(): Promise<SDKResponse<{ userId: string }>> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      this.user = user;
      this.initialized = true;

      // Register device
      await this.registerDevice();

      // Set up realtime subscriptions
      await this.setupRealtimeSubscriptions();

      console.log('[SDK] Initialized for user:', user.id);
      return { success: true, data: { userId: user.id } };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.config.onError?.(new Error(message));
      return { success: false, error: message };
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<SDKResponse<{ userId: string }>> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return this.initialize();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Sign out and cleanup
   */
  async signOut(): Promise<SDKResponse> {
    try {
      await this.endSession();
      await this.cleanup();
      await this.supabase.auth.signOut();
      
      this.user = null;
      this.initialized = false;
      
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  // ========================================
  // SESSION MANAGEMENT
  // ========================================

  /**
   * Start a new session. Call this when the app opens or comes to foreground.
   */
  async startSession(): Promise<SDKResponse<SessionInfo>> {
    this.ensureInitialized();

    try {
      const response = await this.invokeFunction('ingest-event', {
        user_id: this.user!.id,
        event_type: 'session_start',
        device_identifier: this.config.deviceInfo.deviceIdentifier,
        platform: this.config.deviceInfo.platform,
        screen_name: 'app_launch',
        event_data: {},
      });

      if (!response.success) {
        return { success: false, error: response.error };
      }

      // Store session info
      const responseData = response.data as Record<string, string> | undefined;
      if (responseData?.session_id) {
        this.currentSession = {
          sessionId: responseData.session_id,
          deviceId: responseData.device_id || this.deviceId || '',
          startedAt: new Date().toISOString(),
          state: 'active',
        };
      }

      console.log('[SDK] Session started:', this.currentSession?.sessionId);
      return { success: true, data: this.currentSession! };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.config.onError?.(new Error(message));
      return { success: false, error: message };
    }
  }

  /**
   * End the current session. Call this when the app closes or goes to background.
   */
  async endSession(): Promise<SDKResponse> {
    if (!this.initialized || !this.user) {
      return { success: true }; // Nothing to end
    }

    try {
      const response = await this.invokeFunction('ingest-event', {
        user_id: this.user.id,
        event_type: 'session_end',
        device_identifier: this.config.deviceInfo.deviceIdentifier,
        platform: this.config.deviceInfo.platform,
        session_id: this.currentSession?.sessionId,
        event_data: {},
      });

      this.currentSession = null;
      console.log('[SDK] Session ended');
      return { success: response.success, error: response.error };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Get the current session info
   */
  getCurrentSession(): SessionInfo | null {
    return this.currentSession;
  }

  // ========================================
  // EVENT TRACKING
  // ========================================

  /**
   * Send a behavioral event to the engine.
   * This triggers risk calculation and may result in interventions.
   */
  async sendEvent(type: EventType, metadata: EventMetadata = {}): Promise<SDKResponse<{
    riskLevel: string;
    interventionTriggered: boolean;
  }>> {
    this.ensureInitialized();

    try {
      const response = await this.invokeFunction('ingest-event', {
        user_id: this.user!.id,
        event_type: type,
        device_identifier: this.config.deviceInfo.deviceIdentifier,
        platform: this.config.deviceInfo.platform,
        session_id: this.currentSession?.sessionId,
        screen_name: metadata.screenName,
        event_data: {
          velocity: metadata.velocity || metadata.scrollVelocity,
          element: metadata.element,
          duration: metadata.duration,
          ...metadata,
        },
      });

      console.log('[SDK] Event sent:', type, response.data);

      const orchestratorResult = (response.data as Record<string, unknown>)?.orchestrator_result as Record<string, unknown> | undefined;

      return {
        success: response.success,
        data: {
          riskLevel: (orchestratorResult?.risk_level as string) || 'low',
          interventionTriggered: (orchestratorResult?.intervention_triggered as boolean) || false,
        },
        error: response.error,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.config.onError?.(new Error(message));
      return { success: false, error: message };
    }
  }

  /**
   * Convenience method: Track app open
   */
  async trackAppOpen(): Promise<SDKResponse> {
    return this.sendEvent('app_open');
  }

  /**
   * Convenience method: Track app close
   */
  async trackAppClose(): Promise<SDKResponse> {
    return this.sendEvent('app_close');
  }

  /**
   * Convenience method: Track screen view
   */
  async trackScreenView(screenName: string): Promise<SDKResponse> {
    return this.sendEvent('screen_view', { screenName });
  }

  /**
   * Convenience method: Track scroll with velocity
   */
  async trackScroll(velocity: number, screenName?: string): Promise<SDKResponse> {
    return this.sendEvent('scroll', { velocity, screenName });
  }

  /**
   * Convenience method: Track app reopen
   */
  async trackReopen(): Promise<SDKResponse> {
    return this.sendEvent('reopen');
  }

  /**
   * Convenience method: Track app going to background
   */
  async trackBackground(): Promise<SDKResponse> {
    return this.sendEvent('background');
  }

  /**
   * Convenience method: Track app coming to foreground
   */
  async trackForeground(): Promise<SDKResponse> {
    return this.sendEvent('foreground');
  }

  // ========================================
  // INTERVENTIONS
  // ========================================

  /**
   * Get pending interventions for the current user.
   * Call this on app launch to check for unacknowledged interventions.
   */
  async getInterventions(): Promise<SDKResponse<Intervention[]>> {
    this.ensureInitialized();

    try {
      const { data, error } = await this.supabase
        .from('interventions')
        .select('*')
        .eq('user_id', this.user!.id)
        .in('status', ['pending', 'delivered'])
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      const interventions: Intervention[] = (data || []).map(row => ({
        id: row.id,
        type: row.type,
        status: row.status,
        title: row.title,
        message: row.message,
        actionLabel: row.action_label,
        actionUrl: row.action_url,
        riskLevelAtTrigger: row.risk_level_at_trigger,
        riskScoreAtTrigger: row.risk_score_at_trigger,
        createdAt: row.created_at,
      }));

      return { success: true, data: interventions };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Respond to an intervention (acknowledge, dismiss, snooze, etc.)
   */
  async sendInterventionResponse(
    interventionId: string,
    action: InterventionResponseAction,
    responseData?: Record<string, unknown>
  ): Promise<SDKResponse> {
    this.ensureInitialized();

    try {
      const response = await this.invokeFunction('respond-intervention', {
        intervention_id: interventionId,
        action,
        response_data: responseData || {},
      });

      console.log('[SDK] Intervention response sent:', action, response.data);
      return { success: response.success, error: response.error };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.config.onError?.(new Error(message));
      return { success: false, error: message };
    }
  }

  /**
   * Convenience method: Acknowledge an intervention
   */
  async acknowledgeIntervention(interventionId: string): Promise<SDKResponse> {
    return this.sendInterventionResponse(interventionId, 'acknowledge');
  }

  /**
   * Convenience method: Dismiss an intervention
   */
  async dismissIntervention(interventionId: string): Promise<SDKResponse> {
    return this.sendInterventionResponse(interventionId, 'dismiss');
  }

  // ========================================
  // RISK STATE
  // ========================================

  /**
   * Get the current risk state for the user
   */
  async getRiskState(): Promise<SDKResponse<RiskState>> {
    this.ensureInitialized();

    try {
      const { data, error } = await this.supabase
        .from('risk_states')
        .select('*')
        .eq('user_id', this.user!.id)
        .maybeSingle();

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data) {
        return {
          success: true,
          data: {
            score: 0,
            level: 'low',
            factors: { sessionDuration: 0, reopenFrequency: 0, lateNight: 0, scrollVelocity: 0 },
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

      return { success: true, data: riskState };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  // ========================================
  // PRIVATE HELPERS
  // ========================================

  private ensureInitialized(): void {
    if (!this.initialized || !this.user) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }
  }

  private async registerDevice(): Promise<void> {
    try {
      const { data } = await this.supabase
        .from('devices')
        .upsert({
          user_id: this.user!.id,
          device_identifier: this.config.deviceInfo.deviceIdentifier,
          platform: this.config.deviceInfo.platform,
          device_name: this.config.deviceInfo.deviceName,
          os_version: this.config.deviceInfo.osVersion,
          app_version: this.config.deviceInfo.appVersion,
          last_seen_at: new Date().toISOString(),
          is_active: true,
        }, { onConflict: 'user_id,device_identifier' })
        .select('id')
        .single();

      if (data) {
        this.deviceId = data.id;
        console.log('[SDK] Device registered:', this.deviceId);
      }
    } catch (error) {
      console.warn('[SDK] Device registration failed:', error);
    }
  }

  private async setupRealtimeSubscriptions(): Promise<void> {
    if (this.realtimeChannel) {
      await this.supabase.removeChannel(this.realtimeChannel);
    }

    // Subscribe to new interventions
    this.realtimeChannel = this.supabase
      .channel(`user-${this.user!.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'interventions',
          filter: `user_id=eq.${this.user!.id}`,
        },
        (payload) => {
          console.log('[SDK] New intervention received:', payload.new);
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
          this.config.onInterventionReceived?.(intervention);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'risk_states',
          filter: `user_id=eq.${this.user!.id}`,
        },
        (payload) => {
          console.log('[SDK] Risk state updated:', payload.new);
          const riskState: RiskState = {
            score: payload.new.score || 0,
            level: payload.new.current_level || 'low',
            factors: {
              sessionDuration: payload.new.session_duration_factor || 0,
              reopenFrequency: payload.new.reopen_frequency_factor || 0,
              lateNight: payload.new.late_night_factor || 0,
              scrollVelocity: payload.new.scroll_velocity_factor || 0,
            },
            lastEvaluatedAt: payload.new.last_evaluated_at || payload.new.updated_at,
          };
          this.config.onRiskLevelChanged?.(riskState);
        }
      )
      .subscribe();

    console.log('[SDK] Realtime subscriptions active');
  }

  private async invokeFunction(
    functionName: string,
    body: Record<string, unknown>
  ): Promise<SDKResponse<Record<string, unknown>>> {
    try {
      const { data, error } = await this.supabase.functions.invoke(functionName, {
        body,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data as Record<string, unknown> };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  private async cleanup(): Promise<void> {
    if (this.realtimeChannel) {
      await this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }
}

// Export a factory function for convenience
export function createBehavioralEngineSDK(config: SDKConfig): BehavioralEngineSDK {
  return new BehavioralEngineSDK(config);
}
