/**
 * Developer Utilities for PropertyHub
 * 
 * This file contains helpful utilities, debugging tools, and development shortcuts
 * to make the development experience more IDE-friendly and productive.
 * 
 * Usage:
 * - Import specific utilities: import { logger, devTools } from './utils/devUtils'
 * - Access via window in browser console: window.__PROPERTYHUB_DEV__
 * 
 * @author PropertyHub Development Team
 * @version 1.0.0
 */

import React from 'react';
import type { User, Property, AppState, Notification } from '../types';

// ========================================
// Type Helpers and Utilities
// ========================================

/**
 * Utility type for making all properties of T optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Utility type for extracting keys from an object type
 */
export type Keys<T> = keyof T;

/**
 * Utility type for making specific properties required
 */
export type RequireProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Type-safe object keys function
 */
export const getObjectKeys = <T extends Record<string, any>>(obj: T): Array<keyof T> => {
  return Object.keys(obj) as Array<keyof T>;
};

/**
 * Type guard for checking if value is not null or undefined
 */
export const isNotNullish = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};

// ========================================
// Enhanced Logging System
// ========================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

interface LogOptions {
  component?: string;
  action?: string;
  data?: any;
  timestamp?: boolean;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logHistory: Array<{ level: LogLevel; message: string; timestamp: Date; data?: any }> = [];

  private formatMessage(level: LogLevel, message: string, options: LogOptions = {}): string {
    const { component, action, timestamp = true } = options;
    const time = timestamp ? `[${new Date().toLocaleTimeString()}]` : '';
    const comp = component ? `[${component}]` : '';
    const act = action ? `[${action}]` : '';
    
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      success: '✅'
    }[level];

    return `${emoji} ${time} ${comp} ${act} ${message}`.trim();
  }

  private logToHistory(level: LogLevel, message: string, data?: any): void {
    this.logHistory.push({
      level,
      message,
      timestamp: new Date(),
      data
    });

    // Keep only last 100 logs
    if (this.logHistory.length > 100) {
      this.logHistory.shift();
    }
  }

  debug(message: string, options: LogOptions = {}): void {
    if (!this.isDevelopment) return;
    const formatted = this.formatMessage('debug', message, options);
    console.debug(formatted, options.data || '');
    this.logToHistory('debug', message, options.data);
  }

  info(message: string, options: LogOptions = {}): void {
    const formatted = this.formatMessage('info', message, options);
    console.info(formatted, options.data || '');
    this.logToHistory('info', message, options.data);
  }

  warn(message: string, options: LogOptions = {}): void {
    const formatted = this.formatMessage('warn', message, options);
    console.warn(formatted, options.data || '');
    this.logToHistory('warn', message, options.data);
  }

  error(message: string, options: LogOptions = {}): void {
    const formatted = this.formatMessage('error', message, options);
    console.error(formatted, options.data || '');
    this.logToHistory('error', message, options.data);
  }

  success(message: string, options: LogOptions = {}): void {
    const formatted = this.formatMessage('success', message, options);
    console.log(formatted, options.data || '');
    this.logToHistory('success', message, options.data);
  }

  /**
   * Get the log history for debugging
   */
  getHistory(level?: LogLevel): typeof this.logHistory {
    if (level) {
      return this.logHistory.filter(log => log.level === level);
    }
    return [...this.logHistory];
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.logHistory = [];
    console.clear();
    this.info('Log history cleared');
  }

  /**
   * Export logs as JSON for debugging
   */
  exportLogs(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }
}

export const logger = new Logger();

// ========================================
// Development Mock Data Generators
// ========================================

/**
 * Generate mock user data for testing
 */
export const createMockUser = (overrides: DeepPartial<User> = {}): User => {
  const baseUser: User = {
    id: `user_${Date.now()}`,
    email: `user${Math.floor(Math.random() * 1000)}@test.com`,
    name: `Test User ${Math.floor(Math.random() * 100)}`,
    role: 'user',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preferences: {
      theme: 'system',
      notifications: {
        push: true,
        email: true,
        sms: false,
        marketing: false
      },
      language: 'en',
      display: {
        currency: 'GHS',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h'
      },
      privacy: {
        showProfile: true,
        showActivity: true
      }
    }
  };

  return { ...baseUser, ...overrides } as User;
};

/**
 * Generate mock property data for testing
 */
