/**
 * Pull to Refresh Component
 * Native-style pull-to-refresh gesture for mobile apps
 */

import { useState, useRef, useCallback, ReactNode, useEffect } from 'react';
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
  threshold = 60 
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isAtTop = useRef(true);

  // Check if page is at top
  const checkIfAtTop = useCallback(() => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    isAtTop.current = scrollTop <= 0;
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', checkIfAtTop, { passive: true });
    checkIfAtTop();
    return () => window.removeEventListener('scroll', checkIfAtTop);
  }, [checkIfAtTop]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    checkIfAtTop();
    
    if (isAtTop.current) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [disabled, isRefreshing, checkIfAtTop]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    if (!isAtTop.current) {
      setPullDistance(0);
      return;
    }
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;
    
    if (distance > 0) {
      // Prevent default scrolling when pulling down at top
      e.preventDefault();
      
      // Apply resistance for natural feel
      const resistedDistance = Math.min(distance * 0.4, threshold * 1.5);
      setPullDistance(resistedDistance);
    }
  }, [isPulling, disabled, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.5);
      
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
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh, disabled]);

  // Attach touch listeners to document for better capture
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const options = { passive: false };
    
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, options);
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 5 || isRefreshing;

  return (
    <div 
      ref={containerRef}
      className={cn("relative", className)}
    >
      {/* Pull indicator */}
      <div 
        className={cn(
          "fixed left-1/2 z-50 transition-all duration-200 pointer-events-none",
          showIndicator ? "opacity-100" : "opacity-0"
        )}
        style={{ 
          top: `calc(env(safe-area-inset-top, 0px) + ${Math.max(8, pullDistance - 30)}px)`,
          transform: `translateX(-50%) scale(${0.8 + progress * 0.2})`
        }}
      >
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full",
          "bg-background border-2 shadow-lg",
          isRefreshing && "bg-primary/10 border-primary/30"
        )}>
          <RefreshCw 
            className={cn(
              "h-5 w-5 text-primary transition-transform",
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
        className="transition-transform ease-out"
        style={{ 
          transform: showIndicator ? `translateY(${pullDistance}px)` : 'translateY(0)',
          transitionDuration: isPulling ? '0ms' : '200ms'
        }}
      >
        {children}
      </div>
    </div>
  );
}
