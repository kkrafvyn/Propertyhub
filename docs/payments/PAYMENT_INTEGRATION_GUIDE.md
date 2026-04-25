/**
 * PAYMENT SYSTEM INTEGRATION GUIDE
 * 
 * Complete guide for integrating the PropertyHub payment system
 * Includes setup, configuration, component usage, and deployment steps
 * 
 * @author PropertyHub Team
 * @version 1.0.0
 */

/**
 * ============================================
 * 1. ENVIRONMENT CONFIGURATION
 * ============================================
 */

// Add to .env.local
const envConfig = {
  // Paystack Configuration
  VITE_PAYSTACK_PUBLIC_KEY: 'pk_live_your_paystack_public_key',
  VITE_PAYSTACK_SECRET_KEY: 'sk_live_your_paystack_secret_key', // Backend only
  VITE_WEBHOOK_SECRET_PAYSTACK: 'whsec_your_paystack_webhook_secret',

  // Flutterwave Configuration
  VITE_FLUTTERWAVE_PUBLIC_KEY: 'FLWPUBK_LIVE_...',
  VITE_FLUTTERWAVE_SECRET_KEY: 'FLWSECK_LIVE_...', // Backend only
  VITE_FLUTTERWAVE_ENCRYPTION_KEY: 'your_encryption_key',
  VITE_WEBHOOK_SECRET_FLUTTERWAVE: 'whsec_your_flutterwave_webhook_secret',

  // Payment Settings
  VITE_PAYMENT_COMMISSION_RATE: '0.05', // 5%
  VITE_ESCROW_HOLD_DAYS: '7',
  VITE_ESCROW_DISPUTE_WINDOW_HOURS: '72',
};

/**
 * ============================================
 * 2. PAYMENT PROVIDER SETUP
 * ============================================
 */

// PAYSTACK SETUP
// 1. Go to https://dashboard.paystack.com
// 2. Create account and verify email
// 3. Go to Settings > API Keys & Webhooks
// 4. Copy public and secret keys to .env
// 5. Whitelist webhook URL in Settings > Webhooks
//    Example: https://your-domain.com/api/webhooks/paystack
// 6. Add webhook events: charge.success, charge.failed

// FLUTTERWAVE SETUP
// 1. Go to https://dashboard.flutterwave.com
// 2. Create account and verify business details
// 3. Go to Settings > API Keys
// 4. Copy public and secret keys to .env
// 5. Go to Settings > Webhooks
// 6. Add webhook URL: https://your-domain.com/api/webhooks/flutterwave
// 7. Enable webhook notifications

/**
 * ============================================
 * 3. DATABASE SETUP
 * ============================================
 */

// Run these SQL commands in Supabase
const databaseSetup = `
-- Transactions Table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id),
  booking_id UUID REFERENCES bookings(id),
  type TEXT NOT NULL CHECK (type IN ('rent_payment', 'service_payment', 'escrow', 'commission', 'withdrawal')),
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT DEFAULT 'GHS',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  provider TEXT CHECK (provider IN ('paystack', 'flutterwave')),
  provider_reference TEXT UNIQUE,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Rent Schedules Table
CREATE TABLE rent_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT DEFAULT 'GHS',
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  start_date TIMESTAMP NOT NULL,
  next_due_date TIMESTAMP NOT NULL,
  last_paid_date TIMESTAMP,
  auto_debit BOOLEAN DEFAULT FALSE,
  reminder_days INTEGER DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'active_suspended', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Escrow Accounts Table
CREATE TABLE escrow_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES users(id),
  total_amount DECIMAL(15, 2) NOT NULL,
  held_amount DECIMAL(15, 2) NOT NULL,
  released_amount DECIMAL(15, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'released', 'disputed', 'refunded')),
  dispute_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  released_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Payment Methods Table
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('paystack', 'flutterwave')),
  account_reference TEXT NOT NULL,
  card_last_four TEXT,
  card_brand TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Payment Reminders Table
CREATE TABLE payment_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rent_schedule_id UUID NOT NULL REFERENCES rent_schedules(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('email', 'sms', 'push', 'in_app')),
  scheduled_time TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_reference ON transactions(provider_reference);
CREATE INDEX idx_rent_schedules_tenant ON rent_schedules(tenant_id);
CREATE INDEX idx_rent_schedules_owner ON rent_schedules(owner_id);
CREATE INDEX idx_rent_schedules_due ON rent_schedules(next_due_date);
CREATE INDEX idx_escrow_booking ON escrow_accounts(booking_id);
CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);

-- Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE rent_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their rent schedules"
  ON rent_schedules FOR SELECT 
  USING (auth.uid() = tenant_id OR auth.uid() = owner_id);

ALTER TABLE escrow_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their escrow accounts"
  ON escrow_accounts FOR SELECT 
  USING (auth.uid() = owner_id OR auth.uid() = tenant_id);
`;

