/**
 * Hard Block Intervention
 * Full-screen blocking modal that requires significant friction to dismiss
 */

import { useEffect, useState } from 'react';
import { ShieldAlert, Heart, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HardBlockProps {
  id: string;
  title: string;
  message: string;
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function HardBlock({ id, title, message, onAcknowledge, onDismiss }: HardBlockProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [dismissCountdown, setDismissCountdown] = useState(10);
  const [canDismiss, setCanDismiss] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');

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

  // Breathing animation cycle
  useEffect(() => {
    const phases: Array<'inhale' | 'hold' | 'exhale'> = ['inhale', 'hold', 'exhale'];
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % phases.length;
      setBreathingPhase(phases[currentIndex]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleAction = (action: 'acknowledge' | 'dismiss') => {
    if (action === 'dismiss' && !canDismiss) return;
    
    setIsExiting(true);
    setTimeout(() => {
      if (action === 'acknowledge') {
        onAcknowledge(id);
      } else {
        onDismiss(id);
      }
    }, 500);
  };

  const getBreathingText = () => {
    switch (breathingPhase) {
      case 'inhale': return 'Breathe in...';
      case 'hold': return 'Hold...';
      case 'exhale': return 'Breathe out...';
    }
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col',
        'transition-all duration-500',
        isVisible && !isExiting ? 'opacity-100' : 'opacity-0'
      )}
    >
      {/* Full screen gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-rose-600 to-pink-700" />
      
      {/* Animated breathing circle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={cn(
            'rounded-full bg-white/10 transition-all duration-[3000ms] ease-in-out',
            breathingPhase === 'inhale' && 'w-64 h-64',
            breathingPhase === 'hold' && 'w-64 h-64',
            breathingPhase === 'exhale' && 'w-32 h-32'
          )}
        />
      </div>
      
      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-6 text-white">
        <div className="p-4 rounded-full bg-white/20 mb-6">
          <ShieldAlert className="h-10 w-10" />
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-2">{title}</h1>
        <p className="text-white/80 text-center max-w-xs mb-8">{message}</p>
        
        {/* Breathing guide */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur">
            <Heart className={cn(
              'h-8 w-8 transition-transform duration-[3000ms]',
              breathingPhase === 'inhale' && 'scale-125',
              breathingPhase === 'hold' && 'scale-125',
              breathingPhase === 'exhale' && 'scale-100'
            )} />
          </div>
          <p className="text-lg font-medium animate-pulse">{getBreathingText()}</p>
        </div>
        
        {/* Countdown */}
        {!canDismiss && (
          <div className="flex items-center gap-2 text-white/60 mb-6">
            <Clock className="h-4 w-4" />
            <span>Take a moment: {dismissCountdown}s</span>
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="relative p-6 pb-safe space-y-3">
        <Button
          size="lg"
          className="w-full bg-white text-red-600 hover:bg-white/90 font-semibold"
          onClick={() => handleAction('acknowledge')}
        >
          I'm Stepping Away Now
        </Button>
        
        <Button
          size="lg"
          variant="ghost"
          className="w-full text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => handleAction('dismiss')}
          disabled={!canDismiss}
        >
          {canDismiss ? (
            'I understand, let me continue'
          ) : (
            'Please wait...'
          )}
        </Button>
      </div>
    </div>
  );
}
