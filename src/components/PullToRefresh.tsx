/**
 * Pull to Refresh Component
 * Native-style pull-to-refresh gesture for mobile apps
 */

import { useState, useRef, useCallback, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  threshold?: number;
}

export function PullToRefresh({ 
  onRefresh, 
  children, 
  className,
  disabled = false,
  threshold = 80 
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // Only activate if scrolled to top
    if (container.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    
    currentY.current = e.touches[0].clientY;
    const distance = Math.max(0, currentY.current - startY.current);
    
    // Apply resistance for natural feel
    const resistedDistance = Math.min(distance * 0.5, threshold * 1.5);
    setPullDistance(resistedDistance);
  }, [isPulling, disabled, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.6); // Keep indicator visible during refresh
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    
    startY.current = 0;
    currentY.current = 0;
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh, disabled]);

  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div 
        className={cn(
          "absolute left-1/2 -translate-x-1/2 z-20 transition-all duration-200",
          showIndicator ? "opacity-100" : "opacity-0"
        )}
        style={{ 
          top: Math.max(8, pullDistance - 40),
          transform: `translateX(-50%) scale(${0.8 + progress * 0.2})`
        }}
      >
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full",
          "bg-background border shadow-lg",
          isRefreshing && "bg-primary/10"
        )}>
          <RefreshCw 
            className={cn(
              "h-5 w-5 text-primary transition-transform duration-200",
              isRefreshing && "animate-spin"
            )}
            style={{ 
              transform: isRefreshing ? undefined : `rotate(${progress * 180}deg)` 
            }}
          />
        </div>
      </div>

      {/* Content with pull offset */}
      <div 
        className="transition-transform duration-200 ease-out"
        style={{ 
          transform: showIndicator ? `translateY(${pullDistance}px)` : undefined,
          transitionDuration: isPulling ? '0ms' : '200ms'
        }}
      >
        {children}
      </div>
    </div>
  );
}
