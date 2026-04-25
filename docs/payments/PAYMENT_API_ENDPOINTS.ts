/**
 * PAYMENT SYSTEM API ENDPOINTS DOCUMENTATION
 * 
 * This document outlines all backend API endpoints required for the PropertyHub Payment System
 * These endpoints should be implemented in the backend (Node.js/Express, Supabase Functions, or similar)
 * 
 * @author PropertyHub Team
 * @status Required for Production
 */

/**
 * ============================================
 * WEBHOOK ENDPOINTS (External - from Payment Providers)
 * ============================================
 */

/**
 * POST /api/webhooks/paystack
 * 
 * Webhook endpoint for Paystack payment notifications
 * Called by Paystack API when payment events occur
 * 
 * Request Headers:
 * - x-paystack-signature: HMAC-SHA512 signature for verification
 * 
 * Example Payload:
 * {
 *   "event": "charge.success",
 *   "data": {
 *     "id": 12345678,
 *     "reference": "unique_reference_here",
 *     "amount": 100000,  // in cents
 *     "status": "success",
 *     "paid_at": "2024-04-19T10:30:00Z",
 *     "customer": {
 *       "id": 123,
 *       "email": "user@example.com",
 *       "customer_code": "CUS_xxx"
 *     },
 *     "authorization": {
 *       "authorization_code": "AUTH_xxx",
 *       "card_type": "visa",
 *       "last4": "4242"
 *     }
 *   }
 * }
 * 
 * Response:
 * 200 OK
 * { "success": true, "message": "Webhook processed" }
 * 
 * Implementation Steps:
 * 1. Verify HMAC signature using process.env.PAYSTACK_WEBHOOK_SECRET
 * 2. Extract transaction reference from payload
 * 3. Find corresponding PropertyHub transaction in database
 * 4. Call paymentOrchestrationService.verifyAndCompletePayment()
 * 5. Return 200 to acknowledge receipt
 */
export interface PaystackWebhookPayload {
  event: 'charge.success' | 'charge.failed' | 'transfer.success' | 'transfer.failed';
  data: {
    id: number;
    reference: string;
    amount: number;
    status: 'success' | 'failed';
    paid_at: string;
    customer: {
      id: number;
      email: string;
      customer_code: string;
      first_name: string;
      last_name: string;
    };
    authorization: {
      authorization_code: string;
      card_type: string;
      last4: string;
      bank?: string;
      country_code?: string;
    };
  };
}

/**
 * POST /api/webhooks/flutterwave
 * 
 * Webhook endpoint for Flutterwave payment notifications
 * Called by Flutterwave API when payment events occur
 * 
 * Request Headers:
 * - verif-hash: Hash for verification
 * 
 * Example Payload:
 * {
 *   "event": "charge.completed",
 *   "data": {
 *     "id": 123456789,
 *     "tx_ref": "unique_reference_here",
 *     "flw_ref": "FLW123456",
 *     "amount": 100,
 *     "currency": "GHS",
 *     "status": "successful",
 *     "created_at": "2024-04-19T10:30:00Z",
 *     "customer": {
 *       "id": 789,
 *       "name": "John Doe",
 *       "email": "user@example.com",
 *       "phone_number": "+233123456789"
 *     },
 *     "card": {
 *       "card_number": "****4242",
 *       "last_4chars": "4242",
 *       "scheme": "visa"
 *     }
 *   }
 * }
 * 
 * Response:
 * 200 OK
 * { "success": true, "message": "Webhook processed" }
 * 
 * Implementation Steps:
 * 1. Verify hash using process.env.FLUTTERWAVE_WEBHOOK_SECRET
 * 2. Extract transaction reference (tx_ref) from payload
 * 3. Find corresponding PropertyHub transaction in database
 * 4. Call paymentOrchestrationService.verifyAndCompletePayment()
 * 5. Return 200 to acknowledge receipt
 */
export interface FlutterwaveWebhookPayload {
  event: 'charge.completed' | 'charge.failed' | 'payout.successful' | 'payout.failed';
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    amount: number;
    currency: string;
    status: 'successful' | 'failed' | 'cancelled';
    created_at: string;
    customer: {
      id: number;
      name: string;
      email: string;
      phone_number: string;
    };
    card?: {
      card_number: string;
      last_4chars: string;
      scheme: string;
    };
  };
}

/**
 * ============================================
 * PAYMENT ENDPOINTS (Called from Frontend)
 * ============================================
 */

