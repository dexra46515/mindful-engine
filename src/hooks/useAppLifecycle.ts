/**
 * Capacitor App Lifecycle Hook
 * Wires native app events to the Behavioral SDK
 */

import { useEffect, useRef } from 'react';
import { App, type AppState } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import SDK from '@/sdk';

interface UseAppLifecycleOptions {
  onAppOpen?: () => void;
  onBackground?: () => void;
  onForeground?: () => void;
  onUrlOpen?: (url: string) => void;
}

export function useAppLifecycle(options: UseAppLifecycleOptions = {}) {
  const isInitialized = useRef(false);
  const wasBackgrounded = useRef(false);

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      console.log('[Lifecycle] Running on web, skipping native hooks');
      return;
    }

    const setupLifecycleListeners = async () => {
      if (isInitialized.current) return;
      isInitialized.current = true;

      console.log('[Lifecycle] Setting up native app lifecycle listeners');

      // Track app open on initial launch
      try {
        await SDK.events.trackAppOpen();
        console.log('[Lifecycle] App open tracked');
        options.onAppOpen?.();
      } catch (error) {
        console.error('[Lifecycle] Failed to track app open:', error);
      }

      // Listen for app state changes (background/foreground)
      const stateListener = await App.addListener('appStateChange', async (state: AppState) => {
        console.log('[Lifecycle] App state changed:', state.isActive ? 'foreground' : 'background');

        if (state.isActive) {
          // App came to foreground
          if (wasBackgrounded.current) {
            // This is a reopen (was backgrounded, now active again)
            try {
              await SDK.events.trackReopen();
              console.log('[Lifecycle] Reopen tracked');
            } catch (error) {
              console.error('[Lifecycle] Failed to track reopen:', error);
            }
          }

          try {
            await SDK.events.trackForeground();
            console.log('[Lifecycle] Foreground tracked');
            options.onForeground?.();
          } catch (error) {
            console.error('[Lifecycle] Failed to track foreground:', error);
          }

          wasBackgrounded.current = false;
        } else {
          // App went to background
          wasBackgrounded.current = true;

          try {
            await SDK.events.trackBackground();
            console.log('[Lifecycle] Background tracked');
            options.onBackground?.();
          } catch (error) {
            console.error('[Lifecycle] Failed to track background:', error);
          }
        }
      });

      // Listen for deep links / URL opens
      const urlListener = await App.addListener('appUrlOpen', (event) => {
        console.log('[Lifecycle] URL opened:', event.url);
        options.onUrlOpen?.(event.url);
      });

      // Handle back button on Android
      const backListener = await App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          // At root, minimize app instead of exiting
          App.minimizeApp();
        } else {
          window.history.back();
        }
      });

      // Cleanup function
      return () => {
        stateListener.remove();
        urlListener.remove();
        backListener.remove();
      };
    };

    const cleanup = setupLifecycleListeners();

    return () => {
      cleanup.then((cleanupFn) => cleanupFn?.());
    };
  }, [options]);

  return {
    isNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
  };
}

/**
 * Pause session when app goes to background
 */
export function useSessionPause() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener('appStateChange', (state: AppState) => {
      if (state.isActive) {
        SDK.sessions.resume();
      } else {
        SDK.sessions.pause();
      }
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, []);
}
