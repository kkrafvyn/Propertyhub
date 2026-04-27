/**
 * PropertyHub - Webhook Security Configuration
 * 
 * Production-ready webhook security implementation for payment processing.
 * Ensures secure communication between payment gateways and your backend.
 */

import crypto from 'crypto';
import { productionPaymentConfig } from './productionPaymentConfig';
import { sendMonitoringEvent } from './monitoring';

export interface WebhookVerificationResult {
  isValid: boolean;
  error?: string;
  timestamp?: number;
  source?: string;
}

export interface WebhookSecurityConfig {
  enableSignatureVerification: boolean;
  enableTimestampValidation: boolean;
  enableIPWhitelisting: boolean;
  timestampToleranceSeconds: number;
  allowedIPs: string[];
  paystackIPs: string[];
  webhookSecrets: Record<string, string>;
}

/**
 * Production webhook security configuration
 */
export const webhookSecurityConfig: WebhookSecurityConfig = {
  enableSignatureVerification: true,
  enableTimestampValidation: productionPaymentConfig.isProduction,
  enableIPWhitelisting: productionPaymentConfig.isProduction,
  timestampToleranceSeconds: 300, // 5 minutes
  
  // Paystack webhook IP addresses (as of 2024)
  paystackIPs: [
    '52.31.139.75',
    '52.49.173.169',
    '52.214.14.220',
    '18.201.63.9',
    '3.250.176.89',
    '52.214.213.179'
  ],
  
  // Allow local IPs for development
  allowedIPs: productionPaymentConfig.isProduction 
    ? [
        // Paystack IPs
        '52.31.139.75',
        '52.49.173.169',
        '52.214.14.220',
        '18.201.63.9',
        '3.250.176.89',
        '52.214.213.179',
        // Your server IPs (add your production server IPs here)
        // '203.0.113.0/24', // Example IP range
      ]
    : [
        '127.0.0.1',
        '::1',
        'localhost'
      ],
  
  webhookSecrets: {
    paystack: productionPaymentConfig.paystackSecretKey,
    internal: productionPaymentConfig.webhookSecret,
  }
};

/**
 * Verifies Paystack webhook signature
 */
export function verifyPaystackWebhook(
  payload: string | Buffer,
  signature: string,
  secret?: string
): WebhookVerificationResult {
  try {
    const webhookSecret = secret || webhookSecurityConfig.webhookSecrets.paystack;
    
    if (!webhookSecret) {
      return {
        isValid: false,
        error: 'Webhook secret not configured'
      };
    }

    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha512', webhookSecret)
      .update(payload instanceof Buffer ? payload.toString('utf8') : payload)
      .digest('hex');

    // Compare signatures using timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );

    return {
      isValid,
      error: isValid ? undefined : 'Invalid signature',
      source: 'paystack'
    };

  } catch (error) {
    return {
      isValid: false,
      error: `Signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      source: 'paystack'
    };
  }
}

/**
 * Verifies internal webhook signature with timestamp validation
 */
export function verifyInternalWebhook(
  payload: string | Buffer,
  signature: string,
  timestamp?: string,
  secret?: string
): WebhookVerificationResult {
  try {
    const webhookSecret = secret || webhookSecurityConfig.webhookSecrets.internal;
    
    if (!webhookSecret) {
      return {
        isValid: false,
        error: 'Internal webhook secret not configured'
      };
    }

    // Validate timestamp if provided and timestamp validation is enabled
    if (webhookSecurityConfig.enableTimestampValidation && timestamp) {
      const timestampNum = parseInt(timestamp, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      const timeDiff = Math.abs(currentTime - timestampNum);

      if (timeDiff > webhookSecurityConfig.timestampToleranceSeconds) {
        return {
          isValid: false,
          error: 'Timestamp outside tolerance window',
          timestamp: timestampNum,
          source: 'internal'
        };
      }
    }

    // Prepare payload for signature generation
    const signaturePayload = timestamp 
      ? `${timestamp}.${payload}`
      : payload.toString();

    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signaturePayload)
      .digest('hex');

    // Extract signature from header (format: "sha256=<signature>")
    const providedSignature = signature.replace('sha256=', '');

    // Compare signatures using timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );

    return {
      isValid,
      error: isValid ? undefined : 'Invalid signature',
      timestamp: timestamp ? parseInt(timestamp, 10) : undefined,
      source: 'internal'
    };

  } catch (error) {
    return {
      isValid: false,
      error: `Internal webhook verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      source: 'internal'
    };
  }
}

/**
 * Validates webhook source IP address
 */
export function validateWebhookIP(ipAddress: string): boolean {
  if (!webhookSecurityConfig.enableIPWhitelisting) {
    return true;
  }

  // Normalize IP address (handle X-Forwarded-For, X-Real-IP headers)
  const normalizedIP = normalizeIPAddress(ipAddress);

  return webhookSecurityConfig.allowedIPs.some(allowedIP => {
    // Check for exact match
    if (allowedIP === normalizedIP) {
      return true;
    }

    // Check for CIDR range (basic implementation)
    if (allowedIP.includes('/')) {
      return isIPInCIDR(normalizedIP, allowedIP);
    }

    return false;
  });
}

