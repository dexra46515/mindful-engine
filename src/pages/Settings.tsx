/**
 * Settings Page
 * Profile editing, notification preferences, and theme options
 */

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  User, 
  Bell, 
  Palette, 
  Save, 
  Moon, 
  Sun, 
  Monitor,
  Smartphone,
  Mail,
  AlertTriangle,
  TrendingUp,
  Clock,
  FileText,
  Shield,
  ExternalLink
} from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

interface NotificationPrefs {
  emailAlerts: boolean;
  riskWarnings: boolean;
  dailySummary: boolean;
  weeklyInsights: boolean;
  interventionAlerts: boolean;
}

export default function Settings() {
  const navigate = useNavigate();
  const { userId, loading: roleLoading, role } = useUserRole();
  
  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [email, setEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Theme state
  const [theme, setTheme] = useState<Theme>('system');
  
  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    emailAlerts: true,
    riskWarnings: true,
    dailySummary: false,
    weeklyInsights: true,
    interventionAlerts: true,
  });

  // Fetch profile and preferences
  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setProfileLoading(true);
      
      try {
        // Fetch user email
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) setEmail(user.email);
        
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, timezone')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (profile) {
          setDisplayName(profile.display_name || '');
          setTimezone(profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
        }
        
        // Load theme from localStorage
        const savedTheme = localStorage.getItem('theme') as Theme | null;
        if (savedTheme) {
          setTheme(savedTheme);
        }
        
        // Load notification prefs from localStorage (would be from DB in production)
        const savedNotifs = localStorage.getItem('notificationPrefs');
        if (savedNotifs) {
          setNotifPrefs(JSON.parse(savedNotifs));
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', systemDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleSaveProfile = async () => {
    if (!userId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          display_name: displayName,
          timezone: timezone,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('Profile saved successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleNotifChange = (key: keyof NotificationPrefs, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    localStorage.setItem('notificationPrefs', JSON.stringify(updated));
    toast.success('Notification preference updated');
  };

  // Common timezones
  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Anchorage',
    'Pacific/Honolulu',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Singapore',
    'Australia/Sydney',
    'Pacific/Auckland',
  ];

  if (roleLoading || !userId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-4 pt-safe">
        <div className="space-y-4 max-w-lg mx-auto">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pt-safe pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 max-w-lg mx-auto">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Theme</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal details and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profileLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        placeholder="Enter your name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed here
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger id="timezone">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          {timezones.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {tz.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Smartphone className="h-4 w-4" />
                        <span>Role: <span className="capitalize font-medium text-foreground">{role}</span></span>
                      </div>
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={handleSaveProfile}
                      disabled={saving}
                    >
                      {saving ? (
                        <>Saving...</>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Profile
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Control how and when you receive alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Email Alerts</p>
                      <p className="text-xs text-muted-foreground">Receive alerts via email</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifPrefs.emailAlerts}
                    onCheckedChange={(v) => handleNotifChange('emailAlerts', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Risk Warnings</p>
                      <p className="text-xs text-muted-foreground">Alert when risk level is high</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifPrefs.riskWarnings}
                    onCheckedChange={(v) => handleNotifChange('riskWarnings', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent">
                      <Clock className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Daily Summary</p>
                      <p className="text-xs text-muted-foreground">Get a daily usage report</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifPrefs.dailySummary}
                    onCheckedChange={(v) => handleNotifChange('dailySummary', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary">
                      <TrendingUp className="h-4 w-4 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Weekly Insights</p>
                      <p className="text-xs text-muted-foreground">Weekly progress and trends</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifPrefs.weeklyInsights}
                    onCheckedChange={(v) => handleNotifChange('weeklyInsights', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Intervention Alerts</p>
                      <p className="text-xs text-muted-foreground">Notify on new interventions</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifPrefs.interventionAlerts}
                    onCheckedChange={(v) => handleNotifChange('interventionAlerts', v)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Appearance
                </CardTitle>
                <CardDescription>
                  Customize the look and feel of the app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Theme</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      className="h-auto py-4 flex flex-col gap-2"
                      onClick={() => setTheme('light')}
                    >
                      <Sun className="h-5 w-5" />
                      <span className="text-xs">Light</span>
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      className="h-auto py-4 flex flex-col gap-2"
                      onClick={() => setTheme('dark')}
                    >
                      <Moon className="h-5 w-5" />
                      <span className="text-xs">Dark</span>
                    </Button>
                    <Button
                      variant={theme === 'system' ? 'default' : 'outline'}
                      className="h-auto py-4 flex flex-col gap-2"
                      onClick={() => setTheme('system')}
                    >
                      <Monitor className="h-5 w-5" />
                      <span className="text-xs">System</span>
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="rounded-lg p-4 bg-muted/50">
                    <p className="text-sm text-muted-foreground text-center">
                      {theme === 'light' && 'Using light theme for better visibility in bright environments'}
                      {theme === 'dark' && 'Using dark theme to reduce eye strain in low light'}
                      {theme === 'system' && 'Theme will match your device settings automatically'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-primary-foreground font-medium">
                        {displayName?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{displayName || 'Your Name'}</p>
                      <p className="text-sm text-muted-foreground">{role}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 h-8 rounded bg-primary" />
                    <div className="flex-1 h-8 rounded bg-secondary" />
                    <div className="flex-1 h-8 rounded bg-muted" />
                    <div className="flex-1 h-8 rounded bg-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Legal & Info Section */}
        <div className="mt-8 pt-6 border-t">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Legal & Information</h3>
          <div className="grid grid-cols-1 gap-2">
            <Link to="/privacy">
              <Button variant="ghost" className="w-full justify-start h-auto py-3">
                <FileText className="h-4 w-4 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-sm">Privacy Policy</p>
                  <p className="text-xs text-muted-foreground">How we handle your data</p>
                </div>
                <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
              </Button>
            </Link>
            <Link to="/terms">
              <Button variant="ghost" className="w-full justify-start h-auto py-3">
                <FileText className="h-4 w-4 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-sm">Terms of Service</p>
                  <p className="text-xs text-muted-foreground">Usage agreement</p>
                </div>
                <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
              </Button>
            </Link>
            <Link to="/demo">
              <Button variant="ghost" className="w-full justify-start h-auto py-3">
                <Shield className="h-4 w-4 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-sm">Parental Control Demo</p>
                  <p className="text-xs text-muted-foreground">Interactive consent flow walkthrough</p>
                </div>
                <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
              </Button>
            </Link>
          </div>
        </div>

        {/* App Info */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>Mindful Balance Engine v1.0.0</p>
          <p className="mt-1">© {new Date().getFullYear()} All rights reserved</p>
        </div>
      </main>
    </div>
  );
}
