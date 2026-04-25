/**
 * Subscription Service Utility
 * 
 * Handles subscription-related operations including Paystack integration,
 * billing management, and subscription state management.
 */

import type { 
  Subscription, 
  SubscriptionPlan, 
  BillingHistory, 
  PaymentMethod, 
  SubscriptionUsage 
} from '../types/subscription';
import { envConfig } from './envConfig';

// Configuration
const PAYSTACK_CONFIG = {
  publicKey: envConfig.PAYSTACK_PUBLIC_KEY || 'pk_test_demo',
  baseUrl: `${(envConfig.API_URL || 'http://localhost:8080').replace(/\/$/, '')}/api/v1/subscriptions`,
};

const getSubscriptionAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (typeof window === 'undefined') return headers;

  const token =
    localStorage.getItem('auth_token') ||
    localStorage.getItem('propertyhub_auth_token') ||
    localStorage.getItem('supabase.auth.token');

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

export interface SubscriptionServiceConfig {
  userId: string;
  userEmail: string;
  userName: string;
}

export class SubscriptionService {
  private userId: string;
  private userEmail: string;
  private userName: string;

  constructor(config: SubscriptionServiceConfig) {
    this.userId = config.userId;
    this.userEmail = config.userEmail;
    this.userName = config.userName;
  }

  /**
   * Create a subscription plan on Paystack
   */
  async createPaystackPlan(plan: SubscriptionPlan): Promise<string> {
    try {
      const planData = {
        name: `PropertyHub ${plan.name} Plan`,
        amount: plan.price * 100, // Convert to kobo
        interval: plan.interval,
        currency: plan.currency,
        description: plan.description,
        invoice_limit: 0,
        send_invoices: true,
        send_sms: false
      };

      const response = await fetch(`${PAYSTACK_CONFIG.baseUrl}/plans`, {
        method: 'POST',
        headers: getSubscriptionAuthHeaders(),
        body: JSON.stringify(planData)
      });

      if (!response.ok) {
        throw new Error('Failed to create payment plan');
      }

      const result = await response.json();
      return (
        result?.data?.plan_code ||
        result?.data?.planCode ||
        result?.plan_code ||
        result?.planCode
      );
    } catch (error) {
      console.error('Error creating Paystack plan:', error);
      throw error;
    }
  }

  /**
   * Create or retrieve customer on Paystack
   */
  async createPaystackCustomer(): Promise<string> {
    try {
      const customerData = {
        email: this.userEmail,
        first_name: this.userName.split(' ')[0],
        last_name: this.userName.split(' ').slice(1).join(' ') || 'User',
        metadata: {
          property_host: true,
          user_id: this.userId
        }
      };

      const response = await fetch(`${PAYSTACK_CONFIG.baseUrl}/customers`, {
        method: 'POST',
        headers: getSubscriptionAuthHeaders(),
        body: JSON.stringify(customerData)
      });

      if (!response.ok) {
        // If customer exists, get existing customer
        const getResponse = await fetch(`${PAYSTACK_CONFIG.baseUrl}/customers/${encodeURIComponent(this.userEmail)}`, {
          headers: getSubscriptionAuthHeaders(),
        });
        
        if (getResponse.ok) {
          const getResult = await getResponse.json();
          return (
            getResult?.data?.customer_code ||
            getResult?.data?.customerCode ||
            getResult?.customer_code ||
            getResult?.customerCode
          );
        }
        
        throw new Error('Failed to create or retrieve customer');
      }

      const result = await response.json();
      return (
        result?.data?.customer_code ||
        result?.data?.customerCode ||
        result?.customer_code ||
        result?.customerCode
      );
    } catch (error) {
      console.error('Error creating Paystack customer:', error);
      throw error;
    }
  }

