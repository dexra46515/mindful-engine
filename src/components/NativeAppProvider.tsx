/**
 * Native App Provider
 * Wraps the app with Capacitor lifecycle hooks and SDK initialization
 */

import React, { useEffect, useState, createContext, useContext } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useAppLifecycle, useSessionPause } from '@/hooks/useAppLifecycle';
import SDK from '@/sdk';

interface NativeAppContextValue {
  isNative: boolean;
  platform: string;
  isReady: boolean;
  sdkInitialized: boolean;
}

const NativeAppContext = createContext<NativeAppContextValue>({
  isNative: false,
  platform: 'web',
  isReady: false,
  sdkInitialized: false,
});

export const useNativeApp = () => useContext(NativeAppContext);

interface NativeAppProviderProps {
  children: React.ReactNode;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export function NativeAppProvider({ 
  children, 
  supabaseUrl, 
  supabaseAnonKey 
}: NativeAppProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [sdkInitialized, setSdkInitialized] = useState(false);

  // Set up lifecycle hooks
  const { isNative, platform } = useAppLifecycle({
    onAppOpen: () => console.log('[NativeApp] App opened'),
    onBackground: () => console.log('[NativeApp] App backgrounded'),
    onForeground: () => console.log('[NativeApp] App foregrounded'),
  });

  // Pause/resume session based on app state
  useSessionPause();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize SDK
        await SDK.init({
          supabaseUrl,
          supabaseAnonKey,
          logLevel: 'debug',
        });
        setSdkInitialized(true);
        console.log('[NativeApp] SDK initialized');

        // Native-specific initialization
        if (Capacitor.isNativePlatform()) {
          // Set status bar style
          try {
            await StatusBar.setStyle({ style: Style.Dark });
            await StatusBar.setBackgroundColor({ color: '#1a1a2e' });
          } catch (e) {
            console.log('[NativeApp] StatusBar not available:', e);
          }

          // Hide splash screen after initialization
          try {
            await SplashScreen.hide();
          } catch (e) {
            console.log('[NativeApp] SplashScreen not available:', e);
          }
        }

        setIsReady(true);
      } catch (error) {
        console.error('[NativeApp] Initialization failed:', error);
        setIsReady(true); // Still show app even if SDK fails
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      SDK.cleanup();
    };
  }, [supabaseUrl, supabaseAnonKey]);

  const contextValue: NativeAppContextValue = {
    isNative,
    platform,
    isReady,
    sdkInitialized,
  };

  // Show loading state while initializing
  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <NativeAppContext.Provider value={contextValue}>
      {children}
    </NativeAppContext.Provider>
  );
}
