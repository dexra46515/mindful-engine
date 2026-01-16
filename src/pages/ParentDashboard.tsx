/**
 * Parent Dashboard
 * Monitor linked children's behavioral patterns with real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, Shield, Clock, Activity, Bell, LogOut, RefreshCw, 
  AlertTriangle, CheckCircle, XCircle, Eye, Settings, Copy, Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ChildData {
  id: string;
  displayName: string;
  riskLevel: string;
  riskScore: number;
  lastActive: string;
  sessionCount: number;
  interventionCount: number;
  factors: {
    sessionDuration: number;
    reopenFrequency: number;
    lateNight: number;
    scrollVelocity: number;
  };
}

interface InterventionHistory {
  id: string;
  youthName: string;
  type: string;
  status: string;
  title: string;
  createdAt: string;
  riskLevel: string;
}

interface PolicySettings {
  id: string;
  name: string;
  parentAlertThreshold: string;
  escalationEnabled: boolean;
  dailyLimitMinutes: number | null;
  bedtimeStart: string | null;
  bedtimeEnd: string | null;
}

export default function ParentDashboard() {
  const [children, setChildren] = useState<ChildData[]>([]);
  const [interventions, setInterventions] = useState<InterventionHistory[]>([]);
  const [policies, setPolicies] = useState<PolicySettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyCode, setFamilyCode] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [parentName, setParentName] = useState('Parent');
  const [activeTab, setActiveTab] = useState('overview');
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadChildrenData = useCallback(async (parentIdParam: string) => {
    try {
      // Get linked children
      const { data: links } = await supabase
        .from('family_links')
        .select('youth_id')
        .eq('parent_id', parentIdParam)
        .eq('is_active', true);

      if (!links || links.length === 0) {
        setChildren([]);
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
          .select('*')
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
          factors: {
            sessionDuration: riskState?.session_duration_factor || 0,
            reopenFrequency: riskState?.reopen_frequency_factor || 0,
            lateNight: riskState?.late_night_factor || 0,
            scrollVelocity: riskState?.scroll_velocity_factor || 0,
          },
        });
      }

      setChildren(childrenData);
    } catch (error) {
      console.error('Failed to load children data:', error);
    }
  }, []);

  const loadInterventionHistory = useCallback(async (parentIdParam: string) => {
    try {
      // Get linked youth IDs first
      const { data: links } = await supabase
        .from('family_links')
        .select('youth_id')
        .eq('parent_id', parentIdParam)
        .eq('is_active', true);

      if (!links || links.length === 0) {
        setInterventions([]);
        return;
      }

      const youthIds = links.map(l => l.youth_id);

      // Get interventions for all linked youth
      const { data: interventionData } = await supabase
        .from('interventions')
        .select('*, profiles!interventions_user_id_fkey(display_name)')
        .in('user_id', youthIds)
        .order('created_at', { ascending: false })
        .limit(20);

      if (interventionData) {
        // Need to fetch profiles separately due to RLS
        const interventionsWithNames: InterventionHistory[] = [];
        
        for (const int of interventionData) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', int.user_id)
            .maybeSingle();

          interventionsWithNames.push({
            id: int.id,
            youthName: profile?.display_name || 'Child',
            type: int.type,
            status: int.status,
            title: int.title,
            createdAt: int.created_at,
            riskLevel: int.risk_level_at_trigger,
          });
        }

        setInterventions(interventionsWithNames);
      }
    } catch (error) {
      console.error('Failed to load intervention history:', error);
    }
  }, []);

  const loadPolicies = useCallback(async (parentIdParam: string) => {
    try {
      const { data } = await supabase
        .from('policies')
        .select('*')
        .eq('owner_id', parentIdParam);

      if (data) {
        setPolicies(data.map(p => ({
          id: p.id,
          name: p.name,
          parentAlertThreshold: p.parent_alert_threshold || 'high',
          escalationEnabled: p.escalation_enabled || false,
          dailyLimitMinutes: p.daily_limit_minutes,
          bedtimeStart: p.bedtime_start,
          bedtimeEnd: p.bedtime_end,
        })));
      }
    } catch (error) {
      console.error('Failed to load policies:', error);
    }
  }, []);

  const checkAuthAndLoad = useCallback(async () => {
    setLoading(true);
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

    setParentId(user.id);

    // Load parent profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile?.display_name) {
      setParentName(profile.display_name);
    }

    // Get family code from database
    const { data: inviteCode } = await supabase
      .from('invite_codes')
      .select('code')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inviteCode?.code) {
      setFamilyCode(inviteCode.code);
    }

    await Promise.all([
      loadChildrenData(user.id),
      loadInterventionHistory(user.id),
      loadPolicies(user.id),
    ]);

    setLoading(false);
  }, [navigate, loadChildrenData, loadInterventionHistory, loadPolicies]);

  useEffect(() => {
    checkAuthAndLoad();
  }, [checkAuthAndLoad]);

  // Real-time subscriptions for children's risk states
  useEffect(() => {
    if (!parentId || children.length === 0) return;

    const youthIds = children.map(c => c.id);
    
    // Subscribe to risk state changes
    const riskChannel = supabase
      .channel('parent-risk-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'risk_states',
        },
        (payload) => {
          const data = payload.new as any;
          if (data && youthIds.includes(data.user_id)) {
            // Update the specific child's risk data
            setChildren(prev => prev.map(child => {
              if (child.id === data.user_id) {
                return {
                  ...child,
                  riskLevel: data.current_level || 'low',
                  riskScore: data.score || 0,
                  lastActive: data.updated_at || child.lastActive,
                  factors: {
                    sessionDuration: data.session_duration_factor || 0,
                    reopenFrequency: data.reopen_frequency_factor || 0,
                    lateNight: data.late_night_factor || 0,
                    scrollVelocity: data.scroll_velocity_factor || 0,
                  },
                };
              }
              return child;
            }));
          }
        }
      )
      .subscribe();

    // Subscribe to new interventions
    const interventionChannel = supabase
      .channel('parent-intervention-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'interventions',
        },
        async (payload) => {
          const data = payload.new as any;
          if (data && youthIds.includes(data.user_id)) {
            // Fetch youth name
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('user_id', data.user_id)
              .maybeSingle();

            const newIntervention: InterventionHistory = {
              id: data.id,
              youthName: profile?.display_name || 'Child',
              type: data.type,
              status: data.status,
              title: data.title,
              createdAt: data.created_at,
              riskLevel: data.risk_level_at_trigger,
            };

            setInterventions(prev => [newIntervention, ...prev.slice(0, 19)]);

            // Show toast for high-risk interventions
            if (data.risk_level_at_trigger === 'high' || data.risk_level_at_trigger === 'critical') {
              toast({
                title: `Alert: ${profile?.display_name || 'Your child'}`,
                description: data.title,
                variant: 'destructive',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(riskChannel);
      supabase.removeChannel(interventionChannel);
    };
  }, [parentId, children, toast]);

  const generateNewCode = async () => {
    if (!parentId) return;

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const { error } = await supabase
      .from('invite_codes')
      .insert({
        code,
        created_by: parentId,
      });

    if (!error) {
      setFamilyCode(code);
      toast({ title: 'New code generated!', description: code });
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

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'acknowledged':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'dismissed':
        return <XCircle className="h-4 w-4 text-orange-500" />;
      case 'escalated':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading family data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 pt-safe sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Family Dashboard</h1>
            <p className="text-sm opacity-80">Welcome, {parentName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={checkAuthAndLoad}
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
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">
              <Eye className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="history">
              <Bell className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Family Code Card */}
            <Card className="border-dashed">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Your Family Code</p>
                      {familyCode ? (
                        <p className="font-mono font-bold text-lg tracking-widest">{familyCode}</p>
                      ) : (
                        <p className="text-muted-foreground">No code generated</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {familyCode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(familyCode);
                          toast({ title: 'Code copied!' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateNewCode}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Children Cards */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Your Children
                {children.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{children.length}</Badge>
                )}
              </h2>

              {children.length === 0 ? (
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
                  <Card key={child.id} className={cn('border-2 transition-all', getRiskBgColor(child.riskLevel))}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-lg font-semibold text-primary">
                              {child.displayName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <CardTitle className="text-lg">{child.displayName}</CardTitle>
                            <CardDescription>
                              Last active: {formatLastActive(child.lastActive)}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className={cn('text-sm', getRiskColor(child.riskLevel))}>
                          {child.riskLevel.toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Risk Score Bar */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Risk Score</span>
                          <span className="font-semibold">{Math.round(child.riskScore)}/100</span>
                        </div>
                        <Progress value={child.riskScore} className="h-2" />
                      </div>

                      {/* Factors Grid */}
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-background/50 rounded-lg p-2">
                          <div className="text-lg font-bold">{Math.round(child.factors.sessionDuration)}</div>
                          <div className="text-xs text-muted-foreground">Session</div>
                        </div>
                        <div className="bg-background/50 rounded-lg p-2">
                          <div className="text-lg font-bold">{Math.round(child.factors.reopenFrequency)}</div>
                          <div className="text-xs text-muted-foreground">Reopens</div>
                        </div>
                        <div className="bg-background/50 rounded-lg p-2">
                          <div className="text-lg font-bold">{Math.round(child.factors.scrollVelocity)}</div>
                          <div className="text-xs text-muted-foreground">Scroll</div>
                        </div>
                        <div className="bg-background/50 rounded-lg p-2">
                          <div className="text-lg font-bold">{Math.round(child.factors.lateNight)}</div>
                          <div className="text-xs text-muted-foreground">Late</div>
                        </div>
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
                          <Activity className="h-5 w-5 text-orange-500 shrink-0" />
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
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4 mt-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Intervention History
            </h2>

            {interventions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No Interventions Yet</h3>
                  <p className="text-muted-foreground text-sm">
                    Interventions will appear here when they are triggered.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {interventions.map((int) => (
                  <Card key={int.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {getStatusIcon(int.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{int.youthName}</span>
                            <Badge variant="outline" className="text-xs">
                              {int.type.replace('_', ' ')}
                            </Badge>
                            <Badge className={cn('text-xs', getRiskColor(int.riskLevel))}>
                              {int.riskLevel}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{int.title}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatTime(int.createdAt)} • {int.status}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6 mt-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Alert Settings
            </h2>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notification Preferences</CardTitle>
                <CardDescription>
                  Configure when you receive alerts about your children
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">High Risk Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when risk level reaches high
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Escalation Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Alert when interventions are escalated
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Daily Summary</p>
                    <p className="text-sm text-muted-foreground">
                      Receive a daily digest of activity
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
