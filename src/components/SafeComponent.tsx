import React, { Component, ReactNode } from 'react';

interface SafeComponentProps {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface SafeComponentState {
  hasError: boolean;
  error?: Error;
}

export class SafeComponent extends Component<SafeComponentProps, SafeComponentState> {
  constructor(props: SafeComponentProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): SafeComponentState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error(`SafeComponent [${this.props.componentName || 'Unknown'}] caught an error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
          <h3 className="text-sm font-medium text-destructive mb-2">
            Component Error: {this.props.componentName || 'Unknown Component'}
          </h3>
          <p className="text-xs text-muted-foreground">
            This component failed to render. Please refresh the page or contact support.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer">Error Details (Dev)</summary>
              <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component wrapper
export function withSafeComponent<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  componentName?: string,
  fallback?: ReactNode
) {
  return function SafeWrappedComponent(props: T) {
    return (
      <SafeComponent componentName={componentName} fallback={fallback}>
        <WrappedComponent {...props} />
      </SafeComponent>
    );
  };
}

// Hook for safe component rendering
export function useSafeRender() {
  const safeRender = React.useCallback((
    component: ReactNode,
    componentName?: string,
    fallback?: ReactNode
  ) => {
    return (
      <SafeComponent componentName={componentName} fallback={fallback}>
        {component}
      </SafeComponent>
    );
  }, []);

  return safeRender;
}