/**
 * ============================================
 * 4. COMPONENT USAGE EXAMPLES
 * ============================================
 */

// Example 1: Simple Rent Payment Flow
const rentPaymentExample = `
import RentPaymentForm from '@/components/RentPaymentForm';

export function RentPaymentPage() {
  const { rentScheduleId } = useParams();

  return (
    <RentPaymentForm
      rentScheduleId={rentScheduleId}
      onSuccess={(transactionId) => {
        console.log('Payment successful:', transactionId);
        // Show success message, redirect, etc.
      }}
      onError={(error) => {
        console.error('Payment failed:', error);
        // Show error message
      }}
      showEscrow={true}
    />
  );
}
`;

// Example 2: Payment Callback Handler
const paymentCallbackExample = `
import PaymentCallback from '@/components/PaymentCallback';

export function PaymentCallbackPage() {
  return (
    <PaymentCallback
      onSuccess={(response) => {
        console.log('Payment verified:', response);
      }}
      onError={(error) => {
        console.error('Verification failed:', error);
      }}
    />
  );
}
`;

// Example 3: Escrow Management
const escrowManagementExample = `
import EscrowManagement from '@/components/EscrowManagement';

export function TenantDashboard() {
  const { user } = useAuth();

  return (
    <EscrowManagement
      userId={user?.id}
      onEscrowReleased={(escrowId, amount) => {
        console.log('Escrow released:', escrowId, amount);
      }}
    />
  );
}
`;

// Example 4: Using Payment Hooks
const paymentHooksExample = `
import { usePayment, useRentPayment, useEscrow } from '@/hooks/usePayment';

export function PaymentComponent() {
  const { initiatePayment, verifyPayment, loading, error } = usePayment();
  const { rentSchedules, payRent } = useRentPayment();
  const { createEscrow, getUserEscrows } = useEscrow();

  // Initiate a custom payment
  const handleCustomPayment = async () => {
    try {
      const result = await initiatePayment(
        'user@example.com',
        1000,
        'service_payment',
        'paystack',
        { serviceType: 'maintenance' }
      );
      
      // Redirect to payment provider
      window.location.href = result.authorization_url;
    } catch (err) {
      console.error('Payment initiation failed:', err);
    }
  };

  // Create escrow for booking
  const handleCreateEscrow = async () => {
    try {
      await createEscrow('booking-id-here', 5000);
      console.log('Escrow created successfully');
    } catch (err) {
      console.error('Escrow creation failed:', err);
    }
  };

  return (
    <div>
      <button onClick={handleCustomPayment} disabled={loading}>
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
      {error && <p className="text-red-600">{error.message}</p>}
    </div>
  );
}
`;

/**
 * ============================================
 * 5. BACKEND WEBHOOK IMPLEMENTATION
 * ============================================
 */

