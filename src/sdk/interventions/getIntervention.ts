/**
 * Get Pending Interventions
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TokenManager } from '../auth/tokenManager';
import { log } from '../utils/logger';
import type { Intervention, InterventionResponse } from './interventionTypes';

let supabaseClient: SupabaseClient | null = null;

/**
 * Set Supabase client for direct queries
 */
export function setSupabaseClient(client: SupabaseClient): void {
  supabaseClient = client;
}

/**
 * Create Supabase client from URL and key
 */
export function initSupabaseClient(url: string, anonKey: string): SupabaseClient {
  supabaseClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
    },
  });
  return supabaseClient;
}

/**
 * Get pending interventions for the current user
 */
export async function getInterventions(): Promise<InterventionResponse> {
  const userId = TokenManager.getUserId();
  const token = TokenManager.getToken();

  if (!userId || !token) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!supabaseClient) {
    return { success: false, error: 'Supabase client not initialized' };
  }

  try {
    // Set the auth token for RLS
    const { data, error } = await supabaseClient
      .from('interventions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'delivered'])
      .order('created_at', { ascending: false });

    if (error) {
      log('[Interventions] Query error:', error);
      return { success: false, error: error.message };
    }

    const interventions: Intervention[] = (data || []).map((row) => ({
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

    log('[Interventions] Found:', interventions.length);
    return { success: true, interventions };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Get a single intervention by ID
 */
export async function getInterventionById(interventionId: string): Promise<{
  success: boolean;
  intervention?: Intervention;
  error?: string;
}> {
  const userId = TokenManager.getUserId();

  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!supabaseClient) {
    return { success: false, error: 'Supabase client not initialized' };
  }

  try {
    const { data, error } = await supabaseClient
      .from('interventions')
      .select('*')
      .eq('id', interventionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Intervention not found' };
    }

    const intervention: Intervention = {
      id: data.id,
      type: data.type,
      status: data.status,
      title: data.title,
      message: data.message,
      actionLabel: data.action_label,
      actionUrl: data.action_url,
      riskLevelAtTrigger: data.risk_level_at_trigger,
      riskScoreAtTrigger: data.risk_score_at_trigger,
      createdAt: data.created_at,
    };

    return { success: true, intervention };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
