import React from 'react';
import { motion } from 'motion/react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { MessageSquare, RefreshCw, WifiOff, Settings } from 'lucide-react';
import { CriticalErrorBoundary } from './CriticalErrorBoundary';
import { useMobile } from '../../hooks/useMobile';
import { toast } from "sonner";

interface ChatErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
  onFallbackAction?: () => void;
}

const ChatErrorFallback: React.FC<{
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  onRetry: () => void;
  onReset: () => void;
}> = ({ error, onRetry, onReset }) => {
  const isMobile = useMobile();

  const handleContactSupport = () => {
    toast.info('Contact Support', {
      description: 'Please report this issue to our support team for assistance.',
      action: {
        label: 'Copy Error ID',
        onClick: () => {
          const errorId = `chat_error_${Date.now()}`;
          navigator.clipboard?.writeText(errorId);
          toast.success('Error ID copied to clipboard');
        }
      }
    });
  };

  const handleCheckConnection = () => {
    if (!navigator.onLine) {
      toast.error('No internet connection', {
        description: 'Please check your internet connection and try again.'
      });
    } else {
      toast.success('Connection is active', {
        description: 'Your internet connection appears to be working.'
      });
    }
  };

  return (
    <div className={`flex items-center justify-center p-4 ${isMobile ? 'min-h-screen' : 'h-full'}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="text-center">
          <CardHeader className="pb-2">
            <motion.div
              animate={{ 
                rotate: [0, -5, 5, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: 0.6,
                repeat: 1,
                delay: 0.2
              }}
              className="flex justify-center mb-4"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
            </motion.div>
            <CardTitle className="text-lg">Chat System Error</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-muted-foreground">
              <p className="mb-2">
                We're having trouble loading the chat system.
              </p>
              <p className="text-sm">
                This might be due to a connection issue or a temporary problem with our servers.
              </p>
            </div>

            {error && (
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-left">
                <strong>Technical details:</strong>
                <br />
                <code className="break-words">{error.message}</code>
              </div>
            )}

            <div className="space-y-2">
              <Button 
                onClick={onRetry}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Chat System
              </Button>

              <Button 
                onClick={handleCheckConnection}
                className="w-full"
                variant="outline"
              >
                <WifiOff className="w-4 h-4 mr-2" />
                Check Connection
              </Button>

              <Button 
                onClick={handleContactSupport}
                className="w-full"
                variant="ghost"
                size="sm"
              >
                <Settings className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </div>

            <div className="text-xs text-muted-foreground border-t pt-3">
              <p>
                You can continue using other features while we fix this issue
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export const ChatErrorBoundary: React.FC<ChatErrorBoundaryProps> = ({ 
  children, 
  onRetry, 
  onFallbackAction 
}) => {
  const handleChatError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log chat-specific error details
    console.error('Chat System Error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      onlineStatus: navigator.onLine
    });

    // Show toast notification for chat errors
    toast.error('Chat system encountered an error', {
      description: 'Attempting to recover the chat functionality...'
    });

    // Call custom retry handler if provided
    if (onRetry) {
      setTimeout(onRetry, 2000);
    }
  };

  return (
    <CriticalErrorBoundary
      fallbackComponent={ChatErrorFallback}
      onError={handleChatError}
      componentName="Chat System"
      maxRetries={5}
      showErrorDetails={false}
    >
      {children}
    </CriticalErrorBoundary>
  );
};

export default ChatErrorBoundary;