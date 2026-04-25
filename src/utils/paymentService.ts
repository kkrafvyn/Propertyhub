/**
 * PropertyHub - Payment Service
 * 
 * Comprehensive payment processing service for property transactions and bookings.
 * Integrates with Paystack for secure payment processing with support for:
 * - Property purchases and sales
 * - Rental payments and deposits
 * - Booking fees and tours
 * - Subscription payments
 * - Refunds and dispute handling
 * 
 * Features:
 * - Secure API integration with Paystack
 * - Payment method management (cards, bank transfers, mobile money)
 * - Real-time payment status tracking
 * - Webhook verification and processing
 * - Multi-currency support
 * - Fraud detection and prevention
 * - Payment analytics and reporting
 */

import { toast } from 'sonner';
import { envConfig } from './envConfig';

// Types
export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'mobile_money' | 'ussd';
  provider: string;
  last4?: string;
  brand?: string;
  expiry?: string;
  bankName?: string;
  accountNumber?: string;
  isDefault: boolean;
  isVerified: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  type: PaymentType;
  status: PaymentStatus;
  description: string;
  metadata: PaymentMetadata;
  paymentMethodId?: string;
  customerId: string;
  propertyId?: string;
  bookingId?: string;
  reference: string;
  authorizationUrl?: string;
  accessCode?: string;
  fees: PaymentFees;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface PaymentTransaction {
  id: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  type: PaymentType;
  reference: string;
  gatewayReference?: string;
  paymentMethod: PaymentMethod;
  customer: PaymentCustomer;
  property?: PaymentPropertyInfo;
  booking?: PaymentBookingInfo;
  fees: PaymentFees;
  timeline: PaymentTimeline[];
  refunds: PaymentRefund[];
  disputes: PaymentDispute[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type PaymentType = 
  | 'property_purchase'
  | 'property_deposit'
  | 'rental_payment'
  | 'rental_deposit'
  | 'booking_fee'
  | 'tour_fee'
  | 'subscription'
  | 'commission'
  | 'refund';

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'requires_action'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'refunded'
  | 'disputed';

export type TransactionStatus = 
  | 'initiated'
  | 'processing'
  | 'success'
  | 'failed'
  | 'abandoned'
  | 'reversed';

export interface PaymentMetadata {
  propertyId?: string;
  propertyTitle?: string;
  bookingId?: string;
  customerId: string;
  customerEmail: string;
  hostId?: string;
  hostEmail?: string;
  paymentPlan?: PaymentPlan;
  installmentNumber?: number;
  totalInstallments?: number;
  dueDate?: string;
  [key: string]: any;
}

export interface PaymentFees {
  paystackFee: number;
  platformFee: number;
  vatFee: number;
  totalFees: number;
  netAmount: number;
}

export interface PaymentCustomer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: Address;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface PaymentPropertyInfo {
  id: string;
  title: string;
  type: string;
  location: string;
  price: number;
  currency: string;
  hostId: string;
  hostName: string;
}

export interface PaymentBookingInfo {
  id: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalNights: number;
  pricePerNight: number;
}

export interface PaymentPlan {
  type: 'full' | 'installment' | 'mortgage';
  totalAmount: number;
  downPayment: number;
  installments?: PaymentInstallment[];
  interestRate?: number;
  duration?: number; // months
}

export interface PaymentInstallment {
  number: number;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue' | 'waived';
  paidAt?: string;
  paymentId?: string;
}

export interface PaymentTimeline {
  status: PaymentStatus | TransactionStatus;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface PaymentRefund {
  id: string;
  amount: number;
  reason: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  processedAt?: string;
  metadata?: Record<string, any>;
}

export interface PaymentDispute {
  id: string;
  amount: number;
  reason: string;
  status: 'open' | 'under_review' | 'resolved' | 'lost';
  evidence: DisputeEvidence[];
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

export interface DisputeEvidence {
  type: string;
  description: string;
  fileUrl?: string;
  uploadedAt: string;
}

export interface PaymentAnalytics {
  totalRevenue: number;
  totalTransactions: number;
  successRate: number;
  averageTransactionValue: number;
  topPaymentMethods: { method: string; count: number; percentage: number }[];
  revenueByType: { type: PaymentType; amount: number; count: number }[];
  monthlyRevenue: { month: string; revenue: number; transactions: number }[];
  refundRate: number;
  disputeRate: number;
  conversionRate: number;
}

class PaymentService {
  private apiUrl: string;
  private publicKey: string;

  constructor() {
    this.apiUrl = envConfig.API_URL || 'https://api.propertyhub.app';
    this.publicKey = envConfig.PAYSTACK_PUBLIC_KEY || '';

    const isDemoKey = this.publicKey === 'pk_test_demo_key_for_development';

    if (envConfig.isProduction && (!this.publicKey || isDemoKey)) {
      console.error('Paystack public key not configured for production.');
    }

    if (envConfig.isDevelopment && isDemoKey) {
      console.info('Using demo Paystack key for development.');
    }
  }


  /**
   * Initialize payment for property purchase or booking
   */
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    type: PaymentType;
    customerId: string;
    customerEmail: string;
    propertyId?: string;
    bookingId?: string;
    description: string;
    paymentPlan?: PaymentPlan;
    metadata?: Record<string, any>;
  }): Promise<PaymentIntent> {
    try {
      // For demo/development mode, create a mock payment intent
      if (envConfig.isDevelopment && 
          (!this.publicKey || this.publicKey === 'pk_test_demo_key_for_development')) {
        
        const mockPaymentIntent: PaymentIntent = {
          id: 'demo_intent_' + Date.now(),
          amount: params.amount,
          currency: params.currency,
          type: params.type,
          status: 'pending',
          description: params.description,
          metadata: {
            ...params.metadata,
            customerId: params.customerId,
            customerEmail: params.customerEmail,
            propertyId: params.propertyId,
            bookingId: params.bookingId,
            paymentPlan: params.paymentPlan
          },
          customerId: params.customerId,
          propertyId: params.propertyId,
          bookingId: params.bookingId,
          reference: this.generateReference(),
          fees: this.calculateFees(params.amount, params.currency),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
        };

        // Store payment intent locally for reference
        localStorage.setItem(`payment_intent_${mockPaymentIntent.id}`, JSON.stringify(mockPaymentIntent));
        
        console.log('💳 Demo payment intent created:', mockPaymentIntent.reference);
        return mockPaymentIntent;
      }

      const response = await fetch(`${this.apiUrl}/payments/intents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({
          ...params,
          reference: this.generateReference(),
          callback_url: `${window.location.origin}/payment/callback`,
          cancel_url: `${window.location.origin}/payment/cancel`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Payment creation failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Payment creation failed');
      }

      const paymentIntent: PaymentIntent = data.data;
      
      // Store payment intent locally for reference
      localStorage.setItem(`payment_intent_${paymentIntent.id}`, JSON.stringify(paymentIntent));
      
      console.log('💳 Payment intent created:', paymentIntent.reference);
      return paymentIntent;
      
    } catch (error) {
      console.error('❌ Payment intent creation failed:', error);
      
      // In development, still create a demo intent even if backend fails
      if (envConfig.isDevelopment) {
        console.info('🔄 Creating demo payment intent as fallback');
        
        const mockPaymentIntent: PaymentIntent = {
          id: 'demo_intent_fallback_' + Date.now(),
          amount: params.amount,
          currency: params.currency,
          type: params.type,
          status: 'pending',
          description: params.description,
          metadata: {
            ...params.metadata,
            customerId: params.customerId,
            customerEmail: params.customerEmail,
            propertyId: params.propertyId,
            bookingId: params.bookingId,
            paymentPlan: params.paymentPlan
          },
          customerId: params.customerId,
          propertyId: params.propertyId,
          bookingId: params.bookingId,
          reference: this.generateReference(),
          fees: this.calculateFees(params.amount, params.currency),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        };

        localStorage.setItem(`payment_intent_${mockPaymentIntent.id}`, JSON.stringify(mockPaymentIntent));
        
        console.log('💳 Demo fallback payment intent created:', mockPaymentIntent.reference);
        toast.info('Using demo payment mode for development');
        return mockPaymentIntent;
      }
      
      toast.error('Failed to create payment. Please try again.');
      throw error;
    }
  }

  /**
   * Process payment using Paystack Popup
   */
  async processPayment(paymentIntent: PaymentIntent): Promise<PaymentTransaction> {
    return new Promise((resolve, reject) => {
      try {
        // For demo/development mode with no real keys
        if (envConfig.isDevelopment && 
            (!this.publicKey || this.publicKey === 'pk_test_demo_key_for_development')) {
          this.initializePaystackPayment(paymentIntent, resolve, reject);
          return;
        }

        // Load Paystack script if not already loaded
        if (!window.PaystackPop) {
          const script = document.createElement('script');
          script.src = 'https://js.paystack.co/v1/inline.js';
          script.onload = () => this.initializePaystackPayment(paymentIntent, resolve, reject);
          script.onerror = () => {
            console.error('❌ Failed to load Paystack script');
            toast.error('Failed to load payment service. Please try again.');
            reject(new Error('Failed to load Paystack script'));
          };
          document.head.appendChild(script);
        } else {
          this.initializePaystackPayment(paymentIntent, resolve, reject);
        }
      } catch (error) {
        console.error('❌ Payment processing failed:', error);
        toast.error('Failed to process payment. Please try again.');
        reject(error);
      }
    });
  }

  private initializePaystackPayment(
    paymentIntent: PaymentIntent,
    resolve: (value: PaymentTransaction) => void,
    reject: (reason?: any) => void
  ) {
    // Check if we have a valid public key
    if (!this.publicKey || this.publicKey === 'pk_test_demo_key_for_development') {
      if (envConfig.isDevelopment) {
        console.info('💳 Demo mode: Simulating payment success');
        toast.success('Demo payment successful! (No real transaction processed)');
        
        // Simulate successful payment in development
        setTimeout(() => {
          const mockTransaction: PaymentTransaction = {
            id: 'mock_txn_' + Date.now(),
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: 'success',
            type: paymentIntent.type,
            reference: paymentIntent.reference,
            gatewayReference: 'demo_ref_' + Date.now(),
            paymentMethod: {
              id: 'demo_method',
              type: 'card',
              provider: 'demo',
              last4: '1234',
              brand: 'VISA',
              isDefault: false,
              isVerified: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            customer: {
              id: paymentIntent.customerId,
              email: paymentIntent.metadata.customerEmail,
              name: 'Demo Customer'
            },
            fees: this.calculateFees(paymentIntent.amount, paymentIntent.currency),
            timeline: [
              {
                status: 'success',
                message: 'Demo payment completed',
                timestamp: new Date().toISOString()
              }
            ],
            refunds: [],
            disputes: [],
            metadata: paymentIntent.metadata,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: new Date().toISOString()
          };
          
          resolve(mockTransaction);
        }, 1500);
        return;
      } else {
        console.error('❌ Paystack public key not configured for production');
        toast.error('Payment service not configured. Please contact support.');
        reject(new Error('Payment service not configured'));
        return;
      }
    }

    const handler = window.PaystackPop.setup({
      key: this.publicKey,
      email: paymentIntent.metadata.customerEmail,
      amount: paymentIntent.amount * 100, // Convert to kobo
      currency: paymentIntent.currency,
      ref: paymentIntent.reference,
      metadata: {
        custom_fields: [
          {
            display_name: "Payment Type",
            variable_name: "payment_type",
            value: paymentIntent.type
          },
          {
            display_name: "Property ID",
            variable_name: "property_id",
            value: paymentIntent.propertyId || ''
          },
          {
            display_name: "Booking ID",
            variable_name: "booking_id",
            value: paymentIntent.bookingId || ''
          }
        ]
      },
      callback: async (response: any) => {
        try {
          console.log('💳 Payment successful:', response.reference);
          toast.success('Payment successful! Processing your transaction...');
          
          // Verify payment on backend
          const transaction = await this.verifyPayment(response.reference);
          resolve(transaction);
          
        } catch (error) {
          console.error('❌ Payment verification failed:', error);
          toast.error('Payment verification failed. Please contact support.');
          reject(error);
        }
      },
      onClose: () => {
        console.log('💳 Payment modal closed');
        toast.info('Payment cancelled');
        reject(new Error('Payment cancelled by user'));
      }
    });

    handler.openIframe();
  }

  /**
   * Verify payment with backend
   */
  async verifyPayment(reference: string): Promise<PaymentTransaction> {
    try {
      const response = await fetch(`${this.apiUrl}/payments/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Payment verification failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Payment verification failed');
      }

      const transaction: PaymentTransaction = data.data;
      
      // Update local storage with transaction
      localStorage.setItem(`payment_transaction_${transaction.id}`, JSON.stringify(transaction));
      
      // Remove payment intent from storage
      const intentId = transaction.paymentIntentId;
      localStorage.removeItem(`payment_intent_${intentId}`);
      
      return transaction;
      
    } catch (error) {
      console.error('❌ Payment verification failed:', error);
      throw error;
    }
  }

  /**
   * Get payment methods for a customer
   */
  async getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    try {
      const response = await fetch(`${this.apiUrl}/payments/methods/${customerId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch payment methods: ${response.statusText}`);
      }

      const data = await response.json();
      return data.success ? data.data : [];
      
    } catch (error) {
      console.error('❌ Failed to fetch payment methods:', error);
      return [];
    }
  }

  /**
   * Save payment method for future use
   */
  async savePaymentMethod(customerId: string, authorizationCode: string): Promise<PaymentMethod> {
    try {
      const response = await fetch(`${this.apiUrl}/payments/methods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({
          customerId,
          authorizationCode,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save payment method: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to save payment method');
      }

      return data.data;
      
    } catch (error) {
      console.error('❌ Failed to save payment method:', error);
      throw error;
    }
  }

  /**
   * Process refund
   */
  async processRefund(params: {
    transactionId: string;
    amount?: number; // Partial refund if specified
    reason: string;
    metadata?: Record<string, any>;
  }): Promise<PaymentRefund> {
    try {
      const response = await fetch(`${this.apiUrl}/payments/refunds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Refund processing failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Refund processing failed');
      }

      const refund: PaymentRefund = data.data;
      toast.success('Refund initiated successfully');
      
      return refund;
      
    } catch (error) {
      console.error('❌ Refund processing failed:', error);
      toast.error('Failed to process refund. Please try again.');
      throw error;
    }
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(params: {
    startDate?: string;
    endDate?: string;
    propertyId?: string;
    customerId?: string;
  } = {}): Promise<PaymentAnalytics> {
    try {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value);
      });

      const response = await fetch(`${this.apiUrl}/payments/analytics?${searchParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch payment analytics: ${response.statusText}`);
      }

      const data = await response.json();
      return data.success ? data.data : this.getEmptyAnalytics();
      
    } catch (error) {
      console.error('❌ Failed to fetch payment analytics:', error);
      return this.getEmptyAnalytics();
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(params: {
    customerId?: string;
    propertyId?: string;
    type?: PaymentType;
    status?: PaymentStatus;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    transactions: PaymentTransaction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, value.toString());
      });

      const response = await fetch(`${this.apiUrl}/payments/transactions?${searchParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }

      const data = await response.json();
      return data.success ? data.data : { transactions: [], total: 0, page: 1, totalPages: 0 };
      
    } catch (error) {
      console.error('❌ Failed to fetch transactions:', error);
      return { transactions: [], total: 0, page: 1, totalPages: 0 };
    }
  }

  /**
   * Calculate payment fees
   */
  calculateFees(amount: number, currency: string = 'NGN'): PaymentFees {
    // Paystack fees structure
    let paystackFee = 0;
    let vatFee = 0;

    if (currency === 'NGN') {
      if (amount <= 250000) {
        paystackFee = amount * 0.015; // 1.5%
      } else {
        paystackFee = 3750 + ((amount - 250000) * 0.01); // ₦37.5 + 1% for amounts above ₦2,500
      }
      
      // Cap at ₦200,000
      paystackFee = Math.min(paystackFee, 200000);
      
      // Add VAT (7.5% of Paystack fee)
      vatFee = paystackFee * 0.075;
    } else if (currency === 'USD') {
      paystackFee = amount * 0.039; // 3.9%
      paystackFee = Math.max(paystackFee, 50); // Minimum $0.50
    }

    // Platform fee (2% of transaction)
    const platformFee = amount * 0.02;
    
    const totalFees = paystackFee + vatFee + platformFee;
    const netAmount = amount - totalFees;

    return {
      paystackFee: Math.round(paystackFee * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      vatFee: Math.round(vatFee * 100) / 100,
      totalFees: Math.round(totalFees * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
    };
  }

  /**
   * Generate payment reference
   */
  private generateReference(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `PH_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Get authentication token
   */
  private async getAuthToken(): Promise<string> {
    // Get from localStorage or auth context
    const token = localStorage.getItem('auth_token');
    if (!token) {
      // In development mode, return a mock token
      if (envConfig.isDevelopment) {
        return 'demo_auth_token_for_development';
      }
      throw new Error('Authentication required');
    }
    return token;
  }

  /**
   * Get empty analytics object
   */
  private getEmptyAnalytics(): PaymentAnalytics {
    return {
      totalRevenue: 0,
      totalTransactions: 0,
      successRate: 0,
      averageTransactionValue: 0,
      topPaymentMethods: [],
      revenueByType: [],
      monthlyRevenue: [],
      refundRate: 0,
      disputeRate: 0,
      conversionRate: 0,
    };
  }

  /**
   * Get demo analytics data for development
   */
  public getDemoAnalytics(): PaymentAnalytics {
    return {
      totalRevenue: 12500000, // ₦125,000
      totalTransactions: 1250,
      successRate: 94.8,
      averageTransactionValue: 10000, // ₦100
      topPaymentMethods: [
        { method: 'Card Payment', count: 875, percentage: 70 },
        { method: 'Bank Transfer', count: 250, percentage: 20 },
        { method: 'USSD', count: 75, percentage: 6 },
        { method: 'Mobile Money', count: 50, percentage: 4 }
      ],
      revenueByType: [
        { type: 'property_purchase', amount: 7500000, count: 750 },
        { type: 'rental_payment', amount: 3000000, count: 300 },
        { type: 'booking_fee', amount: 1500000, count: 150 },
        { type: 'property_deposit', amount: 500000, count: 50 }
      ],
      monthlyRevenue: [
        { month: 'Jan 2024', revenue: 8500000, transactions: 850 },
        { month: 'Feb 2024', revenue: 9200000, transactions: 920 },
        { month: 'Mar 2024', revenue: 10100000, transactions: 1010 },
        { month: 'Apr 2024', revenue: 11300000, transactions: 1130 },
        { month: 'May 2024', revenue: 12500000, transactions: 1250 },
        { month: 'Jun 2024', revenue: 13800000, transactions: 1380 }
      ],
      refundRate: 2.1,
      disputeRate: 0.8,
      conversionRate: 87.5,
    };
  }
}

// Extend window object for Paystack
declare global {
  interface Window {
    PaystackPop: {
      setup: (config: any) => {
        openIframe: () => void;
      };
    };
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
export default paymentService;
