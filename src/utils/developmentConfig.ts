/**
 * Development Configuration Utility
 * 
 * Provides safe configuration checking and fallbacks for development environment
 * to prevent errors when environment variables are not properly set up.
 * 
 * @author PropertyHub Team
 * @version 1.0.0
 */

import { envConfig } from './envConfig';
import { toast } from 'sonner';

/**
 * Development Configuration Interface
 */
interface DevelopmentConfig {
  isConfigured: boolean;
  warnings: string[];
  errors: string[];
  suggestions: string[];
  paymentMode: 'demo' | 'test' | 'live';
  chatMode: 'mock' | 'local' | 'connected';
}

/**
 * Check development configuration and provide feedback
 */
export function checkDevelopmentConfig(): DevelopmentConfig {
  const warnings: string[] = [];
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  let paymentMode: 'demo' | 'test' | 'live' = 'demo';
  let chatMode: 'mock' | 'local' | 'connected' = 'mock';
  
  // Only check in development mode
  if (!envConfig.isDevelopment) {
    return {
      isConfigured: true,
      warnings: [],
      errors: [],
      suggestions: [],
      paymentMode: 'live',
      chatMode: 'connected'
    };
  }
  
  console.log('🔍 Checking development configuration...');
  
  // Check payment configuration
  const hasDemoPaystack = envConfig.PAYSTACK_PUBLIC_KEY === 'pk_test_demo_key_for_development';
  const hasRealPaystack = envConfig.PAYSTACK_PUBLIC_KEY && !hasDemoPaystack;
  
  if (hasDemoPaystack) {
    paymentMode = 'demo';
    console.info('💳 Payment system running in DEMO mode');
    suggestions.push('Set VITE_PAYSTACK_PUBLIC_KEY in .env.local to test real payments');
  } else if (hasRealPaystack) {
    if (envConfig.PAYSTACK_PUBLIC_KEY.startsWith('pk_test_')) {
      paymentMode = 'test';
      console.info('💳 Payment system running in TEST mode with real Paystack');
    } else {
      paymentMode = 'live';
      warnings.push('Using LIVE Paystack keys in development - be careful!');
    }
  } else {
    paymentMode = 'demo';
    warnings.push('No Paystack public key found, using demo mode');
  }
  
  // Check WebSocket configuration
  const wsUrl = envConfig.WEBSOCKET_URL;
  if (wsUrl.includes('localhost') || wsUrl.includes('127.0.0.1')) {
    chatMode = 'local';
    console.info('💬 Chat system connecting to local WebSocket server');
  } else if (wsUrl && wsUrl !== 'ws://localhost:8080') {
    chatMode = 'connected';
    console.info('💬 Chat system connecting to remote WebSocket server');
  } else {
    chatMode = 'mock';
    warnings.push('WebSocket URL not configured, using mock chat');
    suggestions.push('Start the WebSocket server with: npm run start:websocket');
  }
  
  // Check for common development files
  if (typeof window !== 'undefined') {
    const currentUrl = window.location.href;
    
    if (currentUrl.includes('localhost:5173')) {
      console.info('⚡ Running on Vite development server');
    } else if (currentUrl.includes('localhost')) {
      console.info('🖥️ Running on localhost');
    } else {
      warnings.push('Not running on localhost - some features may not work as expected');
    }
  }
  
  // Check browser capabilities
  if (typeof window !== 'undefined') {
    if (!window.crypto || !window.crypto.subtle) {
      errors.push('Web Crypto API not available - encryption features will not work');
    }
    
    if (!('serviceWorker' in navigator)) {
      warnings.push('Service Worker not supported - offline features unavailable');
    }
    
    if (!('Notification' in window)) {
      warnings.push('Web Notifications not supported - push notifications unavailable');
    }
  }
  
  // Show development configuration summary
  if (warnings.length > 0 || suggestions.length > 0) {
    console.group('⚠️ Development Configuration Summary');
    
    if (warnings.length > 0) {
      console.warn('Warnings:');
      warnings.forEach(warning => console.warn(`  • ${warning}`));
    }
    
    if (suggestions.length > 0) {
      console.info('Suggestions:');
      suggestions.forEach(suggestion => console.info(`  💡 ${suggestion}`));
    }
    
    console.groupEnd();
  }
  
  const isConfigured = errors.length === 0;
  
  return {
    isConfigured,
    warnings,
    errors,
    suggestions,
    paymentMode,
    chatMode
  };
}

