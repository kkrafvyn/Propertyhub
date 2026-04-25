/**
 * PropertyHub Database Schema and Migrations
 * 
 * SQL migration script to set up all required tables and indexes
 * for the 5-feature backend implementation
 * 
 * Database: PostgreSQL (Supabase)
 * Run this script to initialize the database structure
 */

-- ============================================================================
-- USERS TABLE (Already exists in Supabase auth, but extended here)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'user',
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- PAYMENT SYSTEM TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GHS',
  description TEXT,
  payment_method VARCHAR(50) NOT NULL, -- 'paystack', 'flutterwave', 'bank_transfer'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  email VARCHAR(255),
  phone VARCHAR(20),
  reference_id VARCHAR(255), -- External payment provider reference
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created ON payments(created_at DESC);
CREATE INDEX idx_payments_reference ON payments(reference_id);

CREATE TABLE IF NOT EXISTS rent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'on_time', 'late', 'missed', 'overdue'
  payment_method VARCHAR(50),
  transaction_id UUID REFERENCES payments(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rent_payments_property ON rent_payments(property_id);
CREATE INDEX idx_rent_payments_tenant ON rent_payments(tenant_id);
CREATE INDEX idx_rent_payments_status ON rent_payments(status);
CREATE INDEX idx_rent_payments_date ON rent_payments(payment_date DESC);

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'processed', 'rejected'
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refunds_payment ON refunds(payment_id);
CREATE INDEX idx_refunds_user ON refunds(user_id);
CREATE INDEX idx_refunds_status ON refunds(status);

-- ============================================================================
-- UTILITY MANAGEMENT TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS property_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL,
  service_type VARCHAR(50) NOT NULL, -- 'water', 'electricity', 'gas', 'internet', 'waste'
  monthly_budget DECIMAL(10, 2),
  billing_cycle VARCHAR(50) DEFAULT 'monthly', -- 'monthly', 'quarterly', 'semi-annual', 'annual'
  auto_renew BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'active',
  provider_name VARCHAR(255),
  account_number VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_property_services_property ON property_services(property_id);
CREATE INDEX idx_property_services_type ON property_services(service_type);

CREATE TABLE IF NOT EXISTS smart_meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES property_services(id) ON DELETE CASCADE,
  reading DECIMAL(15, 3) NOT NULL,
  unit VARCHAR(50),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_smart_meter_service ON smart_meter_readings(service_id);
CREATE INDEX idx_smart_meter_timestamp ON smart_meter_readings(timestamp DESC);

CREATE TABLE IF NOT EXISTS service_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES property_services(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  transaction_id UUID REFERENCES payments(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_service_payments_service ON service_payments(service_id);
CREATE INDEX idx_service_payments_status ON service_payments(status);

-- ============================================================================
-- VERIFICATION SYSTEM TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_type VARCHAR(50) NOT NULL, -- 'id_verification', 'address_verification', 'professional_verification'
  status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'approved', 'rejected', 'expired'
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

CREATE INDEX idx_verification_requests_user ON verification_requests(user_id);
CREATE INDEX idx_verification_requests_status ON verification_requests(status);

CREATE TABLE IF NOT EXISTS verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL, -- 'national_id', 'passport', 'drivers_license', 'proof_of_address'
  document_url TEXT NOT NULL,
  document_data JSONB, -- Extracted data from OCR
  status VARCHAR(50) DEFAULT 'pending_review', -- 'pending_review', 'verified', 'rejected'
  rejection_reason TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP
);

CREATE INDEX idx_verification_documents_verification ON verification_documents(verification_id);
CREATE INDEX idx_verification_documents_user ON verification_documents(user_id);
CREATE INDEX idx_verification_documents_status ON verification_documents(status);

CREATE TABLE IF NOT EXISTS user_verification_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  verified BOOLEAN DEFAULT FALSE,
  verification_level VARCHAR(50) DEFAULT 'unverified', -- 'unverified', 'basic', 'verified', 'pro'
  badges TEXT[], -- Array of verified badges
  last_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_verification_user ON user_verification_status(user_id);
CREATE INDEX idx_user_verification_level ON user_verification_status(verification_level);

CREATE TABLE IF NOT EXISTS fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  risk_score DECIMAL(5, 2),
  risk_level VARCHAR(50) DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  description TEXT,
  metadata JSONB,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fraud_alerts_user ON fraud_alerts(user_id);
CREATE INDEX idx_fraud_alerts_risk_level ON fraud_alerts(risk_level);
CREATE INDEX idx_fraud_alerts_status ON fraud_alerts(status);

-- ============================================================================
-- LANDLORD DASHBOARD TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  total_units INT DEFAULT 1,
  occupied_units INT DEFAULT 0,
  price_per_unit DECIMAL(10, 2),
  amenities TEXT[],
  images TEXT[],
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_properties_landlord ON properties(landlord_id);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_location ON properties(location);

CREATE TABLE IF NOT EXISTS property_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_number VARCHAR(50),
  lease_start_date DATE NOT NULL,
  lease_end_date DATE,
  monthly_rent DECIMAL(10, 2) NOT NULL,
  deposit_amount DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_property_tenants_property ON property_tenants(property_id);
CREATE INDEX idx_property_tenants_tenant ON property_tenants(tenant_id);
CREATE INDEX idx_property_tenants_status ON property_tenants(status);

CREATE TABLE IF NOT EXISTS tenant_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_score DECIMAL(5, 2) DEFAULT 50, -- 0-100
  behavior_score DECIMAL(5, 2) DEFAULT 50, -- 0-100
  risk_score DECIMAL(5, 2) DEFAULT 50, -- 0-100
  overall_score DECIMAL(5, 2) DEFAULT 50, -- 0-100
  risk_level VARCHAR(50) DEFAULT 'low', -- 'low', 'medium', 'high'
  complaints_count INT DEFAULT 0,
  maintenance_requests_count INT DEFAULT 0,
  recommendations TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_scores_property ON tenant_scores(property_id);
CREATE INDEX idx_tenant_scores_tenant ON tenant_scores(tenant_id);
CREATE INDEX idx_tenant_scores_risk_level ON tenant_scores(risk_level);

CREATE TABLE IF NOT EXISTS property_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  expense_type VARCHAR(50) NOT NULL, -- 'maintenance', 'repair', 'utilities', 'management', 'insurance'
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_property_expenses_property ON property_expenses(property_id);
CREATE INDEX idx_property_expenses_type ON property_expenses(expense_type);
CREATE INDEX idx_property_expenses_date ON property_expenses(expense_date DESC);

CREATE TABLE IF NOT EXISTS landlord_analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  total_properties INT,
  total_units INT,
  total_revenue DECIMAL(15, 2),
  monthly_revenue DECIMAL(15, 2),
  occupancy_rate DECIMAL(5, 2),
  collection_rate DECIMAL(5, 2),
  analytics_data JSONB,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour')
);

CREATE INDEX idx_landlord_analytics_landlord ON landlord_analytics_cache(landlord_id);

-- ============================================================================
-- COMMUNICATION SYSTEM TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participants UUID[] NOT NULL,
  participant_names VARCHAR(255)[],
  participant_avatars TEXT[],
  type VARCHAR(50) DEFAULT 'direct', -- 'direct', 'group'
  name VARCHAR(255),
  description TEXT,
  avatar TEXT,
  unread_count INT DEFAULT 0,
  archived BOOLEAN DEFAULT FALSE,
  muted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP
);