/**
 * POST /api/payments/initialize
 * 
 * Initialize a payment transaction
 * 
 * Request Body:
 * {
 *   "user_id": "uuid",
 *   "amount": 1000,
 *   "currency": "GHS",
 *   "transaction_type": "rent_payment",  // or "service_payment", "escrow", etc.
 *   "provider": "paystack",              // or "flutterwave"
 *   "property_id": "uuid",               // optional
 *   "booking_id": "uuid",                // optional
 *   "metadata": {
 *     "rent_schedule_id": "uuid",
 *     "description": "Rent for April 2024"
 *   }
 * }
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "transaction_id": "uuid",
 *   "authorization_url": "https://checkout.paystack.com/...",
 *   "reference": "ref_12345",
 *   "provider": "paystack",
 *   "expires_in": 3600
 * }
 * 
 * Implementation:
 * - Create transaction record in database (status: pending)
 * - Call appropriate payment provider API (Paystack/Flutterwave)
 * - Return authorization URL for frontend redirect
 * - See: paymentOrchestrationService.processPayment()
 */
export interface InitializePaymentRequest {
  user_id: string;
  amount: number;
  currency: string;
  transaction_type: 'rent_payment' | 'service_payment' | 'escrow' | 'commission' | 'withdrawal';
  provider: 'paystack' | 'flutterwave';
  property_id?: string;
  booking_id?: string;
  metadata?: Record<string, any>;
}

export interface InitializePaymentResponse {
  success: boolean;
  transaction_id: string;
  authorization_url: string;
  reference: string;
  provider: 'paystack' | 'flutterwave';
  expires_in?: number;
}

/**
 * POST /api/payments/verify
 * 
 * Manually verify a payment transaction
 * Usually called after redirect from payment provider
 * 
 * Request Body:
 * {
 *   "transaction_id": "uuid",
 *   "reference": "paystack_reference_or_flutterwave_tx_ref",
 *   "provider": "paystack"
 * }
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "transaction_id": "uuid",
 *   "status": "completed",
 *   "amount": 1000,
 *   "currency": "GHS",
 *   "completed_at": "2024-04-19T10:30:00Z",
 *   "message": "Payment successful"
 * }
 * 
 * Implementation:
 * - Look up transaction by ID
 * - Call Paystack/Flutterwave to verify reference
 * - Update transaction status in database
 * - Update related booking/escrow/rent_schedule
 * - Send confirmation notifications
 * - See: paymentOrchestrationService.verifyAndCompletePayment()
 */
export interface VerifyPaymentRequest {
  transaction_id: string;
  reference: string;
  provider: 'paystack' | 'flutterwave';
}

export interface VerifyPaymentResponse {
  success: boolean;
  transaction_id: string;
  status: 'completed' | 'pending' | 'failed';
  amount: number;
  currency: string;
  completed_at?: string;
  message?: string;
}

/**
 * POST /api/payments/refund
 * 
 * Process a refund for a completed payment
 * 
 * Request Body:
 * {
 *   "transaction_id": "uuid",
 *   "amount": 1000,                    // optional, defaults to full amount
 *   "reason": "Booking cancelled"
 * }
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "refund_transaction_id": "uuid",
 *   "amount": 1000,
 *   "status": "pending"
 * }
 * 
 * Implementation:
 * - Get original transaction
 * - Initiate refund via payment provider API
 * - Create refund transaction record
 * - Notify user
 * - See: paymentOrchestrationService.processRefund()
 */
export interface RefundPaymentRequest {
  transaction_id: string;
  amount?: number;
  reason?: string;
}

export interface RefundPaymentResponse {
  success: boolean;
  refund_transaction_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
}

/**
 * ============================================
 * RENT PAYMENT ENDPOINTS
 * ============================================
 */

/**
 * POST /api/rent-payments/schedules
 * 
 * Create a rent payment schedule
 * 
 * Request Body:
 * {
 *   "booking_id": "uuid",
 *   "owner_id": "uuid",
 *   "tenant_id": "uuid",
 *   "amount": 1000,
 *   "currency": "GHS",
 *   "frequency": "monthly",          // "daily", "weekly", "monthly", "yearly"
 *   "start_date": "2024-05-01",
 *   "next_due_date": "2024-06-01",
 *   "auto_debit": false,
 *   "reminder_days": 3
 * }
 * 
 * Response 201:
 * {
 *   "success": true,
 *   "rent_schedule": { ... }
 * }
 */

/**
 * GET /api/rent-payments/schedules/:tenantId
 * 
 * Get all rent schedules for a tenant
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "schedules": [ ... ]
 * }
 */

/**
 * GET /api/rent-payments/schedules/owner/:ownerId
 * 
 * Get all rent schedules for a property owner
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "schedules": [ ... ]
 * }
 */

/**
 * ============================================
 * ESCROW ENDPOINTS
 * ============================================
 */

