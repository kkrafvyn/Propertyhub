import React from 'react';
import { motion } from 'motion/react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react';
import { errorTracker, performanceMonitor } from '../../utils/errorTracking';

interface CriticalErrorBoundaryState {
  hasError: boolean;
  errorInfo: {
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
    errorId: string;
    timestamp: string;
    userAgent: string;
    url: string;
    userId?: string;
  };
  retryCount: number;
}

interface CriticalErrorBoundaryProps {
  children: React.ReactNode;
  fallbackComponent?: React.ComponentType<{
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
    onRetry: () => void;
    onReset: () => void;
  }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  maxRetries?: number;
  showErrorDetails?: boolean;
  componentName?: string;
  userId?: string;
}

export class CriticalErrorBoundary extends React.Component<
  CriticalErrorBoundaryProps,
  CriticalErrorBoundaryState
> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: CriticalErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      errorInfo: {
        error: null,
        errorInfo: null,
        errorId: '',
        timestamp: '',
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: props.userId
      },
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<CriticalErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      errorInfo: {
        error,
        errorInfo: null,
        errorId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError, componentName = 'Unknown', userId } = this.props;
    
    // Update state with full error info
    this.setState(prevState => ({
      errorInfo: {
        ...prevState.errorInfo,
        error,
        errorInfo,
        userId
      }
    }));

    // Track error with comprehensive details
    errorTracker.logError({
      code: 'CRITICAL_COMPONENT_ERROR',
      message: `Critical error in ${componentName}: ${error.message}`,
      category: 'unknown',
      severity: 'critical',
      stack: error.stack,
      context: {
        component: componentName,
        function: 'componentDidCatch',
        errorId: this.state.errorInfo.errorId,
        retryCount: this.state.retryCount,
        additionalData: {
          errorInfo,
          componentStack: errorInfo.componentStack,
          errorBoundary: 'CriticalErrorBoundary'
        }
      }
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Performance tracking for error recovery
    performanceMonitor.startMeasurement('error_recovery');
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      errorTracker.logError({
        code: 'MAX_RETRIES_EXCEEDED',
        message: `Maximum retry attempts (${maxRetries}) exceeded for critical error`,
        category: 'unknown',
        severity: 'critical',
        context: {
          component: this.props.componentName || 'Unknown',
          errorId: this.state.errorInfo.errorId,
          retryCount: this.state.retryCount
        }
      });
      return;
    }

    // Track retry attempt
    errorTracker.logError({
      code: 'ERROR_RETRY_ATTEMPT',
      message: `Retry attempt ${this.state.retryCount + 1} for critical error`,
      category: 'unknown',
      severity: 'medium',
      context: {
        component: this.props.componentName || 'Unknown',
        errorId: this.state.errorInfo.errorId,
        retryCount: this.state.retryCount + 1
      }
    });

    this.setState(prevState => ({
      hasError: false,
      retryCount: prevState.retryCount + 1,
      errorInfo: {
        ...prevState.errorInfo,
        error: null,
        errorInfo: null
      }
    }));

    performanceMonitor.endMeasurement('error_recovery');
  };

  handleReset = () => {
    // Track reset action
    errorTracker.logError({
      code: 'ERROR_BOUNDARY_RESET',
      message: 'Error boundary manually reset',
      category: 'unknown',
      severity: 'low',
      context: {
        component: this.props.componentName || 'Unknown',
        errorId: this.state.errorInfo.errorId,
        retryCount: this.state.retryCount
      }
    });

    this.setState({
      hasError: false,
      retryCount: 0,
      errorInfo: {
        error: null,
        errorInfo: null,
        errorId: '',
        timestamp: '',
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.props.userId
      }
    });

    // Clear any pending retry timeout
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  };

  handleReportError = () => {
    const { error, errorInfo, errorId } = this.state.errorInfo;
    const reportData = {
      errorId,
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: this.state.errorInfo.timestamp,
      url: this.state.errorInfo.url,
      userAgent: this.state.errorInfo.userAgent,
      userId: this.state.errorInfo.userId,
      componentName: this.props.componentName
    };

    // In a real app, this would send to your error reporting service
    console.error('Error Report:', reportData);
    
    // Copy to clipboard for manual reporting
    navigator.clipboard?.writeText(JSON.stringify(reportData, null, 2))
      .then(() => {
        alert('Error details copied to clipboard. Please share with support team.');
      })
      .catch(() => {
        alert('Please manually copy the error details from the browser console.');
      });
  };

  render() {
    const { hasError, errorInfo, retryCount } = this.state;
    const { 
      children, 
      fallbackComponent: FallbackComponent, 
      maxRetries = 3, 
      showErrorDetails = false,
      componentName = 'Component'
    } = this.props;

    if (hasError) {
      // Use custom fallback component if provided
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={errorInfo.error}
            errorInfo={errorInfo.errorInfo}
            onRetry={this.handleRetry}
            onReset={this.handleReset}
          />
        );
      }

      // Default comprehensive error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-lg"
          >
            <Card className="border-destructive/20">
              <CardHeader className="text-center pb-2">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                  className="flex justify-center mb-4"
                >
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                  </div>
                </motion.div>
                <CardTitle className="text-destructive">
                  Oops! Something went wrong
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="text-center text-muted-foreground">
                  <p className="mb-2">
                    We encountered an unexpected error in the {componentName.toLowerCase()}.
                  </p>
                  <p className="text-sm">
                    Error ID: <code className="bg-muted px-1 rounded text-xs">{errorInfo.errorId}</code>
                  </p>
                </div>

                {showErrorDetails && errorInfo.error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-muted rounded-lg p-3 text-xs font-mono text-muted-foreground overflow-auto max-h-32"
                  >
                    <div className="mb-2">
                      <strong>Error:</strong> {errorInfo.error.message}
                    </div>
                    {errorInfo.error.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">
                          {errorInfo.error.stack.slice(0, 500)}
                          {errorInfo.error.stack.length > 500 && '...'}
                        </pre>
                      </div>
                    )}
                  </motion.div>
                )}

                <div className="flex flex-col gap-2">
                  {retryCount < maxRetries && (
                    <Button 
                      onClick={this.handleRetry}
                      className="w-full"
                      variant="default"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
                    </Button>
                  )}
                  
                  <Button 
                    onClick={this.handleReset}
                    className="w-full"
                    variant="outline"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Reset Component
                  </Button>

                  <Button 
                    onClick={this.handleReportError}
                    className="w-full"
                    variant="ghost"
                    size="sm"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Report Error
                  </Button>
                </div>

                {retryCount >= maxRetries && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-center"
                  >
                    <p className="text-sm text-destructive font-medium">
                      Maximum retry attempts reached
                    </p>
                    <p className="text-xs text-destructive/80 mt-1">
                      Please refresh the page or contact support if the problem persists
                    </p>
                  </motion.div>
                )}

                <div className="text-xs text-muted-foreground text-center border-t pt-3">
                  <p>
                    Time: {new Date(errorInfo.timestamp).toLocaleString()}
                  </p>
                  <p className="mt-1">
                    If this problem persists, please contact our support team
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      );
    }

    return <>{children}</>;
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }
}

export default CriticalErrorBoundary;