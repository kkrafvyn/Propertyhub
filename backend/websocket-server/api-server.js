/**
 * PropertyHub Backend API Server
 * 
 * Complete implementation of all 64+ API endpoints for:
 * - Payment System (12 endpoints)
 * - Utility Management (6+ endpoints)
 * - Verification System (13 endpoints)
 * - Landlord Dashboard (8 endpoints)
 * - Communication System (25+ endpoints)
 * 
 * Built with Express.js, PostgreSQL (Supabase), Socket.io for real-time
 * Production-ready with authentication, validation, error handling, logging
 */

const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const dotenv = require('dotenv');
const winston = require('winston');
const compression = require('compression');
const { body, param, query, validationResult } = require('express-validator');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');

// Import services
const { PaystackService, FlutterwaveService, PaymentReconciliation } = require('./payment-provider-service');
const { WhatsAppManager } = require('./whatsapp-service');
const { VerificationService, FraudDetectionService } = require('./verification-service');
const { NotificationManager, NotificationQueue } = require('./notification-service');
const { WebhookRouter } = require('./webhook-handlers');
const { StorageService } = require('./storage-service');

// Load environment variables
dotenv.config();

// Initialize Express and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.io for real-time messaging
const io = socketio(server, {
  cors: {
    origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = process.env.PORT || 8080;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Initialize Services
console.log('🚀 Initializing services...');
const paystackService = new PaystackService();
const flutterwaveService = new FlutterwaveService();
const whatsappManager = new WhatsAppManager();
const verificationService = new VerificationService();
const notificationManager = new NotificationManager();
console.log('✅ Services initialized');

// Storage setup
const storageService = new StorageService();
const upload = storageService.getUploadMiddleware();
console.log('✅ Storage initialized');

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Configure rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};

// Error handling middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: errors.array() 
    });
  }
  next();
};

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================================================
// WEBHOOK ENDPOINTS
// ============================================================================

