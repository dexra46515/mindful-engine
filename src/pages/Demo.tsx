/**
 * Apple Review Demo Page
 * Interactive walkthrough of the parental consent flow
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Users, 
  Clock, 
  Bell, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Smartphone,
  Key,
  Settings,
  Eye,
  AlertTriangle,
  Lock,
  Unlock,
  Heart
} from 'lucide-react';

const TOTAL_STEPS = 8;

interface DemoStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: DemoStep[] = [
  { id: 1, title: 'Parent Account', description: 'Parent creates account', icon: <Users className="h-5 w-5" /> },
  { id: 2, title: 'Generate Code', description: 'Create invite code', icon: <Key className="h-5 w-5" /> },
  { id: 3, title: 'Child Links', description: 'Child enters code', icon: <Smartphone className="h-5 w-5" /> },
  { id: 4, title: 'iOS Authorization', description: 'System permission', icon: <Shield className="h-5 w-5" /> },
  { id: 5, title: 'Set Policies', description: 'Configure limits', icon: <Settings className="h-5 w-5" /> },
  { id: 6, title: 'Monitoring', description: 'Real-time tracking', icon: <Eye className="h-5 w-5" /> },
  { id: 7, title: 'Interventions', description: 'Graduated response', icon: <AlertTriangle className="h-5 w-5" /> },
  { id: 8, title: 'Complete', description: 'Flow summary', icon: <CheckCircle2 className="h-5 w-5" /> },
];

export default function Demo() {
  const [currentStep, setCurrentStep] = useState(1);
  const [parentEmail, setParentEmail] = useState('parent@example.com');
  const [childName, setChildName] = useState('Emma');
  const [inviteCode] = useState('MBE-2025-DEMO');
  const [dailyLimit, setDailyLimit] = useState([120]);
  const [bedtimeEnabled, setBedtimeEnabled] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [usageMinutes, setUsageMinutes] = useState(105);
  const [interventionLevel, setInterventionLevel] = useState<'none' | 'soft' | 'medium' | 'hard'>('none');

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));
  const goToStep = (step: number) => setCurrentStep(step);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <ParentAccountStep email={parentEmail} setEmail={setParentEmail} onNext={nextStep} />;
      case 2:
        return <GenerateCodeStep inviteCode={inviteCode} onNext={nextStep} />;
      case 3:
        return <ChildLinkStep inviteCode={inviteCode} childName={childName} setChildName={setChildName} onNext={nextStep} />;
      case 4:
        return <AuthorizationStep authorized={authorized} setAuthorized={setAuthorized} onNext={nextStep} />;
      case 5:
        return <PolicyStep dailyLimit={dailyLimit} setDailyLimit={setDailyLimit} bedtimeEnabled={bedtimeEnabled} setBedtimeEnabled={setBedtimeEnabled} childName={childName} onNext={nextStep} />;
      case 6:
        return <MonitoringStep usageMinutes={usageMinutes} setUsageMinutes={setUsageMinutes} dailyLimit={dailyLimit[0]} childName={childName} onNext={nextStep} />;
      case 7:
        return <InterventionStep level={interventionLevel} setLevel={setInterventionLevel} onNext={nextStep} />;
      case 8:
        return <CompleteStep onRestart={() => setCurrentStep(1)} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-4">
            <Shield className="h-3 w-3 mr-1" />
            Apple Review Demo
          </Badge>
          <h1 className="text-3xl font-bold mb-2">Parental Consent Flow</h1>
          <p className="text-muted-foreground">
            Interactive demonstration of the Family Controls authorization process
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-muted-foreground">Step {currentStep} of {TOTAL_STEPS}</span>
            <span className="text-sm text-muted-foreground">{Math.round((currentStep / TOTAL_STEPS) * 100)}%</span>
          </div>
          <Progress value={(currentStep / TOTAL_STEPS) * 100} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between mb-8 overflow-x-auto pb-2">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => goToStep(step.id)}
              className={`flex flex-col items-center min-w-[80px] p-2 rounded-lg transition-all ${
                step.id === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : step.id < currentStep
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step.icon}
              <span className="text-xs mt-1 hidden md:block">{step.title}</span>
            </button>
          ))}
        </div>

        {/* Step Content */}
        <Card className="mb-8">
          <CardContent className="p-6">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button
            onClick={nextStep}
            disabled={currentStep === TOTAL_STEPS}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>This demo simulates the parental consent flow for Apple's Family Controls entitlement review.</p>
          <p className="mt-1">All data shown is for demonstration purposes only.</p>
        </div>
      </div>
    </div>
  );
}

