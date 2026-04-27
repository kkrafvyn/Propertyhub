/**
 * App Wrapper Component
 * 
 * Provides additional safety and performance optimizations
 */

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './ErrorBoundary';
import { ThemeProvider } from './ThemeProvider';
import { AppContextProvider } from '../hooks/useAppContext';
import { PerformanceMonitor } from './performance/PerformanceOptimizer';
import { GeocodingProvider } from './geocoding/GeocodingProvider';
import { EnhancedSearchProvider } from './EnhancedSearchProvider';
import { ChatProvider } from './ChatProvider';
import { queryClient } from '../utils/queryClient';

interface AppWrapperProps {
  children: React.ReactNode;
}

export const AppWrapper: React.FC<AppWrapperProps> = ({ children }) => {
  // Check if essential APIs are available
  const isModernBrowser = typeof window !== 'undefined' && 
    'IntersectionObserver' in window &&
    'ResizeObserver' in window &&
    'requestAnimationFrame' in window;

  if (!isModernBrowser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Browser Not Supported</h1>
          <p className="text-muted-foreground">
            Please use a modern browser to access PropertyHub.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AppContextProvider>
            <GeocodingProvider>
              <EnhancedSearchProvider>
                <ChatProvider>
                  <PerformanceMonitor>
                    {children}
                  </PerformanceMonitor>
                </ChatProvider>
              </EnhancedSearchProvider>
            </GeocodingProvider>
          </AppContextProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default AppWrapper;