/**
 * POST /api/escrow/create
 * 
 * Create an escrow account for a booking
 * 
 * Request Body:
 * {
 *   "booking_id": "uuid",
 *   "owner_id": "uuid",
 *   "tenant_id": "uuid",
 *   "amount": 5000,
 *   "currency": "GHS",
 *   "description": "Security deposit for 6-month lease"
 * }
 * 
 * Response 201:
 * {
 *   "success": true,
 *   "escrow": { ... }
 * }
 */

/**
 * POST /api/escrow/:escrowId/release
 * 
 * Release escrow funds
 * 
 * Request Body:
 * {
 *   "amount": 5000,                    // optional, defaults to full amount
 *   "authorized_by_user_id": "uuid"
 * }
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "escrow": { ... }
 * }
 */

/**
 * POST /api/escrow/:escrowId/dispute
 * 
 * Dispute an escrow account
 * 
 * Request Body:
 * {
 *   "reason": "Property damage",
 *   "evidence_urls": [ "url1", "url2" ],
 *   "disputed_by_user_id": "uuid"
 * }
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "escrow": { ... }
 * }
 */

/**
 * ============================================
 * CRON JOBS / SCHEDULED TASKS
 * ============================================
 */

/**
 * POST /api/cron/rent-reminders
 * 
 * Send rent payment reminders (3 days before due date)
 * Run daily via cron job (e.g., 8:00 AM UTC)
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "sent": 42,
 *   "failed": 2
 * }
 * 
 * Implementation:
 * - See: rentAutomationService.sendRentReminders()
 */

/**
 * POST /api/cron/auto-debit-rent
 * 
 * Auto-debit rent for tenants with auto_debit enabled
 * Run twice daily (e.g., 12:00 AM and 12:00 PM UTC)
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "processed": 128,
 *   "failed": 5
 * }
 * 
 * Implementation:
 * - See: rentAutomationService.autoDebitRent()
 */

/**
 * POST /api/cron/overdue-notifications
 * 
 * Notify landlords about overdue rent
 * Run daily (e.g., 6:00 PM UTC)
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "notified": 15
 * }
 * 
 * Implementation:
 * - See: rentAutomationService.notifyOverdueRent()
 */

/**
 * ============================================
 * BACKEND SETUP CHECKLIST
 * ============================================
 * 
 * Required environment variables:
 * - PAYSTACK_PUBLIC_KEY: Paystack public key for frontend
 * - PAYSTACK_SECRET_KEY: Paystack secret key for backend
 * - PAYSTACK_WEBHOOK_SECRET: Secret for webhook verification
 * - FLUTTERWAVE_PUBLIC_KEY: Flutterwave public key for frontend
 * - FLUTTERWAVE_SECRET_KEY: Flutterwave secret key for backend
 * - FLUTTERWAVE_WEBHOOK_SECRET: Secret for webhook verification
 * - FLUTTERWAVE_ENCRYPTION_KEY: Encryption key for Flutterwave
 * - DATABASE_URL: Supabase or your database connection
 * 
 * Required database tables:
 * - transactions
 * - rent_schedules
 * - escrow_accounts
 * - payment_methods
 * - notifications
 * - payment_reminders
 * 
 * External API integrations:
 * - Paystack API (https://api.paystack.co)
 * - Flutterwave API (https://api.flutterwave.com/v3)
 * - Optional: SMS gateway for payment reminders (Twilio, Nexmo)
 * - Optional: Email service for notifications (SendGrid, Mailgun)
 * 
 * Security checklist:
 * ✓ Verify webhook signatures on all incoming webhooks
 * ✓ Use HTTPS for all payment endpoints
 * ✓ Store secret keys in environment variables only
 * ✓ Implement rate limiting on payment endpoints
 * ✓ Log all payment transactions for audit trail
 * ✓ Implement fraud detection for suspicious patterns
 * ✓ Use database transactions for atomic operations
 * ✓ Validate all user input before processing
 * ✓ Implement idempotency keys for payment requests
 * ✓ Never expose payment provider credentials in logs
 * 
 * Testing recommendations:
 * - Use payment provider test credentials
 * - Test all happy paths and error scenarios
 * - Test webhook delivery and retry logic
 * - Load test payment endpoints for performance
 * - Test failure recovery and rollback mechanisms
 * - Verify audit trail logging
 * 
 * Production deployment:
 * - Switch to production payment credentials
 * - Enable HTTPS enforced on all endpoints
 * - Set up monitoring and alerts for payments
 * - Configure backup payment methods
 * - Test disaster recovery procedures
 * - Schedule regular security audits
 */

export default {
  PaystackWebhookPayload,
  FlutterwaveWebhookPayload,
  InitializePaymentRequest,
  InitializePaymentResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  RefundPaymentRequest,
  RefundPaymentResponse,
};
