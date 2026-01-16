/**
 * Device Information Utilities
 * 
 * For React Native, replace this with actual device info libraries.
 * This provides web fallbacks and type definitions.
 */

export interface DeviceInfo {
  deviceIdentifier: string;
  platform: 'ios' | 'android' | 'web';
  deviceName?: string;
  osVersion?: string;
  appVersion?: string;
}

// Generate a persistent device ID for web
const getWebDeviceId = (): string => {
  const storageKey = 'behavioral_engine_device_id';
  
  if (typeof localStorage !== 'undefined') {
    let deviceId = localStorage.getItem(storageKey);
    if (!deviceId) {
      deviceId = `web-${crypto.randomUUID()}`;
      localStorage.setItem(storageKey, deviceId);
    }
    return deviceId;
  }
  
  return `web-${crypto.randomUUID()}`;
};

// Detect platform
const detectPlatform = (): 'ios' | 'android' | 'web' => {
  if (typeof navigator === 'undefined') return 'web';
  
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'web';
};

// Custom device info (can be overridden by React Native)
let customDeviceInfo: Partial<DeviceInfo> | null = null;

/**
 * Set custom device info (for React Native integration)
 */
export const setDeviceInfo = (info: Partial<DeviceInfo>): void => {
  customDeviceInfo = info;
};

/**
 * Get device information
 */
export const getDeviceInfo = (): DeviceInfo => {
  if (customDeviceInfo) {
    return {
      deviceIdentifier: customDeviceInfo.deviceIdentifier || getWebDeviceId(),
      platform: customDeviceInfo.platform || detectPlatform(),
      deviceName: customDeviceInfo.deviceName,
      osVersion: customDeviceInfo.osVersion,
      appVersion: customDeviceInfo.appVersion,
    };
  }

  return {
    deviceIdentifier: getWebDeviceId(),
    platform: detectPlatform(),
    deviceName: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 50) : undefined,
    osVersion: typeof navigator !== 'undefined' ? navigator.platform : undefined,
  };
};
