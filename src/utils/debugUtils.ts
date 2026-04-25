/**
 * Debug Utilities
 * 
 * Development utilities for debugging and error tracking
 * Only active in development mode
 * 
 * @author PropertyHub Team
 * @version 2.0.0
 */

interface DebugInfo {
  timestamp: string;
  userAgent: string;
  url: string;
  viewport: {
    width: number;
    height: number;
  };
  memory?: {
    used: number;
    total: number;
  };
  connection?: {
    effectiveType: string;
    downlink: number;
  };
  storage: {
    localStorage: number;
    sessionStorage: number;
  };
  react: {
    version: string;
    mode: string;
  };
}

interface ModuleStatus {
  name: string;
  loaded: boolean;
  error?: string;
  loadTime?: number;
}

/**
 * Debug Manager Class
 */
class DebugManager {
  private static instance: DebugManager;
  private moduleStatuses: Map<string, ModuleStatus> = new Map();
  private errors: Error[] = [];
  private startTime: number = Date.now();

  static getInstance(): DebugManager {
    if (!DebugManager.instance) {
      DebugManager.instance = new DebugManager();
    }
    return DebugManager.instance;
  }

  /**
   * Track module loading status
   */
  trackModule(name: string, promise: Promise<any>): Promise<any> {
    const startTime = Date.now();
    
    this.moduleStatuses.set(name, {
      name,
      loaded: false,
    });

    return promise
      .then(result => {
        this.moduleStatuses.set(name, {
          name,
          loaded: true,
          loadTime: Date.now() - startTime,
        });
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Module "${name}" loaded in ${Date.now() - startTime}ms`);
        }
        
        return result;
      })
      .catch(error => {
        this.moduleStatuses.set(name, {
          name,
          loaded: false,
          error: error.message,
          loadTime: Date.now() - startTime,
        });
        
        if (process.env.NODE_ENV === 'development') {
          console.error(`❌ Module "${name}" failed to load:`, error);
        }
        
        throw error;
      });
  }

  /**
   * Track errors
   */
  trackError(error: Error): void {
    this.errors.push(error);
    
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Error tracked:', error);
    }
  }

  /**
   * Get comprehensive debug information
   */
  getDebugInfo(): DebugInfo {
    const info: DebugInfo = {
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
      viewport: {
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
      },
      storage: {
        localStorage: 0,
        sessionStorage: 0,
      },
      react: {
        version: '18.x',
        mode: process.env.NODE_ENV || 'unknown',
      },
    };

    // Get memory information (if available)
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory;
      info.memory = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      };
    }

    // Get connection information (if available)
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      info.connection = {
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
      };
    }

    // Get storage usage
    try {
      if (typeof localStorage !== 'undefined') {
        info.storage.localStorage = Object.keys(localStorage).length;
      }
      if (typeof sessionStorage !== 'undefined') {
        info.storage.sessionStorage = Object.keys(sessionStorage).length;
      }
    } catch (error) {
      // Storage access might be blocked
    }

    return info;
  }

  /**
   * Get module loading report
   */
  getModuleReport(): {
    total: number;
    loaded: number;
    failed: number;
    modules: ModuleStatus[];
    averageLoadTime: number;
  } {
    const modules = Array.from(this.moduleStatuses.values());
    const loaded = modules.filter(m => m.loaded);
    const failed = modules.filter(m => !m.loaded);
    const loadTimes = loaded.map(m => m.loadTime || 0).filter(t => t > 0);
    const averageLoadTime = loadTimes.length > 0 
      ? Math.round(loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length)
      : 0;

    return {
      total: modules.length,
      loaded: loaded.length,
      failed: failed.length,
      modules,
      averageLoadTime,
    };
  }

  /**
   * Get error report
   */
  getErrorReport(): {
    total: number;
    errors: Array<{
      message: string;
      stack?: string;
      timestamp: string;
    }>;
  } {
    return {
      total: this.errors.length,
      errors: this.errors.map(error => ({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      })),
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    appLoadTime: number;
    navigationTiming?: PerformanceNavigationTiming;
    resourceTiming: PerformanceResourceTiming[];
  } {
    const metrics: {
      appLoadTime: number;
      navigationTiming?: PerformanceNavigationTiming;
      resourceTiming: PerformanceResourceTiming[];
    } = {
      appLoadTime: Date.now() - this.startTime,
      resourceTiming: [] as PerformanceResourceTiming[],
    };

    if (typeof window !== 'undefined' && 'performance' in window) {
      // Get navigation timing
      if ('getEntriesByType' in window.performance) {
        const navEntries = window.performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (navEntries.length > 0) {
          metrics.navigationTiming = navEntries[0];
        }

        // Get resource timing
        const resourceEntries = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        metrics.resourceTiming = resourceEntries.slice(0, 20); // Limit to 20 entries
      }
    }

    return metrics;
  }

  /**
   * Export debug data as JSON
   */
  exportDebugData(): string {
    const data = {
      debugInfo: this.getDebugInfo(),
      moduleReport: this.getModuleReport(),
      errorReport: this.getErrorReport(),
      performanceMetrics: this.getPerformanceMetrics(),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Clear all debug data
   */
  clear(): void {
    this.moduleStatuses.clear();
    this.errors = [];
    console.log('🧹 Debug data cleared');
  }

  /**
   * Log comprehensive debug report to console
   */
  logReport(): void {
    if (process.env.NODE_ENV !== 'development') return;

    console.group('🔍 PropertyHub Debug Report');
    
    console.log('📊 Debug Info:', this.getDebugInfo());
    console.log('📦 Module Report:', this.getModuleReport());
    console.log('❌ Error Report:', this.getErrorReport());
    console.log('⚡ Performance Metrics:', this.getPerformanceMetrics());
    
    console.groupEnd();
  }
}

// Export singleton instance
export const debugManager = DebugManager.getInstance();

/**
 * Debug utilities for development
 */
export const debug = {
  /**
   * Track module loading
   */
  trackModule: (name: string, promise: Promise<any>) => 
    debugManager.trackModule(name, promise),

  /**
   * Track errors
   */
  trackError: (error: Error) => 
    debugManager.trackError(error),

  /**
   * Log debug information
   */
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [DEBUG]', ...args);
    }
  },

  /**
   * Log warnings
   */
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ [DEBUG]', ...args);
    }
  },

  /**
   * Log errors
   */
  error: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ [DEBUG]', ...args);
    }
  },

  /**
   * Time a function execution
   */
  time: <T>(label: string, fn: () => T): T => {
    if (process.env.NODE_ENV === 'development') {
      console.time(`⏱️ ${label}`);
    }
    const result = fn();
    if (process.env.NODE_ENV === 'development') {
      console.timeEnd(`⏱️ ${label}`);
    }
    return result;
  },

  /**
   * Time an async function execution
   */
  timeAsync: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    if (process.env.NODE_ENV === 'development') {
      console.time(`⏱️ ${label}`);
    }
    const result = await fn();
    if (process.env.NODE_ENV === 'development') {
      console.timeEnd(`⏱️ ${label}`);
    }
    return result;
  },

  /**
   * Get debug info
   */
  getInfo: () => debugManager.getDebugInfo(),

  /**
   * Get module report
   */
  getModuleReport: () => debugManager.getModuleReport(),

  /**
   * Get error report
   */
  getErrorReport: () => debugManager.getErrorReport(),

  /**
   * Export debug data
   */
  export: () => debugManager.exportDebugData(),

  /**
   * Clear debug data
   */
  clear: () => debugManager.clear(),

  /**
   * Log full report
   */
  report: () => debugManager.logReport(),
};

/**
 * Setup global debug utilities (development only)
 */
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).PropertyHubDebug = {
    ...debug,
    manager: debugManager,
  };

  // Setup global error handlers
  window.addEventListener('error', (event) => {
    debugManager.trackError(new Error(event.message));
  });

  window.addEventListener('unhandledrejection', (event) => {
    debugManager.trackError(new Error(event.reason));
  });

  console.log('🔍 PropertyHub Debug utilities loaded. Access via window.PropertyHubDebug');
}

export default debug;