// Step 1: Parent Account Creation
function ParentAccountStep({ email, setEmail, onNext }: { email: string; setEmail: (v: string) => void; onNext: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-full bg-primary/10">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Step 1: Parent Account Creation</h2>
          <p className="text-muted-foreground">Parent creates an account and selects their role</p>
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-6 max-w-md mx-auto">
        <h3 className="font-medium mb-4 text-center">Create Account</h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value="••••••••" readOnly />
          </div>

          <div>
            <Label>I am a:</Label>
            <RadioGroup defaultValue="parent" className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="parent" id="parent" checked />
                <Label htmlFor="parent" className="font-normal">Parent / Guardian</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="youth" id="youth" />
                <Label htmlFor="youth" className="font-normal">Youth (under 18)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="adult" id="adult" />
                <Label htmlFor="adult" className="font-normal">Adult (self-tracking)</Label>
              </div>
            </RadioGroup>
          </div>

          <Button className="w-full" onClick={onNext}>
            Create Account
          </Button>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-sm">
        <p className="font-medium text-blue-700 dark:text-blue-300">🔒 Key Point:</p>
        <p className="text-blue-600 dark:text-blue-400">Role selection determines permissions. Only parents can create monitoring policies.</p>
      </div>
    </div>
  );
}

// Step 2: Generate Invite Code
function GenerateCodeStep({ inviteCode, onNext }: { inviteCode: string; onNext: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-full bg-primary/10">
          <Key className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Step 2: Generate Invite Code</h2>
          <p className="text-muted-foreground">Parent generates a unique code to share with their child</p>
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-6 max-w-md mx-auto text-center">
        <h3 className="font-medium mb-4">Link Your Child's Device</h3>
        
        <div className="bg-background border-2 border-dashed border-primary/50 rounded-lg p-6 mb-4">
          <p className="text-sm text-muted-foreground mb-2">Your invite code:</p>
          <p className="text-3xl font-mono font-bold tracking-wider text-primary">{inviteCode}</p>
        </div>

        <Button variant="outline" className="mb-4" onClick={copyCode}>
          {copied ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Copied!
            </>
          ) : (
            'Copy Code'
          )}
        </Button>

        <p className="text-sm text-muted-foreground">
          Share this code with your child to link their device
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-sm">
        <p className="font-medium text-blue-700 dark:text-blue-300">🔒 Key Point:</p>
        <p className="text-blue-600 dark:text-blue-400">Codes are single-use and expire after 24 hours. This prevents unauthorized linking.</p>
      </div>
    </div>
  );
}

