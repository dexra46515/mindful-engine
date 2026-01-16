/**
 * Soft Nudge Intervention
 * A gentle, non-intrusive notification that slides in from the bottom
 */

import { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SoftNudgeProps {
  id: string;
  title: string;
  message: string;
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function SoftNudge({ id, title, message, onAcknowledge, onDismiss }: SoftNudgeProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleAction = (action: 'acknowledge' | 'dismiss') => {
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
        'fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm',
        'transform transition-all duration-300 ease-out',
        isVisible && !isExiting ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      )}
    >
      <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
        {/* Gradient accent bar */}
        <div className="h-1 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500" />
        
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-green-500/10 text-green-500 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{message}</p>
            </div>
            
            <button
              onClick={() => handleAction('dismiss')}
              className="p-1 rounded-full hover:bg-muted transition-colors shrink-0"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => handleAction('dismiss')}
            >
              Later
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => handleAction('acknowledge')}
            >
              Take a Breath
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
