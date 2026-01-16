/**
 * Behavioral Event Types
 */

export type BehavioralEventType =
  | 'app_open'
  | 'app_close'
  | 'screen_view'
  | 'scroll'
  | 'tap'
  | 'session_start'
  | 'session_end'
  | 'reopen'
  | 'background'
  | 'foreground';

export interface EventMetadata {
  screenName?: string;
  velocity?: number;
  scrollVelocity?: number;
  element?: string;
  duration?: number;
  sessionId?: string;
  [key: string]: unknown;
}

export interface EventResponse {
  success: boolean;
  event_id?: string;
  session_id?: string;
  device_id?: string;
  orchestrator_result?: {
    risk_level: string;
    intervention_triggered: boolean;
    final_state: string;
  };
  error?: string;
}
