/**
 * Native App Provider
 * Wraps the app with Capacitor lifecycle hooks and SDK initialization
 * 
 * VALIDATION CHECKLIST:
 * ✅ Load token from storage FIRST
 * ✅ Initialize Supabase client
 * ✅ Subscribe to realtime channels
 * ✅ Start session only AFTER token is ready
 * ✅ Avoid double initialization on hot reload
 */

import React, { useEffect, useState, useRef, createContext, useContext } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useAppLifecycle, useRealtimeReconnect } from '@/hooks/useAppLifecycle';
import SDK from '@/sdk';

interface NativeAppContextValue {
  isNative: boolean;
  platform: string;
  isReady: boolean;
  sdkInitialized: boolean;
  tokenLoaded: boolean;
  sessionStarted: boolean;
  realtimeConnected: boolean;
}

const NativeAppContext = createContext<NativeAppContextValue>({
  isNative: false,
  platform: 'web',
  isReady: false,
  sdkInitialized: false,
  tokenLoaded: false,
  sessionStarted: false,
  realtimeConnected: false,
});

export const useNativeApp = () => useContext(NativeAppContext);

interface NativeAppProviderProps {
  children: React.ReactNode;
}

// Supabase config from environment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Module-level flag to prevent double initialization on hot reload
let sdkInitStarted = false;

export function NativeAppProvider({ children }: NativeAppProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [sdkInitialized, setSdkInitialized] = useState(false);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  
  const initRef = useRef(false);

  // Set up lifecycle hooks (after SDK is ready)
  const { isNative, platform } = useAppLifecycle({
    onAppOpen: () => console.log('[NativeApp] ✅ App opened'),
    onBackground: () => console.log('[NativeApp] ⏸️ App backgrounded'),
    onForeground: () => console.log('[NativeApp] ▶️ App foregrounded'),
    onReopen: () => console.log('[NativeApp] 🔄 App reopened'),
  });

  // Handle realtime reconnection on foreground
  useRealtimeReconnect();

  useEffect(() => {
    // Prevent double initialization
    if (initRef.current || sdkInitStarted) {
      console.log('[NativeApp] Init already started, skipping');
      return;
    }
    initRef.current = true;
    sdkInitStarted = true;

    const initializeApp = async () => {
      console.log('[NativeApp] === INITIALIZATION START ===');
      
      try {
        // ==========================================
        // STEP 1: Initialize SDK (loads token from storage)
        // ==========================================
        console.log('[NativeApp] Step 1: Initializing SDK...');
        const initResult = await SDK.init({
          supabaseUrl: SUPABASE_URL,
          supabaseAnonKey: SUPABASE_ANON_KEY,
          logLevel: 'debug',
        });
        
        if (!initResult.success) {
          throw new Error(initResult.error || 'SDK init failed');
        }
        
        setSdkInitialized(true);
        console.log('[NativeApp] ✅ SDK initialized');

        // ==========================================
        // STEP 2: Check if token was loaded from storage
        // ==========================================
        const hasToken = SDK.auth.isAuthenticated();
        setTokenLoaded(hasToken);
        console.log('[NativeApp] Step 2: Token loaded:', hasToken ? '✅ YES' : '❌ NO');

        // ==========================================
        // STEP 3: If authenticated, start session + realtime
        // ==========================================
        if (hasToken) {
          console.log('[NativeApp] Step 3: Starting session...');
          
          // Start session with retry (token should be ready now)
          const sessionResult = await SDK.sessions.start(3, 100);
          setSessionStarted(sessionResult.success);
          
          if (sessionResult.success) {
            console.log('[NativeApp] ✅ Session started:', sessionResult.session?.sessionId);
          } else {
            console.error('[NativeApp] ❌ Session failed:', sessionResult.error);
          }

          // Subscribe to realtime
          console.log('[NativeApp] Step 4: Subscribing to realtime...');
          const realtimeResult = await SDK.realtime.subscribe({
            onInterventionReceived: (intervention) => {
              console.log('[NativeApp] 📩 New intervention:', intervention.title);
            },
            onRiskStateChanged: (risk) => {
              console.log('[NativeApp] ⚠️ Risk updated:', risk.level, risk.score);
            },
            onConnectionChange: (status) => {
              console.log('[NativeApp] 🔌 Realtime status:', status);
              setRealtimeConnected(status === 'connected');
            },
          });
          
          setRealtimeConnected(realtimeResult);
          console.log('[NativeApp]', realtimeResult ? '✅ Realtime subscribed' : '❌ Realtime failed');
        }

        // ==========================================
        // STEP 4: Native-specific initialization
        // ==========================================
        if (Capacitor.isNativePlatform()) {
          console.log('[NativeApp] Step 5: Native platform setup...');
          
          try {
            await StatusBar.setStyle({ style: Style.Dark });
            await StatusBar.setBackgroundColor({ color: '#1a1a2e' });
            console.log('[NativeApp] ✅ StatusBar configured');
          } catch (e) {
            console.log('[NativeApp] ⏭️ StatusBar not available');
          }

          try {
            await SplashScreen.hide();
            console.log('[NativeApp] ✅ SplashScreen hidden');
          } catch (e) {
            console.log('[NativeApp] ⏭️ SplashScreen not available');
          }
        }

        console.log('[NativeApp] === INITIALIZATION COMPLETE ===');
        setIsReady(true);
        
      } catch (error) {
        console.error('[NativeApp] ❌ Initialization failed:', error);
        setIsReady(true); // Still show app
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      console.log('[NativeApp] Cleanup...');
      SDK.cleanup();
      sdkInitStarted = false;
    };
  }, []);

  const contextValue: NativeAppContextValue = {
    isNative,
    platform,
    isReady,
    sdkInitialized,
    tokenLoaded,
    sessionStarted,
    realtimeConnected,
  };

  // Show loading state with progress
  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-safe pb-safe">
        <div className="text-center px-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm mb-2">Initializing...</p>
          <div className="text-xs text-muted-foreground/60 space-y-1">
            <p>{sdkInitialized ? '✅' : '⏳'} SDK</p>
            <p>{tokenLoaded ? '✅' : '⏳'} Auth</p>
            <p>{sessionStarted ? '✅' : '⏳'} Session</p>
            <p>{realtimeConnected ? '✅' : '⏳'} Realtime</p>
          </div>
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