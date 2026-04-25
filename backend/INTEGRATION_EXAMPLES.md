/**
 * How to Integrate External Services
 * 
 * Complete guide for integrating payment providers, WhatsApp, OCR, and notifications
 */

// ============================================================================
// 1. PAYMENT PROCESSING
// ============================================================================

/**
 * Initialize a payment with Paystack or Flutterwave
 */
const { PaystackService, FlutterwaveService, PaymentReconciliation } = require('./payment-provider-service');

// Example: Initialize payment
async function initializePayment(userId, amount) {
  try {
    const paystackService = new PaystackService();
    const result = await paystackService.initializeTransaction({
      userId,
      amount,
      email: 'user@example.com',
      currency: 'NGN',
      paymentType: 'rent',
      description: 'Rent Payment - January 2024',
    });

    console.log('Payment initialized:', result);
    // Result: { success: true, paymentId, authorization_url, access_code }
  } catch (error) {
    console.error('Payment error:', error.message);
  }
}

// Example: Verify payment
async function verifyPayment(paymentReference) {
  const paystackService = new PaystackService();
  const result = await paystackService.verifyTransaction(paymentReference);
  // Automatically updates database with payment status
}

// Example: Reconcile pending payments (run periodically)
async function reconcilePendingPayments() {
  const results = await PaymentReconciliation.reconcilePending();
  console.log('Reconciliation results:', results);
}

// ============================================================================
// 2. WHATSAPP MESSAGING
// ============================================================================

/**
 * Send WhatsApp notifications to users
 */
const { WhatsAppManager } = require('./whatsapp-service');

// Example: Send WhatsApp message
async function sendWhatsAppNotification(userId, message) {
  try {
    const whatsappManager = new WhatsAppManager();
    
    // Get user phone from database
    const userPhone = '+234701234567';
    
    const result = await whatsappManager.sendMessage(userPhone, message);
    console.log('WhatsApp sent:', result);
  } catch (error) {
    console.error('WhatsApp error:', error.message);
  }
}

// Example: Send payment notification
async function notifyPaymentViaWhatsApp(userId, amount, status) {
  const whatsappManager = new WhatsAppManager();
  await whatsappManager.notifyPayment(userId, amount, status, 'Your rent payment received');
}

// Example: Send verification code
async function sendVerificationCode(phoneNumber, code) {
  const whatsappManager = new WhatsAppManager();
  await whatsappManager.sendVerificationCode(phoneNumber, code);
}

// Example: Send template message
async function sendTemplateMessage(phoneNumber, templateName, params) {
  const whatsappManager = new WhatsAppManager();
  await whatsappManager.sendTemplateMessage(phoneNumber, templateName, params);
}

// ============================================================================
// 3. DOCUMENT VERIFICATION & OCR
// ============================================================================

/**
 * Process and verify documents with OCR and fraud detection
 */
const { VerificationService, FraudDetectionService } = require('./verification-service');

// Example: Start verification process
async function startUserVerification(userId, verificationType) {
  const verificationService = new VerificationService();
  const result = await verificationService.startVerification(
    userId,
    verificationType,
    'national_id'
  );
  console.log('Verification started:', result);
}

// Example: Process uploaded document
async function processDocument(verificationId, documentUrl, documentType) {
  const verificationService = new VerificationService();
  const result = await verificationService.processDocument(
    verificationId,
    documentUrl,
    documentType
  );

  console.log('Document processed:', {
    documentId: result.documentId,
    extractedData: result.extractedData,
    fraudAnalysis: result.fraudAnalysis,
    status: result.status,
  });

  // If high fraud risk, reject verification
  if (result.fraudAnalysis.riskLevel === 'critical') {
    console.log('Document rejected due to fraud indicators');
    return;
  }

  // Otherwise, document goes to review
}

// Example: Complete verification
async function completeVerification(verificationId, approved = true) {
  const verificationService = new VerificationService();
  await verificationService.completeVerification(verificationId, approved);
}

