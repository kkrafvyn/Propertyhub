/**
 * Error Tracking and Analytics System
 * 
 * Provides comprehensive error tracking, performance monitoring,
 * and user analytics for PropertyHub
 * 
 * @author PropertyHub Team
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Activity, 
  Users,
  Eye,
  Clock,
  Smartphone,
  Monitor,
  X
} from 'lucide-react';

import { useAppContext } from '../../hooks/useAppContext';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

// Error tracking interface
interface AppErrorEvent {
  id: string;
  timestamp: string;
  type: 'javascript' | 'network' | 'performance' | 'user';
  message: string;
  stack?: string;
  url: string;
  userId?: string;
  userAgent: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

// Performance metrics interface
interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timeToInteractive: number;
}

// User analytics interface
interface UserAnalytics {
  activeUsers: number;
  sessionDuration: number;
  pageViews: number;
  bounceRate: number;
  deviceBreakdown: Record<string, number>;
  popularPages: Array<{ page: string; views: number }>;
}

// Error tracking hook
const useErrorTracking = () => {
  const [errors, setErrors] = useState<AppErrorEvent[]>([]);
  const { currentUser } = useAppContext();

  const trackError = useCallback((error: Partial<AppErrorEvent>) => {
    const errorEvent: AppErrorEvent = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: error.type || 'javascript',
      message: error.message || 'Unknown error',
      stack: error.stack,
      url: window.location.href,
      userId: currentUser?.id,
      userAgent: navigator.userAgent,
      severity: error.severity || 'medium',
      resolved: false
    };

    setErrors(prev => [errorEvent, ...prev.slice(0, 99)]); // Keep latest 100 errors
  }, [currentUser]);

  // Global error handlers
  useEffect(() => {
    const handleError = (event: globalThis.ErrorEvent) => {
      trackError({
        message: event.message,
        stack: event.error?.stack,
        type: 'javascript',
        severity: 'high'
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        type: 'javascript',
        severity: 'high'
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [trackError]);

  const resolveError = useCallback((errorId: string) => {
    setErrors(prev => prev.map(error => 
      error.id === errorId ? { ...error, resolved: true } : error
    ));
  }, []);

  return { errors, trackError, resolveError };
};

// Performance monitoring hook
const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const { trackPerformance } = useAppContext();

  useEffect(() => {
    const measurePerformance = () => {
      if ('performance' in window && 'getEntriesByType' in performance) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');

        const performanceMetrics: PerformanceMetrics = {
          pageLoadTime: navigation.loadEventEnd - navigation.loadEventStart,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          largestContentfulPaint: 0, // Would need additional measurement
          cumulativeLayoutShift: 0, // Would need PerformanceObserver
          firstInputDelay: 0, // Would need PerformanceObserver
          timeToInteractive: navigation.domInteractive // Already relative to navigation start
        };

        setMetrics(performanceMetrics);

        // Track individual metrics
        if (trackPerformance) {
          Object.entries(performanceMetrics).forEach(([key, value]) => {
            trackPerformance(key, value);
          });
        }
      }
    };

    // Measure after page load
    if (document.readyState === 'complete') {
      measurePerformance();
    } else {
      window.addEventListener('load', measurePerformance);
      return () => window.removeEventListener('load', measurePerformance);
    }
  }, [trackPerformance]);

  return metrics;
};

// User analytics hook
const useUserAnalytics = () => {
  const [analytics, setAnalytics] = useState<UserAnalytics>({
    activeUsers: 0,
    sessionDuration: 0,
    pageViews: 0,
    bounceRate: 0,
    deviceBreakdown: {},
    popularPages: []
  });

  useEffect(() => {
    // Simulate analytics data (in real app, this would come from your analytics service)
    const mockAnalytics: UserAnalytics = {
      activeUsers: Math.floor(Math.random() * 1000) + 100,
      sessionDuration: Math.floor(Math.random() * 600) + 120, // 2-10 minutes
      pageViews: Math.floor(Math.random() * 10000) + 1000,
      bounceRate: Math.random() * 0.5 + 0.2, // 20-70%
      deviceBreakdown: {
        mobile: Math.floor(Math.random() * 60) + 30,
        desktop: Math.floor(Math.random() * 50) + 25,
        tablet: Math.floor(Math.random() * 20) + 5
      },
      popularPages: [
        { page: '/properties', views: Math.floor(Math.random() * 1000) + 500 },
        { page: '/search', views: Math.floor(Math.random() * 800) + 300 },
        { page: '/dashboard', views: Math.floor(Math.random() * 600) + 200 }
      ]
    };

    setAnalytics(mockAnalytics);

    // Update every minute
    const interval = setInterval(() => {
      setAnalytics(prev => ({
        ...prev,
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 20) - 10,
        pageViews: prev.pageViews + Math.floor(Math.random() * 10) + 1
      }));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return analytics;
};

// Error dashboard component
const ErrorDashboard: React.FC<{ errors: AppErrorEvent[]; onResolve: (id: string) => void }> = ({ 
  errors, 
  onResolve 
}) => {
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const unresolvedErrors = errors.filter(error => !error.resolved);
  const criticalErrors = unresolvedErrors.filter(error => error.severity === 'critical');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Errors</p>
                <p className="text-2xl font-bold">{errors.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unresolved</p>
                <p className="text-2xl font-bold">{unresolvedErrors.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold">{criticalErrors.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Recent Errors</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {errors.slice(0, 10).map((error) => (
              <div
                key={error.id}
                className={`p-3 rounded-lg border ${
                  error.resolved ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge 
                        variant={
                          error.severity === 'critical' ? 'destructive' :
                          error.severity === 'high' ? 'destructive' :
                          error.severity === 'medium' ? 'default' : 'secondary'
                        }
                      >
                        {error.severity}
                      </Badge>
                      <Badge variant="outline">{error.type}</Badge>
                      {error.resolved && (
                        <Badge variant="default" className="bg-green-500">
                          Resolved
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium line-clamp-2">{error.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(error.timestamp).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDetails(error.id === showDetails ? null : error.id)}
                    >
                      Details
                    </Button>
                    {!error.resolved && (
                      <Button size="sm" onClick={() => onResolve(error.id)}>
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {showDetails === error.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 p-3 bg-muted rounded text-xs"
                    >
                      <div className="space-y-2">
                        <div><strong>URL:</strong> {error.url}</div>
                        <div><strong>User ID:</strong> {error.userId || 'Anonymous'}</div>
                        <div><strong>User Agent:</strong> {error.userAgent}</div>
                        {error.stack && (
                          <div>
                            <strong>Stack Trace:</strong>
                            <pre className="mt-1 whitespace-pre-wrap text-xs">{error.stack}</pre>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Performance dashboard component
const PerformanceDashboard: React.FC<{ metrics: PerformanceMetrics | null }> = ({ metrics }) => {
  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading performance metrics...</p>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (ms: number) => `${ms.toFixed(0)}ms`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Page Load Time</p>
                <p className="text-2xl font-bold">{formatTime(metrics.pageLoadTime)}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">First Contentful Paint</p>
                <p className="text-2xl font-bold">{formatTime(metrics.firstContentfulPaint)}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Time to Interactive</p>
                <p className="text-2xl font-bold">{formatTime(metrics.timeToInteractive)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// User analytics dashboard component
const UserAnalyticsDashboard: React.FC<{ analytics: UserAnalytics }> = ({ analytics }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{analytics.activeUsers.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Page Views</p>
                <p className="text-2xl font-bold">{analytics.pageViews.toLocaleString()}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Session</p>
                <p className="text-2xl font-bold">{Math.round(analytics.sessionDuration / 60)}m</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bounce Rate</p>
                <p className="text-2xl font-bold">{(analytics.bounceRate * 100).toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Device Breakdown</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.deviceBreakdown).map(([device, percentage]) => (
                <div key={device} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {device === 'mobile' && <Smartphone className="h-4 w-4" />}
                    {device === 'desktop' && <Monitor className="h-4 w-4" />}
                    {device === 'tablet' && <Smartphone className="h-4 w-4" />}
                    <span className="capitalize">{device}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 h-2 bg-muted rounded">
                      <div 
                        className="h-2 bg-primary rounded"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Popular Pages</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.popularPages.map((page, index) => (
                <div key={page.page} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">#{index + 1}</span>
                    <span>{page.page}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {page.views.toLocaleString()} views
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Main Error Tracking System Component
export const ErrorTrackingSystem: React.FC<{
  activeTab?: 'errors' | 'performance' | 'analytics';
}> = ({ activeTab = 'errors' }) => {
  const [currentTab, setCurrentTab] = useState(activeTab);
  const { errors, trackError, resolveError } = useErrorTracking();
  const performanceMetrics = usePerformanceMonitoring();
  const userAnalytics = useUserAnalytics();

  const tabs = [
    { id: 'errors', label: 'Errors', icon: AlertTriangle },
    { id: 'performance', label: 'Performance', icon: Activity },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">System Monitoring</h1>
        
        <div className="flex border rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={currentTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentTab(tab.id as any)}
                className="rounded-none first:rounded-l-lg last:rounded-r-lg"
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentTab === 'errors' && (
            <ErrorDashboard errors={errors} onResolve={resolveError} />
          )}
          
          {currentTab === 'performance' && (
            <PerformanceDashboard metrics={performanceMetrics} />
          )}
          
          {currentTab === 'analytics' && (
            <UserAnalyticsDashboard analytics={userAnalytics} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ErrorTrackingSystem;