/**
 * Intervention Provider
 * Manages displaying interventions based on pending items from the database
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { SoftNudge } from './SoftNudge';
import { MediumFriction } from './MediumFriction';
import { HardBlock } from './HardBlock';

interface Intervention {
  id: string;
  type: 'soft_nudge' | 'medium_friction' | 'hard_block' | 'parent_alert';
  status: string;
  title: string;
  message: string;
  riskLevelAtTrigger: string;
  createdAt: string;
}

interface InterventionContextType {
  activeIntervention: Intervention | null;
  pendingCount: number;
  refetch: () => Promise<void>;
}

const InterventionContext = createContext<InterventionContextType>({
  activeIntervention: null,
  pendingCount: 0,
  refetch: async () => {},
});

export function useInterventions() {
  return useContext(InterventionContext);
}

interface InterventionProviderProps {
  children: ReactNode;
}

export function InterventionProvider({ children }: InterventionProviderProps) {
  const { userId, isYouth, isParent } = useUserRole();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [activeIntervention, setActiveIntervention] = useState<Intervention | null>(null);

  const fetchInterventions = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('interventions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'delivered'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch interventions:', error);
        return;
      }

      const mapped: Intervention[] = (data || []).map(row => ({
        id: row.id,
        type: row.type,
        status: row.status,
        title: row.title,
        message: row.message,
        riskLevelAtTrigger: row.risk_level_at_trigger,
        createdAt: row.created_at,
      }));

      setInterventions(mapped);

      // Show the highest priority intervention (hard_block > medium_friction > soft_nudge)
      const priority = ['hard_block', 'medium_friction', 'soft_nudge'];
      const sorted = [...mapped].sort((a, b) => {
        return priority.indexOf(a.type) - priority.indexOf(b.type);
      });

      if (sorted.length > 0 && !activeIntervention) {
        setActiveIntervention(sorted[0]);
      }
    } catch (err) {
      console.error('Intervention fetch error:', err);
    }
  }, [userId, activeIntervention]);

  // Initial fetch
  useEffect(() => {
    if (userId && !isParent) {
      fetchInterventions();
    }
  }, [userId, isParent, fetchInterventions]);

  // Subscribe to new interventions
  useEffect(() => {
    if (!userId || isParent) return;

    const channel = supabase
      .channel(`interventions-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'interventions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Intervention] New intervention:', payload.new);
          const newIntervention: Intervention = {
            id: (payload.new as any).id,
            type: (payload.new as any).type,
            status: (payload.new as any).status,
            title: (payload.new as any).title,
            message: (payload.new as any).message,
            riskLevelAtTrigger: (payload.new as any).risk_level_at_trigger,
            createdAt: (payload.new as any).created_at,
          };

          setInterventions(prev => [newIntervention, ...prev]);

          // Show immediately if no active intervention or if higher priority
          if (!activeIntervention) {
            setActiveIntervention(newIntervention);
          } else {
            const priority = ['hard_block', 'medium_friction', 'soft_nudge'];
            const newPriority = priority.indexOf(newIntervention.type);
            const currentPriority = priority.indexOf(activeIntervention.type);
            
            if (newPriority < currentPriority) {
              setActiveIntervention(newIntervention);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isParent, activeIntervention]);

  const handleAcknowledge = async (id: string) => {
    try {
      const { error } = await supabase
        .from('interventions')
        .update({ 
          status: 'acknowledged', 
          acknowledged_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) {
        console.error('Failed to acknowledge:', error);
      }
    } catch (err) {
      console.error('Acknowledge error:', err);
    }

    // Remove from list and show next
    setInterventions(prev => prev.filter(i => i.id !== id));
    setActiveIntervention(null);
    
    // Show next intervention after a short delay
    setTimeout(() => {
      const remaining = interventions.filter(i => i.id !== id);
      if (remaining.length > 0) {
        setActiveIntervention(remaining[0]);
      }
    }, 500);
  };

  const handleDismiss = async (id: string) => {
    try {
      const { error } = await supabase
        .from('interventions')
        .update({ 
          status: 'dismissed', 
          dismissed_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) {
        console.error('Failed to dismiss:', error);
      }
    } catch (err) {
      console.error('Dismiss error:', err);
    }

    // Remove from list and show next
    setInterventions(prev => prev.filter(i => i.id !== id));
    setActiveIntervention(null);
    
    // Show next intervention after a short delay
    setTimeout(() => {
      const remaining = interventions.filter(i => i.id !== id);
      if (remaining.length > 0) {
        setActiveIntervention(remaining[0]);
      }
    }, 500);
  };

  // Render the appropriate intervention component
  const renderIntervention = () => {
    if (!activeIntervention) return null;

    const props = {
      id: activeIntervention.id,
      title: activeIntervention.title,
      message: activeIntervention.message,
      onAcknowledge: handleAcknowledge,
      onDismiss: handleDismiss,
    };

    switch (activeIntervention.type) {
      case 'soft_nudge':
        return <SoftNudge {...props} />;
      case 'medium_friction':
        return <MediumFriction {...props} />;
      case 'hard_block':
        return <HardBlock {...props} />;
      default:
        return null;
    }
  };

  return (
    <InterventionContext.Provider
      value={{
        activeIntervention,
        pendingCount: interventions.length,
        refetch: fetchInterventions,
      }}
    >
      {children}
      {renderIntervention()}
    </InterventionContext.Provider>
  );
}
