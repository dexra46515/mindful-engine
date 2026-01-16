/**
 * Token Manager with persistence support
 * 
 * For React Native, inject a storage adapter (AsyncStorage/SecureStore)
 * For Web, falls back to localStorage
 */

import { log } from '../utils/logger';

export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

// Default web storage adapter
const webStorageAdapter: StorageAdapter = {
  getItem: async (key) => localStorage.getItem(key),
  setItem: async (key, value) => localStorage.setItem(key, value),
  removeItem: async (key) => localStorage.removeItem(key),
};

const TOKEN_KEY = 'behavioral_engine_token';
const USER_ID_KEY = 'behavioral_engine_user_id';

class TokenManagerClass {
  private token: string | null = null;
  private userId: string | null = null;
  private storage: StorageAdapter = webStorageAdapter;
  private initialized = false;

  /**
   * Set custom storage adapter (for React Native SecureStore, etc.)
   */
  setStorageAdapter(adapter: StorageAdapter): void {
    this.storage = adapter;
  }

  /**
   * Initialize and load persisted token
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.token = await this.storage.getItem(TOKEN_KEY);
      this.userId = await this.storage.getItem(USER_ID_KEY);
      this.initialized = true;
      log('[TokenManager] Initialized, token exists:', !!this.token);
    } catch (error) {
      log('[TokenManager] Failed to load token:', error);
    }
  }

  /**
   * Set token and persist
   */
  async setToken(token: string, userId: string): Promise<void> {
    this.token = token;
    this.userId = userId;

    try {
      await this.storage.setItem(TOKEN_KEY, token);
      await this.storage.setItem(USER_ID_KEY, userId);
      log('[TokenManager] Token saved');
    } catch (error) {
      log('[TokenManager] Failed to save token:', error);
    }
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Get current user ID
   */
  getUserId(): string | null {
    return this.userId;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !!this.token && !!this.userId;
  }

  /**
   * Clear token and remove from storage
   */
  async clearToken(): Promise<void> {
    this.token = null;
    this.userId = null;

    try {
      await this.storage.removeItem(TOKEN_KEY);
      await this.storage.removeItem(USER_ID_KEY);
      log('[TokenManager] Token cleared');
    } catch (error) {
      log('[TokenManager] Failed to clear token:', error);
    }
  }
}

export const TokenManager = new TokenManagerClass();