// Step 3: Child Links Device
function ChildLinkStep({ inviteCode, childName, setChildName, onNext }: { inviteCode: string; childName: string; setChildName: (v: string) => void; onNext: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-full bg-primary/10">
          <Smartphone className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Step 3: Child Enters Code</h2>
          <p className="text-muted-foreground">Child links their device with clear consent notice</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-muted/50 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="h-4 w-4" />
            <span className="text-sm font-medium">Child's Device</span>
          </div>

          <h3 className="font-medium mb-4 text-center">Join Family</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="childName">Your Name</Label>
              <Input id="childName" value={childName} onChange={(e) => setChildName(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="code">Enter code from parent:</Label>
              <Input id="code" value={inviteCode} readOnly className="font-mono text-center" />
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Notice:</strong> By continuing, you agree to parental monitoring of your device usage.
              </p>
            </div>

            <Button className="w-full" onClick={onNext}>
              Link to Family
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-pulse">
              <ArrowRight className="h-12 w-12 text-primary mx-auto mb-4" />
            </div>
            <p className="text-sm text-muted-foreground">Child enters the code shared by parent</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-sm">
        <p className="font-medium text-blue-700 dark:text-blue-300">🔒 Key Point:</p>
        <p className="text-blue-600 dark:text-blue-400">Clear consent notice is displayed before linking. Child must actively agree to monitoring.</p>
      </div>
    </div>
  );
}

// Step 4: iOS Authorization
function AuthorizationStep({ authorized, setAuthorized, onNext }: { authorized: boolean; setAuthorized: (v: boolean) => void; onNext: () => void }) {
  const handleAuthorize = () => {
    setAuthorized(true);
    setTimeout(onNext, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-full bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Step 4: iOS Authorization</h2>
          <p className="text-muted-foreground">System prompts for FamilyControls permission</p>
        </div>
      </div>

      <div className="max-w-sm mx-auto">
        {!authorized ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">"Mindful Balance Engine" would like to access Screen Time</h3>
            </div>

            <p className="text-sm text-muted-foreground text-center mb-6">
              This will allow the app to monitor and manage app usage on this device.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="rounded-xl">
                Don't Allow
              </Button>
              <Button className="rounded-xl" onClick={handleAuthorize}>
                Allow
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 dark:bg-green-950/30 rounded-2xl p-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="font-semibold text-lg text-green-700 dark:text-green-300">Authorization Granted</h3>
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">Screen Time access enabled</p>
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-sm">
        <p className="font-medium text-blue-700 dark:text-blue-300">🔒 Key Point:</p>
        <p className="text-blue-600 dark:text-blue-400">This is the standard iOS FamilyControls authorization prompt. The user must explicitly allow access.</p>
      </div>
    </div>
  );
}

// Step 5: Policy Configuration
function PolicyStep({ dailyLimit, setDailyLimit, bedtimeEnabled, setBedtimeEnabled, childName, onNext }: { dailyLimit: number[]; setDailyLimit: (v: number[]) => void; bedtimeEnabled: boolean; setBedtimeEnabled: (v: boolean) => void; childName: string; onNext: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-full bg-primary/10">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Step 5: Configure Policies</h2>
          <p className="text-muted-foreground">Parent sets limits and schedules</p>
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-6 max-w-md mx-auto">
        <h3 className="font-medium mb-6 text-center">Set Limits for {childName}</h3>
        
        <div className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <Label>Daily Screen Time Limit</Label>
              <span className="font-medium">{Math.floor(dailyLimit[0] / 60)}h {dailyLimit[0] % 60}m</span>
            </div>
            <Slider
              value={dailyLimit}
              onValueChange={setDailyLimit}
              max={480}
              min={30}
              step={15}
              className="mb-2"
            />
            <p className="text-xs text-muted-foreground">Recommended: 1-2 hours for children</p>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Bedtime Schedule</Label>
                <p className="text-sm text-muted-foreground">9:00 PM - 7:00 AM</p>
              </div>
              <Switch checked={bedtimeEnabled} onCheckedChange={setBedtimeEnabled} />
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="mb-3 block">Apps to Monitor</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="social" defaultChecked className="rounded" />
                <label htmlFor="social" className="text-sm">Social Media</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="games" defaultChecked className="rounded" />
                <label htmlFor="games" className="text-sm">Games</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="entertainment" className="rounded" />
                <label htmlFor="entertainment" className="text-sm">Entertainment</label>
              </div>
            </div>
          </div>

          <Button className="w-full" onClick={onNext}>
            Save Policies
          </Button>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-sm">
        <p className="font-medium text-blue-700 dark:text-blue-300">🔒 Key Point:</p>
        <p className="text-blue-600 dark:text-blue-400">Only parents can set policies. Children can view but not modify these settings.</p>
      </div>
    </div>
  );
}

// Step 6: Monitoring
function MonitoringStep({ usageMinutes, setUsageMinutes, dailyLimit, childName, onNext }: { usageMinutes: number; setUsageMinutes: (v: number) => void; dailyLimit: number; childName: string; onNext: () => void }) {
  const usagePercent = Math.round((usageMinutes / dailyLimit) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-full bg-primary/10">
          <Eye className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Step 6: Real-Time Monitoring</h2>
          <p className="text-muted-foreground">Both parent and child can see usage</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Child's View */}
        <div className="bg-muted/50 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="h-4 w-4" />
            <span className="text-sm font-medium">{childName}'s View</span>
          </div>

          <div className="text-center mb-4">
            <div className="text-4xl font-bold">{Math.floor(usageMinutes / 60)}h {usageMinutes % 60}m</div>
            <p className="text-sm text-muted-foreground">used today</p>
          </div>

          <Progress value={usagePercent} className="h-3 mb-2" />
          <p className="text-sm text-center text-muted-foreground">
            {dailyLimit - usageMinutes} minutes remaining
          </p>

          <div className="mt-4 p-3 bg-background rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Currently using</p>
            <p className="font-medium">Social Media</p>
          </div>
        </div>

        {/* Parent's View */}
        <div className="bg-muted/50 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">Parent's Dashboard</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium">{childName}'s Activity</span>
                <Badge variant={usagePercent > 80 ? "destructive" : "secondary"}>
                  {usagePercent}%
                </Badge>
              </div>
              <Progress value={usagePercent} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {Math.floor(usageMinutes / 60)}h {usageMinutes % 60}m / {Math.floor(dailyLimit / 60)}h {dailyLimit % 60}m
              </p>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current App:</span>
              <span>Social Media</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Risk Level:</span>
              <Badge variant={usagePercent > 80 ? "destructive" : usagePercent > 60 ? "secondary" : "outline"}>
                {usagePercent > 80 ? 'High' : usagePercent > 60 ? 'Medium' : 'Low'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setUsageMinutes(Math.max(0, usageMinutes - 15))}>
          -15 min
        </Button>
        <Button variant="outline" size="sm" onClick={() => setUsageMinutes(Math.min(dailyLimit + 30, usageMinutes + 15))}>
          +15 min
        </Button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-sm">
        <p className="font-medium text-blue-700 dark:text-blue-300">🔒 Key Point:</p>
        <p className="text-blue-600 dark:text-blue-400">Transparency: Both parent and child see the same usage data. No hidden surveillance.</p>
      </div>
    </div>
  );
}

// Step 7: Interventions
function InterventionStep({ level, setLevel, onNext }: { level: string; setLevel: (v: 'none' | 'soft' | 'medium' | 'hard') => void; onNext: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-full bg-primary/10">
          <AlertTriangle className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Step 7: Graduated Interventions</h2>
          <p className="text-muted-foreground">Progressive response as limits are reached</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Soft Nudge */}
        <Card 
          className={`cursor-pointer transition-all ${level === 'soft' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setLevel('soft')}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-base">Soft Nudge</CardTitle>
            </div>
            <CardDescription>At 80% of limit</CardDescription>
          </CardHeader>
          <CardContent>
            {level === 'soft' ? (
              <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3 text-sm">
                <p className="font-medium">⏰ Time Check</p>
                <p className="text-muted-foreground">You've used 1h 45m. 15 minutes remaining.</p>
                <Button size="sm" className="mt-2 w-full">Got it</Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Dismissible notification</p>
            )}
          </CardContent>
        </Card>

        {/* Medium Friction */}
        <Card 
          className={`cursor-pointer transition-all ${level === 'medium' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setLevel('medium')}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-base">Medium Friction</CardTitle>
            </div>
            <CardDescription>At 100% of limit</CardDescription>
          </CardHeader>
          <CardContent>
            {level === 'medium' ? (
              <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3 text-sm">
                <p className="font-medium">⚠️ Limit Reached</p>
                <p className="text-muted-foreground">Take a break?</p>
                <p className="text-xs mt-2">Wait 3 seconds to continue...</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Modal with countdown</p>
            )}
          </CardContent>
        </Card>

        {/* Hard Block */}
        <Card 
          className={`cursor-pointer transition-all ${level === 'hard' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setLevel('hard')}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-500" />
              <CardTitle className="text-base">Hard Block</CardTitle>
            </div>
            <CardDescription>Continued overuse</CardDescription>
          </CardHeader>
          <CardContent>
            {level === 'hard' ? (
              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-sm">
                <p className="font-medium">🛡️ App Shielded</p>
                <p className="text-muted-foreground">Screen time limit reached</p>
                <Button size="sm" variant="outline" className="mt-2 w-full">Request More Time</Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Full app shielding</p>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-sm text-muted-foreground">Click each card to preview the intervention</p>

      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-sm">
        <p className="font-medium text-blue-700 dark:text-blue-300">🔒 Key Point:</p>
        <p className="text-blue-600 dark:text-blue-400">Graduated response prevents frustration. Hard blocks use iOS ManagedSettings for real enforcement.</p>
      </div>
    </div>
  );
}

// Step 8: Complete
function CompleteStep({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center mb-4">
        <div className="p-4 rounded-full bg-green-100 dark:bg-green-950/50">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
      </div>

      <h2 className="text-2xl font-bold">Demo Complete</h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        You've seen the complete parental consent and monitoring flow for Mindful Balance Engine.
      </p>

      <div className="grid md:grid-cols-2 gap-4 max-w-lg mx-auto mt-8">
        <Card>
          <CardContent className="pt-6">
            <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
            <h3 className="font-medium">Explicit Consent</h3>
            <p className="text-sm text-muted-foreground">iOS FamilyControls authorization required</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Eye className="h-8 w-8 text-primary mx-auto mb-2" />
            <h3 className="font-medium">Full Transparency</h3>
            <p className="text-sm text-muted-foreground">Child always knows monitoring is active</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Users className="h-8 w-8 text-primary mx-auto mb-2" />
            <h3 className="font-medium">Family-First Design</h3>
            <p className="text-sm text-muted-foreground">Built for parents, not surveillance</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Heart className="h-8 w-8 text-primary mx-auto mb-2" />
            <h3 className="font-medium">Wellbeing Focus</h3>
            <p className="text-sm text-muted-foreground">Promoting healthy digital habits</p>
          </CardContent>
        </Card>
      </div>

      {/* Test Accounts for Apple Review */}
      <div className="mt-8 p-6 bg-muted/50 rounded-lg max-w-lg mx-auto">
        <h3 className="font-semibold mb-4 text-center">Test Accounts for Apple Review</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between p-2 bg-background rounded">
            <span className="text-muted-foreground">Parent Account:</span>
            <span className="font-mono">parent-test@example.com</span>
          </div>
          <div className="flex justify-between p-2 bg-background rounded">
            <span className="text-muted-foreground">Youth Account:</span>
            <span className="font-mono">youth-test@example.com</span>
          </div>
          <div className="flex justify-between p-2 bg-background rounded">
            <span className="text-muted-foreground">Test Password:</span>
            <span className="font-mono">TestDemo2025!</span>
          </div>
          <div className="flex justify-between p-2 bg-background rounded">
            <span className="text-muted-foreground">Invite Code:</span>
            <span className="font-mono">TEST-2025-DEMO</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          The parent account has pre-linked the youth account for testing.
        </p>
      </div>

      <Button onClick={onRestart} className="mt-8">
        Restart Demo
      </Button>
    </div>
  );
}
