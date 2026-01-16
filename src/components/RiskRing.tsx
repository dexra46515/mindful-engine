/**
 * Risk Ring Component
 * Animated circular progress indicator showing current risk level
 */

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface RiskRingProps {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high' | 'critical';
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const levelColors = {
  low: {
    stroke: 'stroke-green-500',
    glow: 'drop-shadow-[0_0_12px_rgba(34,197,94,0.5)]',
    bg: 'text-green-500/20',
    text: 'text-green-600',
  },
  medium: {
    stroke: 'stroke-yellow-500',
    glow: 'drop-shadow-[0_0_12px_rgba(234,179,8,0.5)]',
    bg: 'text-yellow-500/20',
    text: 'text-yellow-600',
  },
  high: {
    stroke: 'stroke-orange-500',
    glow: 'drop-shadow-[0_0_12px_rgba(249,115,22,0.5)]',
    bg: 'text-orange-500/20',
    text: 'text-orange-600',
  },
  critical: {
    stroke: 'stroke-red-500',
    glow: 'drop-shadow-[0_0_16px_rgba(239,68,68,0.6)]',
    bg: 'text-red-500/20',
    text: 'text-red-600',
  },
};

const levelLabels = {
  low: 'Doing Great',
  medium: 'Take a Breath',
  high: 'Time for a Break',
  critical: 'Step Away',
};

export function RiskRing({ 
  score, 
  level, 
  size = 200, 
  strokeWidth = 12,
  className 
}: RiskRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  // Animate score changes
  useEffect(() => {
    const duration = 800;
    const startTime = Date.now();
    const startScore = animatedScore;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startScore + (score - startScore) * eased;
      
      setAnimatedScore(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [score]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;
  const colors = levelColors[level];

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className={cn('transform -rotate-90', colors.glow)}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('transition-all duration-300', colors.stroke)}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-4xl font-bold tabular-nums', colors.text)}>
          {Math.round(animatedScore)}
        </span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
          {levelLabels[level]}
        </span>
      </div>
    </div>
  );
}
