/**
 * PropertyHub - Extended Database Schema
 * 
 * Additional tables for advanced features:
 * - Payment processing
 * - Utilities management
 * - AI interactions
 * - Dashboards & analytics
 * - Verification
 * - Communication
 * - Subscriptions
 * 
 * Run these SQL statements in Supabase SQL Editor
 * @author PropertyHub Team
 */

// ============================================
// 1. PAYMENT SYSTEM TABLES
// ============================================

/*
-- Payment Methods Table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR NOT NULL CHECK (provider IN ('paystack', 'flutterwave')),
  account_reference VARCHAR UNIQUE,
  card_last_four VARCHAR(4),
  card_brand VARCHAR,
  is_default BOOLEAN DEFAULT FALSE,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  type VARCHAR NOT NULL CHECK (type IN ('rent_payment', 'service_payment', 'escrow', 'commission', 'withdrawal')),
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR DEFAULT 'GHS',
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  provider VARCHAR,
  provider_reference VARCHAR,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- Rent Schedules Table
CREATE TABLE IF NOT EXISTS rent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR DEFAULT 'GHS',
  frequency VARCHAR NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  next_due_date TIMESTAMP WITH TIME ZONE,
  last_paid_date TIMESTAMP WITH TIME ZONE,
  auto_debit BOOLEAN DEFAULT FALSE,
  reminder_days INT DEFAULT 7,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'active_suspended', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rent_schedules_booking_id ON rent_schedules(booking_id);
CREATE INDEX idx_rent_schedules_tenant_id ON rent_schedules(tenant_id);
CREATE INDEX idx_rent_schedules_next_due_date ON rent_schedules(next_due_date);

-- Escrow Accounts Table
CREATE TABLE IF NOT EXISTS escrow_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_amount NUMERIC(12, 2) NOT NULL,
  held_amount NUMERIC(12, 2) NOT NULL,
  released_amount NUMERIC(12, 2) DEFAULT 0,
  status VARCHAR DEFAULT 'held' CHECK (status IN ('held', 'released', 'disputed', 'refunded')),
  dispute_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  released_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_escrow_accounts_booking_id ON escrow_accounts(booking_id);
CREATE INDEX idx_escrow_accounts_status ON escrow_accounts(status);

-- Payment Reminders Table
CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rent_schedule_id UUID NOT NULL REFERENCES rent_schedules(id) ON DELETE CASCADE,
  reminder_type VARCHAR NOT NULL CHECK (reminder_type IN ('email', 'sms', 'push', 'in_app')),
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_reminders_scheduled_time ON payment_reminders(scheduled_time);
*/

// ============================================
// 2. UTILITY SERVICES TABLES
// ============================================

/*
-- Property Services Table (DStv, Water, Electricity, etc)
CREATE TABLE IF NOT EXISTS property_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  service_type VARCHAR NOT NULL CHECK (service_type IN ('dstv', 'gotv', 'water', 'electricity', 'wifi', 'internet', 'gas')),
  provider VARCHAR,
  account_number VARCHAR,
  account_name VARCHAR,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'expired')),
  last_payment_date TIMESTAMP WITH TIME ZONE,
  next_renewal_date TIMESTAMP WITH TIME ZONE,
  payment_frequency VARCHAR DEFAULT 'monthly',
  amount NUMERIC(12, 2),
  currency VARCHAR DEFAULT 'GHS',
  auto_renew BOOLEAN DEFAULT FALSE,
  contact_support TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_property_services_property_id ON property_services(property_id);
CREATE INDEX idx_property_services_next_renewal_date ON property_services(next_renewal_date);

-- Service Payments Table
CREATE TABLE IF NOT EXISTS service_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES property_services(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR DEFAULT 'GHS',
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  payment_method VARCHAR,
  provider_reference VARCHAR,
  status VARCHAR DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_service_payments_service_id ON service_payments(service_id);

-- Smart Meters Table
CREATE TABLE IF NOT EXISTS smart_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  meter_type VARCHAR NOT NULL CHECK (meter_type IN ('electric', 'water', 'gas')),
  meter_serial VARCHAR UNIQUE,
  current_reading NUMERIC(12, 2),
  previous_reading NUMERIC(12, 2),
  last_reading_date TIMESTAMP WITH TIME ZONE,
  consumption NUMERIC(12, 2),
  consumption_unit VARCHAR,
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_smart_meters_property_id ON smart_meters(property_id);

-- Billing Cycles Table
CREATE TABLE IF NOT EXISTS billing_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  total_amount NUMERIC(12, 2),
  currency VARCHAR DEFAULT 'GHS',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_billing_cycles_property_id ON billing_cycles(property_id);
*/