// Example Express.js webhook handlers
const webhookImplementationExample = `
import express from 'express';
import crypto from 'crypto';
import { webhookHandler, paymentOrchestrationService } from '../services/paymentService';

const router = express.Router();

// Paystack Webhook Handler
router.post('/webhooks/paystack', async (req, res) => {
  // Verify webhook signature
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  try {
    const result = await webhookHandler.handlePaystackWebhook(req.body);
    res.json(result);
  } catch (error) {
    console.error('Paystack webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Flutterwave Webhook Handler
router.post('/webhooks/flutterwave', async (req, res) => {
  // Verify webhook signature
  const hash = crypto
    .createHmac('sha256', process.env.FLUTTERWAVE_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['verif-hash']) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  try {
    const result = await webhookHandler.handleFlutterwaveWebhook(req.body);
    res.json(result);
  } catch (error) {
    console.error('Flutterwave webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Payment Initialization Endpoint
router.post('/payments/initialize', async (req, res) => {
  try {
    const result = await paymentOrchestrationService.processPayment(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Payment Verification Endpoint
router.post('/payments/verify', async (req, res) => {
  try {
    const { transactionId, reference, provider } = req.body;
    const result = await paymentOrchestrationService.verifyAndCompletePayment(
      transactionId,
      reference,
      provider
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
`;

/**
 * ============================================
 * 6. CRON JOB SETUP
 * ============================================
 */

// Setup rent automation with node-cron
const cronJobSetupExample = `
import cron from 'node-cron';
import { rentAutomationService } from '../services/paymentService';

// Send rent reminders daily at 8:00 AM UTC
cron.schedule('0 8 * * *', async () => {
  console.log('Running rent reminder task...');
  try {
    const result = await rentAutomationService.sendRentReminders();
    console.log('Rent reminders sent:', result);
  } catch (error) {
    console.error('Rent reminder task failed:', error);
  }
});

// Auto-debit rent twice daily (12:00 AM and 12:00 PM UTC)
cron.schedule('0 0,12 * * *', async () => {
  console.log('Running auto-debit task...');
  try {
    const result = await rentAutomationService.autoDebitRent();
    console.log('Auto-debit completed:', result);
  } catch (error) {
    console.error('Auto-debit task failed:', error);
  }
});

// Notify about overdue rent daily at 6:00 PM UTC
cron.schedule('0 18 * * *', async () => {
  console.log('Running overdue notification task...');
  try {
    const result = await rentAutomationService.notifyOverdueRent();
    console.log('Overdue notifications sent:', result);
  } catch (error) {
    console.error('Overdue notification task failed:', error);
  }
});
`;

/**
 * ============================================
 * 7. ROUTING CONFIGURATION
 * ============================================
 */

// Add these routes to your router configuration
const routingExample = `
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RentPaymentForm from '@/components/RentPaymentForm';
import PaymentCallback from '@/components/PaymentCallback';
import EscrowManagement from '@/components/EscrowManagement';

export function AppRoutes() {
  return (
    <Routes>
      {/* Rent Payment */}
      <Route path="/pay-rent/:rentScheduleId" element={<RentPaymentForm />} />
      
      {/* Payment Callbacks */}
      <Route path="/payment/callback" element={<PaymentCallback />} />
      <Route path="/payment/paystack/callback" element={<PaymentCallback />} />
      <Route path="/payment/flutterwave/callback" element={<PaymentCallback />} />
      
      {/* Escrow Management */}
      <Route path="/escrow" element={<EscrowManagement />} />
      <Route path="/escrow/booking/:bookingId" element={<EscrowManagement />} />
    </Routes>
  );
}
`;

/**
 * ============================================
 * 8. TESTING CREDENTIALS
 * ============================================
 */

// Paystack Test Credentials
const paystackTestCreds = {
  publicKey: 'pk_test_f80a8d8c42a61c4f7c8a5b5c7d9e1f2a',
  secretKey: 'sk_test_f80a8d8c42a61c4f7c8a5b5c7d9e1f2a',

  // Test card numbers
  testCards: {
    visa: { number: '4111111111111111', exp: '12/25', cvv: '123' },
    mastercard: { number: '5292888632215159', exp: '12/25', cvv: '123' },
    amex: { number: '378282246310005', exp: '12/25', cvv: '1234' },
  },
};

