/**
 * Time Utilities
 */

/**
 * Get current timestamp as ISO string
 */
export const now = (): string => new Date().toISOString();

/**
 * Get Unix timestamp in milliseconds
 */
export const timestamp = (): number => Date.now();

/**
 * Format duration in seconds to human readable
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};