// ============================================
// 3. AI & RECOMMENDATIONS TABLES
// ============================================

/*
-- AI Interactions Table
CREATE TABLE IF NOT EXISTS ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interaction_type VARCHAR NOT NULL CHECK (interaction_type IN ('chat', 'search', 'description_generation', 'recommendations')),
  input_text TEXT,
  output_text TEXT,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  tokens_used INT,
  cost_cents INT,
  status VARCHAR DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_interactions_user_id ON ai_interactions(user_id);

-- Property Descriptions History
CREATE TABLE IF NOT EXISTS property_descriptions_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  description TEXT,
  generated_by VARCHAR CHECK (generated_by IN ('ai', 'user', 'ai_edited')),
  ai_version VARCHAR,
  quality_score INT CHECK (quality_score >= 0 AND quality_score <= 100),
  user_satisfaction INT CHECK (user_satisfaction >= 1 AND user_satisfaction <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_descriptions_history_property_id ON property_descriptions_history(property_id);

-- Recommendations Table
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  reason VARCHAR NOT NULL,
  score NUMERIC(3, 2),
  clicked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recommendations_user_id ON recommendations(user_id);

-- Price History Table
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  price NUMERIC(12, 2),
  predicted_price NUMERIC(12, 2),
  market_average NUMERIC(12, 2),
  confidence_score NUMERIC(3, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_price_history_property_id ON price_history(property_id);
*/

// ============================================
// 4. LANDLORD DASHBOARD TABLES
// ============================================

/*
-- Dashboard Metrics Table
CREATE TABLE IF NOT EXISTS dashboard_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  total_income NUMERIC(12, 2) DEFAULT 0,
  total_expenses NUMERIC(12, 2) DEFAULT 0,
  occupancy_rate NUMERIC(3, 2) DEFAULT 0,
  total_properties INT DEFAULT 0,
  active_bookings INT DEFAULT 0,
  tenant_score NUMERIC(3, 2) DEFAULT 0,
  maintenance_requests INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, metric_date)
);

CREATE INDEX idx_dashboard_metrics_user_id ON dashboard_metrics(user_id);
CREATE INDEX idx_dashboard_metrics_date ON dashboard_metrics(metric_date DESC);

-- Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);

-- Reports Table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_type VARCHAR NOT NULL CHECK (report_type IN ('income', 'expense', 'occupancy', 'tenant', 'maintenance')),
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  report_data JSONB,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  downloaded_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_reports_user_id ON reports(user_id);
*/

// ============================================
// 5. TENANT FEATURES TABLES
// ============================================

/*
-- Maintenance Requests Table
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR NOT NULL CHECK (category IN ('plumbing', 'electrical', 'structural', 'appliance', 'other')),
  title VARCHAR NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  images TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_maintenance_requests_property_id ON maintenance_requests(property_id);
CREATE INDEX idx_maintenance_requests_status ON maintenance_requests(status);

-- Lease Documents Table
CREATE TABLE IF NOT EXISTS lease_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  document_type VARCHAR NOT NULL CHECK (document_type IN ('lease_agreement', 'inspection_report', 'rules', 'payment_schedule')),
  file_url TEXT NOT NULL,
  file_name VARCHAR,
  uploaded_by UUID REFERENCES users(id),
  signed BOOLEAN DEFAULT FALSE,
  signed_by_tenant BOOLEAN DEFAULT FALSE,
  signed_by_landlord BOOLEAN DEFAULT FALSE,
  signature_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lease_documents_booking_id ON lease_documents(booking_id);

-- Tenant Profiles Table
CREATE TABLE IF NOT EXISTS tenant_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  occupation VARCHAR,
  employer VARCHAR,
  employment_type VARCHAR CHECK (employment_type IN ('employed', 'self_employed', 'student', 'retired')),
  monthly_income NUMERIC(12, 2),
  employment_verified BOOLEAN DEFAULT FALSE,
  references TEXT[],
  tenant_score NUMERIC(3, 2) DEFAULT 0,
  payment_history_score NUMERIC(3, 2) DEFAULT 0,
  property_care_score NUMERIC(3, 2) DEFAULT 0,
  communication_score NUMERIC(3, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_profiles_user_id ON tenant_profiles(user_id);
*/