  /**
   * Create subscription on Paystack
   */
  async createSubscription(planCode: string, customerCode: string, authCode?: string): Promise<any> {
    try {
      const subscriptionData: any = {
        customer: customerCode,
        plan: planCode,
        start_date: new Date().toISOString()
      };

      if (authCode) {
        subscriptionData.authorization = authCode;
      }

      const response = await fetch(`${PAYSTACK_CONFIG.baseUrl}/subscriptions`, {
        method: 'POST',
        headers: getSubscriptionAuthHeaders(),
        body: JSON.stringify(subscriptionData)
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription on Paystack
   */
  async cancelSubscription(subscriptionCode: string): Promise<void> {
    try {
      const response = await fetch(
        `${PAYSTACK_CONFIG.baseUrl}/subscriptions/${encodeURIComponent(subscriptionCode)}/cancel`,
        {
          method: 'POST',
          headers: getSubscriptionAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription details from backend subscription proxy
   */
  async getSubscriptionDetails(subscriptionCode: string): Promise<any> {
    try {
      const response = await fetch(`${PAYSTACK_CONFIG.baseUrl}/subscriptions/${encodeURIComponent(subscriptionCode)}`, {
        headers: getSubscriptionAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to get subscription details');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error getting subscription details:', error);
      throw error;
    }
  }

  /**
   * Initialize Paystack payment popup
   */
  initializePaystackPayment(config: {
    planCode: string;
    customerCode: string;
    amount: number;
    currency: string;
    onSuccess: (response: any) => void;
    onClose: () => void;
  }): void {
    try {
      const handler = (window as any).PaystackPop?.setup({
        key: PAYSTACK_CONFIG.publicKey,
        email: this.userEmail,
        amount: config.amount * 100, // Convert to kobo
        currency: config.currency,
        plan: config.planCode,
        customer: config.customerCode,
        ref: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metadata: {
          user_id: this.userId,
          custom_fields: [
            {
              display_name: "User ID",
              variable_name: "user_id",
              value: this.userId
            }
          ]
        },
        callback: config.onSuccess,
        onClose: config.onClose
      });

      handler?.openIframe();
    } catch (error) {
      console.error('Error initializing payment:', error);
      throw error;
    }
  }

  /**
   * Load Paystack script dynamically
   */
  static loadPaystackScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if ((window as any).PaystackPop) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Paystack script'));
      
      document.head.appendChild(script);
    });
  }

  /**
   * Format subscription data for display
   */
  static formatSubscriptionData(rawData: any): Subscription {
    return {
      id: rawData.id || rawData.subscription_code,
      userId: rawData.customer?.metadata?.user_id || '',
      planId: rawData.plan?.plan_code || '',
      status: rawData.status === 'active' ? 'active' : 
              rawData.status === 'cancelled' ? 'canceled' : 
              rawData.status === 'non-renewing' ? 'canceled' : 'incomplete',
      currentPeriodStart: new Date(rawData.createdAt || rawData.created_at),
      currentPeriodEnd: new Date(rawData.next_payment_date),
      cancelAtPeriodEnd: rawData.status === 'non-renewing',
      createdAt: new Date(rawData.createdAt || rawData.created_at),
      updatedAt: new Date(),
      paystackSubscriptionCode: rawData.subscription_code,
      paystackCustomerCode: rawData.customer?.customer_code
    };
  }

  /**
   * Calculate subscription metrics
   */
  static calculateSubscriptionMetrics(subscription: Subscription, usage: SubscriptionUsage): {
    utilizationPercentage: number;
    daysUntilRenewal: number;
    isNearLimit: boolean;
  } {
    const now = new Date();
    const renewalDate = new Date(subscription.currentPeriodEnd);
    const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const propertyUtilization = usage.maxProperties === -1 ? 0 : 
      (usage.currentProperties / usage.maxProperties) * 100;
    
    const photoUtilization = usage.maxPhotos === -1 ? 0 : 
      (usage.currentPhotos / usage.maxPhotos) * 100;
    
    const utilizationPercentage = Math.max(propertyUtilization, photoUtilization);
    const isNearLimit = utilizationPercentage >= 80;

    return {
      utilizationPercentage,
      daysUntilRenewal: Math.max(0, daysUntilRenewal),
      isNearLimit
    };
  }

  /**
   * Generate invoice download URL
   */
  static generateInvoiceUrl(billingId: string, reference: string): string {
    // In production, this would generate a secure download URL
    return `https://api.paystack.co/transaction/receipt/${reference}`;
  }

  /**
   * Validate subscription limits
   */
  static validateSubscriptionLimits(
    subscription: Subscription, 
    usage: SubscriptionUsage, 
    action: 'add_property' | 'add_photo'
  ): { allowed: boolean; message?: string } {
    switch (action) {
      case 'add_property':
        if (usage.maxProperties === -1) return { allowed: true };
        if (usage.currentProperties >= usage.maxProperties) {
          return {
            allowed: false,
            message: `You've reached your property limit (${usage.maxProperties}). Please upgrade your plan to add more properties.`
          };
        }
        return { allowed: true };

      case 'add_photo':
        if (usage.maxPhotos === -1) return { allowed: true };
        if (usage.currentPhotos >= usage.maxPhotos) {
          return {
            allowed: false,
            message: `You've reached your photo limit (${usage.maxPhotos}). Please upgrade your plan to add more photos.`
          };
        }
        return { allowed: true };

      default:
        return { allowed: true };
    }
  }
}

/**
 * Mock data generators for development and testing
 */
export const MockSubscriptionData = {
  generateMockSubscription: (userId: string, planId: string): Subscription => ({
    id: `sub_${Date.now()}`,
    userId,
    planId,
    status: 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    paystackSubscriptionCode: `SUB_${Math.random().toString(36).substr(2, 9)}`,
    paystackCustomerCode: `CUS_${Math.random().toString(36).substr(2, 9)}`
  }),

  generateMockUsage: (subscriptionId: string, planLimits: { maxProperties: number; maxPhotos: number }): SubscriptionUsage => ({
    subscriptionId,
    currentProperties: Math.floor(Math.random() * Math.max(1, planLimits.maxProperties === -1 ? 10 : planLimits.maxProperties)),
    maxProperties: planLimits.maxProperties,
    currentPhotos: Math.floor(Math.random() * Math.max(1, planLimits.maxPhotos === -1 ? 50 : planLimits.maxPhotos)),
    maxPhotos: planLimits.maxPhotos,
    featuresUsed: ['analytics', 'marketing_tools'],
    lastUpdated: new Date()
  }),

  generateMockBillingHistory: (subscriptionId: string, count: number = 3): BillingHistory[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `bill_${Date.now()}_${i}`,
      subscriptionId,
      amount: 15000 + (i * 1000),
      currency: 'NGN',
      status: Math.random() > 0.8 ? 'failed' : 'paid',
      paidAt: i === 0 ? undefined : new Date(Date.now() - (i * 30 * 24 * 60 * 60 * 1000)),
      paystackReference: `ref_${Math.random().toString(36).substr(2, 9)}`,
      invoiceUrl: `https://paystack.com/invoice/mock${i}`,
      createdAt: new Date(Date.now() - (i * 30 * 24 * 60 * 60 * 1000))
    }));
  }
};

export default SubscriptionService;
