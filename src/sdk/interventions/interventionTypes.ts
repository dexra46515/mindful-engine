/**
 * Intervention Types
 */

export type InterventionType = 
  | 'soft_nudge' 
  | 'medium_friction' 
  | 'hard_block' 
  | 'parent_alert';

export type InterventionStatus = 
  | 'pending' 
  | 'delivered'
  | 'acknowledged' 
  | 'dismissed' 
  | 'escalated';

export type InterventionResponseAction = 
  | 'acknowledge' 
  | 'dismiss' 
  | 'snooze' 
  | 'action_taken';

export interface Intervention {
  id: string;
  type: InterventionType;
  status: InterventionStatus;
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
  riskLevelAtTrigger: 'low' | 'medium' | 'high' | 'critical';
  riskScoreAtTrigger: number;
  createdAt: string;
}

export interface InterventionResponse {
  success: boolean;
  interventions?: Intervention[];
  error?: string;
}
