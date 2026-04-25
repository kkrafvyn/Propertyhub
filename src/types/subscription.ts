/**
 * Subscription Types
 * 
 * SaaS billing, plans, and usage tracking for PropertyHub
 */

export type PlanCategory = 'agent' | 'landlord' | 'tenant';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'cancelled' | 'suspended' | 'pending' | 'expired';

/**
 * Subscription Plan
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  category?: PlanCategory;
  price_monthly?: number;
  price_yearly?: number;
  billing_cycle?: BillingCycle;
  features: Record<string, any> | string[];
  max_listings?: number;
  max_tenants?: number;
  priority_support?: boolean;
  featured_listings?: number;
  is_active?: boolean;
  created_at?: string;
  // Legacy fields
  price?: number;
  currency?: 'NGN' | 'USD';
  interval?: 'monthly' | 'yearly';
  maxProperties?: number;
  maxPhotos?: number;
  prioritySupport?: boolean;
  analyticsAccess?: boolean;
  marketingTools?: boolean;
  popularBadge?: boolean;
  discountPercentage?: number;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
  paystackSubscriptionCode?: string;
  paystackCustomerCode?: string;
}

export interface BillingHistory {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  paidAt?: Date;
  failureReason?: string;
  paystackReference: string;
  invoiceUrl?: string;
  createdAt: Date;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'card' | 'bank_transfer';
  cardBrand?: string;
  last4?: string;
  bankName?: string;
  accountNumber?: string;
  isDefault: boolean;
  paystackAuthCode?: string;
  createdAt: Date;
}

export interface SubscriptionUsage {
  subscriptionId: string;
  currentProperties: number;
  maxProperties: number;
  currentPhotos: number;
  maxPhotos: number;
  featuresUsed: string[];
  lastUpdated: Date;
}

export interface HostMetrics {
  userId: string;
  totalProperties: number;
  activeBookings: number;
  monthlyRevenue: number;
  rating: number;
  totalReviews: number;
  joinDate: Date;
  subscriptionStatus: 'active' | 'inactive' | 'trial';
}

// Predefined subscription plans
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for new hosts starting their property business',
    price: 5000,
    currency: 'NGN',
    interval: 'monthly',
    features: [
      'List up to 3 properties',
      'Up to 10 photos per property',
      'Basic property analytics',
      'Email support',
      'Mobile app access'
    ],
    maxProperties: 3,
    maxPhotos: 10,
    prioritySupport: false,
    analyticsAccess: true,
    marketingTools: false
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Ideal for established hosts with multiple properties',
    price: 15000,
    currency: 'NGN',
    interval: 'monthly',
    features: [
      'List up to 15 properties',
      'Up to 25 photos per property',
      'Advanced analytics & insights',
      'Priority email & chat support',
      'Marketing tools & promotion',
      'Booking management dashboard',
      'Guest communication tools'
    ],
    maxProperties: 15,
    maxPhotos: 25,
    prioritySupport: true,
    analyticsAccess: true,
    marketingTools: true,
    popularBadge: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For property management companies and large-scale hosts',
    price: 35000,
    currency: 'NGN',
    interval: 'monthly',
    features: [
      'Unlimited properties',
      'Unlimited photos',
      'Custom analytics & reporting',
      'Dedicated account manager',
      'Advanced marketing suite',
      'Multi-user team access',
      'API access & integrations',
      'White-label options',
      'Custom branding'
    ],
    maxProperties: -1, // Unlimited
    maxPhotos: -1, // Unlimited
    prioritySupport: true,
    analyticsAccess: true,
    marketingTools: true
  },
  {
    id: 'professional-yearly',
    name: 'Professional',
    description: 'Save 20% with annual billing',
    price: 144000, // 15000 * 12 * 0.8
    currency: 'NGN',
    interval: 'yearly',
    features: [
      'All Professional features',
      '20% discount with annual billing',
      'Priority feature requests',
      'Quarterly business reviews'
    ],
    maxProperties: 15,
    maxPhotos: 25,
    prioritySupport: true,
    analyticsAccess: true,
    marketingTools: true,
    discountPercentage: 20
  },
  {
    id: 'enterprise-yearly',
    name: 'Enterprise',
    description: 'Save 25% with annual billing',
    price: 315000, // 35000 * 12 * 0.75
    currency: 'NGN',
    interval: 'yearly',
    features: [
      'All Enterprise features',
      '25% discount with annual billing',
      'Custom contract terms',
      'Dedicated implementation support'
    ],
    maxProperties: -1,
    maxPhotos: -1,
    prioritySupport: true,
    analyticsAccess: true,
    marketingTools: true,
    discountPercentage: 25
  }
];

export interface SubscriptionState {
  currentSubscription: Subscription | null;
  availablePlans: SubscriptionPlan[];
  billingHistory: BillingHistory[];
  paymentMethods: PaymentMethod[];
  usage: SubscriptionUsage | null;
  loading: boolean;
  error: string | null;
}

export interface SubscriptionActions {
  upgradePlan: (planId: string) => Promise<void>;
  downgradePlan: (planId: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  reactivateSubscription: () => Promise<void>;
  updatePaymentMethod: (paymentMethod: Partial<PaymentMethod>) => Promise<void>;
  retryPayment: (billingId: string) => Promise<void>;
  downloadInvoice: (billingId: string) => Promise<void>;
}

// Utility functions
export const formatPrice = (price: number, currency: string = 'NGN'): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency === 'NGN' ? 'NGN' : 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

export const getSubscriptionStatusColor = (status: Subscription['status']): string => {
  switch (status) {
    case 'active':
      return 'text-green-600 bg-green-100';
    case 'trialing':
      return 'text-blue-600 bg-blue-100';
    case 'past_due':
      return 'text-yellow-600 bg-yellow-100';
    case 'canceled':
    case 'incomplete':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export const getSubscriptionStatusText = (status: Subscription['status']): string => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'trialing':
      return 'Trial Period';
    case 'past_due':
      return 'Payment Due';
    case 'canceled':
      return 'Canceled';
    case 'incomplete':
      return 'Setup Required';
    default:
      return 'Unknown';
  }
};

export const calculateDaysUntilRenewal = (currentPeriodEnd: Date): number => {
  const now = new Date();
  const endDate = new Date(currentPeriodEnd);
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

export const isSubscriptionActive = (subscription: Subscription | null): boolean => {
  if (!subscription) return false;
  return subscription.status === 'active' || subscription.status === 'trialing';
};

export const canAccessFeature = (
  subscription: Subscription | null,
  feature: keyof Pick<SubscriptionPlan, 'prioritySupport' | 'analyticsAccess' | 'marketingTools'>
): boolean => {
  if (!subscription) return false;
  
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId);
  if (!plan) return false;
  
  return Boolean(plan[feature]);
};

export const getRemainingPropertySlots = (
  subscription: Subscription | null,
  currentProperties: number
): number => {
  if (!subscription) return 0;
  
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId);
  if (!plan) return 0;
  
  if (plan.maxProperties === -1) return Infinity;
  
  return Math.max(0, plan.maxProperties - currentProperties);
};
