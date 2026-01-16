/**
 * Parent Dashboard
 * Monitor linked children's behavioral patterns (not content)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Shield, Clock, Activity, Bell, Settings, LogOut, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChildData {
  id: string;
  displayName: string;
  riskLevel: string;
  riskScore: number;
  lastActive: string;
  sessionCount: number;
  interventionCount: number;
}

export default function ParentDashboard() {
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyCode, setFamilyCode] = useState('');
  const [parentName, setParentName] = useState('Parent');
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/auth');
      return;
    }

    // Check if user is a parent
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'parent')
      .maybeSingle();

    if (!roleData) {
      navigate('/onboarding');
      return;
    }

    // Load parent profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile?.display_name) {
      setParentName(profile.display_name);
    }

    // Get family code from localStorage
    const storedCode = localStorage.getItem(`family_code_${user.id}`);
    if (storedCode) {
      setFamilyCode(storedCode);
    }

    await loadChildrenData(user.id);
  };

  const loadChildrenData = async (parentId: string) => {
    setLoading(true);

    try {
      // Get linked children
      const { data: links } = await supabase
        .from('family_links')
        .select('youth_id')
        .eq('parent_id', parentId)
        .eq('is_active', true);

      if (!links || links.length === 0) {
        setChildren([]);
        setLoading(false);
        return;
      }

      const childrenData: ChildData[] = [];

      for (const link of links) {
        // Get child profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', link.youth_id)
          .maybeSingle();

        // Get child risk state
        const { data: riskState } = await supabase
          .from('risk_states')
          .select('current_level, score, updated_at')
          .eq('user_id', link.youth_id)
          .maybeSingle();

        // Get session count (today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { count: sessionCount } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', link.youth_id)
          .gte('started_at', today.toISOString());

        // Get intervention count (today)
        const { count: interventionCount } = await supabase
          .from('interventions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', link.youth_id)
          .gte('created_at', today.toISOString());

        childrenData.push({
          id: link.youth_id,
          displayName: profile?.display_name || 'Child',
          riskLevel: riskState?.current_level || 'low',
          riskScore: riskState?.score || 0,
          lastActive: riskState?.updated_at || 'Never',
          sessionCount: sessionCount || 0,
          interventionCount: interventionCount || 0,
        });
      }

      setChildren(childrenData);
    } catch (error) {
      console.error('Failed to load children data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      default: return 'bg-green-500 text-white';
    }
  };

  const getRiskBgColor = (level: string) => {
    switch (level) {
      case 'critical': return 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30';
      case 'high': return 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30';
      case 'medium': return 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30';
      default: return 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30';
    }
  };

  const formatLastActive = (timestamp: string) => {
    if (timestamp === 'Never') return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 pt-safe">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Family Dashboard</h1>
            <p className="text-sm opacity-80">Welcome, {parentName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => checkAuthAndLoad()}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSignOut}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6 pb-safe">
        {/* Family Code Card */}
        {familyCode && (
          <Card className="border-dashed">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Your Family Code</p>
                    <p className="font-mono font-bold text-lg tracking-widest">{familyCode}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(familyCode);
                    toast({ title: 'Code copied!' });
                  }}
                >
                  Copy
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Children Cards */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Your Children
          </h2>

          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading family data...</p>
              </CardContent>
            </Card>
          ) : children.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No Children Linked Yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Share your family code with your child to get started.
                </p>
                {familyCode && (
                  <div className="bg-muted rounded-lg p-4 inline-block">
                    <p className="text-2xl font-mono font-bold tracking-widest">{familyCode}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            children.map((child) => (
              <Card key={child.id} className={`border-2 ${getRiskBgColor(child.riskLevel)}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{child.displayName}</CardTitle>
                    <Badge className={getRiskColor(child.riskLevel)}>
                      {child.riskLevel.toUpperCase()}
                    </Badge>
                  </div>
                  <CardDescription>
                    Last active: {formatLastActive(child.lastActive)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Risk Score Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Risk Score</span>
                      <span className="font-semibold">{child.riskScore}/100</span>
                    </div>
                    <Progress value={child.riskScore} className="h-2" />
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-background rounded-lg p-3 border">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Clock className="h-4 w-4" />
                        Sessions Today
                      </div>
                      <p className="text-2xl font-bold">{child.sessionCount}</p>
                    </div>
                    <div className="bg-background rounded-lg p-3 border">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Bell className="h-4 w-4" />
                        Nudges Today
                      </div>
                      <p className="text-2xl font-bold">{child.interventionCount}</p>
                    </div>
                  </div>

                  {/* Alert for high risk */}
                  {(child.riskLevel === 'high' || child.riskLevel === 'critical') && (
                    <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-orange-300">
                      <Activity className="h-5 w-5 text-orange-500" />
                      <p className="text-sm">
                        {child.displayName} may need a break. Consider checking in.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Privacy Notice */}
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Privacy First</p>
                <p className="text-xs text-muted-foreground">
                  You only see behavioral patterns, never content. We believe in building trust 
                  through transparency, not surveillance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}