/**
 * Logger Utility
 * 
 * Only logs in development mode
 */

// Check if in development mode
const isDev = (): boolean => {
  // Vite
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.DEV === true;
  }
  // Node
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV !== 'production';
  }
  return false;
};

// Log level
let logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug' = 'info';

/**
 * Set log level
 */
export const setLogLevel = (level: typeof logLevel): void => {
  logLevel = level;
};

/**
 * Log debug messages (only in development)
 */
export const log = (...args: unknown[]): void => {
  if (isDev() && logLevel !== 'none') {
    console.log('[SDK]', ...args);
  }
};

/**
 * Log warnings
 */
export const warn = (...args: unknown[]): void => {
  if (logLevel !== 'none' && logLevel !== 'error') {
    console.warn('[SDK]', ...args);
  }
};

/**
 * Log errors
 */
export const error = (...args: unknown[]): void => {
  if (logLevel !== 'none') {
    console.error('[SDK]', ...args);
  }
};

/**
 * Log info messages
 */
export const info = (...args: unknown[]): void => {
  if (isDev() && (logLevel === 'info' || logLevel === 'debug')) {
    console.info('[SDK]', ...args);
  }
};
