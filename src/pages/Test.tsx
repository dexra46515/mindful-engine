import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, Session } from "@supabase/supabase-js";

// Import SDK
import { 
  SDK, 
  TokenManager, 
  SessionManager,
  sendEvent,
  getInterventions,
  acknowledgeIntervention,
  dismissIntervention,
  getRiskState,
} from "@/sdk";
import type { Intervention, RiskState } from "@/sdk";

export default function Test() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sdkInitialized, setSdkInitialized] = useState(false);
  
  // SDK State
  const [sdkSession, setSdkSession] = useState<string | null>(null);
  const [riskState, setRiskState] = useState<RiskState | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [logs, setLogs] = useState<Array<{ time: string; type: string; message: string }>>([]);
  
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Add log entry
  const addLog = useCallback((type: string, message: string) => {
    setLogs(prev => [
      { time: new Date().toLocaleTimeString(), type, message },
      ...prev.slice(0, 49),
    ]);
  }, []);

  // Initialize SDK when authenticated
  useEffect(() => {
    const initSDK = async () => {
      if (!session?.access_token || !user?.id) return;

      addLog('init', 'Initializing SDK...');

      // Step 1: Initialize SDK
      const result = await SDK.init({
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        supabaseAnonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        logLevel: 'debug',
      });

      if (!result.success) {
        addLog('error', `SDK init failed: ${result.error}`);
        return;
      }

      // Set auth token
      await TokenManager.setToken(session.access_token, user.id);
      addLog('auth', `Token set for user: ${user.id.slice(0, 8)}...`);

      // Step 2: Subscribe to realtime
      await SDK.realtime.subscribe({
        onInterventionReceived: (intervention) => {
          addLog('realtime', `🔔 New intervention: ${intervention.title} (${intervention.type})`);
          setInterventions(prev => [intervention, ...prev]);
          toast({
            title: intervention.title,
            description: intervention.message,
          });
        },
        onRiskStateChanged: (newRiskState) => {
          addLog('realtime', `📊 Risk updated: ${newRiskState.level} (score: ${newRiskState.score})`);
          setRiskState(newRiskState);
        },
        onConnectionChange: (status) => {
          addLog('realtime', `Connection: ${status}`);
        },
      });

      addLog('realtime', 'Subscribed to interventions + risk_states');
      setSdkInitialized(true);

      // Load initial data
      const riskResult = await getRiskState();
      if (riskResult.success && riskResult.riskState) {
        setRiskState(riskResult.riskState);
        addLog('risk', `Current: ${riskResult.riskState.level} (${riskResult.riskState.score})`);
      }

      // Add small delay for orchestrator to finish
      const intResult = await getInterventions(100);
      if (intResult.success && intResult.interventions) {
        setInterventions(intResult.interventions);
        addLog('interventions', `Loaded ${intResult.interventions.length} pending`);
      }
    };

    if (session && user && !sdkInitialized) {
      initSDK();
    }
  }, [session, user, sdkInitialized, addLog, toast]);

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, sess) => {
        setSession(sess);
        setUser(sess?.user ?? null);
        setLoading(false);
        if (!sess?.user) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
      if (!sess?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Step 3: Start session
  const handleStartSession = async () => {
    setSending(true);
    addLog('session', 'Starting session...');
    
    const result = await SessionManager.start();
    
    if (result.success && result.session) {
      setSdkSession(result.session.sessionId);
      addLog('session', `✅ Session started: ${result.session.sessionId.slice(0, 8)}...`);
    } else {
      addLog('error', `Session start failed: ${result.error}`);
    }
    setSending(false);
  };

  const handleEndSession = async () => {
    setSending(true);
    addLog('session', 'Ending session...');
    
    const result = await SessionManager.end();
    
    if (result.success) {
      addLog('session', '✅ Session ended');
      setSdkSession(null);
    } else {
      addLog('error', `Session end failed: ${result.error}`);
    }
    setSending(false);
  };

  // Send events
  const handleSendEvent = async (type: Parameters<typeof sendEvent>[0], metadata: Record<string, unknown> = {}) => {
    setSending(true);
    addLog('event', `Sending: ${type}`);
    
    const result = await sendEvent(type, metadata);
    
    if (result.success) {
      addLog('event', `✅ ${type} → risk: ${result.orchestrator_result?.risk_level || 'unknown'}`);
      if (result.orchestrator_result?.intervention_triggered) {
        addLog('event', '🚨 Intervention triggered!');
      }
    } else {
      addLog('error', `Event failed: ${result.error}`);
    }
    setSending(false);
  };

  // Step 4: Intervention responses
  const handleAcknowledge = async (id: string) => {
    addLog('intervention', `Acknowledging: ${id.slice(0, 8)}...`);
    
    const result = await acknowledgeIntervention(id);
    
    if (result.success) {
      addLog('intervention', `✅ Acknowledged → status: ${result.newStatus}`);
      setInterventions(prev => prev.filter(i => i.id !== id));
    } else {
      addLog('error', `Acknowledge failed: ${result.error}`);
    }
  };

  const handleDismiss = async (id: string) => {
    addLog('intervention', `Dismissing: ${id.slice(0, 8)}...`);
    
    const result = await dismissIntervention(id);
    
    if (result.success) {
      addLog('intervention', `✅ Dismissed → status: ${result.newStatus}`);
      setInterventions(prev => prev.filter(i => i.id !== id));
    } else {
      addLog('error', `Dismiss failed: ${result.error}`);
    }
  };

  // Simulate high-risk behavior
  const handleSimulateHighRisk = async () => {
    addLog('test', '🧪 Simulating high-risk behavior...');
    await handleSendEvent('reopen');
    await handleSendEvent('reopen');
    await handleSendEvent('scroll', { velocity: 3000 });
    await handleSendEvent('scroll', { velocity: 3500 });
    addLog('test', '🧪 Simulation complete - checking for interventions...');
    
    // Wait for orchestrator then refresh interventions
    const intResult = await getInterventions(150);
    if (intResult.success && intResult.interventions) {
      setInterventions(intResult.interventions);
      addLog('interventions', `Found ${intResult.interventions.length} pending after simulation`);
    }
  };

  // Refresh risk state (manual trigger)
  const handleRefreshRisk = async () => {
    addLog('risk', 'Refreshing risk state...');
    const riskResult = await getRiskState();
    if (riskResult.success && riskResult.riskState) {
      setRiskState(riskResult.riskState);
      addLog('risk', `✅ ${riskResult.riskState.level} (${riskResult.riskState.score})`);
    }
  };

  const handleSignOut = async () => {
    await SDK.cleanup();
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">SDK Integration Test</h1>
            <p className="text-muted-foreground">
              {user?.email} | SDK: {sdkInitialized ? '✅ Ready' : '⏳ Initializing...'}
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Risk State */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    Risk State
                    {riskState && (
                      <Badge variant={
                        riskState.level === 'critical' ? 'destructive' :
                        riskState.level === 'high' ? 'destructive' :
                        riskState.level === 'medium' ? 'secondary' : 'outline'
                      }>
                        {riskState.level.toUpperCase()} ({riskState.score})
                      </Badge>
                    )}
                  </span>
                  <Button size="sm" variant="ghost" onClick={handleRefreshRisk}>
                    ↻ Refresh
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {riskState ? (
                  <div className="space-y-3">
                    {/* Visual risk bar */}
                    <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          riskState.level === 'critical' ? 'bg-red-500' :
                          riskState.level === 'high' ? 'bg-orange-500' :
                          riskState.level === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${riskState.score}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span>Session Duration</span>
                        <strong>{riskState.factors.sessionDuration}</strong>
                      </div>
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span>Reopen Frequency</span>
                        <strong>{riskState.factors.reopenFrequency}</strong>
                      </div>
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span>Late Night</span>
                        <strong>{riskState.factors.lateNight}</strong>
                      </div>
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span>Scroll Velocity</span>
                        <strong>{riskState.factors.scrollVelocity}</strong>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last evaluated: {riskState.lastEvaluatedAt ? new Date(riskState.lastEvaluatedAt).toLocaleTimeString() : 'N/A'}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No risk state yet</p>
                )}
              </CardContent>
            </Card>

            {/* Session Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Session Management</CardTitle>
                <CardDescription>
                  Session ID: {sdkSession ? sdkSession.slice(0, 12) + '...' : 'None'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button onClick={handleStartSession} disabled={sending || !!sdkSession}>
                  Start Session
                </Button>
                <Button onClick={handleEndSession} disabled={sending || !sdkSession} variant="outline">
                  End Session
                </Button>
              </CardContent>
            </Card>

            {/* Event Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Send Events</CardTitle>
                <CardDescription>Trigger behavioral events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleSendEvent('app_open')} disabled={sending}>
                    App Open
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleSendEvent('screen_view', { screenName: 'feed' })} disabled={sending}>
                    Screen View
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleSendEvent('reopen')} disabled={sending}>
                    Reopen
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleSendEvent('scroll', { velocity: 2500 })} disabled={sending}>
                    Fast Scroll
                  </Button>
                </div>
                <Button onClick={handleSimulateHighRisk} disabled={sending} variant="destructive" className="w-full">
                  🧪 Simulate High-Risk Behavior
                </Button>
              </CardContent>
            </Card>

            {/* Pending Interventions */}
            <Card>
              <CardHeader>
                <CardTitle>Step 4: Pending Interventions ({interventions.length})</CardTitle>
                <CardDescription>Respond to interventions</CardDescription>
              </CardHeader>
              <CardContent>
                {interventions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No pending interventions. Trigger high-risk behavior to generate one.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {interventions.map((intervention) => (
                      <div key={intervention.id} className="p-3 bg-muted rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{intervention.type}</Badge>
                          <span className="font-medium">{intervention.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{intervention.message}</p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleAcknowledge(intervention.id)}>
                            Acknowledge
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDismiss(intervention.id)}>
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Logs */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Step 2: Realtime Logs</CardTitle>
              <CardDescription>
                Live updates from SDK + realtime subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] overflow-y-auto space-y-1 font-mono text-xs">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Waiting for SDK initialization...
                  </p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={`p-1.5 rounded ${
                      log.type === 'error' ? 'bg-red-500/10 text-red-500' :
                      log.type === 'realtime' ? 'bg-green-500/10 text-green-600' :
                      log.type === 'intervention' ? 'bg-yellow-500/10 text-yellow-600' :
                      'bg-muted'
                    }`}>
                      <span className="text-muted-foreground">{log.time}</span>
                      {' '}
                      <Badge variant="outline" className="text-[10px] px-1 py-0">{log.type}</Badge>
                      {' '}
                      {log.message}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