export const createMockProperty = (overrides: DeepPartial<Property> = {}): Property => {
  const types = ['house', 'apartment', 'land', 'shop'] as const;
  const cities = ['Accra', 'Kumasi', 'Tamale', 'Cape Coast', 'Sekondi-Takoradi'];
  const statuses = ['available', 'rented', 'sold'] as const;

  const baseProperty: Property = {
    id: `prop_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    title: `Beautiful ${types[Math.floor(Math.random() * types.length)]} in ${cities[Math.floor(Math.random() * cities.length)]}`,
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    price: Math.floor(Math.random() * 1000000) + 100000,
    currency: 'GHS',
    pricing: {
      amount: Math.floor(Math.random() * 1000000) + 100000,
      currency: 'GHS',
      period: 'monthly',
      negotiable: true
    },
    listingType: 'rent',
    type: types[Math.floor(Math.random() * types.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    images: [
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'
    ],
    media: [
      {
        id: '1',
        url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
        type: 'image',
        order: 0
      }
    ],
    location: {
      address: `${Math.floor(Math.random() * 999)} Test Street`,
      city: cities[Math.floor(Math.random() * cities.length)],
      region: 'Greater Accra',
      country: 'Ghana',
      coordinates: {
        lat: 5.6037 + (Math.random() - 0.5) * 0.1,
        lng: -0.1870 + (Math.random() - 0.5) * 0.1
      }
    },
    features: {
      bedrooms: Math.floor(Math.random() * 5) + 1,
      bathrooms: Math.floor(Math.random() * 3) + 1,
      area: Math.floor(Math.random() * 2000) + 500,
      parking: Math.random() > 0.5,
      furnished: Math.random() > 0.5
    },
    amenities: ['WiFi', 'Air Conditioning', 'Garden'].slice(0, Math.floor(Math.random() * 3) + 1),
    ownerId: `owner_${Math.floor(Math.random() * 100)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    views: 0,
    favorites: 0,
    inquiries: 0,
    tags: []
  };

  return { ...baseProperty, ...overrides } as Property;
};

/**
 * Generate multiple mock properties
 */
export const createMockProperties = (count: number = 10): Property[] => {
  return Array.from({ length: count }, () => createMockProperty());
};

// ========================================
// Development Tools and Utilities
// ========================================

class DevTools {
  private isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Performance measurement utility
   */
  performance = {
    start: (label: string): void => {
      if (!this.isDevelopment) return;
      performance.mark(`${label}-start`);
      logger.debug(`Performance measurement started: ${label}`);
    },

    end: (label: string): number => {
      if (!this.isDevelopment) return 0;
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
      
      const measure = performance.getEntriesByName(label)[0];
      const duration = measure.duration;
      
      logger.debug(`Performance measurement completed: ${label}`, { 
        data: { duration: `${duration.toFixed(2)}ms` }
      });
      
      return duration;
    }
  };

  /**
   * Local storage utilities with type safety
   */
  storage = {
    set: <T>(key: string, value: T): boolean => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        logger.debug(`Storage set: ${key}`, { data: value });
        return true;
      } catch (error) {
        logger.error(`Failed to set storage: ${key}`, { data: error });
        return false;
      }
    },

    get: <T>(key: string, defaultValue?: T): T | null => {
      try {
        const item = localStorage.getItem(key);
        if (item === null) return defaultValue || null;
        const parsed = JSON.parse(item);
        logger.debug(`Storage get: ${key}`, { data: parsed });
        return parsed;
      } catch (error) {
        logger.error(`Failed to get storage: ${key}`, { data: error });
        return defaultValue || null;
      }
    },

    remove: (key: string): boolean => {
      try {
        localStorage.removeItem(key);
        logger.debug(`Storage removed: ${key}`);
        return true;
      } catch (error) {
        logger.error(`Failed to remove storage: ${key}`, { data: error });
        return false;
      }
    },

    clear: (): boolean => {
      try {
        localStorage.clear();
        logger.debug('Storage cleared');
        return true;
      } catch (error) {
        logger.error('Failed to clear storage', { data: error });
        return false;
      }
    }
  };

  /**
   * Debug information getter
   */
  getDebugInfo = (): Record<string, any> => {
    return {
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      screen: {
        width: screen.width,
        height: screen.height,
        pixelRatio: window.devicePixelRatio
      },
      memory: (performance as any).memory ? {
        used: Math.round((performance as any).memory.usedJSHeapSize / 1048576),
        total: Math.round((performance as any).memory.totalJSHeapSize / 1048576),
        limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1048576)
      } : 'Not available',
      online: navigator.onLine,
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt
      } : 'Not available',
      timestamp: new Date().toISOString()
    };
  };

  /**
   * Component render tracker for debugging re-renders
   */
  trackRender = (componentName: string, props?: any): void => {
    if (!this.isDevelopment) return;
    logger.debug(`Component rendered: ${componentName}`, { data: props });
  };

  /**
   * Simple state change tracker
   */
  trackStateChange = (stateName: string, oldValue: any, newValue: any): void => {
    if (!this.isDevelopment) return;
    logger.debug(`State changed: ${stateName}`, { 
      data: { 
        from: oldValue, 
        to: newValue,
        changed: oldValue !== newValue
      }
    });
  };

  /**
   * API call tracker
   */
  trackApiCall = (endpoint: string, method: string, data?: any): void => {
    if (!this.isDevelopment) return;
    logger.debug(`API call: ${method} ${endpoint}`, { data });
  };
}

