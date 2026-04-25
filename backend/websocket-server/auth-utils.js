/**
 * PropertyHub Authentication & Security Utilities
 * 
 * Middleware, helpers, and security functions for the backend API
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Generate JWT token for user
 */
const generateToken = (userId, role = 'user', expiresIn = JWT_EXPIRATION) => {
  return jwt.sign(
    { userId, role, iat: Date.now() },
    JWT_SECRET,
    { expiresIn }
  );
};

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Extract token from Authorization header
 */
const extractToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.REFRESH_TOKEN_SECRET || JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Hash password
 */
const hashPassword = async (password) => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hash
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
const authenticate = (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No authentication token provided'
      });
    }

    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.tokenIat = decoded.iat;
    
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Role-based access control middleware
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(401).json({
        success: false,
        error: 'User role not set'
      });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Rate limiting middleware helper
 */
const createRateLimiter = (maxRequests = 100, windowMs = 60000) => {
  const store = new Map();

  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress;
    const now = Date.now();
    
    if (!store.has(key)) {
      store.set(key, []);
    }

    const timestamps = store.get(key).filter(t => now - t < windowMs);
    
    if (timestamps.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later'
      });
    }

    timestamps.push(now);
    store.set(key, timestamps);
    
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - timestamps.length);
    res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

    next();
  };
};

// ============================================================================
// WEBHOOK SECURITY
// ============================================================================

/**
 * Verify Paystack webhook signature
 */
const verifyPaystackWebhook = (req, secret) => {
  const hash = crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  return hash === req.headers['x-paystack-signature'];
};

/**
 * Verify Flutterwave webhook signature
 */
const verifyFlutterwaveWebhook = (req, secret) => {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  return hash === req.headers['verifyHash'];
};

/**
 * Generic webhook verification middleware
 */
const verifyWebhookSignature = (provider) => {
  return (req, res, next) => {
    let isValid = false;

    switch (provider) {
      case 'paystack':
        isValid = verifyPaystackWebhook(req, process.env.PAYSTACK_WEBHOOK_SECRET);
        break;
      case 'flutterwave':
        isValid = verifyFlutterwaveWebhook(req, process.env.FLUTTERWAVE_WEBHOOK_SECRET);
        break;
      case 'twilio':
        isValid = verifyTwilioSignature(req);
        break;
      default:
        isValid = false;
    }

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook signature'
      });
    }

    next();
  };
};

// ============================================================================
// ENCRYPTION UTILITIES
// ============================================================================

/**
 * Encrypt sensitive data
 */
const encrypt = (text, encryptionKey = process.env.ENCRYPTION_KEY) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(encryptionKey, 'hex').slice(0, 32),
    iv
  );

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
};

/**
 * Decrypt sensitive data
 */
const decrypt = (encryptedText, encryptionKey = process.env.ENCRYPTION_KEY) => {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(encryptionKey, 'hex').slice(0, 32),
    iv
  );

  let decrypted = decipher.update(parts[1], 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 */
const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone);
};

/**
 * Sanitize user input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>"']/g, '') // Remove HTML characters
    .replace(/\\/g, '') // Remove backslashes
    .slice(0, 1000); // Limit length
};

/**
 * Validate payment amount
 */
const isValidPaymentAmount = (amount) => {
  return typeof amount === 'number' && amount > 0 && amount <= 999999999;
};

// ============================================================================
// SUPABASE UTILITIES
// ============================================================================

/**
 * Initialize Supabase client with authentication
 */
const initSupabaseWithAuth = (accessToken) => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );

  // Set auth token
  if (accessToken) {
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: '',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: null
    });
  }

  return supabase;
};

/**
 * Verify user exists in Supabase
 */
const verifyUserExists = async (userId) => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return !!data;
};

// ============================================================================
// ERROR UTILITIES
// ============================================================================

/**
 * API Error class
 */
class APIError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Create standardized error response
 */
const createErrorResponse = (error) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let details = null;

  if (error instanceof APIError) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
  } else if (error.message) {
    message = error.message;
  }

  return {
    success: false,
    error: message,
    ...(details && { details }),
    timestamp: new Date().toISOString()
  };
};

// ============================================================================
// DATA VALIDATION SCHEMAS
// ============================================================================

/**
 * Payment validation schema
 */
const paymentSchema = {
  validate: (data) => {
    const errors = [];

    if (!data.amount || !isValidPaymentAmount(data.amount)) {
      errors.push('Invalid payment amount');
    }

    if (!data.email || !isValidEmail(data.email)) {
      errors.push('Invalid email address');
    }

    if (!['paystack', 'flutterwave', 'bank_transfer'].includes(data.paymentMethod)) {
      errors.push('Invalid payment method');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

/**
 * Message validation schema
 */
const messageSchema = {
  validate: (data) => {
    const errors = [];

    if (!data.conversationId) {
      errors.push('Missing conversation ID');
    }

    if (!data.content || typeof data.content !== 'string' || data.content.trim().length === 0) {
      errors.push('Message content is required');
    }

    if (data.content.length > 10000) {
      errors.push('Message too long (max 10000 characters)');
    }

    if (!['text', 'image', 'document', 'audio', 'video'].includes(data.messageType)) {
      errors.push('Invalid message type');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

/**
 * Verification validation schema
 */
const verificationSchema = {
  validate: (data) => {
    const errors = [];

    if (!['id_verification', 'address_verification', 'professional_verification'].includes(data.verificationType)) {
      errors.push('Invalid verification type');
    }

    if (!data.documentType) {
      errors.push('Document type is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  // Tokens
  generateToken,
  verifyToken,
  extractToken,
  generateRefreshToken,
  
  // Password
  hashPassword,
  comparePassword,
  
  // Middleware
  authenticate,
  authorize,
  createRateLimiter,
  
  // Webhooks
  verifyPaystackWebhook,
  verifyFlutterwaveWebhook,
  verifyWebhookSignature,
  
  // Encryption
  encrypt,
  decrypt,
  
  // Validation
  isValidEmail,
  isValidPhoneNumber,
  isValidPaymentAmount,
  sanitizeInput,
  
  // Supabase
  initSupabaseWithAuth,
  verifyUserExists,
  
  // Errors
  APIError,
  createErrorResponse,
  
  // Schemas
  paymentSchema,
  messageSchema,
  verificationSchema
};
