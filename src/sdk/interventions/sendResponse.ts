/**
 * Send Intervention Response
 */

import { apiRequest } from '../config/client';
import { ENDPOINTS } from '../config/endpoints';
import { log } from '../utils/logger';
import { now } from '../utils/time';
import type { InterventionResponseAction } from './interventionTypes';

export interface ResponseResult {
  success: boolean;
  newStatus?: string;
  error?: string;
}

/**
 * Send a response to an intervention
 */
export async function sendInterventionResponse(
  interventionId: string,
  action: InterventionResponseAction,
  responseData?: Record<string, unknown>
): Promise<ResponseResult> {
  log('[Interventions] Sending response:', action, interventionId);

  const response = await apiRequest<{
    success: boolean;
    new_status?: string;
  }>(ENDPOINTS.RESPOND_INTERVENTION, 'POST', {
    intervention_id: interventionId,
    action,
    response_data: responseData || {},
    timestamp: now(),
  });

  if (response.success) {
    log('[Interventions] Response sent:', response.data);
    return {
      success: true,
      newStatus: response.data?.new_status,
    };
  }

  return { success: false, error: response.error };
}

/**
 * Acknowledge an intervention (user accepted the nudge)
 */
export async function acknowledgeIntervention(
  interventionId: string,
  feedback?: string
): Promise<ResponseResult> {
  return sendInterventionResponse(interventionId, 'acknowledge', { feedback });
}

/**
 * Dismiss an intervention (user closed without acting)
 */
export async function dismissIntervention(
  interventionId: string,
  reason?: string
): Promise<ResponseResult> {
  return sendInterventionResponse(interventionId, 'dismiss', { reason });
}

/**
 * Snooze an intervention (remind later)
 */
export async function snoozeIntervention(
  interventionId: string,
  snoozeMinutes: number = 15
): Promise<ResponseResult> {
  return sendInterventionResponse(interventionId, 'snooze', { snooze_minutes: snoozeMinutes });
}

/**
 * Mark action as taken (user completed the suggested action)
 */
export async function markActionTaken(
  interventionId: string,
  actionDetails?: Record<string, unknown>
): Promise<ResponseResult> {
  return sendInterventionResponse(interventionId, 'action_taken', actionDetails);
}
