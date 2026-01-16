/**
 * Token Manager with persistence support
 * 
 * VALIDATION CHECKLIST:
 * ✅ Token persists across app restarts
 * ✅ User ID persists across app restarts
 * ✅ Session ID does NOT persist (resets each launch)
 * ✅ No race conditions between token load and SDK init
 * ✅ Supports SecureStore for React Native
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
  getItem: async (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // localStorage might be unavailable
    }
  },
  removeItem: async (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // localStorage might be unavailable
    }
  },
};

const TOKEN_KEY = 'behavioral_engine_token';
const USER_ID_KEY = 'behavioral_engine_user_id';
// NOTE: Session ID is NOT persisted - it resets each cold start

class TokenManagerClass {
  private token: string | null = null;
  private userId: string | null = null;
  private storage: StorageAdapter = webStorageAdapter;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Set custom storage adapter (for React Native SecureStore, etc.)
   * MUST be called before initialize()
   */
  setStorageAdapter(adapter: StorageAdapter): void {
    if (this.initialized) {
      log('[TokenManager] ⚠️ Warning: Storage adapter set after initialization');
    }
    this.storage = adapter;
  }

  /**
   * Initialize and load persisted token
   * Safe to call multiple times - only runs once
   */
  async initialize(): Promise<void> {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Already done
    if (this.initialized) {
      return;
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    const startTime = Date.now();
    log('[TokenManager] Initializing...');

    try {
      // Load token and userId in parallel
      const [storedToken, storedUserId] = await Promise.all([
        this.storage.getItem(TOKEN_KEY),
        this.storage.getItem(USER_ID_KEY),
      ]);

      this.token = storedToken;
      this.userId = storedUserId;
      this.initialized = true;

      const elapsed = Date.now() - startTime;
      log('[TokenManager] ✅ Initialized in', elapsed, 'ms');
      log('[TokenManager] Token exists:', !!this.token);
      log('[TokenManager] User ID:', this.userId ? this.userId.substring(0, 8) + '...' : 'none');
    } catch (error) {
      log('[TokenManager] ❌ Failed to load token:', error);
      this.initialized = true; // Mark as initialized even on failure
    }
  }

  /**
   * Wait for initialization to complete
   */
  async waitForInit(): Promise<boolean> {
    await this.initialize();
    return this.isAuthenticated();
  }

  /**
   * Set token and persist
   */
  async setToken(token: string, userId: string): Promise<void> {
    this.token = token;
    this.userId = userId;

    try {
      await Promise.all([
        this.storage.setItem(TOKEN_KEY, token),
        this.storage.setItem(USER_ID_KEY, userId),
      ]);
      log('[TokenManager] ✅ Token saved');
    } catch (error) {
      log('[TokenManager] ❌ Failed to save token:', error);
    }
  }

  /**
   * Get current token (sync - returns cached value)
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Get current user ID (sync - returns cached value)
   */
  getUserId(): string | null {
    return this.userId;
  }

  /**
   * Check if authenticated (has both token and userId)
   */
  isAuthenticated(): boolean {
    return !!this.token && !!this.userId;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Clear token and remove from storage
   */
  async clearToken(): Promise<void> {
    this.token = null;
    this.userId = null;

    try {
      await Promise.all([
        this.storage.removeItem(TOKEN_KEY),
        this.storage.removeItem(USER_ID_KEY),
      ]);
      log('[TokenManager] ✅ Token cleared');
    } catch (error) {
      log('[TokenManager] ❌ Failed to clear token:', error);
    }
  }
}

export const TokenManager = new TokenManagerClass();
