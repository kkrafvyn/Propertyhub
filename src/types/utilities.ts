/**
 * Utility Service Types
 * 
 * Type definitions for DStv, Water, Electricity, and other utilities
 */

export type ServiceType = 'dstv' | 'gotv' | 'water' | 'electricity' | 'wifi' | 'internet' | 'gas';
export type ServiceProvider = 'dstv' | 'gotv' | 'ecg' | 'cwsa' | 'gwa' | 'zesco';
export type PaymentFrequency = 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'yearly';
export type ServiceStatus = 'active' | 'inactive' | 'suspended' | 'expired' | 'pending';

/**
 * Property Service
 */
export interface PropertyService {
  id: string;
  property_id: string;
  service_type: ServiceType;
  provider: ServiceProvider;
  account_number: string;
  account_name?: string;
  status: ServiceStatus;
  last_payment_date?: string;
  next_renewal_date: string;
  payment_frequency: PaymentFrequency;
  amount: number;
  currency: string;
  auto_renew: boolean;
  contact_support?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Service Payment
 */
export interface ServicePayment {
  id: string;
  service_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  provider_reference?: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

/**
 * Smart Meter Reading
 */
export interface SmartMeter {
  id: string;
  property_id: string;
  meter_type: 'electric' | 'water' | 'gas';
  meter_serial: string;
  current_reading: number;
  previous_reading: number;
  last_reading_date: string;
  consumption: number;
  consumption_unit: string; // kWh, m³, etc
  status: 'active' | 'inactive' | 'faulty';
  created_at: string;
  updated_at: string;
}

/**
 * Billing Cycle
 */
export interface BillingCycle {
  id: string;
  property_id: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  currency: string;
  description?: string;
  created_at: string;
}

/**
 * DStv/GoTV Account Details
 */
export interface TVSubscriptionAccount {
  id: string;
  smartcard_number: string;
  account_holder_name: string;
  provider: 'dstv' | 'gotv';
  bouquet: string; // e.g., 'Compact', 'Premium', 'Premium Plus'
  status: ServiceStatus;
  last_payment_date?: string;
  next_renewal_date: string;
  monthly_fee: number;
  channels?: string[];
  active_until?: string;
}

/**
 * Service Renewal Request
 */
export interface ServiceRenewalRequest {
  service_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  metadata?: Record<string, any>;
}

/**
 * Utility Bill Summary
 */
export interface UtilityBillSummary {
  period: string;
  services: Array<{
    service_type: ServiceType;
    provider: ServiceProvider;
    amount: number;
    status: ServiceStatus;
    next_due: string;
  }>;
  total_amount: number;
  total_due_count: number;
}

/**
 * Smart Meter Data
 */
export interface SmartMeterData {
  meter_id: string;
  reading: number;
  timestamp: string;
  unit: string;
  status: 'valid' | 'estimated' | 'error';
  daily_consumption?: number;
  monthly_consumption?: number;
  forecast_amount?: number;
}

/**
 * Water/Electricity Provider Configuration
 */
export interface UtilityProviderConfig {
  provider: ServiceProvider;
  service_type: ServiceType;
  api_endpoint?: string;
  validation_rules?: {
    account_format: string;
    minimum_payment: number;
    maximum_payment: number;
  };
  bouquets_or_plans?: Array<{
    code: string;
    name: string;
    amount: number;
    description?: string;
  }>;
}

/**
 * Service Auto-Renewal Settings
 */
export interface AutoRenewalSettings {
  service_id: string;
  enabled: boolean;
  payment_method: string;
  max_amount?: number;
  reminder_days: number;
}

