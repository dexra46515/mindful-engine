/**
 * Capacitor App Lifecycle Hook
 * Wires native app events to the Behavioral SDK
 * 
 * VALIDATION CHECKLIST:
 * ✅ App Open: Fires once on cold start → session_start
 * ✅ Foreground: Fires on warm start → reopen (not new session)
 * ✅ Background: Fires reliably → background event (not session_end)
 * ✅ No double-fires on hot reload
 * ✅ Cold start vs warm start differentiation
 */

import { useEffect, useRef, useCallback } from 'react';
import { App, type AppState } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import SDK from '@/sdk';

interface UseAppLifecycleOptions {
  onAppOpen?: () => void;
  onBackground?: () => void;
  onForeground?: () => void;
  onReopen?: () => void;
  onUrlOpen?: (url: string) => void;
}

// Module-level flags to prevent double initialization across hot reloads
let globalInitialized = false;
let globalListenersAttached = false;

export function useAppLifecycle(options: UseAppLifecycleOptions = {}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  
  // Track background state persistently
  const wasBackgroundedRef = useRef(false);
  const sessionStartedRef = useRef(false);

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      console.log('[Lifecycle] Running on web, skipping native hooks');
      return;
    }

    // Prevent double initialization on hot reload
    if (globalInitialized) {
      console.log('[Lifecycle] Already initialized, skipping');
      return;
    }
    globalInitialized = true;

    let stateListener: Awaited<ReturnType<typeof App.addListener>> | null = null;
    let urlListener: Awaited<ReturnType<typeof App.addListener>> | null = null;
    let backListener: Awaited<ReturnType<typeof App.addListener>> | null = null;

    const setupLifecycleListeners = async () => {
      // Prevent duplicate listeners
      if (globalListenersAttached) {
        console.log('[Lifecycle] Listeners already attached');
        return;
      }
      globalListenersAttached = true;

      console.log('[Lifecycle] Setting up native app lifecycle listeners');

      // ==========================================
      // COLD START: Track app_open + session_start
      // ==========================================
      if (!sessionStartedRef.current) {
        sessionStartedRef.current = true;
        
        try {
          // Session start is handled by SDK.sessions.start() in NativeAppProvider
          // Here we just track the app_open event
          await SDK.events.trackAppOpen();
          console.log('[Lifecycle] ✅ Cold start: app_open tracked');
          optionsRef.current.onAppOpen?.();
        } catch (error) {
          console.error('[Lifecycle] ❌ Failed to track app open:', error);
        }
      }

      // ==========================================
      // APP STATE CHANGES (background/foreground)
      // ==========================================
      stateListener = await App.addListener('appStateChange', async (state: AppState) => {
        const isActive = state.isActive;
        console.log('[Lifecycle] App state changed:', isActive ? 'FOREGROUND' : 'BACKGROUND');

        if (isActive) {
          // ==========================================
          // WARM START (reopen): Was backgrounded, now active
          // ==========================================
          if (wasBackgroundedRef.current) {
            wasBackgroundedRef.current = false;
            
            try {
              // Track REOPEN - this increments reopen_count on session, NOT new session
              await SDK.events.trackReopen();
              console.log('[Lifecycle] ✅ Warm start: reopen tracked (no new session)');
              optionsRef.current.onReopen?.();
            } catch (error) {
              console.error('[Lifecycle] ❌ Failed to track reopen:', error);
            }

            try {
              await SDK.events.trackForeground();
              console.log('[Lifecycle] ✅ Foreground event tracked');
              optionsRef.current.onForeground?.();
            } catch (error) {
              console.error('[Lifecycle] ❌ Failed to track foreground:', error);
            }

            // Resume session (was paused)
            SDK.sessions.resume();
          }
        } else {
          // ==========================================
          // BACKGROUND: Track background, NOT session_end
          // Session stays alive until app is killed
          // ==========================================
          if (!wasBackgroundedRef.current) {
            wasBackgroundedRef.current = true;
            
            try {
              // Track background event (NOT session_end)
              await SDK.events.trackBackground();
              console.log('[Lifecycle] ✅ Background event tracked (session still active)');
              optionsRef.current.onBackground?.();
            } catch (error) {
              console.error('[Lifecycle] ❌ Failed to track background:', error);
            }

            // Pause session (not end)
            SDK.sessions.pause();
          } else {
            console.log('[Lifecycle] ⏭️ Already backgrounded, skipping duplicate');
          }
        }
      });

      // ==========================================
      // DEEP LINKS
      // ==========================================
      urlListener = await App.addListener('appUrlOpen', (event) => {
        console.log('[Lifecycle] URL opened:', event.url);
        optionsRef.current.onUrlOpen?.(event.url);
      });

      // ==========================================
      // ANDROID BACK BUTTON
      // ==========================================
      backListener = await App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          // At root, minimize instead of exit
          App.minimizeApp();
        } else {
          window.history.back();
        }
      });
    };

    setupLifecycleListeners();

    // Cleanup on unmount
    return () => {
      // Only clean up if we actually set up listeners
      if (stateListener) stateListener.remove();
      if (urlListener) urlListener.remove();
      if (backListener) backListener.remove();
      
      // Reset flags on cleanup (for development hot reload)
      globalInitialized = false;
      globalListenersAttached = false;
    };
  }, []); // Empty deps - only run once

  return {
    isNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
  };
}

/**
 * Realtime subscription manager for lifecycle
 * Handles reconnection on foreground
 */
export function useRealtimeReconnect() {
  const isReconnecting = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listener: Awaited<ReturnType<typeof App.addListener>> | null = null;

    const setup = async () => {
      listener = await App.addListener('appStateChange', async (state: AppState) => {
        if (state.isActive && !isReconnecting.current) {
          isReconnecting.current = true;
          
          // Check if realtime is still connected
          const userId = SDK.auth.getUserId();
          if (userId && !SDK.realtime.isSubscribed()) {
            console.log('[Lifecycle] Reconnecting realtime after foreground...');
            await SDK.realtime.subscribe({
              onInterventionReceived: (i) => console.log('[Realtime] Intervention:', i),
              onRiskStateChanged: (r) => console.log('[Realtime] Risk updated:', r),
            });
          }
          
          isReconnecting.current = false;
        }
      });
    };

    setup();

    return () => {
      if (listener) listener.remove();
    };
  }, []);
}
