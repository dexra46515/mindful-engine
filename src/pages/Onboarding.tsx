/**
 * Onboarding Flow
 * Role selection and initial setup for new users
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Users, User, Shield, Heart } from 'lucide-react';

type OnboardingStep = 'role' | 'profile' | 'family' | 'complete';
type UserRole = 'parent' | 'youth';

export default function Onboarding() {
  const [step, setStep] = useState<OnboardingStep>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate('/auth');
        return;
      }
      setUserId(user.id);
      
      // Check if user already has a role
      checkExistingRole(user.id);
    });
  }, [navigate]);

  const checkExistingRole = async (uid: string) => {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', uid)
      .maybeSingle();

    if (roleData) {
      // User already onboarded, redirect based on role
      if (roleData.role === 'parent') {
        navigate('/parent');
      } else {
        navigate('/');
      }
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep('profile');
  };

  const handleProfileSubmit = async () => {
    if (!userId || !selectedRole) return;
    
    setLoading(true);
    
    try {
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          display_name: displayName || (selectedRole === 'parent' ? 'Parent' : 'Youth'),
        });

      if (profileError) throw profileError;

      // Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: selectedRole,
        });

      if (roleError && !roleError.message.includes('duplicate')) {
        throw roleError;
      }

      toast({
        title: 'Profile created!',
        description: `You're set up as a ${selectedRole}.`,
      });

      // Move to family setup
      if (selectedRole === 'parent') {
        // Generate and store invite code in database
        const code = generateFamilyCode();
        
        const { error: codeError } = await supabase
          .from('invite_codes')
          .insert({
            code: code,
            created_by: userId,
          });

        if (codeError) {
          console.error('Failed to create invite code:', codeError);
        }
        
        setGeneratedCode(code);
      }
      
      setStep('family');
      
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Setup failed',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const generateFamilyCode = () => {
    // Generate a 6-character alphanumeric code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleFamilyLink = async () => {
    if (!userId || !familyCode) return;
    
    setLoading(true);
    
    try {
      // Find the invite code in the database
      const { data: inviteCode, error: codeError } = await supabase
        .from('invite_codes')
        .select('id, created_by, used_by, expires_at')
        .eq('code', familyCode.toUpperCase())
        .maybeSingle();

      if (codeError || !inviteCode) {
        throw new Error('Invalid family code. Please check and try again.');
      }

      if (inviteCode.used_by) {
        throw new Error('This code has already been used.');
      }

      if (new Date(inviteCode.expires_at) < new Date()) {
        throw new Error('This code has expired. Ask your parent for a new one.');
      }

      const parentId = inviteCode.created_by;

      // Create family link
      const { error: linkError } = await supabase
        .from('family_links')
        .insert({
          parent_id: parentId,
          youth_id: userId,
          is_active: true,
        });

      if (linkError) throw linkError;

      // Mark code as used
      await supabase
        .from('invite_codes')
        .update({ used_by: userId, used_at: new Date().toISOString() })
        .eq('id', inviteCode.id);

      toast({
        title: 'Family connected!',
        description: 'You are now linked to your parent.',
      });

      setStep('complete');
      
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Link failed',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    if (selectedRole === 'parent') {
      navigate('/parent');
    } else {
      window.location.href = '/';
    }
  };

  const handleSkipFamily = () => {
    setStep('complete');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4 pt-safe pb-safe">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {['role', 'profile', 'family', 'complete'].map((s, i) => (
            <div
              key={s}
              className={`h-2 w-12 rounded-full transition-colors ${
                ['role', 'profile', 'family', 'complete'].indexOf(step) >= i
                  ? 'bg-primary'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Role Selection */}
        {step === 'role' && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Welcome to Mindful</CardTitle>
              <CardDescription>
                Let's set up your account. Are you a parent or youth?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <button
                onClick={() => handleRoleSelect('parent')}
                className="w-full p-6 rounded-xl border-2 border-muted hover:border-primary hover:bg-primary/5 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">I'm a Parent</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Monitor your child's digital wellbeing and receive alerts
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleRoleSelect('youth')}
                className="w-full p-6 rounded-xl border-2 border-muted hover:border-primary hover:bg-primary/5 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">I'm a Youth</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Get gentle nudges to help build healthy digital habits
                    </p>
                  </div>
                </div>
              </button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Profile Setup */}
        {step === 'profile' && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Create Your Profile</CardTitle>
              <CardDescription>
                What should we call you?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder={selectedRole === 'parent' ? 'Mom, Dad, Guardian...' : 'Your name or nickname'}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              
              <Button 
                onClick={handleProfileSubmit} 
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Setting up...' : 'Continue'}
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => setStep('role')}
                className="w-full"
              >
                Back
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Family Setup */}
        {step === 'family' && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>
                {selectedRole === 'parent' ? 'Invite Your Child' : 'Join Your Family'}
              </CardTitle>
              <CardDescription>
                {selectedRole === 'parent'
                  ? 'Share this code with your child to connect'
                  : 'Enter the code your parent gave you'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedRole === 'parent' ? (
                <>
                  <div className="bg-muted rounded-xl p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Your Family Code</p>
                    <p className="text-4xl font-mono font-bold tracking-widest text-primary">
                      {generatedCode}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Your child will enter this code in their app to connect with you.
                  </p>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="familyCode">Family Code</Label>
                  <Input
                    id="familyCode"
                    placeholder="Enter 6-letter code"
                    value={familyCode}
                    onChange={(e) => setFamilyCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="text-center text-2xl font-mono tracking-widest"
                  />
                </div>
              )}
              
              {selectedRole === 'parent' ? (
                <Button onClick={handleComplete} className="w-full">
                  Continue to Dashboard
                </Button>
              ) : (
                <Button 
                  onClick={handleFamilyLink} 
                  className="w-full"
                  disabled={loading || familyCode.length !== 6}
                >
                  {loading ? 'Connecting...' : 'Connect to Parent'}
                </Button>
              )}
              
              <Button
                variant="ghost"
                onClick={handleSkipFamily}
                className="w-full text-muted-foreground"
              >
                Skip for now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-green-100 dark:bg-green-900/30 w-fit">
                <Heart className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>You're All Set!</CardTitle>
              <CardDescription>
                {selectedRole === 'parent'
                  ? 'Your dashboard is ready. You can monitor your family\'s digital wellbeing.'
                  : 'Start using the app mindfully. We\'ll help you build healthy habits.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleComplete} className="w-full">
                {selectedRole === 'parent' ? 'Go to Dashboard' : 'Start Using App'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}