// ============================================================================
// 4. EMAIL & SMS NOTIFICATIONS
// ============================================================================

/**
 * Send emails and SMS via notification system
 */
const { EmailService, SMSService, NotificationManager, NotificationQueue } = require('./notification-service');

// Example: Send email notification
async function sendEmailNotification(recipient, templateName, data) {
  const emailService = new EmailService();
  await emailService.sendTemplatedEmail(recipient, templateName, data);
}

// Example: Send SMS notification
async function sendSMSNotification(recipientPhone, message) {
  const smsService = new SMSService();
  await smsService.sendSMS(recipientPhone, message);
}

// Example: Send OTP via SMS
async function sendOTP(recipientPhone, code) {
  const smsService = new SMSService();
  await smsService.sendOTP(recipientPhone, code);
}

// Example: Use notification manager for common scenarios
async function notifyUserOfPayment(userId, amount, reference) {
  await NotificationManager.notifyPaymentReceived(userId, amount, reference);
}

async function notifyPropertyAlert(userId, propertyName, alertType, details) {
  await NotificationManager.notifyPropertyAlert(userId, propertyName, alertType, details);
}

// Example: Queue notification for later processing
async function queueEmailNotification(userId, type, data) {
  await NotificationQueue.queueNotification(userId, type, 'email', data);
}

// Example: Process queued notifications (run periodically via cron)
async function processQueuedNotifications() {
  const result = await NotificationQueue.processQueue();
  console.log(`Processed ${result.processed} notifications`);
}

// ============================================================================
// 5. WEBHOOK HANDLERS
// ============================================================================

/**
 * Webhook handlers for incoming events from external services
 */
const { WebhookRouter } = require('./webhook-handlers');

// Example: Handle payment webhook
app.post('/webhooks/paystack', async (req, res) => {
  await WebhookRouter.route(req, res, 'paystack');
});

app.post('/webhooks/flutterwave', async (req, res) => {
  await WebhookRouter.route(req, res, 'flutterwave');
});

// Example: Handle WhatsApp webhooks
app.post('/webhooks/whatsapp/twilio', async (req, res) => {
  await WebhookRouter.route(req, res, 'twilio_whatsapp');
});

app.post('/webhooks/whatsapp/meta', async (req, res) => {
  await WebhookRouter.route(req, res, 'meta_whatsapp');
});

app.post('/webhooks/whatsapp/messagebird', async (req, res) => {
  await WebhookRouter.route(req, res, 'messagebird_whatsapp');
});

// Example: Handle verification webhook
app.post('/webhooks/verification', async (req, res) => {
  await WebhookRouter.route(req, res, 'verification');
});

// ============================================================================
// 6. CRON JOBS (Run periodically)
// ============================================================================

/**
 * Schedule periodic tasks
 */

// Install: npm install node-cron
const cron = require('node-cron');

// Run every 5 minutes: Reconcile pending payments
cron.schedule('*/5 * * * *', async () => {
  try {
    const results = await PaymentReconciliation.reconcilePending();
    console.log('Payment reconciliation:', results);
  } catch (error) {
    console.error('Reconciliation error:', error.message);
  }
});

// Run every minute: Process queued notifications
cron.schedule('* * * * *', async () => {
  try {
    const result = await NotificationQueue.processQueue();
    if (result.processed > 0) {
      console.log(`Processed ${result.processed} notifications`);
    }
  } catch (error) {
    console.error('Queue processing error:', error.message);
  }
});

// Run daily at 1 AM: Get payment statistics
cron.schedule('0 1 * * *', async () => {
  try {
    const stats = await PaymentReconciliation.getPaymentStats('7d');
    console.log('Weekly payment stats:', stats);
  } catch (error) {
    console.error('Stats error:', error.message);
  }
});

// ============================================================================
// 7. USAGE IN API ENDPOINTS
// ============================================================================

/**
 * Integration in Express routes
 */

