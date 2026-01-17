import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Ticket, CheckCircle2 } from "lucide-react";
import SDK from "@/sdk";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [codeValidated, setCodeValidated] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateInviteCode = async () => {
    if (!inviteCode.trim()) {
      toast({
        variant: "destructive",
        title: "Invite code required",
        description: "Please enter your alpha invite code",
      });
      return;
    }

    setValidatingCode(true);

    const { data, error } = await supabase
      .from('invite_codes')
      .select('id, code, expires_at, used_by')
      .eq('code', inviteCode.trim().toUpperCase())
      .maybeSingle();

    if (error || !data) {
      toast({
        variant: "destructive",
        title: "Invalid code",
        description: "This invite code doesn't exist",
      });
      setValidatingCode(false);
      return;
    }

    // Check if already used
    if (data.used_by) {
      toast({
        variant: "destructive",
        title: "Code already used",
        description: "This invite code has already been redeemed",
      });
      setValidatingCode(false);
      return;
    }

    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      toast({
        variant: "destructive",
        title: "Code expired",
        description: "This invite code has expired",
      });
      setValidatingCode(false);
      return;
    }

    setCodeValidated(true);
    setValidatingCode(false);
    toast({
      title: "Code validated!",
      description: "You can now create your account",
    });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!codeValidated) {
      toast({
        variant: "destructive",
        title: "Validate code first",
        description: "Please validate your invite code before signing up",
      });
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: error.message,
      });
      setLoading(false);
      return;
    }
    
    if (data.session && data.user) {
      // Mark invite code as used
      await supabase
        .from('invite_codes')
        .update({ 
          used_by: data.user.id, 
          used_at: new Date().toISOString() 
        })
        .eq('code', inviteCode.trim().toUpperCase());

      // Save token to SDK's TokenManager
      await SDK.auth.setToken(data.session.access_token, data.user.id);
      
      toast({
        title: "Account created!",
        description: "Let's set up your profile...",
      });
      
      // Redirect to onboarding for new users
      navigate('/onboarding');
    }

    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: error.message,
      });
    } else if (data.session && data.user) {
      // Save token to SDK's TokenManager
      await SDK.auth.setToken(data.session.access_token, data.user.id);
      
      // Check if user has completed onboarding (has a role)
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (!roleData) {
        // New user, needs onboarding
        navigate('/onboarding');
      } else if (roleData.role === 'parent') {
        // Parent user
        navigate('/parent');
      } else {
        // Youth user - reload to reinitialize SDK
        window.location.href = '/';
      }
      
      toast({
        title: "Welcome back!",
        description: "Redirecting...",
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Mindful Engine</CardTitle>
          <CardDescription>
            Alpha Testing Program
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                {/* Invite Code Section */}
                <div className="space-y-2">
                  <Label htmlFor="invite-code" className="flex items-center gap-2">
                    <Ticket className="h-4 w-4" />
                    Invite Code
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="invite-code"
                      type="text"
                      placeholder="Enter invite code"
                      value={inviteCode}
                      onChange={(e) => {
                        setInviteCode(e.target.value.toUpperCase());
                        setCodeValidated(false);
                      }}
                      disabled={codeValidated}
                      className={codeValidated ? "bg-muted border-green-500" : ""}
                      required
                    />
                    {codeValidated ? (
                      <div className="flex items-center px-3 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    ) : (
                      <Button 
                        type="button" 
                        variant="secondary"
                        onClick={validateInviteCode}
                        disabled={validatingCode || !inviteCode.trim()}
                      >
                        {validatingCode ? "..." : "Verify"}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Alpha access requires a valid invite code
                  </p>
                </div>

                {codeValidated && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creating account..." : "Create Account"}
                    </Button>
                  </>
                )}
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
