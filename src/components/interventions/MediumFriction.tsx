/**
 * Medium Friction Intervention
 * A more prominent modal that requires deliberate action to dismiss
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MediumFrictionProps {
  id: string;
  title: string;
  message: string;
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function MediumFriction({ id, title, message, onAcknowledge, onDismiss }: MediumFrictionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [dismissCountdown, setDismissCountdown] = useState(3);
  const [canDismiss, setCanDismiss] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Countdown before dismiss is allowed
  useEffect(() => {
    if (dismissCountdown > 0) {
      const timer = setTimeout(() => {
        setDismissCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanDismiss(true);
    }
  }, [dismissCountdown]);

  const handleAction = (action: 'acknowledge' | 'dismiss') => {
    if (action === 'dismiss' && !canDismiss) return;
    
    setIsExiting(true);
    setTimeout(() => {
      if (action === 'acknowledge') {
        onAcknowledge(id);
      } else {
        onDismiss(id);
      }
    }, 300);
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'transition-all duration-300',
        isVisible && !isExiting ? 'opacity-100' : 'opacity-0'
      )}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => canDismiss && handleAction('dismiss')}
      />
      
      {/* Modal */}
      <div
        className={cn(
          'relative w-full max-w-sm bg-card rounded-3xl shadow-2xl overflow-hidden',
          'transform transition-all duration-300',
          isVisible && !isExiting ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        )}
      >
        {/* Warning gradient header */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-full bg-white/20">
              <AlertTriangle className="h-6 w-6" />
            </div>
            {canDismiss && (
              <button
                onClick={() => handleAction('dismiss')}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          
          <h2 className="text-xl font-bold mt-4">{title}</h2>
          <p className="text-white/80 mt-2">{message}</p>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-orange-500/10 rounded-xl">
            <Clock className="h-5 w-5 text-orange-500" />
            <span className="text-sm">
              Consider a 5-minute break to reset your focus
            </span>
          </div>
          
          <div className="space-y-2">
            <Button
              className="w-full bg-orange-600 hover:bg-orange-700"
              onClick={() => handleAction('acknowledge')}
            >
              I'll Take a Break
            </Button>
            
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => handleAction('dismiss')}
              disabled={!canDismiss}
            >
              {canDismiss ? (
                'Continue Anyway'
              ) : (
                <span className="flex items-center gap-2">
                  <span className="h-5 w-5 flex items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {dismissCountdown}
                  </span>
                  Wait to continue
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
