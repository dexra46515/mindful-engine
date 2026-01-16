/**
 * Usage Stats Component
 * Shows real-time usage statistics and risk factors
 */

import { Activity, RefreshCw, Moon, MousePointer2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsageStatsProps {
  factors: {
    sessionDuration: number;
    reopenFrequency: number;
    lateNight: number;
    scrollVelocity: number;
  };
  className?: string;
}

const statConfig = [
  { 
    key: 'sessionDuration', 
    label: 'Session', 
    icon: Activity,
    description: 'Time spent',
    threshold: { medium: 20, high: 40 }
  },
  { 
    key: 'reopenFrequency', 
    label: 'Reopens', 
    icon: RefreshCw,
    description: 'App opens',
    threshold: { medium: 15, high: 30 }
  },
  { 
    key: 'scrollVelocity', 
    label: 'Scroll', 
    icon: MousePointer2,
    description: 'Speed factor',
    threshold: { medium: 10, high: 25 }
  },
  { 
    key: 'lateNight', 
    label: 'Late Night', 
    icon: Moon,
    description: 'Usage timing',
    threshold: { medium: 10, high: 20 }
  },
] as const;

export function UsageStats({ factors, className }: UsageStatsProps) {
  const getFactorColor = (value: number, threshold: { medium: number; high: number }) => {
    if (value >= threshold.high) return 'text-red-500 bg-red-500/10';
    if (value >= threshold.medium) return 'text-orange-500 bg-orange-500/10';
    return 'text-green-500 bg-green-500/10';
  };

  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {statConfig.map(({ key, label, icon: Icon, description, threshold }) => {
        const value = factors[key] || 0;
        const colorClasses = getFactorColor(value, threshold);
        
        return (
          <div 
            key={key}
            className={cn(
              'rounded-xl p-4 transition-all',
              colorClasses
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide opacity-80">
                {label}
              </span>
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {Math.round(value)}
            </div>
            <div className="text-xs opacity-60 mt-1">
              {description}
            </div>
          </div>
        );
      })}
    </div>
  );
}
