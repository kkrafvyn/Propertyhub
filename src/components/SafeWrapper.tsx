/**
 * Safe Wrapper Component
 * 
 * Provides a safe wrapper around components that might fail
 */

import React, { Suspense } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorFallback } from './ErrorFallback';

interface SafeWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
  errorTitle?: string;
  errorMessage?: string;
}

export const SafeWrapper: React.FC<SafeWrapperProps> = ({
  children,
  fallback,
  loadingFallback,
  errorTitle = "Component Unavailable",
  errorMessage = "This feature is temporarily unavailable."
}) => {
  return (
    <ErrorBoundary 
      fallback={fallback || (
        <ErrorFallback 
          title={errorTitle}
          message={errorMessage}
          showHomeButton={false}
        />
      )}
    >
      <Suspense fallback={loadingFallback || <LoadingSpinner />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

export default SafeWrapper;