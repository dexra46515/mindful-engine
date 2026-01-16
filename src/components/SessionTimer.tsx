/**
 * Session Timer Component
 * Shows current session duration with visual feedback
 */

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionTimerProps {
  startedAt: string | null;
  className?: string;
}

export function SessionTimer({ startedAt, className }: SessionTimerProps) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!startedAt) {
      setDuration(0);
      return;
    }

    const startTime = new Date(startedAt).getTime();
    
    const updateDuration = () => {
      const now = Date.now();
      const seconds = Math.floor((now - startTime) / 1000);
      setDuration(seconds);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [startedAt]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Color based on duration (warn after 30min, danger after 1hr)
  const getColor = () => {
    if (duration > 3600) return 'text-red-500';
    if (duration > 1800) return 'text-orange-500';
    if (duration > 900) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  if (!startedAt) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <Clock className="h-4 w-4" />
        <span className="text-sm">No active session</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Clock className={cn('h-4 w-4', getColor())} />
      <span className={cn('text-lg font-mono tabular-nums', getColor())}>
        {formatDuration(duration)}
      </span>
      <span className="text-xs text-muted-foreground">this session</span>
    </div>
  );
}
