/**
 * App Footer Component
 * Provides consistent navigation to legal pages and demo
 */

import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

interface AppFooterProps {
  showDemo?: boolean;
  className?: string;
}

export function AppFooter({ showDemo = true, className = '' }: AppFooterProps) {
  return (
    <footer className={`border-t py-6 px-4 ${className}`}>
      <div className="max-w-lg mx-auto">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <Link to="/privacy" className="hover:text-primary transition-colors">
            Privacy Policy
          </Link>
          <span className="text-muted-foreground/40">•</span>
          <Link to="/terms" className="hover:text-primary transition-colors">
            Terms of Service
          </Link>
          {showDemo && (
            <>
              <span className="text-muted-foreground/40">•</span>
              <Link to="/demo" className="hover:text-primary transition-colors flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Apple Demo
              </Link>
            </>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground/60 mt-3">
          © {new Date().getFullYear()} Mindful Balance Engine
        </p>
      </div>
    </footer>
  );
}
