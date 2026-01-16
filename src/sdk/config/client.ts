/**
 * HTTP Client for API requests
 */

import { getApiBase } from './endpoints';
import { TokenManager } from '../auth/tokenManager';
import { log } from '../utils/logger';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RequestOptions {
  retries?: number;
  retryDelay?: number;
}

const DEFAULT_OPTIONS: RequestOptions = {
  retries: 3,
  retryDelay: 1000,
};

/**
 * Make an authenticated API request with retry logic
 */
export async function apiRequest<T = unknown>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: Record<string, unknown>,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { retries, retryDelay } = { ...DEFAULT_OPTIONS, ...options };
  const token = TokenManager.getToken();
  const url = `${getApiBase()}${path}`;

  log(`[API] ${method} ${path}`, body);

  for (let attempt = 1; attempt <= (retries || 1); attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      log(`[API] Response:`, data);
      return { success: true, data: data as T };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log(`[API] Attempt ${attempt} failed:`, message);

      if (attempt === retries) {
        return { success: false, error: message };
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  return { success: false, error: 'Request failed after retries' };
}
