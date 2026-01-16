/**
 * Mobile App Entry Point
 * Main screen for the native mobile app
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
  const { isNative, platform, sdkInitialized } = useNativeApp();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [riskState, setRiskState] = useState<RiskState | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [sessionActive, setSessionActive] = useState(false);

  // Check auth and start session
  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = SDK.auth.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated && sdkInitialized) {
        // Start session
        const result = await SDK.sessions.start();
        setSessionActive(result.success);

        // Load initial state (with delay for orchestrator)
        setTimeout(refreshState, 150);
      }
    };

    if (sdkInitialized) {
      checkAuth();
    }
  }, [sdkInitialized]);

  // Subscribe to realtime updates
  // Subscribe to realtime updates
  useEffect(() => {
    if (!isAuthenticated || !sdkInitialized) return;

    const userId = SDK.auth.getUserId();
    if (!userId) return;

    SDK.realtime.subscribe({
      onInterventionReceived: (intervention) => {
        console.log('[MobileApp] New intervention:', intervention);
        setInterventions((prev) => [intervention, ...prev]);
      },
      onRiskStateChanged: (risk) => {
        console.log('[MobileApp] Risk updated:', risk);
        setRiskState(risk);
      },
    });

    return () => {
      SDK.realtime.unsubscribe();
    };
  }, [isAuthenticated, sdkInitialized]);

  const refreshState = async () => {
    const [riskResult, interventionsResult] = await Promise.all([
      SDK.risk.getState(),
      SDK.interventions.get(100), // Small delay for orchestrator
    ]);

    if (riskResult.success && riskResult.riskState) {
      setRiskState(riskResult.riskState);
    }

    if (interventionsResult.success && interventionsResult.interventions) {
      setInterventions(interventionsResult.interventions);
    }
  };

  const handleScroll = async () => {
    const velocity = Math.random() * 2000 + 500;
    await SDK.events.trackScroll(velocity, 'mobile_home');
    setTimeout(refreshState, 200);
  };

  const handleAcknowledge = async (id: string) => {
    await SDK.interventions.acknowledge(id);
    setInterventions((prev) => prev.filter((i) => i.id !== id));
  };

  const handleDismiss = async (id: string) => {
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
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-center">Welcome</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Please sign in to continue
            </p>
            <Button onClick={() => window.location.href = '/auth'}>
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
              {isNative ? `${platform} Native` : 'Web'} • {sessionActive ? 'Active' : 'Inactive'}
            </p>
          </div>
          {riskState && (
            <Badge className={getRiskColor(riskState.level)}>
              {riskState.level.toUpperCase()}
            </Badge>
          )}
        </div>
      </header>

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
              📜 Simulate Scroll
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => SDK.events.trackScreenView('settings')}
            >
              📱 Track Screen View
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={refreshState}
            >
              🔄 Refresh State
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Bottom Safe Area */}
      <div className="h-safe-bottom" />
    </div>
  );
}