// Flutterwave Test Credentials
const flutterwaveTestCreds = {
  publicKey: 'FLWPUBK_TEST_f80a8d8c42a61c4f7c8a5b5c7d9e1f2a',
  secretKey: 'FLWSECK_TEST_f80a8d8c42a61c4f7c8a5b5c7d9e1f2a',

  // Test card numbers
  testCards: {
    successCard: { number: '4242424242424242', exp: '09/32', cvv: '812', pin: '1234' },
    failureCard: { number: '4000000000000002', exp: '09/32', cvv: '812', pin: '1234' },
  },
};

/**
 * ============================================
 * 9. MONITORING & ALERTS
 * ============================================
 */

const monitoringSetup = `
// Setup error tracking (e.g., Sentry)
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Monitor payment events
const monitorPayment = (transactionId, status) => {
  Sentry.captureEvent({
    message: 'Payment ${status}',
    level: status === 'completed' ? 'info' : 'error',
    contexts: {
      payment: {
        transaction_id: transactionId,
        status,
      },
    },
  });
};
`;

/**
 * ============================================
 * 10. DEPLOYMENT CHECKLIST
 * ============================================
 */

const deploymentChecklist = \`
✓ BEFORE DEPLOYMENT TO PRODUCTION:

Environment Configuration:
  [ ] Update all VITE_PAYSTACK_* variables with production keys
  [ ] Update all VITE_FLUTTERWAVE_* variables with production keys
  [ ] Update VITE_WEBHOOK_SECRET_* with production secrets
  [ ] Verify VITE_PAYMENT_COMMISSION_RATE matches business logic
  [ ] Set NODE_ENV to 'production'

Payment Provider Setup:
  [ ] Register webhook URLs with Paystack
  [ ] Register webhook URLs with Flutterwave
  [ ] Test webhooks in production mode
  [ ] Verify SSL/TLS certificates
  [ ] Add payment provider IP addresses to firewall whitelist

Database:
  [ ] Run all migration SQL scripts
  [ ] Verify RLS policies are enabled
  [ ] Create database backups
  [ ] Test database connections from production environment
  [ ] Monitor database performance

Application:
  [ ] Test all payment flows end-to-end
  [ ] Test error handling and recovery
  [ ] Verify logging and monitoring
  [ ] Load test payment endpoints
  [ ] Run security audit on payment code

Compliance:
  [ ] Review data protection (GDPR, local regulations)
  [ ] Setup PCI-DSS compliance (if handling cards)
  [ ] Document security procedures
  [ ] Create incident response plan
  [ ] Backup and disaster recovery tested

Monitoring:
  [ ] Setup payment metrics dashboards
  [ ] Configure alerts for failed payments
  [ ] Setup email notifications for critical errors
  [ ] Enable transaction logging
  [ ] Configure rate limiting

Documentation:
  [ ] Update API documentation
  [ ] Create runbooks for common issues
  [ ] Document payment provider contact information
  [ ] Create incident escalation procedures
  [ ] Update user-facing help documentation
\`;

/**
 * ============================================
 * QUICK START SUMMARY
 * ============================================
 * 
 * 1. Get payment provider credentials (Paystack/Flutterwave)
 * 2. Add credentials to .env.local
 * 3. Run database setup SQL
 * 4. Setup webhook URLs with payment providers
 * 5. Import payment components into your routes
 * 6. Test with test credentials
 * 7. Deploy to production with production keys
 * 8. Monitor payment transactions
 * 9. Handle edge cases and errors
 * 10. Setup automated rent reminders and auto-debit
 */

export default {
  envConfig,
  databaseSetup,
  rentPaymentExample,
  paymentCallbackExample,
  escrowManagementExample,
  paymentHooksExample,
  webhookImplementationExample,
  cronJobSetupExample,
  routingExample,
  paystackTestCreds,
  flutterwaveTestCreds,
  monitoringSetup,
  deploymentChecklist,
};
