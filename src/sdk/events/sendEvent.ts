/**
 * Send Behavioral Events
 */

import { apiRequest } from '../config/client';
import { ENDPOINTS } from '../config/endpoints';
import { TokenManager } from '../auth/tokenManager';
import { SessionManager } from '../sessions/sessionManager';
import { getDeviceInfo } from '../utils/device';
import { now } from '../utils/time';
import type { BehavioralEventType, EventMetadata, EventResponse } from './eventTypes';

export interface SendEventOptions {
  screenName?: string;
}

/**
 * Send a behavioral event to the engine
 */
export async function sendEvent(
  type: BehavioralEventType,
  metadata: EventMetadata = {},
  options: SendEventOptions = {}
): Promise<EventResponse> {
  const userId = TokenManager.getUserId();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  const deviceInfo = getDeviceInfo();
  const sessionId = SessionManager.getSessionId();

  const response = await apiRequest<EventResponse>(
    ENDPOINTS.INGEST_EVENT,
    'POST',
    {
      user_id: userId,
      event_type: type,
      device_identifier: deviceInfo.deviceIdentifier,
      platform: deviceInfo.platform,
      session_id: sessionId,
      screen_name: options.screenName || metadata.screenName,
      event_data: {
        ...metadata,
        velocity: metadata.velocity || metadata.scrollVelocity,
      },
      timestamp: now(),
    }
  );

  // Update session ID if returned from backend
  if (response.data?.session_id) {
    SessionManager.setSessionId(response.data.session_id);
  }

  return {
    success: response.success,
    event_id: response.data?.event_id,
    session_id: response.data?.session_id,
    device_id: response.data?.device_id,
    orchestrator_result: response.data?.orchestrator_result,
    error: response.error,
  };
}

// Convenience methods
export const trackAppOpen = () => sendEvent('app_open');
export const trackAppClose = () => sendEvent('app_close');
export const trackScreenView = (screenName: string) => sendEvent('screen_view', { screenName });
export const trackScroll = (velocity: number, screenName?: string) => 
  sendEvent('scroll', { velocity }, { screenName });
export const trackTap = (element: string, screenName?: string) => 
  sendEvent('tap', { element }, { screenName });
export const trackReopen = () => sendEvent('reopen');
export const trackBackground = () => sendEvent('background');
export const trackForeground = () => sendEvent('foreground');
