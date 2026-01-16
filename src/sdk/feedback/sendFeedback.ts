/**
 * Send Feedback Events
 */

import { apiRequest } from '../config/client';
import { ENDPOINTS } from '../config/endpoints';
import { TokenManager } from '../auth/tokenManager';
import { log } from '../utils/logger';
import { now } from '../utils/time';

export type FeedbackType = 
  | 'intervention_helpful'
  | 'intervention_not_helpful'
  | 'intervention_too_frequent'
  | 'intervention_well_timed'
  | 'general_positive'
  | 'general_negative'
  | 'bug_report'
  | 'feature_request';

export interface FeedbackEvent {
  type: FeedbackType;
  interventionId?: string;
  rating?: number; // 1-5
  comment?: string;
  context?: Record<string, unknown>;
}

export interface FeedbackResult {
  success: boolean;
  feedbackId?: string;
  error?: string;
}

/**
 * Send feedback to the feedback agent
 */
export async function sendFeedback(event: FeedbackEvent): Promise<FeedbackResult> {
  const userId = TokenManager.getUserId();

  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  log('[Feedback] Sending:', event.type);

  const response = await apiRequest<{
    success: boolean;
    feedback_id?: string;
  }>(ENDPOINTS.FEEDBACK_AGENT, 'POST', {
    user_id: userId,
    intervention_id: event.interventionId,
    feedback_type: event.type,
    rating: event.rating,
    comment: event.comment,
    context: event.context || {},
    timestamp: now(),
  });

  if (response.success) {
    log('[Feedback] Sent successfully');
    return {
      success: true,
      feedbackId: response.data?.feedback_id,
    };
  }

  return { success: false, error: response.error };
}

/**
 * Rate an intervention's helpfulness
 */
export async function rateIntervention(
  interventionId: string,
  helpful: boolean,
  comment?: string
): Promise<FeedbackResult> {
  return sendFeedback({
    type: helpful ? 'intervention_helpful' : 'intervention_not_helpful',
    interventionId,
    comment,
  });
}

/**
 * Report intervention timing feedback
 */
export async function reportTiming(
  interventionId: string,
  wellTimed: boolean
): Promise<FeedbackResult> {
  return sendFeedback({
    type: wellTimed ? 'intervention_well_timed' : 'intervention_too_frequent',
    interventionId,
  });
}