// Example: Payment endpoint
app.post('/api/v1/payments/initialize', authenticate, async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;

    let paymentService;
    if (paymentMethod === 'paystack') {
      paymentService = new PaystackService();
    } else if (paymentMethod === 'flutterwave') {
      paymentService = new FlutterwaveService();
    }

    const result = await paymentService.initializeTransaction({
      userId: req.userId,
      amount,
      email: req.body.email,
      paymentType: 'rent',
      description: req.body.description,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Example: WhatsApp notification endpoint
app.post('/api/v1/messages/whatsapp/send', authenticate, async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    const whatsappManager = new WhatsAppManager();
    const result = await whatsappManager.sendMessage(phoneNumber, message);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Example: Verification endpoint
app.post('/api/v1/verification/upload-document', authenticate, async (req, res) => {
  try {
    const { verificationId, documentUrl, documentType } = req.body;
    const verificationService = new VerificationService();
    const result = await verificationService.processDocument(
      verificationId,
      documentUrl,
      documentType
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 8. CONFIGURATION & INITIALIZATION
// ============================================================================

/**
 * Check configuration on startup
 */
function validateExternalServices() {
  const errors = [];

  // Check payment providers
  if (!process.env.PAYSTACK_SECRET_KEY) {
    errors.push('⚠️  Paystack: PAYSTACK_SECRET_KEY not configured');
  }
  if (!process.env.FLUTTERWAVE_SECRET_KEY) {
    errors.push('⚠️  Flutterwave: FLUTTERWAVE_SECRET_KEY not configured');
  }

  // Check WhatsApp
  if (!process.env.TWILIO_ACCOUNT_SID && !process.env.META_BUSINESS_TOKEN) {
    errors.push('⚠️  WhatsApp: No provider configured (Twilio or Meta required)');
  }

  // Check OCR
  if (!process.env.GOOGLE_VISION_API_KEY) {
    errors.push('⚠️  OCR: GOOGLE_VISION_API_KEY not configured');
  }

  // Check Email
  if (!process.env.SMTP_USER && !process.env.SENDGRID_API_KEY) {
    errors.push('⚠️  Email: SMTP or SendGrid not configured');
  }

  // Check SMS
  if (!process.env.VONAGE_API_KEY && !process.env.TWILIO_ACCOUNT_SID) {
    errors.push('⚠️  SMS: Vonage or Twilio not configured');
  }

  if (errors.length > 0) {
    console.warn('\n⚠️  External Services Configuration Warnings:');
    errors.forEach(error => console.warn(error));
    console.warn('\n✓ Set API keys in .env file to enable these services\n');
  } else {
    console.log('✓ All external services configured');
  }
}

// Call on startup
validateExternalServices();

// ============================================================================
// 9. ERROR HANDLING & RETRY LOGIC
// ============================================================================

/**
 * Wrapper for resilient service calls
 */
async function withRetry(fn, maxRetries = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      console.warn(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs *= 2; // Exponential backoff
    }
  }
}

// Example usage:
async function sendPaymentNotificationWithRetry(userId, message) {
  return withRetry(
    async () => {
      const whatsappManager = new WhatsAppManager();
      return whatsappManager.notifyUser(userId, message);
    },
    3, // max 3 retries
    1000 // 1 second initial delay
  );
}

// ============================================================================
// 10. MONITORING & LOGGING
// ============================================================================

/**
 * Log all external service calls
 */
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/external-services.log' }),
    new winston.transports.Console(),
  ],
});

// Use logger:
logger.info('Payment initialized', { userId, amount, paymentMethod });
logger.error('WhatsApp send failed', { phone, error: error.message });
logger.warn('High fraud risk detected', { verificationId, riskScore });

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  initializePayment,
  verifyPayment,
  sendWhatsAppNotification,
  startUserVerification,
  processDocument,
  sendEmailNotification,
  sendSMSNotification,
  validateExternalServices,
  withRetry,
};
