import { ErrorDetails, ErrorCategory, ErrorContext, AnalyticsEvent } from '../types';

/**
 * Enhanced Error Tracking System
 * Provides comprehensive error logging, analytics, and monitoring
 */

class ErrorTracker {
  private sessionId: string;
  private userId?: string;
  private errorQueue: ErrorDetails[] = [];
  private maxQueueSize = 100;
  private flushInterval = 30000; // 30 seconds
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startPeriodicFlush();
    this.setupGlobalErrorHandlers();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupGlobalErrorHandlers(): void {
    // Catch unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError({
        code: 'UNHANDLED_ERROR',
        message: event.error?.message || event.message || 'Unknown error occurred',
        category: 'unknown',
        severity: 'high',
        timestamp: new Date().toISOString(),
        context: {
          component: 'Global',
          function: 'window.onerror',
          url: event.filename,
          additionalData: {
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error?.stack
          }
        },
        stack: event.error?.stack,
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    });

    // Catch unhandled Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        code: 'UNHANDLED_PROMISE_REJECTION',
        message: event.reason?.message || String(event.reason) || 'Unhandled promise rejection',
        category: 'unknown',
        severity: 'high',
        timestamp: new Date().toISOString(),
        context: {
          component: 'Global',
          function: 'unhandledrejection',
          additionalData: {
            reason: event.reason,
            stack: event.reason?.stack
          }
        },
        stack: event.reason?.stack,
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    });
  }

  public setUserId(userId: string): void {
    this.userId = userId;
  }

  public logError(error: Partial<ErrorDetails>): void {
    const fullError: ErrorDetails = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      category: error.category || 'unknown',
      severity: error.severity || 'medium',
      timestamp: error.timestamp || new Date().toISOString(),
      userId: error.userId || this.userId,
      sessionId: error.sessionId || this.sessionId,
      context: error.context || {},
      stack: error.stack,
      userAgent: error.userAgent || navigator.userAgent,
      url: error.url || window.location.href
    };

    // Skip logging test errors with specific codes to avoid confusion
    if (fullError.code === 'HEALTH_CHECK_TEST') {
      return; // Don't log health check test errors
    }

    // Add to queue
    this.errorQueue.push(fullError);

    // Ensure queue doesn't exceed max size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
    }

    // Console log for development (but not for test errors)
    if (process.env.NODE_ENV === 'development' && !String(fullError.code).includes('TEST')) {
      console.group(`🚨 Error Tracked: ${fullError.code}`);
      console.error('Message:', fullError.message);
      console.log('Category:', fullError.category);
      console.log('Severity:', fullError.severity);
      console.log('Context:', fullError.context);
      if (fullError.stack) {
        console.log('Stack:', fullError.stack);
      }
      console.groupEnd();
    }

    // Immediate flush for critical errors (but not test errors)
    if (fullError.severity === 'critical' && !String(fullError.code).includes('TEST')) {
      this.flushErrors();
    }
  }

  public logAuthenticationError(message: string, context?: Partial<ErrorContext>): void {
    this.logError({
      code: 'AUTH_ERROR',
      message: `Authentication failed: ${message}`,
      category: 'authentication',
      severity: 'high',
      context: {
        component: 'Authentication',
        ...context
      }
    });
  }

  public logNetworkError(message: string, url?: string, status?: number, context?: Partial<ErrorContext>): void {
    this.logError({
      code: 'NETWORK_ERROR',
      message: `Network request failed: ${message}`,
      category: 'network',
      severity: status && status >= 500 ? 'high' : 'medium',
      context: {
        component: 'NetworkRequest',
        additionalData: {
          url,
          status,
          timestamp: new Date().toISOString()
        },
        ...context
      }
    });
  }

  public logValidationError(field: string, value: unknown, rule: string, context?: Partial<ErrorContext>): void {
    this.logError({
      code: 'VALIDATION_ERROR',
      message: `Validation failed for field "${field}": ${rule}`,
      category: 'validation',
      severity: 'low',
      context: {
        component: 'FormValidation',
        additionalData: {
          field,
          value,
          rule,
          timestamp: new Date().toISOString()
        },
        ...context
      }
    });
  }

  public logWebSocketError(message: string, connectionState?: string, context?: Partial<ErrorContext>): void {
    this.logError({
      code: 'WEBSOCKET_ERROR',
      message: `WebSocket error: ${message}`,
      category: 'websocket',
      severity: 'medium',
      context: {
        component: 'WebSocketProvider',
        additionalData: {
          connectionState,
          timestamp: new Date().toISOString()
        },
        ...context
      }
    });
  }

  public logPaymentError(message: string, amount?: number, method?: string, context?: Partial<ErrorContext>): void {
    this.logError({
      code: 'PAYMENT_ERROR',
      message: `Payment processing failed: ${message}`,
      category: 'payment',
      severity: 'high',
      context: {
        component: 'PaymentProvider',
        additionalData: {
          amount,
          method,
          timestamp: new Date().toISOString()
        },
        ...context
      }
    });
  }

  public logPerformanceIssue(metric: string, value: number, threshold: number, context?: Partial<ErrorContext>): void {
    this.logError({
      code: 'PERFORMANCE_ISSUE',
      message: `Performance threshold exceeded: ${metric} (${value}ms > ${threshold}ms)`,
      category: 'unknown',
      severity: value > threshold * 2 ? 'high' : 'medium',
      context: {
        component: 'PerformanceMonitor',
        additionalData: {
          metric,
          value,
          threshold,
          timestamp: new Date().toISOString()
        },
        ...context
      }
    });
  }

  private async flushErrors(): Promise<void> {
    if (this.errorQueue.length === 0) return;

    const errorsToFlush = [...this.errorQueue];
    this.errorQueue = [];

    try {
      // In a real implementation, you would send these to your error tracking service
      // For now, we'll log them for development and store them locally for debugging
      
      if (process.env.NODE_ENV === 'development') {
        console.group('📊 Error Tracking Flush');
        console.log(`Flushing ${errorsToFlush.length} errors`);
        console.table(errorsToFlush.map(error => ({
          code: error.code,
          message: error.message.substring(0, 50),
          category: error.category,
          severity: error.severity,
          timestamp: error.timestamp
        })));
        console.groupEnd();
      }

      // Store in localStorage for debugging (with size limit)
      const existingErrors = this.getStoredErrors();
      const allErrors = [...existingErrors, ...errorsToFlush].slice(-200); // Keep last 200 errors
      localStorage.setItem('propertyHub_errorLogs', JSON.stringify(allErrors));

    } catch (error) {
      console.error('Failed to flush errors:', error);
      // Re-add errors to queue if flush failed
      this.errorQueue = [...errorsToFlush, ...this.errorQueue];
    }
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushErrors();
    }, this.flushInterval);
  }

  public getStoredErrors(): ErrorDetails[] {
    try {
      const stored = localStorage.getItem('propertyHub_errorLogs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  public clearStoredErrors(): void {
    localStorage.removeItem('propertyHub_errorLogs');
  }

  public getErrorStats(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<string, number>;
    recent: ErrorDetails[];
  } {
    const errors = this.getStoredErrors();
    const stats = {
      total: errors.length,
      byCategory: {} as Record<ErrorCategory, number>,
      bySeverity: {} as Record<string, number>,
      recent: errors.slice(-10).reverse()
    };

    // Initialize counters
    const categories: ErrorCategory[] = ['authentication', 'authorization', 'network', 'validation', 'database', 'websocket', 'payment', 'file_upload', 'geolocation', 'pwa', 'unknown'];
    categories.forEach(category => {
      stats.byCategory[category] = 0;
    });

    const severities = ['low', 'medium', 'high', 'critical'];
    severities.forEach(severity => {
      stats.bySeverity[severity] = 0;
    });

    // Count errors
    errors.forEach(error => {
      stats.byCategory[error.category]++;
      stats.bySeverity[error.severity]++;
    });

    return stats;
  }

  public dispose(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushErrors(); // Final flush
  }
}

// Create singleton instance
export const errorTracker = new ErrorTracker();

// Enhanced error boundary hook
export function useErrorHandler() {
  const handleError = (error: Error, errorInfo?: any, context?: Partial<ErrorContext>) => {
    errorTracker.logError({
      code: 'COMPONENT_ERROR',
      message: error.message,
      category: 'unknown',
      severity: 'medium',
      stack: error.stack,
      context: {
        component: context?.component || 'Unknown',
        function: context?.function || 'useErrorHandler',
        additionalData: {
          errorInfo,
          ...context?.additionalData
        }
      }
    });
  };

  return { handleError };
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private measurements: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMeasurement(name: string): void {
    this.measurements.set(name, performance.now());
  }

  endMeasurement(name: string, threshold?: number): number {
    const startTime = this.measurements.get(name);
    if (!startTime) {
      errorTracker.logError({
        code: 'MEASUREMENT_ERROR',
        message: `No start time found for measurement: ${name}`,
        category: 'unknown',
        severity: 'low'
      });
      return 0;
    }

    const duration = performance.now() - startTime;
    this.measurements.delete(name);

    // Log performance issues if threshold exceeded
    if (threshold && duration > threshold) {
      errorTracker.logPerformanceIssue(name, duration, threshold);
    }

    return duration;
  }

  measureAsync<T>(name: string, fn: () => Promise<T>, threshold?: number): Promise<T> {
    this.startMeasurement(name);
    return fn().finally(() => {
      this.endMeasurement(name, threshold);
    });
  }

  measureSync<T>(name: string, fn: () => T, threshold?: number): T {
    this.startMeasurement(name);
    try {
      return fn();
    } finally {
      this.endMeasurement(name, threshold);
    }
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();