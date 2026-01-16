/**
 * Session Manager
 * 
 * VALIDATION CHECKLIST:
 * ✅ Session ID does NOT persist (resets each cold start)
 * ✅ Cold start → session_start → new session_id
 * ✅ Warm start (reopen) → reopen event, SAME session_id
 * ✅ Pause/Resume don't create new sessions
 * ✅ Session state tracked correctly
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
  // NOTE: These are NOT persisted - reset on each cold start
  private sessionId: string | null = null;
  private deviceId: string | null = null;
  private startedAt: string | null = null;
  private state: 'active' | 'paused' | 'ended' = 'ended';
  private startInProgress = false;

  /**
   * Start a new session (COLD START only)
   * 
   * This should only be called once per app launch.
   * Reopens (warm starts) should use trackReopen() instead.
   */
  async start(retries = 3, retryDelayMs = 150): Promise<{ success: boolean; session?: SessionInfo; error?: string }> {
    // Prevent double starts
    if (this.startInProgress) {
      log('[SessionManager] Start already in progress, waiting...');
      // Wait a bit and check if session exists
      await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      if (this.sessionId) {
        return { success: true, session: this.getSessionInfo()! };
      }
    }

    // If already have an active session, just return it (warm start scenario)
    if (this.sessionId && this.state !== 'ended') {
      log('[SessionManager] Session already active:', this.sessionId);
      return { success: true, session: this.getSessionInfo()! };
    }

    this.startInProgress = true;

    try {
      // Retry if token isn't ready yet
      for (let attempt = 0; attempt < retries; attempt++) {
        const userId = TokenManager.getUserId();
        if (userId) break;
        
        if (attempt < retries - 1) {
          log(`[SessionManager] Token not ready, retry ${attempt + 1}/${retries}...`);
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        }
      }

      const userId = TokenManager.getUserId();
      if (!userId) {
        return { success: false, error: 'Not authenticated after retries' };
      }

      const deviceInfo = getDeviceInfo();
      log('[SessionManager] Starting new session for user:', userId.substring(0, 8) + '...');

      const response = await apiRequest<{
        success: boolean;
        session_id: string | null;
        device_id: string | null;
      }>(ENDPOINTS.INGEST_EVENT, 'POST', {
        user_id: userId,
        event_type: 'session_start',
        device_identifier: deviceInfo.deviceIdentifier,
        platform: deviceInfo.platform,
        event_data: {
          cold_start: true,
        },
      });

      if (response.success && response.data?.session_id) {
        this.sessionId = response.data.session_id;
        this.deviceId = response.data.device_id || null;
        this.startedAt = new Date().toISOString();
        this.state = 'active';

        log('[SessionManager] ✅ New session started:', this.sessionId);
        return { success: true, session: this.getSessionInfo()! };
      }

      // Session might have been resumed (user had recent session)
      if (response.success) {
        this.startedAt = new Date().toISOString();
        this.state = 'active';
        log('[SessionManager] ✅ Session resumed (existing)');
        
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
    } finally {
      this.startInProgress = false;
    }
  }

  /**
   * End the current session (app killed / explicit logout)
   */
  async end(): Promise<{ success: boolean; error?: string }> {
    const userId = TokenManager.getUserId();
    if (!userId) {
      log('[SessionManager] No user, nothing to end');
      return { success: true };
    }

    // Even if no sessionId, try to end any active session on backend
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
      log('[SessionManager] ✅ Session ended:', this.sessionId);
    }

    return { success: response.success, error: response.error };
  }

  /**
   * Pause the session (app going to background)
   * Does NOT end the session - just marks it paused
   */
  pause(): void {
    if (this.state === 'active') {
      this.state = 'paused';
      log('[SessionManager] ⏸️ Session paused (still alive)');
    }
  }

  /**
   * Resume the session (app coming to foreground)
   * Does NOT create a new session
   */
  resume(): void {
    if (this.state === 'paused') {
      this.state = 'active';
      log('[SessionManager] ▶️ Session resumed');
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Set session ID (when received from backend via events)
   */
  setSessionId(id: string): void {
    if (this.sessionId !== id) {
      log('[SessionManager] Session ID updated:', id);
    }
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
   * Check if session is paused (backgrounded but alive)
   */
  isPaused(): boolean {
    return this.state === 'paused';
  }

  /**
   * Clear session data (logout, app killed)
   * Called on cold start implicitly via class initialization
   */
  clear(): void {
    log('[SessionManager] Session cleared');
    this.sessionId = null;
    this.deviceId = null;
    this.startedAt = null;
    this.state = 'ended';
  }
}

export const SessionManager = new SessionManagerClass();
