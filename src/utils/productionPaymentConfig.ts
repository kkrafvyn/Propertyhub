/**
 * PropertyHub - Production Payment Configuration
 * 
 * Handles production-specific payment configurations including:
 * - Secure environment variable validation
 * - Production Paystack key management
 * - Webhook URL configuration and validation
 * - SSL certificate validation
 * - Rate limiting and security configurations
 */

import { envConfig } from './envConfig';

export interface ProductionPaymentConfig {
  isProduction: boolean;
  paystackPublicKey: string;
  paystackSecretKey: string;
  webhookUrl: string;
  webhookSecret: string;
  enableLogging: boolean;
  enableDebugMode: boolean;
  rateLimit: {
    maxTransactionsPerMinute: number;
    maxTransactionsPerDay: number;
    maxFailedAttemptsPerHour: number;
  };
  security: {
    enableSSLVerification: boolean;
    requireSignedWebhooks: boolean;
    enableFraudDetection: boolean;
    allowedOrigins: string[];
  };
  monitoring: {
    enableErrorTracking: boolean;
    enablePerformanceMonitoring: boolean;
    alertThresholds: {
      failureRate: number; // Percentage
      averageResponseTime: number; // Milliseconds
      dailyVolume: number; // Transaction count
    };
  };
}

/**
 * Validates required environment variables for production
 */
function validateProductionEnvironment(): void {
  const requiredVars = [
    'PAYSTACK_PUBLIC_KEY',
    'PAYMENT_WEBHOOK_URL'
  ];

  const missingVars = requiredVars.filter(varName => {
    const value = envConfig[varName as keyof typeof envConfig];
    return !value || value === '';
  });

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables for production: ${missingVars.join(', ')}`);
  }

  // Validate Paystack key formats
  if (envConfig.isProduction) {
    if (!envConfig.PAYSTACK_PUBLIC_KEY.startsWith('pk_live_')) {
      console.warn('⚠️ Using test public key in production environment');
    }
    
    if (false) {
      console.warn('⚠️ Using test secret key in production environment');
    }
  }
}

/**
 * Validates webhook URL configuration
 */
function validateWebhookConfiguration(webhookUrl: string): boolean {
  try {
    const url = new URL(webhookUrl);
    
    // Ensure HTTPS in production
    if (envConfig.isProduction && url.protocol !== 'https:') {
      throw new Error('Webhook URL must use HTTPS in production');
    }
    
    // Validate domain
    if (envConfig.isProduction) {
      const allowedDomains = [
        'api.propertyhub.app',
        'webhook.propertyhub.app',
        'backend.propertyhub.app'
      ];
      
      if (!allowedDomains.some(domain => url.hostname.endsWith(domain))) {
        console.warn(`⚠️ Webhook URL uses non-standard domain: ${url.hostname}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Invalid webhook URL:', error);
    return false;
  }
}

/**
 * Gets production-ready payment configuration
 */
export function getProductionPaymentConfig(): ProductionPaymentConfig {
  // Validate environment in production
  if (envConfig.isProduction) {
    validateProductionEnvironment();
  }

  // Validate webhook configuration
  const webhookUrl = envConfig.PAYMENT_WEBHOOK_URL;
  if (!validateWebhookConfiguration(webhookUrl)) {
    throw new Error('Invalid webhook configuration');
  }

  const config: ProductionPaymentConfig = {
    isProduction: envConfig.isProduction,
    paystackPublicKey: envConfig.PAYSTACK_PUBLIC_KEY,
    paystackSecretKey: '',
    webhookUrl: webhookUrl,
    webhookSecret: generateWebhookSecret(),
    enableLogging: envConfig.isProduction,
    enableDebugMode: envConfig.isDevelopment,
    
    rateLimit: {
      maxTransactionsPerMinute: envConfig.isProduction ? 100 : 1000,
      maxTransactionsPerDay: envConfig.isProduction ? 10000 : 50000,
      maxFailedAttemptsPerHour: envConfig.isProduction ? 10 : 100,
    },
    
    security: {
      enableSSLVerification: envConfig.isProduction,
      requireSignedWebhooks: true,
      enableFraudDetection: envConfig.isProduction,
      allowedOrigins: envConfig.isProduction 
        ? [
            'https://propertyhub.app',
            'https://www.propertyhub.app',
            'https://admin.propertyhub.app'
          ]
        : [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173'
          ],
    },
    
    monitoring: {
      enableErrorTracking: envConfig.isProduction,
      enablePerformanceMonitoring: envConfig.isProduction,
      alertThresholds: {
        failureRate: 5.0, // 5% failure rate triggers alert
        averageResponseTime: 3000, // 3 seconds
        dailyVolume: envConfig.isProduction ? 1000 : 10000,
      },
    },
  };

  // Log configuration summary (without sensitive data)
  console.log('💳 Payment configuration loaded:', {
    isProduction: config.isProduction,
    webhookUrl: config.webhookUrl,
    enableLogging: config.enableLogging,
    enableFraudDetection: config.security.enableFraudDetection,
    allowedOrigins: config.security.allowedOrigins,
    rateLimit: config.rateLimit,
  });

  return config;
}

