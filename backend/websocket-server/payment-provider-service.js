/**
 * Payment Provider Integration Service
 * 
 * Handles all payment provider operations:
 * - Paystack
 * - Flutterwave
 * - Bank transfers
 */

const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================================================
// PAYSTACK SERVICE
// ============================================================================

class PaystackService {
  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || 'sk_test_xxxxx';
    this.publicKey = process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxx';
    this.webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET || 'webhook_secret_xxxxx';
    this.baseUrl = 'https://api.paystack.co';
  }

  /**
   * Initialize payment transaction
   */
  async initializeTransaction(data) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        {
          email: data.email,
          amount: data.amount * 100, // Convert to kobo
          metadata: {
            userId: data.userId,
            propertyId: data.propertyId,
            paymentType: data.paymentType, // 'rent', 'utility', 'service'
            description: data.description,
          },
          reference: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const transaction = response.data.data;

      // Store pending payment in database
      await supabase.from('payments').insert({
        user_id: data.userId,
        amount: data.amount,
        currency: data.currency || 'NGN',
        status: 'pending',
        payment_method: 'paystack',
        reference_id: transaction.reference,
        metadata: {
          authorization_url: transaction.authorization_url,
          access_code: transaction.access_code,
          paymentType: data.paymentType,
          description: data.description,
        },
      });

      return {
        success: true,
        paymentId: transaction.reference,
        authorization_url: transaction.authorization_url,
        access_code: transaction.access_code,
        amount: data.amount,
      };
    } catch (error) {
      console.error('Paystack initialization error:', error.message);
      throw new Error(`Failed to initialize Paystack payment: ${error.message}`);
    }
  }

  /**
   * Verify payment transaction
   */
  async verifyTransaction(reference) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      const transaction = response.data.data;
      const status = transaction.status === 'success' ? 'completed' : 'failed';

      // Update payment status in database
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id, user_id')
        .eq('reference_id', reference)
        .single();

      if (existingPayment) {
        await supabase
          .from('payments')
          .update({
            status,
            metadata: {
              ...existingPayment.metadata,
              verifiedAt: new Date().toISOString(),
              customer: transaction.customer,
              authorization: transaction.authorization,
            },
          })
          .eq('reference_id', reference);

        // Create rent payment record if applicable
        if (status === 'completed' && existingPayment.metadata?.paymentType === 'rent') {
          await this.createRentPaymentRecord(
            existingPayment.id,
            existingPayment.user_id,
            transaction.amount / 100
          );
        }
      }

      return {
        success: status === 'completed',
        status,
        reference,
        amount: transaction.amount / 100,
        customer: transaction.customer,
        paidAt: transaction.paid_at,
      };
    } catch (error) {
      console.error('Paystack verification error:', error.message);
      throw new Error(`Failed to verify Paystack payment: ${error.message}`);
    }
  }

  /**
   * Create rent payment record
   */
  async createRentPaymentRecord(paymentId, userId, amount) {
    try {
      await supabase.from('rent_payments').insert({
        payment_id: paymentId,
        user_id: userId,
        amount,
        payment_date: new Date().toISOString(),
        status: 'completed',
      });
    } catch (error) {
      console.error('Error creating rent payment record:', error.message);
    }
  }

  /**
   * Process refund
   */
  async refundTransaction(reference, amount) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/refund`,
        {
          transaction: reference,
          amount: amount * 100, // Convert to kobo
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const refund = response.data.data;

      // Record refund in database
      await supabase.from('refunds').insert({
        payment_id: reference,
        amount,
        status: 'pending',
        reason: 'User initiated refund',
        approval_code: refund.refund_code,
      });

      return {
        success: true,
        refundCode: refund.refund_code,
        amount,
        status: 'pending',
      };
    } catch (error) {
      console.error('Paystack refund error:', error.message);
      throw new Error(`Failed to process refund: ${error.message}`);
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(reference) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transaction/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Error fetching transaction:', error.message);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(body, signature) {
    const hash = crypto
      .createHmac('sha512', this.webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    return hash === signature;
  }

  /**
   * Handle webhook event
   */
  async handleWebhookEvent(event) {
    try {
      switch (event.event) {
        case 'charge.success':
          return await this.handleChargeSuccess(event.data);
        case 'charge.failed':
          return await this.handleChargeFailed(event.data);
        case 'charge.dispute.create':
          return await this.handleChargeDispute(event.data);
        default:
          console.log('Unknown Paystack event:', event.event);
          return { handled: false };
      }
    } catch (error) {
      console.error('Webhook error:', error.message);
      throw error;
    }
  }

  /**
   * Handle successful charge
   */
  async handleChargeSuccess(data) {
    const reference = data.reference;

    // Update payment status
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        metadata: {
          webhook_verified_at: new Date().toISOString(),
        },
      })
      .eq('reference_id', reference);

    return { success: true, action: 'payment_completed' };
  }

  /**
   * Handle failed charge
   */
  async handleChargeFailed(data) {
    const reference = data.reference;

    await supabase
      .from('payments')
      .update({
        status: 'failed',
        metadata: {
          webhook_verified_at: new Date().toISOString(),
          failureReason: data.failure_reason,
        },
      })
      .eq('reference_id', reference);

    return { success: true, action: 'payment_failed' };
  }

  /**
   * Handle charge dispute
   */
  async handleChargeDispute(data) {
    console.log('Charge dispute:', data);
    return { success: true, action: 'dispute_created' };
  }
}

// ============================================================================
// FLUTTERWAVE SERVICE
// ============================================================================

class FlutterwaveService {
  constructor() {
    this.secretKey = process.env.FLUTTERWAVE_SECRET_KEY || 'FLWSECK_TEST_xxxxx';
    this.webhookSecret = process.env.FLUTTERWAVE_WEBHOOK_SECRET || 'webhook_secret_xxxxx';
    this.baseUrl = 'https://api.flutterwave.com/v3';
  }

  /**
   * Initialize payment
   */
  async initializePayment(data) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/payments`,
        {
          tx_ref: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          amount: data.amount,
          currency: data.currency || 'NGN',
          payment_options: 'card,account,ussd',
          customer: {
            email: data.email,
            name: data.name,
            phonenumber: data.phone,
          },
          customizations: {
            title: 'PropertyHub Rent Payment',
            description: data.description,
            logo: 'https://propertyhub.com/logo.png',
          },
          meta: {
            userId: data.userId,
            propertyId: data.propertyId,
            paymentType: data.paymentType,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const payment = response.data.data;

      // Store payment in database
      await supabase.from('payments').insert({
        user_id: data.userId,
        amount: data.amount,
        currency: data.currency || 'NGN',
        status: 'pending',
        payment_method: 'flutterwave',
        reference_id: payment.link.split('/').pop(),
        metadata: {
          payment_link: payment.link,
          tx_ref: payment.tx_ref,
          paymentType: data.paymentType,
        },
      });

      return {
        success: true,
        paymentId: payment.link.split('/').pop(),
        payment_link: payment.link,
        tx_ref: payment.tx_ref,
      };
    } catch (error) {
      console.error('Flutterwave initialization error:', error.message);
      throw new Error(`Failed to initialize Flutterwave payment: ${error.message}`);
    }
  }

  /**
   * Verify payment
   */
  async verifyPayment(transactionId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transactions/${transactionId}/verify`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      const transaction = response.data.data;
      const status = transaction.status === 'successful' ? 'completed' : 'failed';

      // Update payment in database
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id, user_id')
        .eq('reference_id', transactionId)
        .single();

      if (existingPayment) {
        await supabase
          .from('payments')
          .update({ status })
          .eq('reference_id', transactionId);

        // Create rent payment record if applicable
        if (status === 'completed' && existingPayment.metadata?.paymentType === 'rent') {
          await this.createRentPaymentRecord(
            existingPayment.id,
            existingPayment.user_id,
            transaction.amount
          );
        }
      }

      return {
        success: status === 'completed',
        status,
        transactionId,
        amount: transaction.amount,
        customer: transaction.customer,
      };
    } catch (error) {
      console.error('Flutterwave verification error:', error.message);
      throw new Error(`Failed to verify Flutterwave payment: ${error.message}`);
    }
  }

  /**
   * Create rent payment record
   */
  async createRentPaymentRecord(paymentId, userId, amount) {
    try {
      await supabase.from('rent_payments').insert({
        payment_id: paymentId,
        user_id: userId,
        amount,
        payment_date: new Date().toISOString(),
        status: 'completed',
      });
    } catch (error) {
      console.error('Error creating rent payment record:', error.message);
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(transactionId, amount) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transactions/${transactionId}/refund`,
        { amount },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const refund = response.data.data;

      // Record refund
      await supabase.from('refunds').insert({
        payment_id: transactionId,
        amount,
        status: 'pending',
        reason: 'User initiated refund',
        approval_code: refund.id,
      });

      return {
        success: true,
        refundId: refund.id,
        amount,
        status: 'processing',
      };
    } catch (error) {
      console.error('Flutterwave refund error:', error.message);
      throw new Error(`Failed to process refund: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(body, signature) {
    const hash = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    return hash === signature;
  }

  /**
   * Handle webhook event
   */
  async handleWebhookEvent(event) {
    try {
      if (event.event === 'charge.completed') {
        return await this.handleChargeCompleted(event.data);
      } else if (event.event === 'charge.failed') {
        return await this.handleChargeFailed(event.data);
      }
      return { handled: false };
    } catch (error) {
      console.error('Webhook error:', error.message);
      throw error;
    }
  }

  /**
   * Handle completed charge
   */
  async handleChargeCompleted(data) {
    await supabase
      .from('payments')
      .update({ status: 'completed' })
      .eq('reference_id', data.id);

    return { success: true, action: 'payment_completed' };
  }

  /**
   * Handle failed charge
   */
  async handleChargeFailed(data) {
    await supabase
      .from('payments')
      .update({
        status: 'failed',
        metadata: { failureReason: data.failure_reason },
      })
      .eq('reference_id', data.id);

    return { success: true, action: 'payment_failed' };
  }
}

// ============================================================================
// PAYMENT RECONCILIATION
// ============================================================================

class PaymentReconciliation {
  /**
   * Get pending payments
   */
  static async getPendingPayments() {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .in('status', ['pending', 'processing'])
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;
    return data;
  }

  /**
   * Reconcile pending payments
   */
  static async reconcilePending() {
    const pendingPayments = await this.getPendingPayments();
    const paystackService = new PaystackService();
    const flutterwaveService = new FlutterwaveService();

    const results = [];

    for (const payment of pendingPayments) {
      try {
        if (payment.payment_method === 'paystack') {
          const result = await paystackService.verifyTransaction(payment.reference_id);
          results.push({
            paymentId: payment.id,
            oldStatus: payment.status,
            newStatus: result.status,
            success: result.success,
          });
        } else if (payment.payment_method === 'flutterwave') {
          const result = await flutterwaveService.verifyPayment(payment.reference_id);
          results.push({
            paymentId: payment.id,
            oldStatus: payment.status,
            newStatus: result.status,
            success: result.success,
          });
        }
      } catch (error) {
        console.error(`Reconciliation error for payment ${payment.id}:`, error.message);
        results.push({
          paymentId: payment.id,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get payment statistics
   */
  static async getPaymentStats(period = '7d') {
    const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : 1;
    const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase.from('payments').select('*').gte('created_at', startDate);

    if (error) throw error;

    const stats = {
      total_transactions: data.length,
      completed: data.filter(p => p.status === 'completed').length,
      failed: data.filter(p => p.status === 'failed').length,
      pending: data.filter(p => p.status === 'pending').length,
      total_amount: data
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0),
      by_provider: {
        paystack: data.filter(p => p.payment_method === 'paystack').length,
        flutterwave: data.filter(p => p.payment_method === 'flutterwave').length,
      },
    };

    return stats;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  PaystackService,
  FlutterwaveService,
  PaymentReconciliation,
};
