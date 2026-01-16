/**
 * Secure Storage Adapter
 * 
 * Abstract interface for secure token storage.
 * Implementations for different platforms:
 * 
 * React Native (Expo):
 * ```typescript
 * import * as SecureStore from 'expo-secure-store';
 * 
 * const secureStoreAdapter: StorageAdapter = {
 *   getItem: (key) => SecureStore.getItemAsync(key),
 *   setItem: (key, value) => SecureStore.setItemAsync(key, value),
 *   removeItem: (key) => SecureStore.deleteItemAsync(key),
 * };
 * 
 * TokenManager.setStorageAdapter(secureStoreAdapter);
 * ```
 * 
 * React Native (Keychain):
 * ```typescript
 * import * as Keychain from 'react-native-keychain';
 * 
 * const keychainAdapter: StorageAdapter = {
 *   getItem: async (key) => {
 *     const creds = await Keychain.getGenericPassword({ service: key });
 *     return creds ? creds.password : null;
 *   },
 *   setItem: async (key, value) => {
 *     await Keychain.setGenericPassword(key, value, { service: key });
 *   },
 *   removeItem: async (key) => {
 *     await Keychain.resetGenericPassword({ service: key });
 *   },
 * };
 * ```
 */

export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

/**
 * In-memory storage adapter (for testing)
 */
export const createMemoryStorage = (): StorageAdapter => {
  const store = new Map<string, string>();

  return {
    getItem: async (key) => store.get(key) || null,
    setItem: async (key, value) => { store.set(key, value); },
    removeItem: async (key) => { store.delete(key); },
  };
};

/**
 * Web localStorage adapter (default for web)
 */
export const createWebStorage = (): StorageAdapter => ({
  getItem: async (key) => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: async (key, value) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },
  removeItem: async (key) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  },
});