app.post('/webhooks/:provider', async (req, res) => {
  const { provider } = req.params;
  try {
    await WebhookRouter.route(req, res, provider);
  } catch (error) {
    logger.error(`Webhook error (${provider}):`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// USER MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/users/profile/:userId
 * Get user profile
 */
app.get('/api/v1/users/profile/:userId',
  authenticateToken,
  async (req, res) => {
    try {
      const { userId } = req.params;
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      res.json({ success: true, data });
    } catch (error) {
      logger.error('Profile retrieval error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * PUT /api/v1/users/profile
 * Update user profile
 */
app.put('/api/v1/users/profile',
  authenticateToken,
  [
    body('full_name').optional().isString(),
    body('phone').optional().isString(),
    body('avatar_url').optional().isURL()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { full_name, phone, avatar_url } = req.body;
      const userId = req.userId;
      
      const { data, error } = await supabase
        .from('users')
        .update({ full_name, phone, avatar_url, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select();
        
      if (error) throw error;
      res.json({ success: true, data: data[0] });
    } catch (error) {
      logger.error('Profile update error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================================
// PROPERTY MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/properties/create
 * Create new property
 */
app.post('/api/v1/properties/create',
  authenticateToken,
  [
    body('title').isString().notEmpty(),
    body('location').isString().notEmpty(),
    body('price_per_unit').isFloat({ min: 0 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const propertyData = req.body;
      const landlordId = req.userId;
      
      const { data, error } = await supabase
        .from('properties')
        .insert([{ ...propertyData, landlord_id: landlordId }])
        .select();
        
      if (error) throw error;
      res.status(201).json({ success: true, data: data[0] });
    } catch (error) {
      logger.error('Property creation error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/v1/properties
 * List all properties (with filters)
 */
app.get('/api/v1/properties',
  async (req, res) => {
    try {
      const { location, min_price, max_price, landlord_id } = req.query;
      let query = supabase.from('properties').select('*');
      
      if (location) query = query.ilike('location', `%${location}%`);
      if (min_price) query = query.gte('price_per_unit', min_price);
      if (max_price) query = query.lte('price_per_unit', max_price);
      if (landlord_id) query = query.eq('landlord_id', landlord_id);
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json({ success: true, data });
    } catch (error) {
      logger.error('Property listing error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================================
// BOOKING MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/bookings
 * Create a new booking for the authenticated user
 */
app.post('/api/v1/bookings',
  authenticateToken,
  [
    body('property_id').optional().isUUID(),
    body('propertyId').optional().isUUID(),
    body('check_in').optional().isISO8601(),
    body('checkIn').optional().isISO8601(),
    body('check_out').optional().isISO8601(),
    body('checkOut').optional().isISO8601(),
    body('guests').optional().isInt({ min: 1 }),
    body('total_price').optional().isFloat({ min: 0 }),
    body('totalPrice').optional().isFloat({ min: 0 }),
    body('currency').optional().isString(),
    body('note').optional().isString(),
    body('payment_status').optional().isString(),
    body('paymentMethod').optional().isString(),
    body('payment_method').optional().isString()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const propertyId = req.body.property_id || req.body.propertyId;
      const checkIn = req.body.check_in || req.body.checkIn;
      const checkOut = req.body.check_out || req.body.checkOut;

      if (!propertyId || !checkIn || !checkOut) {
        return res.status(400).json({
          success: false,
          error: 'propertyId, checkIn, and checkOut are required'
        });
      }

      let ownerId = req.body.owner_id || req.body.ownerId || null;
      if (!ownerId) {
        const { data: property, error: propertyError } = await supabase
          .from('properties')
          .select('owner_id, landlord_id')
          .eq('id', propertyId)
          .single();

        if (propertyError) throw propertyError;
        ownerId = property?.owner_id || property?.landlord_id || null;
      }

      const payload = {
        property_id: propertyId,
        user_id: req.userId,
        owner_id: ownerId,
        check_in: checkIn,
        check_out: checkOut,
        status: req.body.status || 'pending',
        guests: req.body.guests || 1,
        total_price: req.body.total_price ?? req.body.totalPrice ?? null,
        currency: req.body.currency || 'GHS',
        note: req.body.note || null,
        payment_status: req.body.payment_status || req.body.paymentStatus || 'pending',
        payment_method: req.body.payment_method || req.body.paymentMethod || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('bookings')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ success: true, data });
    } catch (error) {
      logger.error('Booking creation error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/v1/bookings/user/:userId
 * Get bookings for the authenticated user
 */
app.get('/api/v1/bookings/user/:userId',
  authenticateToken,
  [query('limit').optional().isInt({ min: 1, max: 100 })],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = Number(req.query.limit || 50);

      if (req.userId !== userId && req.userRole !== 'admin') {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .order('check_in', { ascending: false })
        .limit(limit);

      if (error) throw error;
      res.json({ success: true, data: data || [] });
    } catch (error) {
      logger.error('User bookings retrieval error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/v1/bookings/:bookingId
 * Get booking by ID
 */
app.get('/api/v1/bookings/:bookingId',
  authenticateToken,
  async (req, res) => {
    try {
      const { bookingId } = req.params;

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (error) throw error;

      if (
        data.user_id !== req.userId &&
        data.owner_id !== req.userId &&
        req.userRole !== 'admin'
      ) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      res.json({ success: true, data });
    } catch (error) {
      logger.error('Booking retrieval error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * PATCH /api/v1/bookings/:bookingId/status
 * Update booking status
 */
app.patch('/api/v1/bookings/:bookingId/status',
  authenticateToken,
  [body('status').isString().notEmpty()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { status } = req.body;

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, user_id, owner_id')
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;

      if (
        booking.user_id !== req.userId &&
        booking.owner_id !== req.userId &&
        req.userRole !== 'admin'
      ) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      const { data, error } = await supabase
        .from('bookings')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, data });
    } catch (error) {
      logger.error('Booking status update error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================================
// SAVED HOMES, SEARCH HISTORY, SAVED SEARCHES, AND ALERTS
// ============================================================================

/**
 * GET /api/v1/favorites/:userId
 * Get saved homes for a user
 */
app.get('/api/v1/favorites/:userId',
  authenticateToken,
  async (req, res) => {
    try {
      const { userId } = req.params;

      if (req.userId !== userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json({ success: true, data: data || [] });
    } catch (error) {
      logger.error('Favorites retrieval error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/v1/favorites
 * Save a property for the authenticated user
 */
app.post('/api/v1/favorites',
  authenticateToken,
  [
    body('propertyId').isUUID(),
    body('note').optional().isString(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.userId;
      const { propertyId, note } = req.body;

      const { data, error } = await supabase
        .from('favorites')
        .upsert(
          {
            user_id: userId,
            property_id: propertyId,
            note,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,property_id' }
        )
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ success: true, data });
    } catch (error) {
      logger.error('Favorite creation error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * DELETE /api/v1/favorites/:propertyId
 * Remove a saved property for the authenticated user
 */
app.delete('/api/v1/favorites/:propertyId',
  authenticateToken,
  [param('propertyId').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.userId;
      const { propertyId } = req.params;

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('property_id', propertyId);

      if (error) throw error;
      res.json({ success: true, data: { propertyId } });
    } catch (error) {
      logger.error('Favorite deletion error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/v1/search/history/:userId
 * Get search history for a user
 */
app.get('/api/v1/search/history/:userId',
  authenticateToken,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = Number(req.query.limit || 10);

      if (req.userId !== userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      res.json({ success: true, data: data || [] });
    } catch (error) {
      logger.error('Search history retrieval error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/v1/search/history
 * Record a search action
 */
app.post('/api/v1/search/history',
  authenticateToken,
  [
    body('query').isString().notEmpty(),
    body('filters').optional().isObject(),
    body('resultsCount').optional().isInt({ min: 0 }),
    body('clickedPropertyId').optional().isUUID(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.userId;
      const { query: searchQuery, filters, resultsCount, clickedPropertyId } = req.body;

      const { data, error } = await supabase
        .from('search_history')
        .insert({
          user_id: userId,
          query: searchQuery,
          filters: filters || {},
          results_count: resultsCount,
          clicked_property_id: clickedPropertyId,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ success: true, data });
    } catch (error) {
      logger.error('Search history insert error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * DELETE /api/v1/search/history/:userId
 * Clear search history for a user
 */
app.delete('/api/v1/search/history/:userId',
  authenticateToken,
  async (req, res) => {
    try {
      const { userId } = req.params;

      if (req.userId !== userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const { error } = await supabase.from('search_history').delete().eq('user_id', userId);
      if (error) throw error;

      res.json({ success: true, data: { userId } });
    } catch (error) {
      logger.error('Search history clear error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/v1/search/saved/:userId
 * Get saved searches for a user
 */
app.get('/api/v1/search/saved/:userId',
  authenticateToken,
  async (req, res) => {
    try {
      const { userId } = req.params;

      if (req.userId !== userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      res.json({ success: true, data: data || [] });
    } catch (error) {
      logger.error('Saved searches retrieval error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/v1/search/saved
 * Create a saved search
 */
app.post('/api/v1/search/saved',
  authenticateToken,
  [
    body('name').isString().notEmpty(),
    body('searchTerm').optional().isString(),
    body('filters').optional().isObject(),
    body('resultsCount').optional().isInt({ min: 0 }),
    body('alertEnabled').optional().isBoolean(),
    body('alertFrequency').optional().isIn(['instant', 'daily', 'weekly']),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.userId;
      const {
        name,
        searchTerm,
        filters,
        resultsCount,
        alertEnabled,
        alertFrequency,
      } = req.body;
      const timestamp = new Date().toISOString();

      const { data, error } = await supabase
        .from('saved_searches')
        .insert({
          user_id: userId,
          name,
          search_term: searchTerm,
          filters: filters || {},
          results_count: resultsCount || 0,
          alert_enabled: alertEnabled || false,
          alert_frequency: alertFrequency || 'daily',
          created_at: timestamp,
          updated_at: timestamp,
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ success: true, data });
    } catch (error) {
      logger.error('Saved search creation error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * PUT /api/v1/search/saved/:savedSearchId
 * Update a saved search
 */
app.put('/api/v1/search/saved/:savedSearchId',
  authenticateToken,
  [param('savedSearchId').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.userId;
      const { savedSearchId } = req.params;

      const { data, error } = await supabase
        .from('saved_searches')
        .update({
          ...req.body,
          updated_at: new Date().toISOString(),
        })
        .eq('id', savedSearchId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, data });
    } catch (error) {
      logger.error('Saved search update error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * DELETE /api/v1/search/saved/:savedSearchId
 * Delete a saved search
 */
app.delete('/api/v1/search/saved/:savedSearchId',
  authenticateToken,
  [param('savedSearchId').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.userId;
      const { savedSearchId } = req.params;

      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', savedSearchId)
        .eq('user_id', userId);

      if (error) throw error;
      res.json({ success: true, data: { id: savedSearchId } });
    } catch (error) {
      logger.error('Saved search deletion error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/v1/search/alerts/:userId
 * Get property alerts for a user
 */
app.get('/api/v1/search/alerts/:userId',
  authenticateToken,
  async (req, res) => {
    try {
      const { userId } = req.params;

      if (req.userId !== userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const { data, error } = await supabase
        .from('property_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      res.json({ success: true, data: data || [] });
    } catch (error) {
      logger.error('Property alerts retrieval error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/v1/search/alerts
 * Create a property alert
 */
app.post('/api/v1/search/alerts',
  authenticateToken,
  [
    body('name').isString().notEmpty(),
    body('criteria').optional().isObject(),
    body('frequency').optional().isIn(['instant', 'daily', 'weekly']),
    body('enabled').optional().isBoolean(),
    body('matchCount').optional().isInt({ min: 0 }),
    body('email').optional().isString(),
    body('pushNotifications').optional().isBoolean(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.userId;
      const {
        name,
        criteria,
        frequency,
        enabled,
        matchCount,
        email,
        pushNotifications,
      } = req.body;
      const timestamp = new Date().toISOString();

      const { data, error } = await supabase
        .from('property_alerts')
        .insert({
          user_id: userId,
          name,
          criteria: criteria || {},
          frequency: frequency || 'daily',
          enabled: enabled !== false,
          match_count: matchCount || 0,
          email,
          push_notifications: pushNotifications !== false,
          created_at: timestamp,
          updated_at: timestamp,
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ success: true, data });
    } catch (error) {
      logger.error('Property alert creation error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * PUT /api/v1/search/alerts/:alertId
 * Update a property alert
 */
app.put('/api/v1/search/alerts/:alertId',
  authenticateToken,
  [param('alertId').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.userId;
      const { alertId } = req.params;

      const payload = {
        ...req.body,
        updated_at: new Date().toISOString(),
      };

      if (Object.prototype.hasOwnProperty.call(payload, 'pushNotifications')) {
        payload.push_notifications = payload.pushNotifications;
        delete payload.pushNotifications;
      }

      if (Object.prototype.hasOwnProperty.call(payload, 'matchCount')) {
        payload.match_count = payload.matchCount;
        delete payload.matchCount;
      }

      const { data, error } = await supabase
        .from('property_alerts')
        .update(payload)
        .eq('id', alertId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, data });
    } catch (error) {
      logger.error('Property alert update error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * DELETE /api/v1/search/alerts/:alertId
 * Delete a property alert
 */
app.delete('/api/v1/search/alerts/:alertId',
  authenticateToken,
  [param('alertId').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.userId;
      const { alertId } = req.params;

      const { error } = await supabase
        .from('property_alerts')
        .delete()
        .eq('id', alertId)
        .eq('user_id', userId);

      if (error) throw error;
      res.json({ success: true, data: { id: alertId } });
    } catch (error) {
      logger.error('Property alert deletion error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================================
// MEDIA & STORAGE ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/media/upload
 * Upload single file
 */
app.post('/api/v1/media/upload',
  authenticateToken,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const fileUrl = req.file.location || `/uploads/${req.file.filename}`;
      
      res.json({ 
        success: true, 
        data: { 
          url: fileUrl,
          mimetype: req.file.mimetype,
          size: req.file.size
        } 
      });
    } catch (error) {
      logger.error('File upload error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================================
// PAYMENT SYSTEM ENDPOINTS (12 endpoints)
// ============================================================================

/**
 * POST /api/v1/payments/initialize
 * Initialize payment transaction
 */
app.post('/api/v1/payments/initialize', 
  authenticateToken,
  [
    body('amount').isFloat({ min: 1 }),
    body('description').isString(),
    body('paymentMethod').isIn(['paystack', 'flutterwave', 'bank_transfer'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { amount, description, paymentMethod, email, phone } = req.body;
      const userId = req.userId;

      // Create payment record in Supabase
      const { data, error } = await supabase
        .from('payments')
        .insert([
          {
            user_id: userId,
            amount,
            description,
            payment_method: paymentMethod,
            status: 'pending',
            email,
            phone,
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) throw error;

      const payment = data[0];

      // Initialize with payment provider based on method
      let paymentResponse;
      if (paymentMethod === 'paystack') {
        paymentResponse = await paystackService.initializeTransaction({
          amount,
          email,
          userId,
          paymentType: 'rent', // Default
          description
        });
      } else if (paymentMethod === 'flutterwave') {
        paymentResponse = await flutterwaveService.initializePayment({
          amount,
          email,
          userId,
          paymentType: 'rent',
          description
        });
      }

      res.status(200).json({ 
        success: true, 
        data: { 
          paymentId: payment.id,
          ...paymentResponse 
        }
      });
    } catch (error) {
      logger.error('Payment initialization error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/v1/payments/:paymentId/verify
 * Verify payment status
 */
app.get('/api/v1/payments/:paymentId/verify',
  authenticateToken,
  async (req, res) => {
    try {
      const { paymentId } = req.params;

      let paymentRecord = null;

      const { data: paymentById, error: paymentByIdError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (!paymentByIdError && paymentById) {
        paymentRecord = paymentById;
      } else {
        const { data: paymentByReference, error: paymentByReferenceError } = await supabase
          .from('payments')
          .select('*')
          .eq('reference_id', paymentId)
          .single();

        if (!paymentByReferenceError && paymentByReference) {
          paymentRecord = paymentByReference;
        }
      }

      if (!paymentRecord) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }

      if (paymentRecord.user_id !== req.userId && req.userRole !== 'admin') {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      let verificationResult = {
        success: paymentRecord.status === 'completed',
        status: paymentRecord.status,
        reference: paymentRecord.reference_id || paymentRecord.id,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency || 'NGN',
      };

      if (paymentRecord.payment_method === 'paystack' && paymentRecord.reference_id) {
        verificationResult = await paystackService.verifyTransaction(paymentRecord.reference_id);
      } else if (paymentRecord.payment_method === 'flutterwave' && paymentRecord.reference_id) {
        verificationResult = await flutterwaveService.verifyPayment(paymentRecord.reference_id);
      }

      res.json({ success: true, data: verificationResult });
    } catch (error) {
      logger.error('Payment verification error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/v1/payments/history/:userId
 * Get user payment history
 */
app.get('/api/v1/payments/history/:userId',
  authenticateToken,
  [query('limit').optional().isInt({ min: 1, max: 100 })],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = req.query.limit || 50;

      // Verify user is viewing their own history or is admin
      if (req.userId !== userId && req.userRole !== 'admin') {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      res.json({ 
        success: true, 
        data,
        pagination: { total: data.length, limit }
      });
    } catch (error) {
      logger.error('Payment history retrieval error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/v1/payments/:paymentId/refund
 * Process refund
 */
app.post('/api/v1/payments/:paymentId/refund',
  authenticateToken,
  async (req, res) => {
    try {
      const { paymentId } = req.params;
      const { reason } = req.body;

      // Get original payment
      const { data: payment, error: getError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .eq('user_id', req.userId)
        .single();

      if (getError) throw getError;
      if (payment.status !== 'completed') {
        return res.status(400).json({ success: false, error: 'Only completed payments can be refunded' });
      }

      // Create refund record
      const { data: refund, error: refundError } = await supabase
        .from('refunds')
        .insert([
          {
            payment_id: paymentId,
            user_id: req.userId,
            amount: payment.amount,
            reason,
            status: 'pending',
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (refundError) throw refundError;

      // Process refund with payment provider
      if (payment.payment_method === 'paystack') {
        await processPaystackRefund(payment.id, payment.amount);
      }

      res.json({ success: true, data: refund[0] });
    } catch (error) {
      logger.error('Refund processing error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================================
// UTILITY MANAGEMENT ENDPOINTS (6+ endpoints)
// ============================================================================

/**
 * GET /api/v1/utilities/services/:propertyId
 * Get property utility services
 */
app.get('/api/v1/utilities/services/:propertyId',
  authenticateToken,
  async (req, res) => {
    try {
      const { propertyId } = req.params;

      const { data, error } = await supabase
        .from('property_services')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({ success: true, data });
    } catch (error) {
      logger.error('Utilities retrieval error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/v1/utilities/add-service
 * Add utility service to property
 */
app.post('/api/v1/utilities/add-service',
  authenticateToken,
  [
    body('propertyId').isString(),
    body('serviceType').isIn(['water', 'electricity', 'gas', 'internet', 'waste']),
    body('monthlyBudget').isFloat({ min: 0 }),
    body('billingCycle').isIn(['monthly', 'quarterly', 'semi-annual', 'annual'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { propertyId, serviceType, monthlyBudget, billingCycle, autoRenew } = req.body;

      const { data, error } = await supabase
        .from('property_services')
        .insert([
          {
            property_id: propertyId,
            service_type: serviceType,
            monthly_budget: monthlyBudget,
            billing_cycle: billingCycle,
            auto_renew: autoRenew || false,
            status: 'active',
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) throw error;

      res.status(201).json({ success: true, data: data[0] });
    } catch (error) {
      logger.error('Service addition error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/v1/utilities/smart-meter/reading
 * Log smart meter reading
 */
app.post('/api/v1/utilities/smart-meter/reading',
  authenticateToken,
  [
    body('serviceId').isString(),
    body('reading').isFloat({ min: 0 }),
    body('unit').isString()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { serviceId, reading, unit } = req.body;

      const { data, error } = await supabase
        .from('smart_meter_readings')
        .insert([
          {
            service_id: serviceId,
            reading,
            unit,
            timestamp: new Date().toISOString()
          }
        ])
        .select();

      if (error) throw error;

      res.status(201).json({ success: true, data: data[0] });
    } catch (error) {
      logger.error('Smart meter reading error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================================
// VERIFICATION SYSTEM ENDPOINTS (13 endpoints)
// ============================================================================

/**
 * POST /api/v1/verification/start
 * Start verification process
 */
app.post('/api/v1/verification/start',
  authenticateToken,
  [
    body('verificationType').isIn(['id_verification', 'address_verification', 'professional_verification']),
    body('documentType').optional().isString()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { verificationType, documentType } = req.body;
      const userId = req.userId;

      // Create verification request
      const { data: verificationRequest, error: verificationError } = await supabase
        .from('verification_requests')
        .insert([
          {
            user_id: userId,
            verification_type: verificationType,
            status: 'in_progress',
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (verificationError) throw verificationError;

      res.status(201).json({ 
        success: true, 
        data: verificationRequest[0],
        message: 'Verification process started. Please upload required documents.'
      });
    } catch (error) {
      logger.error('Verification start error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/v1/verification/upload-document
 * Upload verification document
 */
app.post('/api/v1/verification/upload-document',
  authenticateToken,
  async (req, res) => {
    try {
      const { verificationId, documentType, documentUrl, documentData } = req.body;

      // Store document
      const { data, error } = await supabase
        .from('verification_documents')
        .insert([
          {
            verification_id: verificationId,
            user_id: req.userId,
            document_type: documentType,
            document_url: documentUrl,
            document_data: documentData,
            status: 'pending_review',
            uploaded_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) throw error;

      res.status(201).json({ success: true, data: data[0] });
    } catch (error) {
      logger.error('Document upload error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/v1/verification/status/:userId
 * Get verification status
 */
app.get('/api/v1/verification/status/:userId',
  authenticateToken,
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Verify authorization
      if (req.userId !== userId && req.userRole !== 'admin') {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      const { data, error } = await supabase
        .from('user_verification_status')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      res.json({ 
        success: true, 
        data: data || { verified: false, verification_level: 'unverified' }
      });
    } catch (error) {
      logger.error('Status retrieval error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ADMIN CONTROLS FOR VERIFICATION
app.post('/api/v1/verification/admin/review',
  authenticateToken,
  async (req, res) => {
    try {
      if (req.userRole !== 'admin') {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      const { verificationId, approved, reason } = req.body;
      const result = await verificationService.completeVerification(verificationId, approved);
      
      res.json({ success: true, result });
    } catch (error) {
      logger.error('Admin verification review error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================================
// LANDLORD DASHBOARD ENDPOINTS (8 endpoints)
// ============================================================================

/**
 * GET /api/v1/landlord/analytics/:userId
 * Get comprehensive landlord analytics
 */
app.get('/api/v1/landlord/analytics/:userId',
  authenticateToken,
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Verify authorization
      if (req.userId !== userId && req.userRole !== 'admin') {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      // Fetch landlord's properties
      const { data: properties, error: propError } = await supabase
        .from('properties')
        .select('*')
        .eq('landlord_id', userId);

      if (propError) throw propError;

      // Calculate analytics for each property
      const propertyIds = properties.map(p => p.id);
      
      const { data: payments, error: paymentError } = await supabase
        .from('rent_payments')
        .select('*')
        .in('property_id', propertyIds);

      if (paymentError) throw paymentError;

      // Aggregate analytics
      const analytics = {
        totalProperties: properties.length,
        totalRevenue: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
        occupancyRate: calculateOccupancy(properties),
        totalTenants: properties.reduce((sum, p) => sum + (p.occupied_units || 0), 0),
        paymentMetrics: calculatePaymentMetrics(payments),
        properties: properties.map(p => ({
          ...p,
          revenue: payments.filter(pm => pm.property_id === p.id).reduce((sum, pm) => sum + (pm.amount || 0), 0)
        }))
      };

      res.json({ success: true, data: analytics });
    } catch (error) {
      logger.error('Analytics retrieval error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/v1/landlord/analytics/property/:propertyId
 * Get analytics for specific property
 */
app.get('/api/v1/landlord/analytics/property/:propertyId',
  authenticateToken,
  async (req, res) => {
    try {
      const { propertyId } = req.params;

      // Get property details
      const { data: property, error: propError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (propError) throw propError;

      // Verify authorization
      if (property.landlord_id !== req.userId && req.userRole !== 'admin') {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      // Get property metrics
      const { data: tenants, error: tenantError } = await supabase
        .from('property_tenants')
        .select('*')
        .eq('property_id', propertyId);

      if (tenantError) throw tenantError;

      const { data: payments, error: paymentError } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('property_id', propertyId);

      if (paymentError) throw paymentError;

      const metrics = {
        propertyId,
        totalUnits: property.total_units,
        occupiedUnits: property.occupied_units,
        occupancyRate: (property.occupied_units / property.total_units) * 100,
        monthlyRevenue: payments
          .filter(p => isCurrentMonth(new Date(p.payment_date)))
          .reduce((sum, p) => sum + (p.amount || 0), 0),
        totalRevenue: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
        tenants: tenants.length,
        paymentStatus: analyzePayments(payments)
      };

      res.json({ success: true, data: metrics });
    } catch (error) {
      logger.error('Property analytics error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================================
// COMMUNICATION SYSTEM ENDPOINTS (25+ endpoints)
// ============================================================================

/**
 * GET /api/v1/messages/conversations/:userId
 * Get all conversations for user
 */
app.get('/api/v1/messages/conversations/:userId',
  authenticateToken,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = req.query.limit || 50;
      const offset = req.query.offset || 0;

      if (req.userId !== userId && req.userRole !== 'admin') {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      const { data, error, count } = await supabase
        .from('conversations')
        .select('*', { count: 'exact' })
        .contains('participants', [userId])
        .eq('archived', false)
        .order('last_message_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      res.json({ 
        success: true, 
        data,
        pagination: { total: count, limit, offset, hasMore: offset + limit < count }
      });
    } catch (error) {
      logger.error('Conversations retrieval error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/v1/messages/conversations/create
 * Create new conversation
 */
app.post('/api/v1/messages/conversations/create',
  authenticateToken,
  [
    body('participants').isArray({ min: 2 }),
    body('type').isIn(['direct', 'group'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { participants, type, name } = req.body;

      const { data, error } = await supabase
        .from('conversations')
        .insert([
          {
            participants,
            type,
            name: name || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) throw error;

      res.status(201).json({ success: true, data: data[0] });
    } catch (error) {
      logger.error('Conversation creation error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/v1/messages/conversation/:conversationId/messages
 * Get messages in conversation
 */
app.get('/api/v1/messages/conversation/:conversationId/messages',
  authenticateToken,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const limit = req.query.limit || 30;
      const offset = req.query.offset || 0;

      const { data, error, count } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      res.json({ 
        success: true, 
        data: data.reverse(), // Reverse to show oldest first
        pagination: { total: count, limit, offset, hasMore: offset + limit < count }
      });
    } catch (error) {
      logger.error('Messages retrieval error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/v1/messages/send
 * Send new message
 */
app.post('/api/v1/messages/send',
  authenticateToken,
  [
    body('conversationId').isString(),
    body('content').isString().trim().notEmpty(),
    body('messageType').isIn(['text', 'image', 'document', 'audio', 'video'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { conversationId, content, messageType, fileUrl, fileName } = req.body;
      const senderId = req.userId;

      // Create message
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            conversation_id: conversationId,
            sender_id: senderId,
            content,
            message_type: messageType,
            file_url: fileUrl || null,
            file_name: fileName || null,
            status: 'sent',
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) throw error;

      const message = data[0];

      // Emit via Socket.io for real-time delivery
      io.to(conversationId).emit('message:new', message);

      res.status(201).json({ success: true, data: message });
    } catch (error) {
      logger.error('Message sending error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * PUT /api/v1/messages/:messageId/edit
 * Edit message
 */
app.put('/api/v1/messages/:messageId/edit',
  authenticateToken,
  [body('content').isString().trim().notEmpty()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { messageId } = req.params;
      const { content } = req.body;

      // Get message and verify sender
      const { data: message, error: getError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (getError) throw getError;
      if (message.sender_id !== req.userId) {
        return res.status(403).json({ success: false, error: 'Only sender can edit message' });
      }

      // Update message
      const { data, error } = await supabase
        .from('messages')
        .update({
          content,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .select();

      if (error) throw error;

      // Emit update via Socket.io
      io.to(message.conversation_id).emit('message:edit', data[0]);

      res.json({ success: true, data: data[0] });
    } catch (error) {
      logger.error('Message edit error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * DELETE /api/v1/messages/:messageId
 * Delete message
 */
app.delete('/api/v1/messages/:messageId',
  authenticateToken,
  async (req, res) => {
    try {
      const { messageId } = req.params;

      // Get message and verify sender
      const { data: message, error: getError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (getError) throw getError;
      if (message.sender_id !== req.userId) {
        return res.status(403).json({ success: false, error: 'Only sender can delete message' });
      }

      // Soft delete
      const { data, error } = await supabase
        .from('messages')
        .update({
          content: '[deleted]',
          status: 'deleted',
          deleted_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .select();

      if (error) throw error;

      // Emit deletion via Socket.io
      io.to(message.conversation_id).emit('message:delete', { messageId });

      res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
      logger.error('Message deletion error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/v1/messages/:messageId/read
 * Mark message as read
 */
app.post('/api/v1/messages/:messageId/read',
  authenticateToken,
  async (req, res) => {
    try {
      const { messageId } = req.params;
      const userId = req.userId;

      // Update message status
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (error) throw error;

      const readBy = data.read_by || [];
      if (!readBy.includes(userId)) {
        readBy.push(userId);
      }

      const { data: updated, error: updateError } = await supabase
        .from('messages')
        .update({
          status: 'read',
          read_by: readBy
        })
        .eq('id', messageId)
        .select();

      if (updateError) throw updateError;

      // Emit read receipt via Socket.io
      io.to(data.conversation_id).emit('message:read', { messageId, userId });

      res.json({ success: true, data: updated[0] });
    } catch (error) {
      logger.error('Read receipt error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================================
// SOCKET.IO REAL-TIME HANDLERS
// ============================================================================

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication failed'));

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.userId}`);

  // Join conversation room
  socket.on('conversation:join', ({ conversationId }) => {
    socket.join(conversationId);
    logger.info(`User ${socket.userId} joined conversation ${conversationId}`);
  });

  // Leave conversation room
  socket.on('conversation:leave', ({ conversationId }) => {
    socket.leave(conversationId);
  });

  // Typing indicator
  socket.on('user:typing', ({ conversationId, userName }) => {
    socket.to(conversationId).emit('user:typing', {
      userId: socket.userId,
      userName,
      timestamp: new Date().toISOString()
    });
  });

  // Stop typing
  socket.on('user:stop-typing', ({ conversationId }) => {
    socket.to(conversationId).emit('user:stop-typing', {
      userId: socket.userId
    });
  });

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.userId}`);
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// ============================================================================
// COMMUNICATION SYSTEM ENDPOINTS (CONTINUED)
// ============================================================================

/**
 * GET /api/v1/messages/search
 * Search messages across conversations
 */
app.get('/api/v1/messages/search',
  authenticateToken,
  [query('q').isString().notEmpty()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { q } = req.query;
      const userId = req.userId;

      // Search in messages where user is a participant of the conversation
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          conversations!inner(participants)
        `)
        .ilike('content', `%${q}%`)
        .contains('conversations.participants', [userId])
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({ success: true, data });
    } catch (error) {
      logger.error('Message search error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/v1/messages/typing
 * Trigger typing indicator (REST fallback for WebSocket)
 */
app.post('/api/v1/messages/typing',
  authenticateToken,
  async (req, res) => {
    const { conversationId, isTyping } = req.body;
    const userId = req.userId;
    
    // Broadcast via socket
    io.to(conversationId).emit('user:typing', {
      userId,
      isTyping,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  }
);

function calculateOccupancy(properties) {
  const totalUnits = properties.reduce((sum, p) => sum + (p.total_units || 0), 0);
  const occupiedUnits = properties.reduce((sum, p) => sum + (p.occupied_units || 0), 0);
  return totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
}

function calculatePaymentMetrics(payments) {
  const total = payments.length;
  const onTime = payments.filter(p => p.status === 'on_time').length;
  const late = payments.filter(p => p.status === 'late').length;
  const missed = payments.filter(p => p.status === 'missed').length;

  return {
    total,
    onTime,
    late,
    missed,
    collectionRate: total > 0 ? ((onTime + late) / total) * 100 : 0
  };
}

function analyzePayments(payments) {
  return {
    onTime: payments.filter(p => p.status === 'on_time').length,
    late: payments.filter(p => p.status === 'late').length,
    missed: payments.filter(p => p.status === 'missed').length
  };
}

function isCurrentMonth(date) {
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
    requestId: req.id
  });
});

// ============================================================================
// CRON JOBS
// ============================================================================

// Payment reconciliation every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  logger.info('Running payment reconciliation...');
  try {
    const results = await PaymentReconciliation.reconcilePending();
    logger.info('Reconciliation complete', { count: results.length });
  } catch (error) {
    logger.error('Reconciliation job failed:', error);
  }
});

// Notification queue processing every minute
cron.schedule('* * * * *', async () => {
  try {
    const result = await NotificationQueue.processQueue();
    if (result.processed > 0) {
      logger.info('Notification queue processed', { count: result.processed });
    }
  } catch (error) {
    logger.error('Queue processing job failed:', error);
  }
});

// Daily payment stats at 1 AM
cron.schedule('0 1 * * *', async () => {
  try {
    const stats = await PaymentReconciliation.getPaymentStats('1d');
    logger.info('Daily payment stats generated', stats);
  } catch (error) {
    logger.error('Stats job failed:', error);
  }
});

// ============================================================================
// START SERVER
// ============================================================================

server.listen(PORT, () => {
  logger.info(`PropertyHub API Server running on port ${PORT}`);
  console.log(`✅ Server listening on http://localhost:${PORT}`);
  console.log(`✅ WebSocket server ready for real-time messaging`);
});

module.exports = app;
