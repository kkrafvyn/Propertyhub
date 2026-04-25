import React, { useEffect, useState } from 'react';
import { checkCompatibility } from '../utils/versionCheck';
import { LoadingSpinner } from './LoadingSpinner';
import { AlertTriangle } from 'lucide-react';

interface CompatibilityCheckProps {
  children: React.ReactNode;
}

export function CompatibilityCheck({ children }: CompatibilityCheckProps) {
  const [isReady, setIsReady] = useState(false);
  const [compatibility, setCompatibility] = useState<ReturnType<typeof checkCompatibility> | null>(null);

  useEffect(() => {
    try {
      const compat = checkCompatibility();
      setCompatibility(compat);
      
      // Always allow the app to load, but show warnings for missing features
      setTimeout(() => {
        setIsReady(true);
      }, 500);
      
      if (compat.warnings.length > 0) {
        console.warn('Compatibility warnings:', compat.warnings);
      }
    } catch (error) {
      console.error('Compatibility check failed:', error);
      // Still allow app to load
      setIsReady(true);
    }
  }, []);

  if (!isReady) {
    return <LoadingSpinner />;
  }

  if (compatibility && !compatibility.compatible) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Compatibility Issues</h2>
          <p className="text-muted-foreground mb-4">
            Your browser may not support all features of PropertyHub. 
            For the best experience, please use a modern browser.
          </p>
          {compatibility.warnings.length > 0 && (
            <div className="text-left text-sm text-muted-foreground mb-4">
              <ul className="list-disc list-inside">
                {compatibility.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={() => setIsReady(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Continue Anyway
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}