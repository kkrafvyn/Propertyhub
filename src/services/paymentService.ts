/**
 * Payment Service Layer
 * 
 * Comprehensive payment processing service
 * Integrates with Paystack, Flutterwave, and manages PropertyHub escrow
 * 
 * @author PropertyHub Team
 */

import { supabase } from './supabaseClient';
import { envConfig } from '../utils/envConfig';
import type {
  Transaction,
  PaymentMethod,
  RentSchedule,
  EscrowAccount,
  PaymentProvider,
  TransactionType,
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  RentPaymentRequest,
  RentPaymentResponse,
  CreateEscrowRequest,
  ReleaseEscrowRequest,
  DisputeEscrowRequest,
} from '../types/payment';

/**
 * ============================================
 * PAYSTACK SERVICE
 * ============================================
 */

const PAYMENT_API_BASE = envConfig.API_URL.replace(/\/$/, '');

const getPaymentAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  const tokenKeys = [
    'auth_token',
    'propertyhub_auth_token',
    'supabase.auth.token',
  ];

  for (const key of tokenKeys) {
    const value = localStorage.getItem(key);
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return null;
};

const buildPaymentHeaders = (includeJson = true): Record<string, string> => {
  const headers: Record<string, string> = {};
  const token = getPaymentAuthToken();

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const parseApiPayload = async (response: Response): Promise<any> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const requestPaymentApi = async <T = any>(
  endpointCandidates: string[],
  options: RequestInit,
  defaultError: string
): Promise<T> => {
  if (!PAYMENT_API_BASE) {
    throw new Error('Payment backend is not configured. Set VITE_API_URL for this deployment.');
  }

  let lastError: Error | null = null;

  for (const endpoint of endpointCandidates) {
    try {
      const response = await fetch(`${PAYMENT_API_BASE}${endpoint}`, options);
      const payload = await parseApiPayload(response);

      if (!response.ok) {
        const message = payload?.error || payload?.message || defaultError;
        throw new Error(message);
      }

      const data = payload?.data ?? payload;
      return data as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(defaultError);
    }
  }

  throw lastError ?? new Error(defaultError);
};

const normalizePaystackInitialization = (payload: any) => {
  const authorizationUrl =
    payload?.authorization_url ?? payload?.authorizationUrl ?? payload?.payment_link ?? '';
  const reference = payload?.reference ?? payload?.paymentId ?? payload?.tx_ref ?? '';
  const accessCode = payload?.access_code ?? payload?.accessCode ?? '';

  if (!authorizationUrl || !reference) {
    throw new Error('Payment gateway returned an incomplete Paystack initialization payload.');
  }

  return {
    authorization_url: authorizationUrl,
    reference,
    access_code: accessCode,
  };
};

const normalizeFlutterwaveInitialization = (payload: any) => {
  const link = payload?.link ?? payload?.payment_link ?? payload?.authorization_url ?? payload?.authorizationUrl ?? '';

  if (!link) {
    throw new Error('Payment gateway returned an incomplete Flutterwave initialization payload.');
  }

  return { link };
};

export const paystackService = {
  /**
   * Initialize payment with Paystack
   */
  async initializePayment(
    email: string,
    amount: number,
    metadata?: Record<string, any>
  ): Promise<{ authorization_url: string; reference: string; access_code: string }> {
    try {
      const payload = await requestPaymentApi(
        ['/api/v1/payments/initialize', '/api/payments/initialize'],
        {
          method: 'POST',
          headers: buildPaymentHeaders(),
          body: JSON.stringify({
            email,
            amount,
            currency: metadata?.currency || 'GHS',
            paymentMethod: 'paystack',
            callback_url: `${window.location.origin}/payment/callback`,
            metadata,
          }),
        },
        'Failed to initialize Paystack payment'
      );

      return normalizePaystackInitialization(payload);
    } catch (error) {
      console.error('Paystack initialization error:', error);
      throw error;
    }
  },

  /**
   * Verify Paystack payment
   */
  async verifyPayment(reference: string): Promise<any> {
    try {
      return await requestPaymentApi(
        [
          `/api/v1/payments/${encodeURIComponent(reference)}/verify`,
          `/api/payments/${encodeURIComponent(reference)}/status`,
        ],
        {
          method: 'GET',
          headers: buildPaymentHeaders(false),
        },
        'Failed to verify Paystack payment'
      );
    } catch (error) {
      console.error('Paystack verification error:', error);
      throw error;
    }
  },

  /**
   * Get list of banks for transfers
   */
  async getBanks(): Promise<any[]> {
    console.warn('Paystack bank listing must be served by backend proxy endpoints.');
    return [];
  },

  /**
   * Resolve account number
   */
  async resolveAccount(account_number: string, bank_code: string): Promise<any> {
    throw new Error(
      `Account resolution requires a backend payment proxy. Received account ${account_number} for bank ${bank_code}.`
    );
  },
};

/**
 * ============================================
 * FLUTTERWAVE SERVICE
 * ============================================
 */

export const flutterwaveService = {
  /**
   * Initialize payment with Flutterwave
   */
  async initializePayment(
    email: string,
    amount: number,
    tx_ref: string,
    currency: string = 'GHS',
    metadata?: Record<string, any>
  ): Promise<{ link: string }> {
    try {
      const payload = await requestPaymentApi(
        ['/api/v1/payments/initialize', '/api/payments/initialize'],
        {
          method: 'POST',
          headers: buildPaymentHeaders(),
          body: JSON.stringify({
            email,
            amount,
            currency,
            paymentMethod: 'flutterwave',
            tx_ref,
            callback_url: `${window.location.origin}/payment/callback`,
            metadata,
          }),
        },
        'Failed to initialize Flutterwave payment'
      );

      return normalizeFlutterwaveInitialization(payload);
    } catch (error) {
      console.error('Flutterwave initialization error:', error);
      throw error;
    }
  },

  /**
   * Verify Flutterwave payment
   */
  async verifyPayment(transaction_id: string): Promise<any> {
    try {
      return await requestPaymentApi(
        [
          `/api/v1/payments/${encodeURIComponent(transaction_id)}/verify`,
          `/api/payments/${encodeURIComponent(transaction_id)}/status`,
        ],
        {
          method: 'GET',
          headers: buildPaymentHeaders(false),
        },
        'Failed to verify Flutterwave payment'
      );
    } catch (error) {
      console.error('Flutterwave verification error:', error);
      throw error;
    }
  },

  /**
   * Get banks list
   */
  async getBanks(country_code: string = 'GH'): Promise<any[]> {
    console.warn(`Flutterwave bank listing for ${country_code} requires a backend proxy endpoint.`);
    return [];
  },
};

/**
 * ============================================
 * TRANSACTION SERVICE
 * ============================================
 */

export const transactionService = {
  /**
   * Create transaction record
   */
  async createTransaction(transactionData: Partial<Transaction>): Promise<{ data: Transaction | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          ...transactionData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<{ data: Transaction | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get user transactions
   */
  async getUserTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ data: Transaction[] | null; count: number | null; error: any }> {
    try {
      const { data, error, count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { data, count, error: null };
    } catch (error) {
      return { data: null, count: null, error };
    }
  },

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transactionId: string,
    status: string,
    reference?: string
  ): Promise<{ data: Transaction | null; error: any }> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (reference) {
        updateData.provider_reference = reference;
      }

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', transactionId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

/**
 * ============================================
 * RENT PAYMENT SERVICE
 * ============================================
 */

export const rentPaymentService = {
  /**
   * Create rent schedule
   */
  async createRentSchedule(scheduleData: Partial<RentSchedule>): Promise<{ data: RentSchedule | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('rent_schedules')
        .insert({
          ...scheduleData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get rent schedules by tenant
   */
  async getTenantRentSchedules(tenantId: string): Promise<{ data: RentSchedule[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('rent_schedules')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('next_due_date', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get rent schedules by property owner
   */
  async getOwnerRentSchedules(ownerId: string): Promise<{ data: RentSchedule[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('rent_schedules')
        .select('*')
        .eq('owner_id', ownerId)
        .order('next_due_date', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Update rent schedule after payment
   */
  async updateRentScheduleAfterPayment(
    rentScheduleId: string
  ): Promise<{ data: RentSchedule | null; error: any }> {
    try {
      const currentDate = new Date();
      const nextDueDate = new Date(currentDate);

      // Add frequency to get next due date
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);

      const { data, error } = await supabase
        .from('rent_schedules')
        .update({
          last_paid_date: currentDate.toISOString(),
          next_due_date: nextDueDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', rentScheduleId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

/**
 * ============================================
 * ESCROW SERVICE
 * ============================================
 */

export const escrowService = {
  /**
   * Create escrow account
   */
  async createEscrow(escrowData: Partial<EscrowAccount>): Promise<{ data: EscrowAccount | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('escrow_accounts')
        .insert({
          ...escrowData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get escrow by booking
   */
  async getEscrowByBooking(bookingId: string): Promise<{ data: EscrowAccount | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('escrow_accounts')
        .select('*')
        .eq('booking_id', bookingId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Release escrow funds
   */
  async releaseEscrow(
    escrowId: string,
    amount?: number
  ): Promise<{ data: EscrowAccount | null; error: any }> {
    try {
      const releaseAmount = amount || null;

      const { data, error } = await supabase
        .from('escrow_accounts')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
          released_amount: releaseAmount,
        })
        .eq('id', escrowId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Dispute escrow
   */
  async disputeEscrow(
    escrowId: string,
    reason: string
  ): Promise<{ data: EscrowAccount | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('escrow_accounts')
        .update({
          status: 'disputed',
          dispute_reason: reason,
        })
        .eq('id', escrowId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get user's escrows
   */
  async getUserEscrows(userId: string): Promise<{ data: EscrowAccount[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('escrow_accounts')
        .select('*')
        .or(`owner_id.eq.${userId},tenant_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

/**
 * ============================================
 * PAYMENT METHOD SERVICE
 * ============================================
 */

export const paymentMethodService = {
  /**
   * Create payment method
   */
  async createPaymentMethod(
    methodData: Partial<PaymentMethod>
  ): Promise<{ data: PaymentMethod | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .insert({
          ...methodData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get user payment methods
   */
  async getUserPaymentMethods(userId: string): Promise<{ data: PaymentMethod[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Delete payment method
   */
  async deletePaymentMethod(methodId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', methodId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },
};

/**
 * ============================================
 * PAYMENT ORCHESTRATION SERVICE
 * ============================================
 */

export const paymentOrchestrationService = {
  /**
   * Complete payment flow with verification and booking updates
   */
  async processPayment(request: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
    try {
      // Check if user has default payment method
      const { data: methods, error: methodsError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', request.user_id)
        .eq('is_default', true)
        .single();

      let provider = request.provider;
      if (!methodsError && methods) {
        provider = methods.provider;
      }

      // Create initial transaction
      const { data: transaction, error: txError } = await transactionService.createTransaction({
        user_id: request.user_id,
        amount: request.amount,
        currency: request.currency,
        type: request.transaction_type,
        status: 'pending',
        provider,
        property_id: request.property_id,
        booking_id: request.booking_id,
        description: `${request.transaction_type} for property ${request.property_id}`,
        metadata: request.metadata,
      });

      if (txError || !transaction) throw txError || new Error('Failed to create transaction');

      // Get user email
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('id', request.user_id)
        .single();

      if (userError || !user?.email) throw new Error('User email not found');

      // Initialize payment with provider
      let response: any;
      if (provider === 'paystack') {
        response = await paystackService.initializePayment(user.email, request.amount, {
          ...request.metadata,
          transaction_id: transaction.id,
        });
        
        return {
          success: true,
          transaction_id: transaction.id,
          authorization_url: response.authorization_url,
          access_code: response.access_code,
          reference: response.reference,
          provider: 'paystack',
          expires_in: 3600,
        };
      } else {
        const txRef = `ph_${transaction.id}_${Date.now()}`;
        response = await flutterwaveService.initializePayment(
          user.email,
          request.amount,
          txRef,
          request.currency,
          request.metadata
        );

        return {
          success: true,
          transaction_id: transaction.id,
          authorization_url: response.link,
          reference: txRef,
          provider: 'flutterwave',
        };
      }
    } catch (error) {
      console.error('Payment orchestration error:', error);
      throw error;
    }
  },

  /**
   * Verify payment and update all related records
   */
  async verifyAndCompletePayment(
    transactionId: string,
    reference: string,
    provider: 'paystack' | 'flutterwave'
  ): Promise<VerifyPaymentResponse> {
    try {
      // Get transaction details
      const { data: transaction, error: txError } = await transactionService.getTransaction(transactionId);
      if (txError || !transaction) throw new Error('Transaction not found');

      let paymentData: any;
      let status: 'completed' | 'failed' = 'failed';

      if (provider === 'paystack') {
        paymentData = await paystackService.verifyPayment(reference);
        status = paymentData.status === 'success' ? 'completed' : 'failed';
      } else {
        paymentData = await flutterwaveService.verifyPayment(reference);
        status = paymentData.status === 'successful' ? 'completed' : 'failed';
      }

      // Update transaction
      const { data: updatedTx, error: updateError } = await transactionService.updateTransactionStatus(
        transactionId,
        status,
        reference
      );

      if (updateError) throw updateError;

      // If successful, handle post-payment operations
      if (status === 'completed') {
        // Update booking if applicable
        if (transaction.booking_id) {
          const { error: bookingError } = await supabase
            .from('bookings')
            .update({
              payment_status: 'paid',
              payment_confirmed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', transaction.booking_id);

          if (bookingError) console.error('Failed to update booking:', bookingError);
        }

        // Update rent schedule if rent payment
        if (transaction.type === 'rent_payment' && transaction.metadata?.rent_schedule_id) {
          await rentPaymentService.updateRentScheduleAfterPayment(transaction.metadata.rent_schedule_id);
        }

        // Create notification
        await supabase.from('notifications').insert({
          user_id: transaction.user_id,
          type: 'payment_completed',
          title: 'Payment Confirmed',
          message: `Payment of ${transaction.currency} ${transaction.amount} has been confirmed.`,
          data: { transaction_id: transactionId },
        });
      }

      return {
        success: status === 'completed',
        transaction_id: transactionId,
        reference,
        status,
        amount: transaction.amount,
        currency: transaction.currency,
        completed_at: status === 'completed' ? new Date().toISOString() : undefined,
        message: status === 'completed' ? 'Payment successful' : 'Payment failed',
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      throw error;
    }
  },

  /**
   * Calculate platform commission
   */
  async calculateCommission(
    amount: number,
    transactionType: TransactionType
  ): Promise<{ commission: number; net: number }> {
    try {
      const { data: config } = await supabase
        .from('payment_configuration')
        .select('*')
        .single();

      let commissionRate = 0.05; // Default 5%
      let fixedAmount = 0;

      if (config) {
        commissionRate = config.commission_rate || 0.05;
        fixedAmount = config.fixed_amount || 0;
      }

      const commission = Math.round(amount * commissionRate * 100) / 100 + fixedAmount;
      const net = amount - commission;

      return { commission, net };
    } catch (error) {
      console.error('Commission calculation error:', error);
      // Return default if query fails
      return {
        commission: Math.round(amount * 0.05 * 100) / 100,
        net: Math.round(amount * 0.95 * 100) / 100,
      };
    }
  },

  /**
   * Record commission transaction
   */
  async recordCommission(
    transactionId: string,
    amount: number
  ): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000', // Platform account
          type: 'commission',
          amount,
          currency: 'GHS',
          status: 'completed',
          metadata: { source_transaction_id: transactionId },
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Process refund
   */
  async processRefund(
    transactionId: string,
    amount?: number,
    reason?: string
  ): Promise<{ success: boolean; error?: any }> {
    try {
      const { data: transaction, error: txError } = await transactionService.getTransaction(transactionId);
      if (txError || !transaction) throw new Error('Transaction not found');

      const refundAmount = amount || transaction.amount;

      // Update transaction status
      const { error: updateError } = await transactionService.updateTransactionStatus(
        transactionId,
        'refunded'
      );

      if (updateError) throw updateError;

      // Create refund transaction record
      const { error: refundError } = await supabase
        .from('transactions')
        .insert({
          user_id: transaction.user_id,
          type: 'refund',
          amount: refundAmount,
          currency: transaction.currency,
          status: 'completed',
          metadata: {
            original_transaction_id: transactionId,
            reason,
          },
          created_at: new Date().toISOString(),
        });

      if (refundError) throw refundError;

      // Notify user
      await supabase.from('notifications').insert({
        user_id: transaction.user_id,
        type: 'refund_processed',
        title: 'Refund Processed',
        message: `A refund of ${transaction.currency} ${refundAmount} has been processed. It may take 3-5 business days to appear in your account.`,
        data: { transaction_id: transactionId },
      });

      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  },
};

/**
 * ============================================
 * WEBHOOK HANDLER
 * ============================================
 */

export const webhookHandler = {
  /**
   * Handle Paystack webhook
   */
  async handlePaystackWebhook(event: any): Promise<{ success: boolean; message: string }> {
    try {
      if (event.event !== 'charge.success') {
        return { success: true, message: 'Event not relevant' };
      }

      const { reference, amount, customer } = event.data;

      // Find transaction by reference
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('provider_reference', reference);

      if (txError || !transactions || transactions.length === 0) {
        console.warn('Transaction not found for reference:', reference);
        return { success: false, message: 'Transaction not found' };
      }

      const transaction = transactions[0];

      // Verify amount matches
      if (Math.round(amount / 100) !== transaction.amount) {
        console.warn('Amount mismatch for transaction:', transaction.id);
        return { success: false, message: 'Amount mismatch' };
      }

      // Update transaction
      await paymentOrchestrationService.verifyAndCompletePayment(
        transaction.id,
        reference,
        'paystack'
      );

      return { success: true, message: 'Webhook processed' };
    } catch (error) {
      console.error('Paystack webhook error:', error);
      return { success: false, message: 'Webhook processing failed' };
    }
  },

  /**
   * Handle Flutterwave webhook
   */
  async handleFlutterwaveWebhook(event: any): Promise<{ success: boolean; message: string }> {
    try {
      if (event.event !== 'charge.completed') {
        return { success: true, message: 'Event not relevant' };
      }

      const { id: transactionId, amount, tx_ref } = event.data;

      // Find transaction by reference
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('provider_reference', tx_ref);

      if (txError || !transactions || transactions.length === 0) {
        console.warn('Transaction not found for reference:', tx_ref);
        return { success: false, message: 'Transaction not found' };
      }

      const transaction = transactions[0];

      // Verify amount matches
      if (amount !== transaction.amount) {
        console.warn('Amount mismatch for transaction:', transaction.id);
        return { success: false, message: 'Amount mismatch' };
      }

      // Update transaction
      await paymentOrchestrationService.verifyAndCompletePayment(
        transaction.id,
        tx_ref,
        'flutterwave'
      );

      return { success: true, message: 'Webhook processed' };
    } catch (error) {
      console.error('Flutterwave webhook error:', error);
      return { success: false, message: 'Webhook processing failed' };
    }
  },
};

/**
 * ============================================
 * RENT AUTOMATION SERVICE
 * ============================================
 */

export const rentAutomationService = {
  /**
   * Send payment reminders for upcoming rent
   */
  async sendRentReminders(): Promise<{ sent: number; failed: number }> {
    try {
      const now = new Date();
      const reminderDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

      // Get all active rent schedules due in 3 days
      const { data: schedules, error: scheduleError } = await supabase
        .from('rent_schedules')
        .select('*')
        .eq('status', 'active')
        .lte('next_due_date', reminderDate.toISOString())
        .gte('next_due_date', now.toISOString());

      if (scheduleError) throw scheduleError;

      let sent = 0;
      let failed = 0;

      for (const schedule of schedules || []) {
        try {
          // Get tenant info
          const { data: tenant, error: tenantError } = await supabase
            .from('users')
            .select('id, email, phone_number')
            .eq('id', schedule.tenant_id)
            .single();

          if (tenantError || !tenant) continue;

          // Create notification
          await supabase.from('notifications').insert({
            user_id: tenant.id,
            type: 'rent_reminder',
            title: 'Rent Payment Due Soon',
            message: `Your rent of ${schedule.currency} ${schedule.amount} is due on ${new Date(schedule.next_due_date).toLocaleDateString()}. Please make the payment promptly.`,
            data: { rent_schedule_id: schedule.id },
          });

          // Could send SMS via Twilio or email here
          sent++;
        } catch (error) {
          console.error('Failed to send reminder for schedule:', schedule.id, error);
          failed++;
        }
      }

      return { sent, failed };
    } catch (error) {
      console.error('Rent reminder error:', error);
      return { sent: 0, failed: 0 };
    }
  },

  /**
   * Auto-debit rent for active subscriptions
   */
  async autoDebitRent(): Promise<{ processed: number; failed: number }> {
    try {
      const now = new Date();

      // Get all active rent schedules with auto_debit enabled
      const { data: schedules, error: scheduleError } = await supabase
        .from('rent_schedules')
        .select('*')
        .eq('status', 'active')
        .eq('auto_debit', true)
        .lte('next_due_date', now.toISOString());

      if (scheduleError) throw scheduleError;

      let processed = 0;
      let failed = 0;

      for (const schedule of schedules || []) {
        try {
          const { data: tenant } = await supabase
            .from('users')
            .select('email')
            .eq('id', schedule.tenant_id)
            .single();

          if (!tenant?.email) continue;

          // Initiate payment
          const result = await paymentOrchestrationService.processPayment({
            user_id: schedule.tenant_id,
            amount: schedule.amount,
            currency: schedule.currency,
            transaction_type: 'rent_payment',
            provider: 'paystack',
            metadata: {
              rent_schedule_id: schedule.id,
              auto_debit: true,
            },
          });

          if (result.success) {
            processed++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error('Failed to auto-debit for schedule:', schedule.id, error);
          failed++;
        }
      }

      return { processed, failed };
    } catch (error) {
      console.error('Auto-debit error:', error);
      return { processed: 0, failed: 0 };
    }
  },

  /**
   * Check for overdue rent and notify landlords
   */
  async notifyOverdueRent(): Promise<{ notified: number }> {
    try {
      const now = new Date();

      // Get all overdue rent schedules
      const { data: schedules, error: scheduleError } = await supabase
        .from('rent_schedules')
        .select('*')
        .eq('status', 'active')
        .lt('next_due_date', now.toISOString());

      if (scheduleError) throw scheduleError;

      let notified = 0;

      for (const schedule of schedules || []) {
        try {
          // Notify landlord
          await supabase.from('notifications').insert({
            user_id: schedule.owner_id,
            type: 'rent_overdue',
            title: 'Rent Payment Overdue',
            message: `Rent for property is ${Math.floor((now.getTime() - new Date(schedule.next_due_date).getTime()) / (1000 * 60 * 60 * 24))} days overdue. Contact tenant for payment.`,
            data: { rent_schedule_id: schedule.id },
          });

          notified++;
        } catch (error) {
          console.error('Failed to notify for schedule:', schedule.id, error);
        }
      }

      return { notified };
    } catch (error) {
      console.error('Overdue rent notification error:', error);
      return { notified: 0 };
    }
  },
};

export default {
  paystack: paystackService,
  flutterwave: flutterwaveService,
  transactions: transactionService,
  rentPayment: rentPaymentService,
  escrow: escrowService,
  paymentMethods: paymentMethodService,
  orchestration: paymentOrchestrationService,
  webhooks: webhookHandler,
  automation: rentAutomationService,
};