// ============================================
// 6. VERIFICATION TABLES
// ============================================

/*
-- Verifications Table
CREATE TABLE IF NOT EXISTS verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_type VARCHAR NOT NULL CHECK (verification_type IN ('email', 'phone', 'id_document', 'address', 'income', 'landlord_badge')),
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'expired')),
  verified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  verifier_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_verifications_user_id ON verifications(user_id);
CREATE INDEX idx_verifications_type ON verifications(verification_type);

-- ID Documents Table
CREATE TABLE IF NOT EXISTS id_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type VARCHAR NOT NULL CHECK (document_type IN ('national_id', 'passport', 'drivers_license', 'voters_card')),
  document_number VARCHAR UNIQUE,
  issue_date DATE,
  expiry_date DATE,
  front_image_url TEXT,
  back_image_url TEXT,
  verified BOOLEAN DEFAULT FALSE,
  verification_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_id_documents_user_id ON id_documents(user_id);

-- Fraud Flags Table
CREATE TABLE IF NOT EXISTS fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  flag_type VARCHAR NOT NULL CHECK (flag_type IN ('suspicious_activity', 'duplicate_listing', 'payment_fraud', 'impersonation', 'other')),
  description TEXT,
  severity VARCHAR CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR DEFAULT 'under_review' CHECK (status IN ('under_review', 'confirmed', 'false_positive', 'resolved')),
  action_taken TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fraud_flags_user_id ON fraud_flags(user_id);
CREATE INDEX idx_fraud_flags_status ON fraud_flags(status);
*/

// ============================================
// 7. COMMUNICATION TABLES
// ============================================

/*
-- Chat Threads Table
CREATE TABLE IF NOT EXISTS chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  archived BOOLEAN DEFAULT FALSE,
  CONSTRAINT different_participants CHECK (participant_1 < participant_2),
  UNIQUE(participant_1, participant_2)
);

CREATE INDEX idx_chat_threads_participant_1 ON chat_threads(participant_1);
CREATE INDEX idx_chat_threads_participant_2 ON chat_threads(participant_2);

-- Notifications Table (extended)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT TRUE,
  whatsapp_notifications BOOLEAN DEFAULT FALSE,
  payment_alerts BOOLEAN DEFAULT TRUE,
  maintenance_updates BOOLEAN DEFAULT TRUE,
  lease_reminders BOOLEAN DEFAULT TRUE,
  marketing_emails BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
*/

// ============================================
// 8. SUBSCRIPTION TABLES
// ============================================

/*
-- Subscription Plans Table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR NOT NULL CHECK (category IN ('agent', 'landlord', 'tenant')),
  price_monthly NUMERIC(10, 2),
  price_yearly NUMERIC(10, 2),
  billing_cycle VARCHAR CHECK (billing_cycle IN ('monthly', 'yearly')),
  features JSONB DEFAULT '{}',
  max_listings INT,
  max_tenants INT,
  priority_support BOOLEAN DEFAULT FALSE,
  featured_listings INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Subscriptions Table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'suspended', 'pending', 'expired')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN DEFAULT TRUE,
  payment_method VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);

-- Usage Tracking Table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  metric_type VARCHAR NOT NULL,
  current_usage INT DEFAULT 0,
  limit_value INT,
  reset_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(subscription_id, metric_type)
);

CREATE INDEX idx_usage_tracking_subscription_id ON usage_tracking(subscription_id);
*/

export const DATABASE_SCHEMA = 'Extended schema for PropertyHub advanced features';
