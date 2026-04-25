import React from 'react';
import { motion } from 'motion/react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Home, RefreshCw, Search, MapPin } from 'lucide-react';
import { CriticalErrorBoundary } from './CriticalErrorBoundary';
import { useMobile } from '../../hooks/useMobile';

interface PropertyErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
  onNavigateToSearch?: () => void;
  onNavigateToHome?: () => void;
}

const PropertyErrorFallback: React.FC<{
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  onRetry: () => void;
  onReset: () => void;
}> = ({ error, onRetry, onReset }) => {
  const isMobile = useMobile();

  const handleNavigateToSearch = () => {
    // Navigate to main search page
    window.location.href = '/?action=search';
  };

  const handleNavigateToHome = () => {
    // Navigate to home page
    window.location.href = '/';
  };

  const isNetworkError = error?.message.includes('NetworkError') || 
                        error?.message.includes('fetch');
  const isDataError = error?.message.includes('Cannot read') ||
                      error?.message.includes('undefined');

  return (
    <div className={`flex items-center justify-center p-4 ${isMobile ? 'min-h-screen' : 'h-full'} bg-background`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <Card className="text-center">
          <CardHeader className="pb-2">
            <motion.div
              animate={{ 
                y: [0, -5, 0],
                scale: [1, 1.02, 1]
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="flex justify-center mb-4"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Home className="w-8 h-8 text-primary" />
              </div>
            </motion.div>
            <CardTitle className="text-xl">Property Loading Error</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-muted-foreground">
              {isNetworkError ? (
                <>
                  <p className="mb-2">
                    We're having trouble connecting to our servers.
                  </p>
                  <p className="text-sm">
                    Please check your internet connection and try again.
                  </p>
                </>
              ) : isDataError ? (
                <>
                  <p className="mb-2">
                    There was an issue loading property data.
                  </p>
                  <p className="text-sm">
                    This property might be temporarily unavailable.
                  </p>
                </>
              ) : (
                <>
                  <p className="mb-2">
                    We encountered an unexpected error while loading properties.
                  </p>
                  <p className="text-sm">
                    Our team has been notified and is working on a fix.
                  </p>
                </>
              )}
            </div>

            <div className="bg-muted/30 rounded-lg p-4 text-left">
              <h4 className="font-medium mb-2 text-sm">What you can do:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Try refreshing the page</li>
                <li>• Check your internet connection</li>
                <li>• Browse other available properties</li>
                <li>• Contact support if the issue persists</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Button 
                onClick={onRetry}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={handleNavigateToSearch}
                  variant="outline"
                  size="sm"
                >
                  <Search className="w-4 h-4 mr-1" />
                  Search
                </Button>

                <Button 
                  onClick={handleNavigateToHome}
                  variant="outline"
                  size="sm"
                >
                  <Home className="w-4 h-4 mr-1" />
                  Home
                </Button>
              </div>
            </div>

            {error && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">
                  Technical Details
                </summary>
                <div className="mt-2 p-2 bg-muted/50 rounded text-left">
                  <code className="break-words">{error.message}</code>
                </div>
              </details>
            )}

            <div className="text-xs text-muted-foreground border-t pt-3">
              <div className="flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>PropertyHub - Your trusted real estate partner</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export const PropertyErrorBoundary: React.FC<PropertyErrorBoundaryProps> = ({ 
  children, 
  onRetry, 
  onNavigateToSearch,
  onNavigateToHome
}) => {
  const handlePropertyError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log property-specific error details
    console.error('Property System Error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });

    // Execute custom handlers
    if (onRetry) {
      setTimeout(onRetry, 1500);
    }
  };

  return (
    <CriticalErrorBoundary
      fallbackComponent={PropertyErrorFallback}
      onError={handlePropertyError}
      componentName="Property System"
      maxRetries={3}
      showErrorDetails={false}
    >
      {children}
    </CriticalErrorBoundary>
  );
};

export default PropertyErrorBoundary;