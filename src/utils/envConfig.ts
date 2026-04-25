/**
 * Environment Configuration Utility
 * 
 * Provides browser-safe access to environment variables
 * across different build tools (Vite, Webpack, etc.)
 */

export interface EnvironmentConfig {
  WEBSOCKET_URL: string;
  API_URL: string;
  VAPID_PUBLIC_KEY: string;
  PAYSTACK_PUBLIC_KEY: string;
  PAYMENT_WEBHOOK_URL: string;
  NODE_ENV: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

/**
 * Get environment variable with fallbacks for different build systems
 */
function getEnvVar(key: string, fallback: string = ''): string {
  // Try Vite environment variables (VITE_*)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const viteKey = `VITE_${key}`;
    if (import.meta.env[viteKey]) {
      return import.meta.env[viteKey] as string;
    }
  }

  // Try React/CRA environment variables (REACT_APP_*)
  if (typeof process !== 'undefined' && process.env) {
    const reactKey = `REACT_APP_${key}`;
    if (process.env[reactKey]) {
      return process.env[reactKey] as string;
    }
  }

  // Try window environment variables (injected at build time)
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    const windowEnv = (window as any).__ENV__[key];
    if (windowEnv) {
      return windowEnv;
    }
  }

  // Try runtime environment detection
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Auto-detect websocket URL based on current host
    if (key === 'WEBSOCKET_URL') {
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'ws://localhost:8080';
      } else {
        const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
        return `${wsProtocol}//${hostname}/ws`;
      }
    }

    // Auto-detect API URL
    if (key === 'API_URL') {
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:8080';
      } else {
        return `${protocol}//${hostname}/api`;
      }
    }
  }

  return fallback;
}

/**
 * Get current environment
 */
function getEnvironment(): 'development' | 'production' | 'test' {
  // Try Vite
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const mode = import.meta.env.MODE;
    if (mode === 'production') return 'production';
    if (mode === 'test') return 'test';
    return 'development';
  }

  // Try Node.js
  if (typeof process !== 'undefined' && process.env) {
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'production') return 'production';
    if (nodeEnv === 'test') return 'test';
    return 'development';
  }

  // Try window
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    }
  }

  return 'production';
}

/**
 * Export environment configuration
 */
export const envConfig: EnvironmentConfig = {
  WEBSOCKET_URL: getEnvVar('WEBSOCKET_URL', 'ws://localhost:8080'),
  API_URL: getEnvVar('API_URL', 'http://localhost:8080'),
  VAPID_PUBLIC_KEY: getEnvVar('VAPID_PUBLIC_KEY', ''),
  PAYSTACK_PUBLIC_KEY: getEnvVar('PAYSTACK_PUBLIC_KEY', 'pk_test_demo_key_for_development'),
  PAYMENT_WEBHOOK_URL: getEnvVar('PAYMENT_WEBHOOK_URL', 'http://localhost:8080/webhooks/paystack'),
  NODE_ENV: getEnvironment(),
  isDevelopment: getEnvironment() === 'development',
  isProduction: getEnvironment() === 'production'
};

/**
 * Helper function to safely get environment variables
 */
export function getEnv(key: keyof EnvironmentConfig): string | boolean {
  return envConfig[key];
}

/**
 * Debug environment configuration (development only)
 */
if (envConfig.isDevelopment && typeof console !== 'undefined') {
  const isDemoMode = envConfig.PAYSTACK_PUBLIC_KEY === 'pk_test_demo_key_for_development';
  
  console.log('🔧 Environment Configuration:', {
    NODE_ENV: envConfig.NODE_ENV,
    API_URL: envConfig.API_URL,
    WEBSOCKET_URL: envConfig.WEBSOCKET_URL,
    PAYMENT_WEBHOOK_URL: envConfig.PAYMENT_WEBHOOK_URL,
    VAPID_PUBLIC_KEY: envConfig.VAPID_PUBLIC_KEY ? '[SET]' : '[NOT SET]',
    PAYSTACK_PUBLIC_KEY: isDemoMode ? '[DEMO MODE]' : '[SET]',
    isDevelopment: envConfig.isDevelopment,
    isProduction: envConfig.isProduction
  });
  
  if (isDemoMode) {
    console.info('ℹ️ Payment system running in demo mode. Payments will be simulated.');
    console.info('💡 To use real payments, keep only the public key in the client and configure gateway secrets on the backend.');
  }
}

export default envConfig;
