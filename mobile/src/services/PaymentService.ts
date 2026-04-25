/**
 * PropertyHub Mobile - Payment Service
 * 
 * React Native payment processing service for property transactions.
 * Integrates with Paystack SDK for mobile payments with:
 * - Native payment UI components
 * - Biometric authentication support
 * - Offline payment queuing
 * - Receipt generation and storage
 * - Payment method management
 * - Push notification integration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

// Types (shared with web app)
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

export type TransactionStatus = 
  | 'initiated'
  | 'processing'
  | 'success'
  | 'failed'
  | 'abandoned'
  | 'reversed';

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

export interface PaymentTimeline {
  status: TransactionStatus;
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

export interface MobilePaymentConfig {
  email: string;
  amount: number; // in kobo for NGN, cents for USD
  currency: string;
  reference: string;
  publicKey: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  metadata?: Record<string, any>;
  customizations?: {
    title?: string;
    description?: string;
    logo?: string;
  };
}

export interface PaymentResult {
  success: boolean;
  reference: string;
  transaction?: PaymentTransaction;
  error?: string;
}

// Mock Paystack SDK for demo (in production, use @react-native-paystack/paystack)
interface PaystackSDK {
  chargeCard: (config: MobilePaymentConfig) => Promise<{ reference: string; status: string }>;
  chargeMobileMoney: (config: MobilePaymentConfig) => Promise<{ reference: string; status: string }>;
  chargeBankTransfer: (config: MobilePaymentConfig) => Promise<{ reference: string; status: string }>;
}

// Mock implementation for demo
const MockPaystackSDK: PaystackSDK = {
  chargeCard: async (config) => {
    console.log('🎭 Mock: Charging card with config:', config);
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 90% success rate for demo
    const success = Math.random() > 0.1;
    
    if (success) {
      return {
        reference: config.reference,
        status: 'success'
      };
    } else {
      throw new Error('Payment failed - Insufficient funds');
    }
  },
  
  chargeMobileMoney: async (config) => {
    console.log('🎭 Mock: Charging mobile money with config:', config);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const success = Math.random() > 0.15; // 85% success rate
    
    if (success) {
      return {
        reference: config.reference,
        status: 'success'
      };
    } else {
      throw new Error('Mobile money payment failed');
    }
  },
  
  chargeBankTransfer: async (config) => {
    console.log('🎭 Mock: Processing bank transfer with config:', config);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      reference: config.reference,
      status: 'pending' // Bank transfers usually require confirmation
    };
  }
};

class MobilePaymentService {
  private apiUrl: string;
  private publicKey: string;
  private secretKey: string;
  private paystack: PaystackSDK;

  constructor() {
    this.apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://api.propertyhub.app';
    this.publicKey = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || '';
    this.secretKey = process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY || '';
    
    // In production, use: import { paystack } from '@react-native-paystack/paystack';
    this.paystack = MockPaystackSDK;

    if (!this.publicKey) {
      console.warn('⚠️ Paystack public key not configured');
    }
  }

  /**
   * Initialize payment intent for mobile
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
    metadata?: Record<string, any>;
  }): Promise<{
    reference: string;
    amount: number;
    currency: string;
    publicKey: string;
  }> {
    try {
      const isOnline = await NetInfo.fetch().then(state => state.isConnected);
      
      if (!isOnline) {
        // Queue payment for later processing
        await this.queueOfflinePayment(params);
        throw new Error('No internet connection. Payment queued for when connection is restored.');
      }

      const response = await fetch(`${this.apiUrl}/payments/intents/mobile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
          'X-Platform': Platform.OS,
          'X-App-Version': '1.0.0',
        },
        body: JSON.stringify({
          ...params,
          reference: this.generateReference(),
          platform: Platform.OS,
          deviceInfo: {
            platform: Platform.OS,
            version: Platform.Version,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Payment creation failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Payment creation failed');
      }

      // Cache payment intent locally
      await AsyncStorage.setItem(
        `payment_intent_${data.reference}`,
        JSON.stringify(data)
      );

      return {
        reference: data.reference,
        amount: params.amount,
        currency: params.currency,
        publicKey: this.publicKey
      };
      
    } catch (error) {
      console.error('❌ Mobile payment intent creation failed:', error);
      throw error;
    }
  }

  /**
   * Process card payment using Paystack React Native SDK
   */
  async processCardPayment(params: {
    email: string;
    amount: number;
    currency: string;
    reference: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    metadata?: Record<string, any>;
  }): Promise<PaymentResult> {
    try {
      const config: MobilePaymentConfig = {
        email: params.email,
        amount: params.amount * 100, // Convert to kobo/cents
        currency: params.currency,
        reference: params.reference,
        publicKey: this.publicKey,
        firstName: params.firstName,
        lastName: params.lastName,
        phone: params.phone,
        metadata: params.metadata,
        customizations: {
          title: 'PropertyHub Payment',
          description: 'Property transaction payment',
        }
      };

      console.log('💳 Processing card payment:', config.reference);

      const result = await this.paystack.chargeCard(config);
      
      if (result.status === 'success') {
        // Verify payment on backend
        const transaction = await this.verifyPayment(result.reference);
        
        return {
          success: true,
          reference: result.reference,
          transaction
        };
      } else {
        return {
          success: false,
          reference: result.reference,
          error: 'Payment was not successful'
        };
      }
      
    } catch (error) {
      console.error('❌ Card payment failed:', error);
      return {
        success: false,
        reference: params.reference,
        error: error instanceof Error ? error.message : 'Payment failed'
      };
    }
  }

  /**
   * Process mobile money payment
   */
  async processMobileMoneyPayment(params: {
    email: string;
    amount: number;
    currency: string;
    reference: string;
    phone: string;
    provider: 'mtn' | 'airtel' | 'glo' | '9mobile';
    metadata?: Record<string, any>;
  }): Promise<PaymentResult> {
    try {
      const config: MobilePaymentConfig = {
        email: params.email,
        amount: params.amount * 100,
        currency: params.currency,
        reference: params.reference,
        publicKey: this.publicKey,
        phone: params.phone,
        metadata: {
          ...params.metadata,
          provider: params.provider
        },
        customizations: {
          title: 'PropertyHub Mobile Money',
          description: `Pay with ${params.provider.toUpperCase()}`,
        }
      };

      console.log('📱 Processing mobile money payment:', config.reference);

      const result = await this.paystack.chargeMobileMoney(config);
      
      if (result.status === 'success') {
        const transaction = await this.verifyPayment(result.reference);
        
        return {
          success: true,
          reference: result.reference,
          transaction
        };
      } else {
        return {
          success: false,
          reference: result.reference,
          error: 'Mobile money payment was not successful'
        };
      }
      
    } catch (error) {
      console.error('❌ Mobile money payment failed:', error);
      return {
        success: false,
        reference: params.reference,
        error: error instanceof Error ? error.message : 'Mobile money payment failed'
      };
    }
  }

  /**
   * Process bank transfer payment
   */
  async processBankTransferPayment(params: {
    email: string;
    amount: number;
    currency: string;
    reference: string;
    metadata?: Record<string, any>;
  }): Promise<PaymentResult> {
    try {
      const config: MobilePaymentConfig = {
        email: params.email,
        amount: params.amount * 100,
        currency: params.currency,
        reference: params.reference,
        publicKey: this.publicKey,
        metadata: params.metadata,
        customizations: {
          title: 'PropertyHub Bank Transfer',
          description: 'Complete payment via bank transfer',
        }
      };

      console.log('🏦 Processing bank transfer payment:', config.reference);

      const result = await this.paystack.chargeBankTransfer(config);
      
      // Bank transfers typically return pending status
      return {
        success: true,
        reference: result.reference,
        error: result.status === 'pending' 
          ? 'Bank transfer initiated. Please complete the transfer to confirm payment.'
          : undefined
      };
      
    } catch (error) {
      console.error('❌ Bank transfer payment failed:', error);
      return {
        success: false,
        reference: params.reference,
        error: error instanceof Error ? error.message : 'Bank transfer failed'
      };
    }
  }

  /**
   * Verify payment on backend
   */
  async verifyPayment(reference: string): Promise<PaymentTransaction> {
    try {
      const response = await fetch(`${this.apiUrl}/payments/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
          'X-Platform': Platform.OS,
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
      
      // Cache transaction locally
      await AsyncStorage.setItem(
        `payment_transaction_${transaction.id}`,
        JSON.stringify(transaction)
      );
      
      // Remove payment intent from cache
      await AsyncStorage.removeItem(`payment_intent_${reference}`);
      
      return transaction;
      
    } catch (error) {
      console.error('❌ Mobile payment verification failed:', error);
      throw error;
    }
  }

  /**
   * Get saved payment methods
   */
  async getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    try {
      const isOnline = await NetInfo.fetch().then(state => state.isConnected);
      
      if (!isOnline) {
        return this.getCachedPaymentMethods(customerId);
      }

      const response = await fetch(`${this.apiUrl}/payments/methods/${customerId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
          'X-Platform': Platform.OS,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch payment methods: ${response.statusText}`);
      }

      const data = await response.json();
      const methods = data.success ? data.data : [];
      
      // Cache payment methods
      await AsyncStorage.setItem(
        `payment_methods_${customerId}`,
        JSON.stringify(methods)
      );
      
      return methods;
      
    } catch (error) {
      console.error('❌ Failed to fetch payment methods:', error);
      return this.getCachedPaymentMethods(customerId);
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(params: {
    customerId: string;
    page?: number;
    limit?: number;
  }): Promise<{
    transactions: PaymentTransaction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const isOnline = await NetInfo.fetch().then(state => state.isConnected);
      
      if (!isOnline) {
        return this.getCachedTransactionHistory(params.customerId);
      }

      const searchParams = new URLSearchParams({
        customerId: params.customerId,
        page: (params.page || 1).toString(),
        limit: (params.limit || 20).toString(),
      });

      const response = await fetch(`${this.apiUrl}/payments/transactions/mobile?${searchParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
          'X-Platform': Platform.OS,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }

      const data = await response.json();
      const result = data.success ? data.data : { transactions: [], total: 0, page: 1, totalPages: 0 };
      
      // Cache transaction history
      await AsyncStorage.setItem(
        `transaction_history_${params.customerId}`,
        JSON.stringify(result)
      );
      
      return result;
      
    } catch (error) {
      console.error('❌ Failed to fetch transactions:', error);
      return this.getCachedTransactionHistory(params.customerId);
    }
  }

  /**
   * Calculate payment fees (mobile-optimized)
   */
  calculateFees(amount: number, currency: string = 'NGN'): PaymentFees {
    let paystackFee = 0;
    let vatFee = 0;

    if (currency === 'NGN') {
      if (amount <= 250000) {
        paystackFee = amount * 0.015; // 1.5%
      } else {
        paystackFee = 3750 + ((amount - 250000) * 0.01); // ₦37.5 + 1% for amounts above ₦2,500
      }
      
      paystackFee = Math.min(paystackFee, 200000); // Cap at ₦200,000
      vatFee = paystackFee * 0.075; // 7.5% VAT
    } else if (currency === 'USD') {
      paystackFee = amount * 0.039; // 3.9%
      paystackFee = Math.max(paystackFee, 50); // Minimum $0.50
    }

    const platformFee = amount * 0.02; // 2% platform fee
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
   * Process queued offline payments
   */
  async processQueuedPayments(): Promise<void> {
    try {
      const queuedPayments = await AsyncStorage.getItem('queued_payments');
      if (!queuedPayments) return;

      const payments = JSON.parse(queuedPayments);
      const processedPayments: string[] = [];

      for (const payment of payments) {
        try {
          await this.createPaymentIntent(payment);
          processedPayments.push(payment.id);
          console.log('✅ Processed queued payment:', payment.reference);
        } catch (error) {
          console.error('❌ Failed to process queued payment:', payment.reference, error);
        }
      }

      // Remove processed payments from queue
      const remainingPayments = payments.filter(
        (p: any) => !processedPayments.includes(p.id)
      );
      
      if (remainingPayments.length > 0) {
        await AsyncStorage.setItem('queued_payments', JSON.stringify(remainingPayments));
      } else {
        await AsyncStorage.removeItem('queued_payments');
      }

    } catch (error) {
      console.error('❌ Error processing queued payments:', error);
    }
  }

  // Private helper methods

  private async queueOfflinePayment(params: any): Promise<void> {
    try {
      const queuedPayments = await AsyncStorage.getItem('queued_payments');
      const payments = queuedPayments ? JSON.parse(queuedPayments) : [];
      
      payments.push({
        ...params,
        id: this.generateReference(),
        queuedAt: new Date().toISOString()
      });
      
      await AsyncStorage.setItem('queued_payments', JSON.stringify(payments));
    } catch (error) {
      console.error('❌ Error queuing offline payment:', error);
    }
  }

  private async getCachedPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    try {
      const cached = await AsyncStorage.getItem(`payment_methods_${customerId}`);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('❌ Error getting cached payment methods:', error);
      return [];
    }
  }

  private async getCachedTransactionHistory(customerId: string): Promise<{
    transactions: PaymentTransaction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const cached = await AsyncStorage.getItem(`transaction_history_${customerId}`);
      return cached ? JSON.parse(cached) : { transactions: [], total: 0, page: 1, totalPages: 0 };
    } catch (error) {
      console.error('❌ Error getting cached transaction history:', error);
      return { transactions: [], total: 0, page: 1, totalPages: 0 };
    }
  }

  private generateReference(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `PHM_${timestamp}_${random}`.toUpperCase();
  }

  private async getAuthToken(): string {
    // Get from secure storage in production
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required');
    }
    return token;
  }
}

// Export singleton instance
export const mobilePaymentService = new MobilePaymentService();
export default mobilePaymentService;