/**
 * Show development configuration toast
 */
export function showDevelopmentConfigToast(): void {
  if (!envConfig.isDevelopment) return;
  
  const config = checkDevelopmentConfig();
  
  if (!config.isConfigured) {
    toast.error('Development Configuration Issues', {
      description: `${config.errors.length} error(s) found. Check console for details.`,
      action: {
        label: 'Check Console',
        onClick: () => {
          console.group('🚨 Development Configuration Errors');
          config.errors.forEach(error => console.error(`❌ ${error}`));
          console.groupEnd();
        }
      }
    });
    return;
  }
  
  if (config.warnings.length > 0) {
    toast.warning('Development Configuration', {
      description: `Running in ${config.paymentMode} payment mode, ${config.chatMode} chat mode`,
      action: {
        label: 'Details',
        onClick: () => {
          console.group('⚠️ Development Configuration Details');
          console.log('Payment Mode:', config.paymentMode);
          console.log('Chat Mode:', config.chatMode);
          if (config.warnings.length > 0) {
            console.warn('Warnings:', config.warnings);
          }
          if (config.suggestions.length > 0) {
            console.info('Suggestions:', config.suggestions);
          }
          console.groupEnd();
        }
      }
    });
  } else {
    toast.success('Development Environment Ready', {
      description: `Payment: ${config.paymentMode} | Chat: ${config.chatMode}`
    });
  }
}

/**
 * Get safe configuration for components
 */
export function getSafeConfig() {
  const config = checkDevelopmentConfig();
  
  return {
    // Payment configuration
    payment: {
      mode: config.paymentMode,
      isDemo: config.paymentMode === 'demo',
      isTest: config.paymentMode === 'test',
      isLive: config.paymentMode === 'live',
      publicKey: envConfig.PAYSTACK_PUBLIC_KEY || 'pk_test_demo_key_for_development'
    },
    
    // Chat configuration
    chat: {
      mode: config.chatMode,
      isMock: config.chatMode === 'mock',
      isLocal: config.chatMode === 'local',
      isConnected: config.chatMode === 'connected',
      websocketUrl: envConfig.WEBSOCKET_URL || 'ws://localhost:8080'
    },
    
    // API configuration
    api: {
      url: envConfig.API_URL || 'http://localhost:8080',
      isLocal: (envConfig.API_URL || '').includes('localhost')
    },
    
    // Environment info
    environment: {
      isDevelopment: envConfig.isDevelopment,
      isProduction: envConfig.isProduction,
      nodeEnv: envConfig.NODE_ENV
    },
    
    // Configuration status
    status: {
      isConfigured: config.isConfigured,
      hasWarnings: config.warnings.length > 0,
      hasErrors: config.errors.length > 0,
      warnings: config.warnings,
      errors: config.errors,
      suggestions: config.suggestions
    }
  };
}

/**
 * Initialize development environment
 * Call this early in the application lifecycle
 */
export function initializeDevelopmentEnvironment(): void {
  if (!envConfig.isDevelopment) return;
  
  console.log('🏠 PropertyHub Development Environment');
  console.log('📅 Build Time:', new Date().toISOString());
  
  // Check configuration
  const config = checkDevelopmentConfig();
  
  // Show configuration status
  setTimeout(() => {
    showDevelopmentConfigToast();
  }, 2000); // Delay to let other components initialize
  
  // Set up development helpers
  if (typeof window !== 'undefined') {
    // Add development utilities to window for debugging
    (window as any).__PROPERTY_HUB_DEV__ = {
      config: getSafeConfig(),
      envConfig,
      checkConfig: checkDevelopmentConfig,
      reloadConfig: () => {
        window.location.reload();
      }
    };
    
    console.info('🔧 Development utilities available at window.__PROPERTY_HUB_DEV__');
  }
  
  // Log configuration summary
  console.group('🔧 Development Configuration Summary');
  console.log('Payment Mode:', config.paymentMode);
  console.log('Chat Mode:', config.chatMode);
  console.log('WebSocket URL:', envConfig.WEBSOCKET_URL);
  console.log('API URL:', envConfig.API_URL);
  console.groupEnd();
}

export default {
  checkDevelopmentConfig,
  showDevelopmentConfigToast,
  getSafeConfig,
  initializeDevelopmentEnvironment
};