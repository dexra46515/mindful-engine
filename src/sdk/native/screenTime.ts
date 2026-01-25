/**
 * Screen Time Native SDK
 * Bridge between React/Capacitor and iOS Screen Time APIs
 * 
 * Note: This file provides the TypeScript interface.
 * The actual Swift implementation requires the native extensions
 * outlined in docs/v2-native-roadmap.md
 */

import { Capacitor, registerPlugin } from '@capacitor/core';

// Plugin interface matching Swift implementation
interface ScreenTimePlugin {
  requestAuthorization(): Promise<{ authorized: boolean }>;
  checkAuthorizationStatus(): Promise<{ status: 'approved' | 'denied' | 'notDetermined' }>;
  startMonitoring(options: { dailyLimitMinutes: number }): Promise<{ success: boolean }>;
  stopMonitoring(): Promise<{ success: boolean }>;
  grantTimeExtension(options: { minutes: number }): Promise<{ success: boolean }>;
  openAppPicker(): Promise<{ success: boolean }>;
  setBedtimeSchedule(options: { startHour: number; startMinute: number; endHour: number; endMinute: number }): Promise<{ success: boolean }>;
}

// Register the plugin (only available when native extension is built)
const ScreenTimePluginImpl = registerPlugin<ScreenTimePlugin>('ScreenTimePlugin', {
  web: () => import('./screenTimeWeb').then(m => new m.ScreenTimePluginWeb()),
});

/**
 * Screen Time Manager
 * High-level interface for Screen Time functionality
 */
export class ScreenTimeManager {
  /**
   * Check if Screen Time API is available
   */
  static isAvailable(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  }

  /**
   * Request FamilyControls authorization
   * Shows iOS system permission dialog
   */
  static async requestAuthorization(): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('[ScreenTime] Not available on this platform');
      return false;
    }
    
    try {
      const result = await ScreenTimePluginImpl.requestAuthorization();
      return result.authorized;
    } catch (error) {
      console.error('[ScreenTime] Authorization failed:', error);
      return false;
    }
  }

  /**
   * Check current authorization status
   */
  static async checkStatus(): Promise<'approved' | 'denied' | 'notDetermined'> {
    if (!this.isAvailable()) {
      return 'notDetermined';
    }
    
    try {
      const result = await ScreenTimePluginImpl.checkAuthorizationStatus();
      return result.status;
    } catch (error) {
      console.error('[ScreenTime] Status check failed:', error);
      return 'notDetermined';
    }
  }

  /**
   * Start monitoring with daily limit
   * Requires authorization first
   */
  static async startMonitoring(dailyLimitMinutes: number): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('[ScreenTime] Cannot start monitoring - not on iOS');
      return false;
    }
    
    try {
      const result = await ScreenTimePluginImpl.startMonitoring({ dailyLimitMinutes });
      return result.success;
    } catch (error) {
      console.error('[ScreenTime] Failed to start monitoring:', error);
      return false;
    }
  }

  /**
   * Stop all monitoring and remove shields
   */
  static async stopMonitoring(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    
    try {
      const result = await ScreenTimePluginImpl.stopMonitoring();
      return result.success;
    } catch (error) {
      console.error('[ScreenTime] Failed to stop monitoring:', error);
      return false;
    }
  }

  /**
   * Grant temporary time extension
   * Removes shields for specified duration
   */
  static async grantTimeExtension(minutes: number): Promise<boolean> {
    if (!this.isAvailable()) return false;
    
    try {
      const result = await ScreenTimePluginImpl.grantTimeExtension({ minutes });
      return result.success;
    } catch (error) {
      console.error('[ScreenTime] Failed to grant extension:', error);
      return false;
    }
  }

  /**
   * Open the FamilyActivityPicker for app selection
   */
  static async openAppPicker(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    
    try {
      const result = await ScreenTimePluginImpl.openAppPicker();
      return result.success;
    } catch (error) {
      console.error('[ScreenTime] Failed to open picker:', error);
      return false;
    }
  }

  /**
   * Set bedtime schedule
   * Apps will be shielded during this time period
   */
  static async setBedtimeSchedule(
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number
  ): Promise<boolean> {
    if (!this.isAvailable()) return false;
    
    try {
      const result = await ScreenTimePluginImpl.setBedtimeSchedule({
        startHour,
        startMinute,
        endHour,
        endMinute,
      });
      return result.success;
    } catch (error) {
      console.error('[ScreenTime] Failed to set bedtime:', error);
      return false;
    }
  }
}

/**
 * Integration helper for connecting Screen Time with existing engine
 */
export class ScreenTimeIntegration {
  /**
   * Initialize Screen Time for a youth user
   */
  static async initializeForYouth(dailyLimitMinutes: number): Promise<boolean> {
    // Check if already authorized
    const status = await ScreenTimeManager.checkStatus();
    
    if (status === 'denied') {
      console.warn('[Integration] Screen Time authorization previously denied');
      return false;
    }
    
    if (status === 'notDetermined') {
      const authorized = await ScreenTimeManager.requestAuthorization();
      if (!authorized) {
        console.warn('[Integration] Screen Time authorization denied');
        return false;
      }
    }

    // Start monitoring with the policy limit
    return ScreenTimeManager.startMonitoring(dailyLimitMinutes);
  }

  /**
   * Handle intervention from backend
   */
  static async handleIntervention(intervention: {
    type: 'soft_nudge' | 'medium_friction' | 'hard_block';
    id: string;
  }): Promise<void> {
    // For hard blocks, native Screen Time handles the shield
    // Soft nudge and medium friction are handled by React components
    if (intervention.type === 'hard_block') {
      console.log('[Integration] Hard block - native shield active');
    }
  }

  /**
   * Handle time extension approval from parent
   */
  static async handleTimeExtensionApproval(minutes: number): Promise<boolean> {
    return ScreenTimeManager.grantTimeExtension(minutes);
  }

  /**
   * Sync policies from backend to native
   */
  static async syncPolicies(policies: {
    dailyLimitMinutes: number;
    bedtimeStart?: string; // HH:mm format
    bedtimeEnd?: string;   // HH:mm format
  }): Promise<void> {
    // Stop existing monitoring
    await ScreenTimeManager.stopMonitoring();
    
    // Restart with new limits
    await ScreenTimeManager.startMonitoring(policies.dailyLimitMinutes);
    
    // Set bedtime if configured
    if (policies.bedtimeStart && policies.bedtimeEnd) {
      const [startHour, startMinute] = policies.bedtimeStart.split(':').map(Number);
      const [endHour, endMinute] = policies.bedtimeEnd.split(':').map(Number);
      
      await ScreenTimeManager.setBedtimeSchedule(startHour, startMinute, endHour, endMinute);
    }
  }

  /**
   * Cleanup when user logs out or unlinks
   */
  static async cleanup(): Promise<void> {
    await ScreenTimeManager.stopMonitoring();
  }
}

export default ScreenTimeManager;