/**
 * Normalizes IP address from various header formats
 */
function normalizeIPAddress(ipAddress: string): string {
  // Handle X-Forwarded-For header (comma-separated list)
  if (ipAddress.includes(',')) {
    return ipAddress.split(',')[0].trim();
  }

  // Handle IPv6 mapped IPv4 addresses
  if (ipAddress.startsWith('::ffff:')) {
    return ipAddress.replace('::ffff:', '');
  }

  return ipAddress.trim();
}

/**
 * Basic CIDR range check (for production, consider using a proper IP library)
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  try {
    const [network, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength, 10);

    // Convert IP addresses to numbers for comparison
    const ipNum = ipToNumber(ip);
    const networkNum = ipToNumber(network);
    
    // Calculate subnet mask
    const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
    
    return (ipNum & mask) === (networkNum & mask);
  } catch (error) {
    console.error('CIDR validation error:', error);
    return false;
  }
}

/**
 * Converts IPv4 address to number
 */
function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Generates secure webhook signature for outgoing webhooks
 */
export function generateWebhookSignature(
  payload: string | Buffer,
  secret: string,
  timestamp?: number
): string {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const signaturePayload = `${ts}.${payload}`;
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');

  return `sha256=${signature}`;
}

/**
 * Middleware factory for Express.js webhook verification
 */
export function createWebhookVerificationMiddleware(
  webhookType: 'paystack' | 'internal' = 'paystack'
) {
  return (req: any, res: any, next: any) => {
    try {
      // Get IP address from request
      const ipAddress = req.ip || 
                       req.connection.remoteAddress || 
                       req.headers['x-forwarded-for'] || 
                       req.headers['x-real-ip'];

      // Validate IP if IP whitelisting is enabled
      if (!validateWebhookIP(ipAddress)) {
        console.warn(`Webhook rejected from unauthorized IP: ${ipAddress}`);
        return res.status(403).json({ error: 'Unauthorized IP address' });
      }

      // Get signature from headers
      const signature = webhookType === 'paystack' 
        ? req.headers['x-paystack-signature']
        : req.headers['x-webhook-signature'];

      if (!signature) {
        console.warn('Webhook signature missing');
        return res.status(400).json({ error: 'Webhook signature required' });
      }

      // Get timestamp for internal webhooks
      const timestamp = req.headers['x-webhook-timestamp'];

      // Verify signature
      const verification = webhookType === 'paystack'
        ? verifyPaystackWebhook(req.body, signature)
        : verifyInternalWebhook(req.body, signature, timestamp);

      if (!verification.isValid) {
        console.warn(`Webhook verification failed: ${verification.error}`);
        return res.status(401).json({ error: verification.error });
      }

      // Add verification result to request for logging
      req.webhookVerification = verification;

      next();

    } catch (error) {
      console.error('Webhook verification middleware error:', error);
      res.status(500).json({ error: 'Webhook verification failed' });
    }
  };
}

/**
 * Logs webhook security events for monitoring
 */
export function logWebhookSecurityEvent(
  event: 'verification_success' | 'verification_failed' | 'ip_blocked' | 'timestamp_invalid',
  details: {
    ipAddress?: string;
    userAgent?: string;
    signature?: string;
    timestamp?: number;
    error?: string;
    webhookType?: string;
  }
): void {
  const logEntry = {
    event,
    timestamp: new Date().toISOString(),
    environment: productionPaymentConfig.isProduction ? 'production' : 'development',
    ...details
  };

  void sendMonitoringEvent({
    type: 'webhook_security',
    name: event,
    payload: logEntry,
    timestamp: new Date().toISOString(),
  });

  // In production, send to monitoring service
  if (productionPaymentConfig.isProduction) {
    // TODO: Send to monitoring service (e.g., Sentry, LogRocket, DataDog)
    console.log('🔒 Webhook Security Event:', logEntry);
  } else {
    console.log('🔒 Webhook Security Event:', logEntry);
  }
}

/**
 * Production webhook URL configuration
 */
export const PRODUCTION_WEBHOOK_URLS = {
  paystack: {
    live: 'https://api.propertyhub.app/webhooks/paystack',
    test: 'https://api-staging.propertyhub.app/webhooks/paystack'
  },
  internal: {
    live: 'https://api.propertyhub.app/webhooks/payments',
    test: 'https://api-staging.propertyhub.app/webhooks/payments'
  }
} as const;

/**
 * Gets the appropriate webhook URL based on environment
 */
export function getWebhookURL(type: 'paystack' | 'internal', useTestURL: boolean = false): string {
  const urls = PRODUCTION_WEBHOOK_URLS[type];
  
  if (productionPaymentConfig.isProduction && !useTestURL) {
    return urls.live;
  } else {
    return urls.test;
  }
}

export default {
  webhookSecurityConfig,
  verifyPaystackWebhook,
  verifyInternalWebhook,
  validateWebhookIP,
  generateWebhookSignature,
  createWebhookVerificationMiddleware,
  logWebhookSecurityEvent,
  getWebhookURL
};
