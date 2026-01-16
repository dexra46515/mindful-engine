/**
 * Hook to get the current user's role
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'parent' | 'youth' | 'admin' | null;

interface UseUserRoleReturn {
  role: UserRole;
  loading: boolean;
  userId: string | null;
  isParent: boolean;
  isYouth: boolean;
  isAdmin: boolean;
  hasRole: boolean;
  refetch: () => Promise<void>;
}

export function useUserRole(): UseUserRoleReturn {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchRole = async () => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setRole(null);
        setUserId(null);
        return;
      }

      setUserId(user.id);

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleData) {
        setRole(roleData.role as UserRole);
      } else {
        setRole(null);
      }
    } catch (error) {
      console.error('Failed to fetch user role:', error);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRole();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    role,
    loading,
    userId,
    isParent: role === 'parent',
    isYouth: role === 'youth',
    isAdmin: role === 'admin',
    hasRole: role !== null,
    refetch: fetchRole,
  };
}