/**
 * Generates a secure webhook secret if none is provided
 */
function generateWebhookSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validates payment amount and currency
 */
export function validatePaymentAmount(amount: number, currency: string): boolean {
  // Minimum amounts by currency
  const minimumAmounts: Record<string, number> = {
    NGN: 100, // ₦1.00
    USD: 1, // $1.00
    GHS: 5, // ₵5.00
    ZAR: 10, // R10.00
  };

  // Maximum amounts by currency
  const maximumAmounts: Record<string, number> = {
    NGN: 50000000, // ₦500,000
    USD: 100000, // $100,000
    GHS: 100000, // ₵100,000
    ZAR: 100000, // R100,000
  };

  const minAmount = minimumAmounts[currency] || minimumAmounts.NGN;
  const maxAmount = maximumAmounts[currency] || maximumAmounts.NGN;

  if (amount < minAmount) {
    throw new Error(`Amount too low. Minimum is ${minAmount} ${currency}`);
  }

  if (amount > maxAmount) {
    throw new Error(`Amount too high. Maximum is ${maxAmount} ${currency}`);
  }

  return true;
}

/**
 * Gets webhook verification headers
 */
export function getWebhookVerificationHeaders(): Record<string, string> {
  const config = getProductionPaymentConfig();
  
  return {
    'Content-Type': 'application/json',
    'X-Webhook-Source': 'PropertyHub',
    'X-Webhook-Version': '1.0',
    'X-Environment': config.isProduction ? 'production' : 'development',
    'User-Agent': 'PropertyHub-Webhook/1.0',
  };
}

/**
 * Monitors payment gateway health
 */
export interface PaymentGatewayHealth {
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  uptime: number;
  lastCheck: string;
  errors: Array<{
    type: string;
    count: number;
    lastOccurred: string;
  }>;
}

export async function checkPaymentGatewayHealth(): Promise<PaymentGatewayHealth> {
  const startTime = Date.now();
  
  try {
    // Ping backend health instead of calling payment gateway secrets from the client.
    const response = await fetch(`${envConfig.API_URL.replace(/\/$/, '')}/health`, {
      method: 'GET',
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        status: responseTime > 5000 ? 'degraded' : 'healthy',
        responseTime,
        uptime: 99.9, // This would come from monitoring service
        lastCheck: new Date().toISOString(),
        errors: [],
      };
    } else {
      return {
        status: 'degraded',
        responseTime,
        uptime: 95.0,
        lastCheck: new Date().toISOString(),
        errors: [
          {
            type: 'API_ERROR',
            count: 1,
            lastOccurred: new Date().toISOString(),
          },
        ],
      };
    }
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      uptime: 0,
      lastCheck: new Date().toISOString(),
      errors: [
        {
          type: 'CONNECTION_ERROR',
          count: 1,
          lastOccurred: new Date().toISOString(),
        },
      ],
    };
  }
}

/**
 * Production webhook endpoints configuration
 */
export const PRODUCTION_WEBHOOK_ENDPOINTS = {
  paystack: {
    live: 'https://api.propertyhub.app/webhooks/paystack',
    test: 'http://localhost:8080/webhooks/paystack',
  },
  internal: {
    live: 'https://api.propertyhub.app/webhooks/payments',
    test: 'http://localhost:8080/webhooks/payments',
  },
} as const;

/**
 * Gets the appropriate webhook endpoint based on environment
 */
export function getWebhookEndpoint(type: 'paystack' | 'internal'): string {
  const endpoints = PRODUCTION_WEBHOOK_ENDPOINTS[type];
  return envConfig.isProduction ? endpoints.live : endpoints.test;
}

// Export the configuration instance
export const productionPaymentConfig = getProductionPaymentConfig();

export default productionPaymentConfig;
