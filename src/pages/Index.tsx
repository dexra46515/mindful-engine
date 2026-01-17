/**
 * Youth/Adult App Experience
 * Main app view with risk indicator, session timer, and usage stats
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useRiskState } from '@/hooks/useRiskState';
import { useCurrentSession } from '@/hooks/useCurrentSession';
import { RiskRing } from '@/components/RiskRing';
import { SessionTimer } from '@/components/SessionTimer';
import { UsageStats } from '@/components/UsageStats';
import { PullToRefresh } from '@/components/PullToRefresh';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LogOut, Settings, RefreshCw, Sparkles, BarChart3 } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();
  const { role, loading: roleLoading, userId, hasRole } = useUserRole();
  const { riskState, loading: riskLoading, refetch: refetchRisk } = useRiskState(userId);
  const { session, loading: sessionLoading, refetch: refetchSession } = useCurrentSession(userId);
  const [greeting, setGreeting] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Determine greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Fetch display name
  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', userId)
        .maybeSingle();

      if (data?.display_name) {
        setDisplayName(data.display_name);
      }
    };

    fetchProfile();
  }, [userId]);

  // Redirect logic
  useEffect(() => {
    if (roleLoading) return;

    // If not logged in, go to auth
    if (!userId) {
      navigate('/auth');
      return;
    }

    // If no role yet, go to onboarding
    if (!hasRole) {
      navigate('/onboarding');
      return;
    }

    // If parent, go to parent dashboard
    if (role === 'parent') {
      navigate('/parent');
      return;
    }
  }, [roleLoading, userId, hasRole, role, navigate]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchRisk(), refetchSession()]);
  }, [refetchRisk, refetchSession]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // Loading state
  if (roleLoading || !userId || !hasRole) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
        <div className="space-y-4 w-full max-w-xs px-4">
          <Skeleton className="h-48 w-48 rounded-full mx-auto" />
          <Skeleton className="h-8 w-32 mx-auto" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  const isLoading = riskLoading || sessionLoading;

  return (
    <PullToRefresh onRefresh={handleRefresh} className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pt-safe pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm text-muted-foreground">{greeting}</p>
            <h1 className="text-lg font-semibold">
              {displayName || 'Welcome back'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 space-y-6">
        {/* Risk Ring - Hero Section */}
        <section className="flex flex-col items-center py-8">
          {riskLoading ? (
            <Skeleton className="h-[200px] w-[200px] rounded-full" />
          ) : riskState ? (
            <RiskRing 
              score={riskState.score} 
              level={riskState.level}
              size={200}
            />
          ) : (
            <RiskRing score={0} level="low" size={200} />
          )}

          {/* Session Timer */}
          <div className="mt-6">
            {sessionLoading ? (
              <Skeleton className="h-6 w-32" />
            ) : (
              <SessionTimer startedAt={session?.startedAt || null} />
            )}
          </div>

          {/* Mindfulness prompt based on risk level */}
          {riskState && riskState.level !== 'low' && (
            <Card className="mt-6 w-full max-w-sm border-none bg-primary/5">
              <CardContent className="pt-4 pb-4 text-center">
                <Sparkles className="h-5 w-5 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">
                  {riskState.level === 'medium' && "You've been scrolling for a while. Take a moment to breathe."}
                  {riskState.level === 'high' && "Your usage is elevated. Consider taking a short break."}
                  {riskState.level === 'critical' && "It's time to step away. Your wellbeing matters."}
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Usage Stats Grid */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Today's Activity
            </h2>
          </div>
          
          {riskLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : riskState ? (
            <UsageStats factors={riskState.factors} />
          ) : (
            <UsageStats factors={{ sessionDuration: 0, reopenFrequency: 0, lateNight: 0, scrollVelocity: 0 }} />
          )}
        </section>

        {/* Session Info */}
        {session && (
          <section>
            <Card className="bg-muted/50 border-none">
              <CardContent className="py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">App reopens this session</span>
                  <span className="font-medium">{session.reopenCount}</span>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Quick Actions */}
        <section className="pb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Quick Actions
            </h2>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-1"
              onClick={() => navigate('/insights')}
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-xs">Insights</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-1"
              onClick={() => navigate('/settings')}
            >
              <Settings className="h-5 w-5" />
              <span className="text-xs">Settings</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-1"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-5 w-5" />
              <span className="text-xs">Refresh</span>
            </Button>
          </div>
        </section>
      </main>
    </PullToRefresh>
  );
}
