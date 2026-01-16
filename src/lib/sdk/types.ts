// SDK Types for the Behavioral Engine

export type EventType = 
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

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type InterventionType = 'soft_nudge' | 'medium_friction' | 'hard_block' | 'parent_alert';

export type InterventionStatus = 'pending' | 'delivered' | 'acknowledged' | 'dismissed' | 'escalated';

export type InterventionResponseAction = 'acknowledge' | 'dismiss' | 'snooze' | 'action_taken';

export interface DeviceInfo {
  deviceIdentifier: string;
  platform?: 'ios' | 'android' | 'web';
  deviceName?: string;
  osVersion?: string;
  appVersion?: string;
}

export interface SessionInfo {
  sessionId: string;
  deviceId: string;
  startedAt: string;
  state: 'active' | 'paused' | 'ended';
}

export interface EventMetadata {
  screenName?: string;
  velocity?: number;
  scrollVelocity?: number;
  element?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface Intervention {
  id: string;
  type: InterventionType;
  status: InterventionStatus;
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
  riskLevelAtTrigger: RiskLevel;
  riskScoreAtTrigger: number;
  createdAt: string;
}

export interface RiskState {
  score: number;
  level: RiskLevel;
  factors: {
    sessionDuration: number;
    reopenFrequency: number;
    lateNight: number;
    scrollVelocity: number;
  };
  lastEvaluatedAt: string;
}

export interface SDKConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  deviceInfo: DeviceInfo;
  onInterventionReceived?: (intervention: Intervention) => void;
  onRiskLevelChanged?: (riskState: RiskState) => void;
  onError?: (error: Error) => void;
}

export interface SDKResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
