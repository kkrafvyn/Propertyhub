import { getSupabaseFunctionUrl } from '../services/supabaseProject';

export interface EnvironmentConfig {
  WEBSOCKET_URL: string;
  API_URL: string;
  VAPID_PUBLIC_KEY: string;
  PAYSTACK_PUBLIC_KEY: string;
  PAYMENT_WEBHOOK_URL: string;
  MONITORING_ENDPOINT: string;
  NODE_ENV: string;
  isDevelopment: boolean;
  isProduction: boolean;
  isLocalHost: boolean;
}

const readRawEnv = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const viteValue = import.meta.env[`VITE_${key}`];
    if (typeof viteValue === 'string') {
      return viteValue.trim();
    }
  }

  if (typeof process !== 'undefined' && process.env) {
    const reactValue = process.env[`REACT_APP_${key}`];
    if (typeof reactValue === 'string') {
      return reactValue.trim();
    }
  }

  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    const windowValue = (window as any).__ENV__[key];
    if (typeof windowValue === 'string') {
      return windowValue.trim();
    }
  }

  return '';
};

const isPlaceholderValue = (value: string): boolean =>
  value.length === 0 ||
  value.includes('your-') ||
  value.includes('placeholder') ||
  value.includes('example.com') ||
  value === 'pk_test_demo_key_for_development' ||
  value === 'pk_test_demo';

const getEnvironment = (): 'development' | 'production' | 'test' => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.MODE) {
    const mode = String(import.meta.env.MODE).toLowerCase();
    if (mode === 'production') return 'production';
    if (mode === 'test') return 'test';
    return 'development';
  }

  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    const nodeEnv = String(process.env.NODE_ENV).toLowerCase();
    if (nodeEnv === 'production') return 'production';
    if (nodeEnv === 'test') return 'test';
    return 'development';
  }

  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'development'
      : 'production';
  }

  return 'production';
};

const NODE_ENV = getEnvironment();
const isDevelopment = NODE_ENV === 'development';
const isProduction = NODE_ENV === 'production';
const isLocalHost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const supabaseFunctionUrl = getSupabaseFunctionUrl();

const resolveApiUrl = (): string => {
  const configured = readRawEnv('API_URL');
  if (!isPlaceholderValue(configured)) {
    return configured.replace(/\/$/, '');
  }

  if (supabaseFunctionUrl) {
    return supabaseFunctionUrl.replace(/\/$/, '');
  }

  if (isLocalHost) {
    return 'http://localhost:8080';
  }

  return '';
};

const resolveWebSocketUrl = (): string => {
  const configured = readRawEnv('WEBSOCKET_URL');
  if (!isPlaceholderValue(configured)) {
    return configured.replace(/\/$/, '');
  }

  const apiUrl = resolveApiUrl();
  if (apiUrl) {
    return apiUrl.replace(/^http/i, 'ws').replace(/\/$/, '');
  }

  if (isLocalHost) {
    return 'ws://localhost:8080';
  }

  return '';
};

const resolvePaymentWebhookUrl = (): string => {
  const configured = readRawEnv('PAYMENT_WEBHOOK_URL');
  if (!isPlaceholderValue(configured)) {
    return configured.replace(/\/$/, '');
  }

  if (isLocalHost) {
    return 'http://localhost:8080/webhooks/paystack';
  }

  return '';
};

export const envConfig: EnvironmentConfig = {
  WEBSOCKET_URL: resolveWebSocketUrl(),
  API_URL: resolveApiUrl(),
  VAPID_PUBLIC_KEY: readRawEnv('VAPID_PUBLIC_KEY'),
  PAYSTACK_PUBLIC_KEY: isPlaceholderValue(readRawEnv('PAYSTACK_PUBLIC_KEY'))
    ? ''
    : readRawEnv('PAYSTACK_PUBLIC_KEY'),
  PAYMENT_WEBHOOK_URL: resolvePaymentWebhookUrl(),
  MONITORING_ENDPOINT: isPlaceholderValue(readRawEnv('MONITORING_ENDPOINT'))
    ? ''
    : readRawEnv('MONITORING_ENDPOINT'),
  NODE_ENV,
  isDevelopment,
  isProduction,
  isLocalHost,
};

export function getEnv(key: keyof EnvironmentConfig): string | boolean {
  return envConfig[key];
}

if (typeof console !== 'undefined' && isDevelopment) {
  console.log('Environment configuration', {
    NODE_ENV: envConfig.NODE_ENV,
    API_URL: envConfig.API_URL || '[missing]',
    WEBSOCKET_URL: envConfig.WEBSOCKET_URL || '[missing]',
    PAYMENT_WEBHOOK_URL: envConfig.PAYMENT_WEBHOOK_URL || '[missing]',
    VAPID_PUBLIC_KEY: envConfig.VAPID_PUBLIC_KEY ? '[set]' : '[missing]',
    PAYSTACK_PUBLIC_KEY: envConfig.PAYSTACK_PUBLIC_KEY ? '[set]' : '[missing]',
    MONITORING_ENDPOINT: envConfig.MONITORING_ENDPOINT || '[missing]',
  });
}

if (typeof console !== 'undefined' && isProduction) {
  if (!envConfig.API_URL) {
    console.error('VITE_API_URL is required in production.');
  }

  if (!envConfig.PAYSTACK_PUBLIC_KEY) {
    console.error('VITE_PAYSTACK_PUBLIC_KEY is required in production.');
  }
}

export default envConfig;
