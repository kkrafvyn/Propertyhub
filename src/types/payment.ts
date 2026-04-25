/**
 * Payment Types
 * 
 * Type definitions for payment processing system
 * Includes Paystack, Flutterwave, and PropertyHub configurations
 */

export type PaymentProvider = 'paystack' | 'flutterwave';
export type TransactionType = 'rent_payment' | 'service_payment' | 'escrow' | 'commission' | 'withdrawal';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type RentFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type PaymentMethodStatus = 'active' | 'inactive' | 'expired';
export type EscrowStatus = 'held' | 'released' | 'disputed' | 'refunded';

/**
 * Payment Method
 */
export interface PaymentMethod {
  id: string;
  user_id: string;
  provider: PaymentProvider;
  account_reference: string;
  card_last_four?: string;
  card_brand?: string;
  is_default: boolean;
  status: PaymentMethodStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Transaction
 */
export interface Transaction {
  id: string;
  user_id: string;
  property_id?: string;
  booking_id?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  provider?: PaymentProvider;
  provider_reference?: string;
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
  completed_at?: string;
}

/**
 * Rent Schedule (recurring rent payment)
 */
export interface RentSchedule {
  id: string;
  booking_id: string;
  owner_id: string;
  tenant_id: string;
  amount: number;
  currency: string;
  frequency: RentFrequency;
  start_date: string;
  next_due_date: string;
  last_paid_date?: string;
  auto_debit: boolean;
  reminder_days: number;
  status: 'active' | 'active_suspended' | 'inactive';
  created_at: string;
  updated_at: string;
}

/**
 * Escrow Account (secure payment holding)
 */
export interface EscrowAccount {
  id: string;
  booking_id: string;
  owner_id: string;
  tenant_id: string;
  total_amount: number;
  held_amount: number;
  released_amount: number;
  status: EscrowStatus;
  dispute_reason?: string;
  created_at: string;
  released_at?: string;
}

/**
 * Payment Reminder
 */
export interface PaymentReminder {
  id: string;
  rent_schedule_id: string;
  reminder_type: 'email' | 'sms' | 'push' | 'in_app';
  scheduled_time: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
}

/**
 * Paystack Configuration & Responses
 */

export interface PaystackInitializeRequest {
  email: string;
  amount: number; // in cents
  metadata?: {
    user_id?: string;
    booking_id?: string;
    property_id?: string;
    transaction_type?: TransactionType;
  };
  callback_url?: string;
}

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    reference: string;
    amount: number;
    paid_at: string;
    status: 'success' | 'failed';
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
    };
  };
}

export interface PaystackListBanksResponse {
  status: boolean;
  message: string;
  data: Array<{
    id: number;
    name: string;
    code: string;
    longcode: string;
    gateway: string;
    pay_with_bank: boolean;
    supports_transfer: boolean;
    country_id: number;
    currency: string;
    type: string;
    is_deleted: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
}

/**
 * Flutterwave Configuration & Responses
 */

export interface FlutterwaveInitializeRequest {
  tx_ref: string;
  amount: number;
  currency: string;
  customer: {
    email: string;
    phone_number?: string;
    name?: string;
  };
  customizations: {
    title: string;
    description: string;
    logo?: string;
  };
  meta?: {
    user_id?: string;
    booking_id?: string;
    property_id?: string;
    transaction_type?: TransactionType;
  };
  redirect_url?: string;
}

export interface FlutterwaveInitializeResponse {
  status: string;
  message: string;
  data: {
    link: string;
  };
}

export interface FlutterwaveVerifyResponse {
  status: string;
  message: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    device_fingerprint: string;
    amount: number;
    currency: string;
    charged_amount: number;
    app_fee: number;
    merchant_fee: number;
    processor_response: string;
    auth_model: string;
    ip: string;
    narration: string;
    status: 'successful' | 'failed' | 'cancelled';
    payment_type: string;
    created_at: string;
    account_id: number;
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
      card_type: string;
      issuer_code: string;
      issuer_name: string;
      country: string;
      country_code: string;
      card_token: string;
    };
  };
}

/**
 * PropertyHub Payment Configuration
 */
export interface PropertyHubPaymentConfig {
  paystack: {
    publicKey: string;
    secretKey?: string; // only on backend
    enabled: boolean;
  };
  flutterwave: {
    publicKey: string;
    secretKey?: string; // only on backend
    encryptionKey?: string; // only on backend
    enabled: boolean;
  };
  commission: {
    rate: number; // 0.05 = 5%
    fixed_amount?: number;
  };
  escrow: {
    enabled: boolean;
    hold_days: number;
    dispute_window_hours: number;
  };
}

/**
 * Payment Request/Response for PropertyHub API
 */

export interface InitiatePaymentRequest {
  user_id: string;
  amount: number;
  currency: string;
  transaction_type: TransactionType;
  property_id?: string;
  booking_id?: string;
  provider: PaymentProvider;
  metadata?: Record<string, any>;
}

export interface InitiatePaymentResponse {
  success: boolean;
  transaction_id: string;
  authorization_url?: string;
  access_code?: string;
  reference: string;
  provider: PaymentProvider;
  expires_in?: number;
}

export interface VerifyPaymentRequest {
  transaction_id: string;
  reference: string;
  provider: PaymentProvider;
}

export interface VerifyPaymentResponse {
  success: boolean;
  transaction_id: string;
  reference: string;
  status: TransactionStatus;
  amount: number;
  currency: string;
  completed_at?: string;
  message?: string;
}

/**
 * Rent Payment Specific Types
 */

export interface RentPaymentRequest {
  rent_schedule_id: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  use_escrow: boolean;
  metadata?: Record<string, any>;
}

export interface RentPaymentResponse {
  success: boolean;
  rent_schedule_id: string;
  transaction_id: string;
  authorization_url?: string;
  reference: string;
  next_due_date: string;
}

/**
 * Escrow Request/Response
 */

export interface CreateEscrowRequest {
  booking_id: string;
  amount: number;
  currency: string;
  description?: string;
}

export interface ReleaseEscrowRequest {
  escrow_id: string;
  amount?: number;
  authorize_by_user_id: string;
}

export interface DisputeEscrowRequest {
  escrow_id: string;
  reason: string;
  evidence?: string[];
  disputed_by_user_id: string;
}