CREATE INDEX idx_conversations_participants ON conversations USING GIN(participants);
CREATE INDEX idx_conversations_archived ON conversations(archived);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_name VARCHAR(255),
  sender_avatar TEXT,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'image', 'document', 'audio', 'video'
  file_url TEXT,
  file_name VARCHAR(255),
  file_size INT,
  status VARCHAR(50) DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP,
  deleted_at TIMESTAMP,
  read_by UUID[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_status ON messages(status);

CREATE TABLE IF NOT EXISTS read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id, user_id)
);

CREATE INDEX idx_read_receipts_message ON read_receipts(message_id);
CREATE INDEX idx_read_receipts_user ON read_receipts(user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'message', 'mention', 'reaction', 'whatsapp', 'system'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read) WHERE read = FALSE;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  direction VARCHAR(50) NOT NULL, -- 'inbound', 'outbound'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'read', 'failed'
  external_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_whatsapp_user ON whatsapp_messages(user_id);
CREATE INDEX idx_whatsapp_phone ON whatsapp_messages(phone_number);
CREATE INDEX idx_whatsapp_created ON whatsapp_messages(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can only see their own payments
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view conversations they participate in
CREATE POLICY "Users can view messages they participate in" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE auth.uid() = ANY(participants)
    )
  );

CREATE POLICY "Users can insert messages in their conversations" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE auth.uid() = ANY(participants)
    )
  );

-- Users can view their notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

CREATE OR REPLACE VIEW landlord_portfolio AS
SELECT 
  p.landlord_id,
  COUNT(DISTINCT p.id) as total_properties,
  SUM(p.total_units) as total_units,
  SUM(p.occupied_units) as occupied_units,
  (SUM(p.occupied_units)::FLOAT / SUM(p.total_units)) * 100 as occupancy_rate,
  SUM(rp.amount) as total_revenue
FROM properties p
LEFT JOIN rent_payments rp ON p.id = rp.property_id
GROUP BY p.landlord_id;

-- ============================================================================
-- COMPLETION
-- ============================================================================

-- All tables created successfully
-- Run migrations: psql -U user -d database -f migrations.sql
