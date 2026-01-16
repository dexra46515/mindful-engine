/**
 * Mobile App Entry Point
 * Main screen for the native mobile app with validation status
 */

import React, { useState, useEffect } from 'react';
import { useNativeApp } from '@/components/NativeAppProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import SDK from '@/sdk';
import type { RiskState } from '@/sdk/risk/getRiskState';
import type { Intervention } from '@/sdk/interventions/interventionTypes';

export default function MobileApp() {
  const { isNative, platform, sdkInitialized, tokenLoaded, sessionStarted, realtimeConnected } = useNativeApp();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [riskState, setRiskState] = useState<RiskState | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [eventLog, setEventLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setEventLog(prev => [`[${time}] ${msg}`, ...prev.slice(0, 19)]);
  };

  // Check auth on mount AND when SDK initializes
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = SDK.auth.isAuthenticated();
      setIsAuthenticated(authenticated);
      addLog(`Auth check: ${authenticated ? '✅ authenticated' : '❌ not authenticated'}`);
      return authenticated;
    };

    // Check immediately
    const authenticated = checkAuth();

    // If authenticated and SDK ready, load data
    if (authenticated && sdkInitialized) {
      setTimeout(async () => {
        const [riskResult, interventionsResult] = await Promise.all([
          SDK.risk.getState(),
          SDK.interventions.get(100),
        ]);

        if (riskResult.success && riskResult.riskState) {
          setRiskState(riskResult.riskState);
          addLog(`Risk loaded: ${riskResult.riskState.level} (${riskResult.riskState.score})`);
        }

        if (interventionsResult.success && interventionsResult.interventions) {
          setInterventions(interventionsResult.interventions);
          addLog(`Interventions loaded: ${interventionsResult.interventions.length}`);
        }
      }, 200);
    }

    // Re-check auth every second for 5 seconds (handles async token save)
    let checks = 0;
    const interval = setInterval(() => {
      checks++;
      const nowAuth = checkAuth();
      if (nowAuth || checks >= 5) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sdkInitialized]);

  // Subscribe to realtime updates (handled by NativeAppProvider, but we add local handlers)
  useEffect(() => {
    if (!isAuthenticated || !sdkInitialized || !realtimeConnected) return;

    // The NativeAppProvider already subscribes, but we can add additional handlers here
    addLog('📡 Realtime connected');

    return () => {
      addLog('🔌 Realtime cleanup');
    };
  }, [isAuthenticated, sdkInitialized, realtimeConnected]);

  const refreshState = async () => {
    addLog('🔄 Refreshing state...');
    const [riskResult, interventionsResult] = await Promise.all([
      SDK.risk.getState(),
      SDK.interventions.get(100),
    ]);

    if (riskResult.success && riskResult.riskState) {
      setRiskState(riskResult.riskState);
      addLog(`Risk: ${riskResult.riskState.level} (${riskResult.riskState.score})`);
    }

    if (interventionsResult.success && interventionsResult.interventions) {
      setInterventions(interventionsResult.interventions);
      addLog(`Interventions: ${interventionsResult.interventions.length}`);
    }
  };

  const handleScroll = async () => {
    const velocity = Math.floor(Math.random() * 2000 + 500);
    addLog(`📜 Scroll event: velocity=${velocity}`);
    await SDK.events.trackScroll(velocity, 'mobile_home');
    setTimeout(refreshState, 200);
  };

  const handleReopen = async () => {
    addLog('🔄 Simulating reopen...');
    await SDK.events.trackReopen();
    setTimeout(refreshState, 200);
  };

  const handleAcknowledge = async (id: string) => {
    addLog(`✅ Acknowledging: ${id.substring(0, 8)}...`);
    await SDK.interventions.acknowledge(id);
    setInterventions((prev) => prev.filter((i) => i.id !== id));
  };

  const handleDismiss = async (id: string) => {
    addLog(`❌ Dismissing: ${id.substring(0, 8)}...`);
    await SDK.interventions.dismiss(id);
    setInterventions((prev) => prev.filter((i) => i.id !== id));
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center pt-safe pb-safe">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-center">Welcome</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Please sign in to continue
            </p>
            
            {/* Validation Status */}
            <div className="text-xs text-left bg-muted rounded-lg p-3 space-y-1">
              <p className="font-medium mb-2">Initialization Status:</p>
              <p>{sdkInitialized ? '✅' : '⏳'} SDK Initialized</p>
              <p>{tokenLoaded ? '✅' : '❌'} Token Loaded</p>
              <p>{sessionStarted ? '✅' : '⏳'} Session Started</p>
              <p>{realtimeConnected ? '✅' : '⏳'} Realtime Connected</p>
              <p className="mt-2 text-muted-foreground">
                Platform: {isNative ? platform : 'web'}
              </p>
            </div>

            <Button onClick={() => window.location.href = '/auth'} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Status Bar Spacer */}
      <div className="h-safe-top bg-primary" />

      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Behavioral Engine</h1>
            <p className="text-xs opacity-80">
              {isNative ? `${platform} Native` : 'Web'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {realtimeConnected && (
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            )}
            {riskState && (
              <Badge className={getRiskColor(riskState.level)}>
                {riskState.level.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Validation Status Bar */}
      <div className="bg-muted/50 px-4 py-2 flex items-center justify-between text-xs border-b">
        <div className="flex items-center gap-3">
          <span className={sdkInitialized ? 'text-green-600' : 'text-muted-foreground'}>
            SDK {sdkInitialized ? '✓' : '○'}
          </span>
          <span className={tokenLoaded ? 'text-green-600' : 'text-muted-foreground'}>
            Auth {tokenLoaded ? '✓' : '○'}
          </span>
          <span className={sessionStarted ? 'text-green-600' : 'text-muted-foreground'}>
            Session {sessionStarted ? '✓' : '○'}
          </span>
          <span className={realtimeConnected ? 'text-green-600' : 'text-muted-foreground'}>
            Realtime {realtimeConnected ? '✓' : '○'}
          </span>
        </div>
        <Button size="sm" variant="ghost" onClick={refreshState} className="h-6 px-2">
          ↻
        </Button>
      </div>

      {/* Main Content */}
      <main className="p-4 space-y-4 pb-20">
        {/* Risk State Card */}
        {riskState && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                Risk Score
                <span className="text-2xl font-bold">{riskState.score}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={riskState.score} className="h-2 mb-3" />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted rounded p-2">
                  <div className="text-muted-foreground">Session</div>
                  <div className="font-medium">{riskState.factors?.sessionDuration || 0}</div>
                </div>
                <div className="bg-muted rounded p-2">
                  <div className="text-muted-foreground">Reopens</div>
                  <div className="font-medium">{riskState.factors?.reopenFrequency || 0}</div>
                </div>
                <div className="bg-muted rounded p-2">
                  <div className="text-muted-foreground">Scroll</div>
                  <div className="font-medium">{riskState.factors?.scrollVelocity || 0}</div>
                </div>
                <div className="bg-muted rounded p-2">
                  <div className="text-muted-foreground">Late Night</div>
                  <div className="font-medium">{riskState.factors?.lateNight || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Interventions */}
        {interventions.length > 0 && (
          <Card className="border-orange-500/50 bg-orange-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Active Interventions ({interventions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {interventions.slice(0, 3).map((intervention) => (
                <div key={intervention.id} className="bg-background rounded-lg p-3 border">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <Badge variant="outline" className="text-xs mb-1">
                        {intervention.type.replace('_', ' ')}
                      </Badge>
                      <h4 className="font-medium text-sm">{intervention.title}</h4>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {intervention.message}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleAcknowledge(intervention.id)}
                    >
                      Take Action
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleDismiss(intervention.id)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Test Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Test Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={handleScroll}
            >
              📜 Simulate Scroll (500-2500 velocity)
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={handleReopen}
            >
              🔄 Simulate Reopen
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                SDK.events.trackScreenView('settings');
                addLog('📱 Screen view: settings');
              }}
            >
              📱 Track Screen View
            </Button>
          </CardContent>
        </Card>

        {/* Event Log */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              Event Log
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setEventLog([])}
                className="h-6 px-2 text-xs"
              >
                Clear
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-2 h-40 overflow-y-auto text-xs font-mono space-y-1">
              {eventLog.length === 0 ? (
                <p className="text-muted-foreground">No events yet...</p>
              ) : (
                eventLog.map((log, i) => (
                  <p key={i} className="text-muted-foreground">{log}</p>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Bottom Safe Area */}
      <div className="h-safe-bottom" />
    </div>
  );
}
