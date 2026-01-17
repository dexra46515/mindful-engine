/**
 * Admin Dashboard
 * Manage invite codes and alpha testers
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Plus, 
  Copy, 
  Ticket, 
  Users, 
  CheckCircle2,
  XCircle,
  Clock,
  Trash2
} from 'lucide-react';

interface InviteCode {
  id: string;
  code: string;
  created_at: string;
  expires_at: string;
  used_by: string | null;
  used_at: string | null;
}

interface AlphaUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { role, loading: roleLoading, isAdmin, userId } = useUserRole();
  
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [users, setUsers] = useState<AlphaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [codePrefix, setCodePrefix] = useState('ALPHA');
  const [expiryDays, setExpiryDays] = useState(30);
  const [codeCount, setCodeCount] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // Fetch invite codes
    const { data: codesData } = await supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (codesData) setCodes(codesData);

    // Fetch users with roles
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id, role, created_at')
      .order('created_at', { ascending: false });

    if (rolesData) {
      // Get profiles for display names
      const userIds = rolesData.map(r => r.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const usersWithInfo = rolesData.map(r => ({
        id: r.user_id,
        email: profilesData?.find(p => p.user_id === r.user_id)?.display_name || 'Unknown',
        role: r.role,
        created_at: r.created_at,
      }));
      
      setUsers(usersWithInfo);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error('Access denied. Admin only.');
      navigate('/');
      return;
    }
    
    if (isAdmin) {
      fetchData();
    }
  }, [roleLoading, isAdmin, navigate, fetchData]);

  const generateCodes = async () => {
    if (!userId) return;
    
    setGenerating(true);
    
    const newCodes = [];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    for (let i = 0; i < codeCount; i++) {
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      newCodes.push({
        code: `${codePrefix}${randomPart}`,
        created_by: userId,
        expires_at: expiresAt.toISOString(),
      });
    }

    const { error } = await supabase
      .from('invite_codes')
      .insert(newCodes);

    if (error) {
      toast.error('Failed to generate codes');
    } else {
      toast.success(`Generated ${codeCount} invite code(s)`);
      fetchData();
    }

    setGenerating(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  const deleteCode = async (id: string) => {
    const { error } = await supabase
      .from('invite_codes')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete code');
    } else {
      toast.success('Code deleted');
      fetchData();
    }
  };

  const getCodeStatus = (code: InviteCode) => {
    if (code.used_by) return 'used';
    if (new Date(code.expires_at) < new Date()) return 'expired';
    return 'active';
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background p-4 pt-safe">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const activeCodesCount = codes.filter(c => getCodeStatus(c) === 'active').length;
  const usedCodesCount = codes.filter(c => getCodeStatus(c) === 'used').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pt-safe pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b">
        <div className="flex items-center gap-3 px-4 py-3 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground">Manage alpha testers</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <Ticket className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{activeCodesCount}</p>
              <p className="text-xs text-muted-foreground">Active Codes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{usedCodesCount}</p>
              <p className="text-xs text-muted-foreground">Codes Used</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </CardContent>
          </Card>
        </div>

        {/* Generate Codes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Generate Invite Codes
            </CardTitle>
            <CardDescription>
              Create new alpha testing invite codes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prefix">Code Prefix</Label>
                <Input
                  id="prefix"
                  value={codePrefix}
                  onChange={(e) => setCodePrefix(e.target.value.toUpperCase())}
                  placeholder="ALPHA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry">Expires in (days)</Label>
                <Input
                  id="expiry"
                  type="number"
                  min={1}
                  max={365}
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(parseInt(e.target.value) || 30)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="count">Number of codes</Label>
                <Input
                  id="count"
                  type="number"
                  min={1}
                  max={50}
                  value={codeCount}
                  onChange={(e) => setCodeCount(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            <Button onClick={generateCodes} disabled={generating} className="w-full">
              {generating ? 'Generating...' : `Generate ${codeCount} Code(s)`}
            </Button>
          </CardContent>
        </Card>

        {/* Invite Codes List */}
        <Card>
          <CardHeader>
            <CardTitle>Invite Codes</CardTitle>
            <CardDescription>
              {codes.length} total codes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : codes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No invite codes yet. Generate some above!
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {codes.map(code => {
                  const status = getCodeStatus(code);
                  return (
                    <div 
                      key={code.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <code className="font-mono text-sm font-medium">{code.code}</code>
                        <Badge 
                          variant={status === 'active' ? 'default' : 'secondary'}
                          className={
                            status === 'used' ? 'bg-green-500/20 text-green-700' :
                            status === 'expired' ? 'bg-red-500/20 text-red-700' : ''
                          }
                        >
                          {status === 'active' && <Clock className="h-3 w-3 mr-1" />}
                          {status === 'used' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {status === 'expired' && <XCircle className="h-3 w-3 mr-1" />}
                          {status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Expires: {new Date(code.expires_at).toLocaleDateString()}
                        </span>
                        {status === 'active' && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => copyCode(code.code)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        {!code.used_by && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteCode(code.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alpha Users */}
        <Card>
          <CardHeader>
            <CardTitle>Alpha Users</CardTitle>
            <CardDescription>
              Users who have signed up
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No users yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {users.map(user => (
                  <div 
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {user.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