export const devTools = new DevTools();

// ========================================
// React Development Hooks
// ========================================

/**
 * Hook for debugging component re-renders
 */
export const useWhyDidYouUpdate = (name: string, props: Record<string, any>): void => {
  const previous = React.useRef<Record<string, any>>();
  
  React.useEffect(() => {
    if (previous.current) {
      const allKeys = Object.keys({ ...previous.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};
      
      allKeys.forEach(key => {
        if (previous.current![key] !== props[key]) {
          changedProps[key] = {
            from: previous.current![key],
            to: props[key]
          };
        }
      });
      
      if (Object.keys(changedProps).length) {
        logger.debug(`${name} re-rendered due to:`, { data: changedProps });
      }
    }
    
    previous.current = props;
  });
};

/**
 * Hook for performance monitoring
 */
export const usePerformanceMonitor = (componentName: string): void => {
  React.useLayoutEffect(() => {
    devTools.performance.start(componentName);
    return () => {
      devTools.performance.end(componentName);
    };
  });
};

// ========================================
// Validation Helpers
// ========================================

/**
 * Runtime type checking for development
 */
export const validateType = <T>(value: any, validator: (val: any) => val is T, name: string): T => {
  if (!validator(value)) {
    const error = `Type validation failed for ${name}`;
    logger.error(error, { data: { value, expectedType: validator.name } });
    throw new Error(error);
  }
  return value;
};

/**
 * Property validation helper
 */
export const validateProperty = (property: any): property is Property => {
  return (
    typeof property === 'object' &&
    property !== null &&
    typeof property.id === 'string' &&
    typeof property.title === 'string' &&
    typeof property.price === 'number' &&
    ['house', 'apartment', 'land', 'shop'].includes(property.type)
  );
};

/**
 * User validation helper
 */
export const validateUser = (user: any): user is User => {
  return (
    typeof user === 'object' &&
    user !== null &&
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.name === 'string' &&
    ['user', 'host', 'manager', 'admin'].includes(user.role)
  );
};

// ========================================
// Global Development Interface
// ========================================

/**
 * Global development interface for browser console access
 */
interface GlobalDevInterface {
  logger: typeof logger;
  devTools: typeof devTools;
  createMockUser: typeof createMockUser;
  createMockProperty: typeof createMockProperty;
  createMockProperties: typeof createMockProperties;
  getDebugInfo: () => Record<string, any>;
  version: string;
}

// Attach to window for browser console access
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__PROPERTYHUB_DEV__ = {
    logger,
    devTools,
    createMockUser,
    createMockProperty,
    createMockProperties,
    getDebugInfo: devTools.getDebugInfo,
    version: '2.0.0'
  } as GlobalDevInterface;

  logger.info('PropertyHub development tools loaded', {
    component: 'DevUtils',
    data: { access: 'window.__PROPERTYHUB_DEV__' }
  });
}

// ========================================
// Export Everything
// ========================================

// Exports are already handled via inline export keywords

export default {
  logger,
  devTools,
  createMockUser,
  createMockProperty,
  createMockProperties,
  getObjectKeys,
  isNotNullish,
  validateType,
  validateProperty,
  validateUser,
  useWhyDidYouUpdate,
  usePerformanceMonitor
};

/**
 * Development Usage Examples:
 * 
 * 1. Logging:
 *    logger.info('User logged in', { component: 'Auth', data: user });
 * 
 * 2. Performance:
 *    devTools.performance.start('expensive-operation');
 *    // ... expensive operation
 *    devTools.performance.end('expensive-operation');
 * 
 * 3. Mock Data:
 *    const testUser = createMockUser({ role: 'admin' });
 *    const testProperties = createMockProperties(20);
 * 
 * 4. Debug Component Re-renders:
 *    useWhyDidYouUpdate('MyComponent', { prop1, prop2 });
 * 
 * 5. Browser Console:
 *    window.__PROPERTYHUB_DEV__.logger.getHistory();
 *    window.__PROPERTYHUB_DEV__.createMockProperty();
 * 
 * 6. Storage:
 *    devTools.storage.set('userPrefs', { theme: 'dark' });
 *    const prefs = devTools.storage.get('userPrefs');
 */
