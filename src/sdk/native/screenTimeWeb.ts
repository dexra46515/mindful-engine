/**
 * Web fallback for Screen Time Plugin
 * Provides stub implementations for non-iOS platforms
 */

export class ScreenTimePluginWeb {
  async requestAuthorization(): Promise<{ authorized: boolean }> {
    console.warn('[ScreenTime Web] Authorization not available on web');
    return { authorized: false };
  }

  async checkAuthorizationStatus(): Promise<{ status: 'approved' | 'denied' | 'notDetermined' }> {
    return { status: 'notDetermined' };
  }

  async startMonitoring(_options: { dailyLimitMinutes: number }): Promise<{ success: boolean }> {
    console.warn('[ScreenTime Web] Monitoring not available on web');
    return { success: false };
  }

  async stopMonitoring(): Promise<{ success: boolean }> {
    return { success: true };
  }

  async grantTimeExtension(_options: { minutes: number }): Promise<{ success: boolean }> {
    console.warn('[ScreenTime Web] Time extension not available on web');
    return { success: false };
  }

  async openAppPicker(): Promise<{ success: boolean }> {
    console.warn('[ScreenTime Web] App picker not available on web');
    return { success: false };
  }

  async setBedtimeSchedule(_options: { 
    startHour: number; 
    startMinute: number; 
    endHour: number; 
    endMinute: number 
  }): Promise<{ success: boolean }> {
    console.warn('[ScreenTime Web] Bedtime schedule not available on web');
    return { success: false };
  }
}
