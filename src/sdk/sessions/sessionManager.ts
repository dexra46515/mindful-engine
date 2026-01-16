/**
 * Session Manager
 * 
 * Manages user sessions - syncs with backend-generated session IDs
 */

import { apiRequest } from '../config/client';
import { ENDPOINTS } from '../config/endpoints';
import { TokenManager } from '../auth/tokenManager';
import { getDeviceInfo } from '../utils/device';
import { log } from '../utils/logger';

export interface SessionInfo {
  sessionId: string;
  deviceId: string;
  startedAt: string;
  state: 'active' | 'paused' | 'ended';
}

class SessionManagerClass {
  private sessionId: string | null = null;
  private deviceId: string | null = null;
  private startedAt: string | null = null;
  private state: 'active' | 'paused' | 'ended' = 'ended';

  /**
   * Start a new session
   */
  async start(): Promise<{ success: boolean; session?: SessionInfo; error?: string }> {
    const userId = TokenManager.getUserId();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    const deviceInfo = getDeviceInfo();

    const response = await apiRequest<{
      success: boolean;
      session_id: string | null;
      device_id: string | null;
    }>(ENDPOINTS.INGEST_EVENT, 'POST', {
      user_id: userId,
      event_type: 'session_start',
      device_identifier: deviceInfo.deviceIdentifier,
      platform: deviceInfo.platform,
      event_data: {},
    });

    if (response.success && response.data?.session_id) {
      this.sessionId = response.data.session_id;
      this.deviceId = response.data.device_id || null;
      this.startedAt = new Date().toISOString();
      this.state = 'active';

      log('[SessionManager] Session started:', this.sessionId);

      return {
        success: true,
        session: this.getSessionInfo()!,
      };
    }

    // Session might have been created even if response doesn't have session_id
    // This can happen if user already has an active session (reopen)
    if (response.success) {
      this.startedAt = new Date().toISOString();
      this.state = 'active';
      log('[SessionManager] Session resumed (existing)');
      
      return {
        success: true,
        session: {
          sessionId: this.sessionId || 'active',
          deviceId: this.deviceId || '',
          startedAt: this.startedAt,
          state: 'active',
        },
      };
    }

    return { success: false, error: response.error };
  }

  /**
   * End the current session
   */
  async end(): Promise<{ success: boolean; error?: string }> {
    const userId = TokenManager.getUserId();
    if (!userId || !this.sessionId) {
      return { success: true }; // Nothing to end
    }

    const deviceInfo = getDeviceInfo();

    const response = await apiRequest(ENDPOINTS.INGEST_EVENT, 'POST', {
      user_id: userId,
      event_type: 'session_end',
      device_identifier: deviceInfo.deviceIdentifier,
      platform: deviceInfo.platform,
      session_id: this.sessionId,
      event_data: {},
    });

    if (response.success) {
      this.state = 'ended';
      log('[SessionManager] Session ended:', this.sessionId);
    }

    return { success: response.success, error: response.error };
  }

  /**
   * Pause the session (app going to background)
   */
  pause(): void {
    if (this.state === 'active') {
      this.state = 'paused';
      log('[SessionManager] Session paused');
    }
  }

  /**
   * Resume the session (app coming to foreground)
   */
  resume(): void {
    if (this.state === 'paused') {
      this.state = 'active';
      log('[SessionManager] Session resumed');
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Set session ID (when received from backend)
   */
  setSessionId(id: string): void {
    this.sessionId = id;
  }

  /**
   * Get full session info
   */
  getSessionInfo(): SessionInfo | null {
    if (!this.sessionId) return null;

    return {
      sessionId: this.sessionId,
      deviceId: this.deviceId || '',
      startedAt: this.startedAt || '',
      state: this.state,
    };
  }

  /**
   * Check if session is active
   */
  isActive(): boolean {
    return this.state === 'active';
  }

  /**
   * Clear session data
   */
  clear(): void {
    this.sessionId = null;
    this.deviceId = null;
    this.startedAt = null;
    this.state = 'ended';
  }
}

export const SessionManager = new SessionManagerClass();
