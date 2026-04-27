CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  role VARCHAR DEFAULT 'user' CHECK (role IN ('user', 'host', 'manager', 'admin')),
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
  avatar TEXT,
  bio TEXT,
  phone VARCHAR,
  verified BOOLEAN DEFAULT FALSE,
  rating NUMERIC(3, 2) DEFAULT 0,
  response_time INT,
  response_rate NUMERIC(3, 2),
  total_properties INT DEFAULT 0,
  total_bookings INT DEFAULT 0,
  languages TEXT[] DEFAULT ARRAY[]::TEXT[],
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE OR REPLACE FUNCTION update_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS users_updated_at_trigger ON users;
CREATE TRIGGER users_updated_at_trigger
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_users_timestamp();
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  type VARCHAR NOT NULL CHECK (type IN ('house', 'apartment', 'land', 'shop', 'office', 'warehouse')),
  listing_type VARCHAR NOT NULL CHECK (listing_type IN ('rent', 'sale', 'lease')),
  status VARCHAR DEFAULT 'available' CHECK (status IN ('available', 'rented', 'sold', 'maintenance', 'pending')),
  price NUMERIC(12, 2),
  currency VARCHAR DEFAULT 'GHS',
  period VARCHAR CHECK (period IN ('monthly', 'yearly', 'daily')),
  bedrooms INT,
  bathrooms INT,
  area INT NOT NULL,
  location VARCHAR NOT NULL,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  amenities TEXT[] DEFAULT ARRAY[]::TEXT[],
  features JSONB DEFAULT '{}',
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  cover_image TEXT,
  rating NUMERIC(3, 2) DEFAULT 0,
  review_count INT DEFAULT 0,
  availability_start TIMESTAMP WITH TIME ZONE,
  availability_end TIMESTAMP WITH TIME ZONE,
  views INT DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE,
  featured_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(location);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_featured ON properties(featured, featured_until);
CREATE INDEX IF NOT EXISTS idx_properties_title_search ON properties USING GIN(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_properties_description_search ON properties USING GIN(to_tsvector('english', description));
CREATE OR REPLACE FUNCTION update_properties_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS properties_updated_at_trigger ON properties;
CREATE TRIGGER properties_updated_at_trigger
BEFORE UPDATE ON properties
FOR EACH ROW
EXECUTE FUNCTION update_properties_timestamp();
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  check_in TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  guests INT NOT NULL,
  total_price NUMERIC(12, 2),
  currency VARCHAR DEFAULT 'GHS',
  note TEXT,
  payment_status VARCHAR DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  payment_method VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_owner_id ON bookings(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in ON bookings(check_in);
CREATE OR REPLACE FUNCTION update_bookings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS bookings_updated_at_trigger ON bookings;
CREATE TRIGGER bookings_updated_at_trigger
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_bookings_timestamp();
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR NOT NULL,
  comment TEXT NOT NULL,
  cleanliness INT CHECK (cleanliness >= 1 AND cleanliness <= 5),
  accuracy INT CHECK (accuracy >= 1 AND accuracy <= 5),
  communication INT CHECK (communication >= 1 AND communication <= 5),
  location INT CHECK (location >= 1 AND location <= 5),
  value INT CHECK (value >= 1 AND value <= 5),
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  verified_booking BOOLEAN DEFAULT FALSE,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reviews_property_id ON reviews(property_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE OR REPLACE FUNCTION update_reviews_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS reviews_updated_at_trigger ON reviews;
CREATE TRIGGER reviews_updated_at_trigger
BEFORE UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_reviews_timestamp();
CREATE OR REPLACE FUNCTION update_property_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_property_id UUID;
BEGIN
  target_property_id := COALESCE(NEW.property_id, OLD.property_id);

  IF target_property_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE properties
  SET rating = (
    SELECT COALESCE(AVG(rating)::NUMERIC(3, 2), 0) FROM reviews WHERE property_id = target_property_id
  ),
  review_count = (
    SELECT COUNT(*) FROM reviews WHERE property_id = target_property_id
  )
  WHERE id = target_property_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS reviews_rating_trigger ON reviews;
CREATE TRIGGER reviews_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_property_rating();
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_property_id ON messages(property_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
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
CREATE INDEX IF NOT EXISTS idx_chat_threads_participant_1 ON chat_threads(participant_1);
CREATE INDEX IF NOT EXISTS idx_chat_threads_participant_2 ON chat_threads(participant_2);
CREATE INDEX IF NOT EXISTS idx_chat_threads_property_id ON chat_threads(property_id);
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  note TEXT,
  UNIQUE(user_id, property_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_property_id ON favorites(property_id);
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query VARCHAR NOT NULL,
  filters JSONB DEFAULT '{}',
  results_count INT,
  clicked_property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC);
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  search_term VARCHAR,
  filters JSONB DEFAULT '{}',
  results_count INT DEFAULT 0,
  alert_enabled BOOLEAN DEFAULT FALSE,
  alert_frequency VARCHAR DEFAULT 'daily' CHECK (alert_frequency IN ('instant', 'daily', 'weekly')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_updated_at ON saved_searches(updated_at DESC);
CREATE TABLE IF NOT EXISTS property_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  criteria JSONB DEFAULT '{}',
  frequency VARCHAR DEFAULT 'daily' CHECK (frequency IN ('instant', 'daily', 'weekly')),
  enabled BOOLEAN DEFAULT TRUE,
  match_count INT DEFAULT 0,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  email VARCHAR,
  push_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_property_alerts_user_id ON property_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_property_alerts_enabled ON property_alerts(user_id, enabled);
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  related_entity_id UUID,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
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
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE TABLE IF NOT EXISTS property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type VARCHAR CHECK (type IN ('image', 'video', '360_tour')),
  caption TEXT,
  "order" INT,
  thumbnail_url TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON property_images(property_id);
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR DEFAULT 'GHS',
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
  payment_method VARCHAR NOT NULL,
  payment_reference VARCHAR,
  transaction_id VARCHAR,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE OR REPLACE FUNCTION update_payments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS payments_updated_at_trigger ON payments;
CREATE TRIGGER payments_updated_at_trigger
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_payments_timestamp();
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
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_provider ON payment_methods(provider);
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  type VARCHAR NOT NULL CHECK (type IN ('rent_payment', 'service_payment', 'escrow', 'commission', 'withdrawal', 'refund')),
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
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
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
CREATE INDEX IF NOT EXISTS idx_rent_schedules_booking_id ON rent_schedules(booking_id);
CREATE INDEX IF NOT EXISTS idx_rent_schedules_tenant_id ON rent_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rent_schedules_owner_id ON rent_schedules(owner_id);
CREATE INDEX IF NOT EXISTS idx_rent_schedules_next_due_date ON rent_schedules(next_due_date);
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
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_booking_id ON escrow_accounts(booking_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_owner_id ON escrow_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_status ON escrow_accounts(status);
CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rent_schedule_id UUID NOT NULL REFERENCES rent_schedules(id) ON DELETE CASCADE,
  reminder_type VARCHAR NOT NULL CHECK (reminder_type IN ('email', 'sms', 'push', 'in_app')),
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_rent_schedule_id ON payment_reminders(rent_schedule_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_scheduled_time ON payment_reminders(scheduled_time);
CREATE TABLE IF NOT EXISTS property_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  service_type VARCHAR NOT NULL CHECK (service_type IN ('dstv', 'gotv', 'water', 'electricity', 'wifi', 'internet', 'gas', 'other')),
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
CREATE INDEX IF NOT EXISTS idx_property_services_property_id ON property_services(property_id);
CREATE INDEX IF NOT EXISTS idx_property_services_next_renewal_date ON property_services(next_renewal_date);
CREATE INDEX IF NOT EXISTS idx_property_services_status ON property_services(status);
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
CREATE INDEX IF NOT EXISTS idx_service_payments_service_id ON service_payments(service_id);
CREATE INDEX IF NOT EXISTS idx_service_payments_payment_date ON service_payments(payment_date DESC);
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
CREATE INDEX IF NOT EXISTS idx_smart_meters_property_id ON smart_meters(property_id);
CREATE INDEX IF NOT EXISTS idx_smart_meters_meter_type ON smart_meters(meter_type);
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
CREATE INDEX IF NOT EXISTS idx_billing_cycles_property_id ON billing_cycles(property_id);
CREATE INDEX IF NOT EXISTS idx_billing_cycles_period_start ON billing_cycles(period_start DESC);
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
CREATE INDEX IF NOT EXISTS idx_verifications_user_id ON verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_type ON verifications(verification_type);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications(status);
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
CREATE INDEX IF NOT EXISTS idx_id_documents_user_id ON id_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_id_documents_verified ON id_documents(verified);
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
CREATE INDEX IF NOT EXISTS idx_fraud_flags_user_id ON fraud_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_property_id ON fraud_flags(property_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_status ON fraud_flags(status);
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_type VARCHAR NOT NULL CHECK (verification_type IN ('identity', 'address', 'income')),
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);
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
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_user_id ON dashboard_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_date ON dashboard_metrics(metric_date DESC);
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
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
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_report_type ON reports(report_type);
CREATE TABLE IF NOT EXISTS payments_extended (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  provider VARCHAR NOT NULL CHECK (provider IN ('paystack', 'flutterwave')),
  reference VARCHAR NOT NULL,
  webhook_verified BOOLEAN DEFAULT FALSE,
  webhook_verified_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payments_extended_payment_id ON payments_extended(payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_extended_provider ON payments_extended(provider);
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number VARCHAR NOT NULL,
  message TEXT NOT NULL,
  direction VARCHAR CHECK (direction IN ('inbound', 'outbound')),
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  provider VARCHAR NOT NULL CHECK (provider IN ('twilio', 'meta', 'messagebird')),
  external_id VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON whatsapp_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_email VARCHAR NOT NULL,
  subject VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  provider VARCHAR DEFAULT 'smtp' CHECK (provider IN ('smtp', 'sendgrid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number VARCHAR NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  provider VARCHAR NOT NULL CHECK (provider IN ('vonage', 'twilio')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sms_logs_user_id ON sms_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR NOT NULL,
  channel VARCHAR NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'in_app')),
  recipient VARCHAR NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_channel ON notification_queue(channel);
CREATE INDEX IF NOT EXISTS idx_notification_queue_created_at ON notification_queue(created_at DESC);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE id_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments_extended ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view all public profiles" ON users;
CREATE POLICY "Users can view all public profiles" ON users
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can create profile" ON users;
CREATE POLICY "Users can create profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Properties are publicly readable" ON properties;
CREATE POLICY "Properties are publicly readable" ON properties
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Owners can update own properties" ON properties;
CREATE POLICY "Owners can update own properties" ON properties
  FOR UPDATE USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Owners can delete own properties" ON properties;
CREATE POLICY "Owners can delete own properties" ON properties
  FOR DELETE USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Users can create properties" ON properties;
CREATE POLICY "Users can create properties" ON properties
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = owner_id);
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
CREATE POLICY "Users can create bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update bookings" ON bookings;
CREATE POLICY "Users can update bookings" ON bookings
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = owner_id);
DROP POLICY IF EXISTS "Reviews are publicly readable" ON reviews;
CREATE POLICY "Reviews are publicly readable" ON reviews
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
CREATE POLICY "Users can create reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
CREATE POLICY "Users can update own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Users can create messages" ON messages;
CREATE POLICY "Users can create messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Users can view own threads" ON chat_threads;
CREATE POLICY "Users can view own threads" ON chat_threads
  FOR SELECT USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
DROP POLICY IF EXISTS "Users can create threads" ON chat_threads;
CREATE POLICY "Users can create threads" ON chat_threads
  FOR INSERT WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create payments" ON payments;
CREATE POLICY "Users can create payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own payment methods" ON payment_methods;
CREATE POLICY "Users can view own payment methods" ON payment_methods
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create payment methods" ON payment_methods;
CREATE POLICY "Users can create payment methods" ON payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own payment methods" ON payment_methods;
CREATE POLICY "Users can update own payment methods" ON payment_methods
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own payment methods" ON payment_methods;
CREATE POLICY "Users can delete own payment methods" ON payment_methods
  FOR DELETE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view rent schedules" ON rent_schedules;
CREATE POLICY "Users can view rent schedules" ON rent_schedules
  FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = tenant_id);
DROP POLICY IF EXISTS "Users can view escrow accounts" ON escrow_accounts;
CREATE POLICY "Users can view escrow accounts" ON escrow_accounts
  FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = tenant_id);
DROP POLICY IF EXISTS "Users can view own payment reminders" ON payment_reminders;
CREATE POLICY "Users can view own payment reminders" ON payment_reminders
  FOR SELECT USING (
    rent_schedule_id IN (
      SELECT id FROM rent_schedules WHERE owner_id = auth.uid() OR tenant_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
CREATE POLICY "Users can view own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create favorites" ON favorites;
CREATE POLICY "Users can create favorites" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own favorites" ON favorites;
CREATE POLICY "Users can delete own favorites" ON favorites
  FOR DELETE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
CREATE POLICY "Users can view own notification preferences" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own notification preferences" ON notification_preferences;
CREATE POLICY "Users can insert own notification preferences" ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
CREATE POLICY "Users can update own notification preferences" ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own search history" ON search_history;
CREATE POLICY "Users can view own search history" ON search_history
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own search history" ON search_history;
CREATE POLICY "Users can insert own search history" ON search_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own search history" ON search_history;
CREATE POLICY "Users can delete own search history" ON search_history
  FOR DELETE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own saved searches" ON saved_searches;
CREATE POLICY "Users can view own saved searches" ON saved_searches
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own saved searches" ON saved_searches;
CREATE POLICY "Users can create own saved searches" ON saved_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own saved searches" ON saved_searches;
CREATE POLICY "Users can update own saved searches" ON saved_searches
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own saved searches" ON saved_searches;
CREATE POLICY "Users can delete own saved searches" ON saved_searches
  FOR DELETE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own property alerts" ON property_alerts;
CREATE POLICY "Users can view own property alerts" ON property_alerts
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own property alerts" ON property_alerts;
CREATE POLICY "Users can create own property alerts" ON property_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own property alerts" ON property_alerts;
CREATE POLICY "Users can update own property alerts" ON property_alerts
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own property alerts" ON property_alerts;
CREATE POLICY "Users can delete own property alerts" ON property_alerts
  FOR DELETE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Property images are publicly readable" ON property_images;
CREATE POLICY "Property images are publicly readable" ON property_images
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Owners can insert own property images" ON property_images;
CREATE POLICY "Owners can insert own property images" ON property_images
  FOR INSERT WITH CHECK (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "Owners can update own property images" ON property_images;
CREATE POLICY "Owners can update own property images" ON property_images
  FOR UPDATE USING (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "Owners can delete own property images" ON property_images;
CREATE POLICY "Owners can delete own property images" ON property_images
  FOR DELETE USING (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "Owners can view own property services" ON property_services;
CREATE POLICY "Owners can view own property services" ON property_services
  FOR SELECT USING (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "Owners can manage own property services" ON property_services;
CREATE POLICY "Owners can manage own property services" ON property_services
  FOR INSERT WITH CHECK (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "Owners can update own property services" ON property_services;
CREATE POLICY "Owners can update own property services" ON property_services
  FOR UPDATE USING (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "Owners can delete own property services" ON property_services;
CREATE POLICY "Owners can delete own property services" ON property_services
  FOR DELETE USING (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "Owners can view own service payments" ON service_payments;
CREATE POLICY "Owners can view own service payments" ON service_payments
  FOR SELECT USING (
    service_id IN (
      SELECT id
      FROM property_services
      WHERE property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
    )
  );
DROP POLICY IF EXISTS "Owners can insert own service payments" ON service_payments;
CREATE POLICY "Owners can insert own service payments" ON service_payments
  FOR INSERT WITH CHECK (
    service_id IN (
      SELECT id
      FROM property_services
      WHERE property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
    )
  );
DROP POLICY IF EXISTS "Owners can view own smart meters" ON smart_meters;
CREATE POLICY "Owners can view own smart meters" ON smart_meters
  FOR SELECT USING (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "Owners can insert own smart meters" ON smart_meters;
CREATE POLICY "Owners can insert own smart meters" ON smart_meters
  FOR INSERT WITH CHECK (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "Owners can update own smart meters" ON smart_meters;
CREATE POLICY "Owners can update own smart meters" ON smart_meters
  FOR UPDATE USING (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "Owners can view own billing cycles" ON billing_cycles;
CREATE POLICY "Owners can view own billing cycles" ON billing_cycles
  FOR SELECT USING (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "Owners can insert own billing cycles" ON billing_cycles;
CREATE POLICY "Owners can insert own billing cycles" ON billing_cycles
  FOR INSERT WITH CHECK (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "Users can view own verifications" ON verifications;
CREATE POLICY "Users can view own verifications" ON verifications
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create verifications" ON verifications;
CREATE POLICY "Users can create verifications" ON verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own ID documents" ON id_documents;
CREATE POLICY "Users can view own ID documents" ON id_documents
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own ID documents" ON id_documents;
CREATE POLICY "Users can insert own ID documents" ON id_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own ID documents" ON id_documents;
CREATE POLICY "Users can update own ID documents" ON id_documents
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view related fraud flags" ON fraud_flags;
CREATE POLICY "Users can view related fraud flags" ON fraud_flags
  FOR SELECT USING (
    auth.uid() = user_id OR property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "Users can view own verification requests" ON verification_requests;
CREATE POLICY "Users can view own verification requests" ON verification_requests
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own verification requests" ON verification_requests;
CREATE POLICY "Users can create own verification requests" ON verification_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own metrics" ON dashboard_metrics;
CREATE POLICY "Users can view own metrics" ON dashboard_metrics
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own events" ON analytics_events;
CREATE POLICY "Users can create own events" ON analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own reports" ON reports;
CREATE POLICY "Users can create own reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own payment verification details" ON payments_extended;
CREATE POLICY "Users can view own payment verification details" ON payments_extended
  FOR SELECT USING (
    payment_id IN (SELECT id FROM payments WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Users can view own WhatsApp messages" ON whatsapp_messages;
CREATE POLICY "Users can view own WhatsApp messages" ON whatsapp_messages
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own email logs" ON email_logs;
CREATE POLICY "Users can view own email logs" ON email_logs
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own SMS logs" ON sms_logs;
CREATE POLICY "Users can view own SMS logs" ON sms_logs
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own notification queue" ON notification_queue;
CREATE POLICY "Users can view own notification queue" ON notification_queue
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- BACKEND COMPATIBILITY LAYER
-- Align the schema with the existing websocket backend and client service code.
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS full_name VARCHAR,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS phone_number VARCHAR,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS landlord_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name VARCHAR,
  ADD COLUMN IF NOT EXISTS address VARCHAR,
  ADD COLUMN IF NOT EXISTS units INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS monthly_rent NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS total_units INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS occupied_units INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_per_unit NUMERIC(12, 2);

ALTER TABLE properties ALTER COLUMN type SET DEFAULT 'apartment';
ALTER TABLE properties ALTER COLUMN listing_type SET DEFAULT 'rent';
ALTER TABLE properties ALTER COLUMN area SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_properties_price_per_unit ON properties(price_per_unit);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS check_in_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS check_out_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'active'));

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('pending', 'completed', 'failed', 'paid', 'refunded'));

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participants UUID[] NOT NULL,
  participant_names TEXT[] DEFAULT ARRAY[]::TEXT[],
  participant_avatars TEXT[] DEFAULT ARRAY[]::TEXT[],
  type VARCHAR DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  name VARCHAR,
  description TEXT,
  avatar TEXT,
  unread_count INT DEFAULT 0,
  archived BOOLEAN DEFAULT FALSE,
  muted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations(archived);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sender_name VARCHAR,
  ADD COLUMN IF NOT EXISTS sender_avatar TEXT,
  ADD COLUMN IF NOT EXISTS message_type VARCHAR DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name VARCHAR,
  ADD COLUMN IF NOT EXISTS file_size INT,
  ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS read_by UUID[] DEFAULT ARRAY[]::UUID[];

ALTER TABLE messages ALTER COLUMN receiver_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_status_compat ON messages(status);

CREATE TABLE IF NOT EXISTS read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_read_receipts_message_id ON read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_user_id ON read_receipts(user_id);

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS email VARCHAR,
  ADD COLUMN IF NOT EXISTS phone VARCHAR,
  ADD COLUMN IF NOT EXISTS reference_id VARCHAR,
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS paid_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE payments ALTER COLUMN booking_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_property_id ON payments(property_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference_id ON payments(reference_id);

CREATE TABLE IF NOT EXISTS payment_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_rate NUMERIC(6, 4) DEFAULT 0.0500,
  fixed_amount NUMERIC(12, 2) DEFAULT 0,
  paystack_enabled BOOLEAN DEFAULT TRUE,
  flutterwave_enabled BOOLEAN DEFAULT TRUE,
  escrow_hold_days INT DEFAULT 7,
  dispute_window_hours INT DEFAULT 72,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'on_time', 'late', 'missed', 'overdue')),
  payment_method VARCHAR,
  transaction_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rent_payments_property_id ON rent_payments(property_id);
CREATE INDEX IF NOT EXISTS idx_rent_payments_tenant_id ON rent_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rent_payments_user_id ON rent_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_rent_payments_payment_date ON rent_payments(payment_date DESC);

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id VARCHAR NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processed', 'rejected', 'failed')),
  approval_code VARCHAR,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);

ALTER TABLE property_services
  ADD COLUMN IF NOT EXISTS monthly_budget NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR,
  ADD COLUMN IF NOT EXISTS provider_name VARCHAR;

ALTER TABLE property_services DROP CONSTRAINT IF EXISTS property_services_service_type_check;
ALTER TABLE property_services
  ADD CONSTRAINT property_services_service_type_check
  CHECK (service_type IN ('dstv', 'gotv', 'water', 'electricity', 'wifi', 'internet', 'gas', 'other', 'waste'));

CREATE TABLE IF NOT EXISTS smart_meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES property_services(id) ON DELETE CASCADE,
  smart_meter_id UUID REFERENCES smart_meters(id) ON DELETE CASCADE,
  reading NUMERIC(15, 3) NOT NULL,
  unit VARCHAR,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CHECK (service_id IS NOT NULL OR smart_meter_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_smart_meter_readings_service_id ON smart_meter_readings(service_id);
CREATE INDEX IF NOT EXISTS idx_smart_meter_readings_smart_meter_id ON smart_meter_readings(smart_meter_id);
CREATE INDEX IF NOT EXISTS idx_smart_meter_readings_timestamp ON smart_meter_readings(timestamp DESC);

ALTER TABLE smart_meters
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES property_services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit VARCHAR;

CREATE TABLE IF NOT EXISTS verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID REFERENCES verification_requests(id) ON DELETE CASCADE,
  verification_request_id UUID REFERENCES verification_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  request_id UUID REFERENCES verification_requests(id) ON DELETE CASCADE,
  document_type VARCHAR NOT NULL,
  document_url TEXT,
  document_data JSONB DEFAULT '{}',
  fraud_analysis JSONB DEFAULT '{}',
  file_name VARCHAR,
  file_type VARCHAR,
  file_content TEXT,
  file_size INT,
  status VARCHAR DEFAULT 'pending_review' CHECK (status IN ('pending', 'pending_review', 'approved', 'verified', 'rejected')),
  ocr_status VARCHAR DEFAULT 'processing',
  rejection_reason TEXT,
  notes TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP WITH TIME ZONE,
  CHECK (
    verification_id IS NOT NULL OR verification_request_id IS NOT NULL OR request_id IS NOT NULL
  )
);
CREATE INDEX IF NOT EXISTS idx_verification_documents_verification_id ON verification_documents(verification_id);
CREATE INDEX IF NOT EXISTS idx_verification_documents_request_id ON verification_documents(verification_request_id);
CREATE INDEX IF NOT EXISTS idx_verification_documents_user_id ON verification_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_documents_status ON verification_documents(status);

CREATE TABLE IF NOT EXISTS user_verification_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  verified BOOLEAN DEFAULT FALSE,
  verification_level VARCHAR DEFAULT 'unverified',
  badges TEXT[] DEFAULT ARRAY[]::TEXT[],
  fraud_status VARCHAR DEFAULT 'clear',
  overall_score NUMERIC(5, 2) DEFAULT 0,
  trust_level VARCHAR DEFAULT 'low',
  verified_at TIMESTAMP WITH TIME ZONE,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_verification_status_user_id ON user_verification_status(user_id);

CREATE TABLE IF NOT EXISTS verification_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge VARCHAR NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, badge)
);
CREATE INDEX IF NOT EXISTS idx_verification_badges_user_id ON verification_badges(user_id);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR,
  location VARCHAR,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON user_sessions(created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR NOT NULL,
  entity_type VARCHAR,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

CREATE TABLE IF NOT EXISTS fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  alert_type VARCHAR NOT NULL,
  risk_score NUMERIC(5, 2),
  risk_level VARCHAR DEFAULT 'low',
  severity VARCHAR DEFAULT 'medium',
  description TEXT,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'open', 'under_review', 'resolved', 'false_positive', 'blocked')),
  resolution VARCHAR,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user_id ON fraud_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_property_id ON fraud_alerts(property_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON fraud_alerts(status);

ALTER TABLE verification_requests
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE verification_requests DROP CONSTRAINT IF EXISTS verification_requests_verification_type_check;
ALTER TABLE verification_requests
  ADD CONSTRAINT verification_requests_verification_type_check
  CHECK (
    verification_type IN (
      'identity', 'address', 'income',
      'id', 'email', 'phone', 'landlord_badge',
      'id_verification', 'address_verification', 'professional_verification'
    )
  );

ALTER TABLE verification_requests DROP CONSTRAINT IF EXISTS verification_requests_status_check;
ALTER TABLE verification_requests
  ADD CONSTRAINT verification_requests_status_check
  CHECK (
    status IN ('pending', 'approved', 'rejected', 'expired', 'in_progress', 'pending_review', 'verified', 'failed')
  );

CREATE TABLE IF NOT EXISTS property_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  unit_number VARCHAR,
  lease_start_date DATE NOT NULL,
  lease_end_date DATE,
  monthly_rent NUMERIC(12, 2) NOT NULL,
  deposit_amount NUMERIC(12, 2),
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_property_tenants_property_id ON property_tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_property_tenants_tenant_id ON property_tenants(tenant_id);

CREATE TABLE IF NOT EXISTS property_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  expense_type VARCHAR NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expense_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_property_expenses_property_id ON property_expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_property_expenses_date ON property_expenses(date DESC);

CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  severity VARCHAR DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  status VARCHAR DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_complaints_property_id ON complaints(property_id);
CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);

ALTER TABLE notification_queue
  ADD COLUMN IF NOT EXISTS type VARCHAR,
  ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';

ALTER TABLE notification_queue ALTER COLUMN recipient DROP NOT NULL;
ALTER TABLE notification_queue ALTER COLUMN message DROP NOT NULL;

ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

ALTER TABLE whatsapp_messages ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE whatsapp_messages ALTER COLUMN provider SET DEFAULT 'twilio';
ALTER TABLE whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_status_check;
ALTER TABLE whatsapp_messages
  ADD CONSTRAINT whatsapp_messages_status_check
  CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'received'));

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone_number ON whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_external_id ON whatsapp_messages(external_id);

CREATE OR REPLACE FUNCTION set_row_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_user_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name := COALESCE(NEW.name, NEW.full_name, SPLIT_PART(NEW.email, '@', 1));
  NEW.full_name := COALESCE(NEW.full_name, NEW.name);
  NEW.avatar := COALESCE(NEW.avatar, NEW.avatar_url);
  NEW.avatar_url := COALESCE(NEW.avatar_url, NEW.avatar);
  NEW.phone := COALESCE(NEW.phone, NEW.phone_number);
  NEW.phone_number := COALESCE(NEW.phone_number, NEW.phone);
  NEW.verified := COALESCE(NEW.verified, FALSE);
  NEW.is_verified := COALESCE(NEW.is_verified, NEW.verified, FALSE);
  NEW.email_verified := COALESCE(NEW.email_verified, FALSE);
  NEW.phone_verified := COALESCE(NEW.phone_verified, FALSE);
  IF NEW.is_verified AND NOT NEW.verified THEN
    NEW.verified := TRUE;
  END IF;
  IF NEW.verified AND NOT NEW.is_verified THEN
    NEW.is_verified := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_profile_compatibility_trigger ON users;
CREATE TRIGGER users_profile_compatibility_trigger
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION sync_user_profile_fields();

CREATE OR REPLACE FUNCTION sync_property_compatibility_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.owner_id := COALESCE(NEW.owner_id, NEW.landlord_id);
  NEW.landlord_id := COALESCE(NEW.landlord_id, NEW.owner_id);
  NEW.title := COALESCE(NEW.title, NEW.name, 'Untitled Property');
  NEW.name := COALESCE(NEW.name, NEW.title);
  NEW.location := COALESCE(NEW.location, NEW.address, 'Unspecified');
  NEW.address := COALESCE(NEW.address, NEW.location);
  NEW.units := COALESCE(NEW.units, NEW.total_units, 1);
  NEW.total_units := COALESCE(NEW.total_units, NEW.units, 1);
  NEW.occupied_units := COALESCE(NEW.occupied_units, 0);
  NEW.price := COALESCE(NEW.price, NEW.price_per_unit, NEW.monthly_rent);
  NEW.price_per_unit := COALESCE(NEW.price_per_unit, NEW.price, NEW.monthly_rent);
  NEW.monthly_rent := COALESCE(NEW.monthly_rent, NEW.price_per_unit, NEW.price);
  NEW.type := COALESCE(NEW.type, 'apartment');
  NEW.listing_type := COALESCE(NEW.listing_type, 'rent');
  NEW.area := COALESCE(NEW.area, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS properties_compatibility_trigger ON properties;
CREATE TRIGGER properties_compatibility_trigger
BEFORE INSERT OR UPDATE ON properties
FOR EACH ROW
EXECUTE FUNCTION sync_property_compatibility_fields();

CREATE OR REPLACE FUNCTION sync_booking_compatibility_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.check_in := COALESCE(NEW.check_in, NEW.check_in_date);
  NEW.check_out := COALESCE(NEW.check_out, NEW.check_out_date);
  NEW.check_in_date := COALESCE(NEW.check_in_date, NEW.check_in);
  NEW.check_out_date := COALESCE(NEW.check_out_date, NEW.check_out);
  NEW.payment_status := COALESCE(NEW.payment_status, 'pending');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bookings_compatibility_trigger ON bookings;
CREATE TRIGGER bookings_compatibility_trigger
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION sync_booking_compatibility_fields();

CREATE OR REPLACE FUNCTION sync_message_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.message_type := COALESCE(NEW.message_type, 'text');
  NEW.status := COALESCE(
    NEW.status,
    CASE WHEN COALESCE(NEW.read, FALSE) THEN 'read' ELSE 'sent' END
  );
  NEW.read := COALESCE(NEW.read, NEW.status = 'read');
  IF NEW.status = 'read' AND NEW.read_at IS NULL THEN
    NEW.read_at := CURRENT_TIMESTAMP;
  END IF;
  NEW.is_edited := COALESCE(NEW.is_edited, FALSE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_compatibility_trigger ON messages;
CREATE TRIGGER messages_compatibility_trigger
BEFORE INSERT OR UPDATE ON messages
FOR EACH ROW
EXECUTE FUNCTION sync_message_fields();

CREATE OR REPLACE FUNCTION sync_notification_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.description := COALESCE(NEW.description, NEW.message, NEW.title);
  NEW.message := COALESCE(NEW.message, NEW.description, NEW.title);
  NEW.data := COALESCE(NEW.data, NEW.metadata, '{}'::JSONB);
  NEW.metadata := COALESCE(NEW.metadata, NEW.data, '{}'::JSONB);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notifications_compatibility_trigger ON notifications;
CREATE TRIGGER notifications_compatibility_trigger
BEFORE INSERT OR UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION sync_notification_fields();

CREATE OR REPLACE FUNCTION sync_notification_queue_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.type := COALESCE(NEW.type, NEW.notification_type);
  NEW.notification_type := COALESCE(NEW.notification_type, NEW.type);
  NEW.data := COALESCE(NEW.data, '{}'::JSONB);
  NEW.message := COALESCE(NEW.message, NEW.data->>'message', NEW.data->>'description');
  NEW.recipient := COALESCE(NEW.recipient, NEW.data->>'recipient');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_queue_compatibility_trigger ON notification_queue;
CREATE TRIGGER notification_queue_compatibility_trigger
BEFORE INSERT OR UPDATE ON notification_queue
FOR EACH ROW
EXECUTE FUNCTION sync_notification_queue_fields();

CREATE OR REPLACE FUNCTION sync_payment_fields()
RETURNS TRIGGER AS $$
DECLARE
  booking_property_id UUID;
BEGIN
  NEW.reference_id := COALESCE(NEW.reference_id, NEW.payment_reference);
  NEW.payment_reference := COALESCE(NEW.payment_reference, NEW.reference_id);
  IF NEW.booking_id IS NOT NULL AND NEW.property_id IS NULL THEN
    SELECT property_id INTO booking_property_id
    FROM bookings
    WHERE id = NEW.booking_id;
    NEW.property_id := booking_property_id;
  END IF;
  IF NEW.status = 'completed' AND NEW.paid_date IS NULL THEN
    NEW.paid_date := COALESCE(NEW.completed_at, CURRENT_TIMESTAMP);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payments_compatibility_trigger ON payments;
CREATE TRIGGER payments_compatibility_trigger
BEFORE INSERT OR UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION sync_payment_fields();

CREATE OR REPLACE FUNCTION sync_property_service_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.provider := COALESCE(NEW.provider, NEW.provider_name);
  NEW.provider_name := COALESCE(NEW.provider_name, NEW.provider);
  NEW.amount := COALESCE(NEW.amount, NEW.monthly_budget);
  NEW.monthly_budget := COALESCE(NEW.monthly_budget, NEW.amount);
  NEW.payment_frequency := COALESCE(NEW.payment_frequency, NEW.billing_cycle, 'monthly');
  NEW.billing_cycle := COALESCE(NEW.billing_cycle, NEW.payment_frequency, 'monthly');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS property_services_compatibility_trigger ON property_services;
CREATE TRIGGER property_services_compatibility_trigger
BEFORE INSERT OR UPDATE ON property_services
FOR EACH ROW
EXECUTE FUNCTION sync_property_service_fields();

CREATE OR REPLACE FUNCTION sync_smart_meter_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.unit := COALESCE(NEW.unit, NEW.consumption_unit);
  NEW.consumption_unit := COALESCE(NEW.consumption_unit, NEW.unit);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS smart_meters_compatibility_trigger ON smart_meters;
CREATE TRIGGER smart_meters_compatibility_trigger
BEFORE INSERT OR UPDATE ON smart_meters
FOR EACH ROW
EXECUTE FUNCTION sync_smart_meter_fields();

CREATE OR REPLACE FUNCTION sync_verification_document_fields()
RETURNS TRIGGER AS $$
DECLARE
  target_request_id UUID;
BEGIN
  target_request_id := COALESCE(NEW.verification_request_id, NEW.verification_id, NEW.request_id);
  NEW.verification_request_id := COALESCE(NEW.verification_request_id, target_request_id);
  NEW.verification_id := COALESCE(NEW.verification_id, target_request_id);
  NEW.request_id := COALESCE(NEW.request_id, target_request_id);
  IF NEW.user_id IS NULL AND target_request_id IS NOT NULL THEN
    SELECT user_id INTO NEW.user_id
    FROM verification_requests
    WHERE id = target_request_id;
  END IF;
  NEW.document_data := COALESCE(NEW.document_data, '{}'::JSONB);
  NEW.fraud_analysis := COALESCE(NEW.fraud_analysis, '{}'::JSONB);
  NEW.ocr_status := COALESCE(NEW.ocr_status, 'processing');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS verification_documents_compatibility_trigger ON verification_documents;
CREATE TRIGGER verification_documents_compatibility_trigger
BEFORE INSERT OR UPDATE ON verification_documents
FOR EACH ROW
EXECUTE FUNCTION sync_verification_document_fields();

DROP TRIGGER IF EXISTS messages_updated_at_trigger ON messages;
CREATE TRIGGER messages_updated_at_trigger
BEFORE UPDATE ON messages
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

DROP TRIGGER IF EXISTS notification_preferences_updated_at_trigger ON notification_preferences;
CREATE TRIGGER notification_preferences_updated_at_trigger
BEFORE UPDATE ON notification_preferences
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

DROP TRIGGER IF EXISTS payment_methods_updated_at_trigger ON payment_methods;
CREATE TRIGGER payment_methods_updated_at_trigger
BEFORE UPDATE ON payment_methods
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

DROP TRIGGER IF EXISTS rent_schedules_updated_at_trigger ON rent_schedules;
CREATE TRIGGER rent_schedules_updated_at_trigger
BEFORE UPDATE ON rent_schedules
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

DROP TRIGGER IF EXISTS property_services_updated_at_trigger ON property_services;
CREATE TRIGGER property_services_updated_at_trigger
BEFORE UPDATE ON property_services
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

DROP TRIGGER IF EXISTS smart_meters_updated_at_trigger ON smart_meters;
CREATE TRIGGER smart_meters_updated_at_trigger
BEFORE UPDATE ON smart_meters
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

DROP TRIGGER IF EXISTS conversations_updated_at_trigger ON conversations;
CREATE TRIGGER conversations_updated_at_trigger
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

DROP TRIGGER IF EXISTS verification_requests_updated_at_trigger ON verification_requests;
CREATE TRIGGER verification_requests_updated_at_trigger
BEFORE UPDATE ON verification_requests
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

DROP TRIGGER IF EXISTS user_verification_status_updated_at_trigger ON user_verification_status;
CREATE TRIGGER user_verification_status_updated_at_trigger
BEFORE UPDATE ON user_verification_status
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

DROP TRIGGER IF EXISTS payment_configuration_updated_at_trigger ON payment_configuration;
CREATE TRIGGER payment_configuration_updated_at_trigger
BEFORE UPDATE ON payment_configuration
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

DROP TRIGGER IF EXISTS saved_searches_updated_at_trigger ON saved_searches;
CREATE TRIGGER saved_searches_updated_at_trigger
BEFORE UPDATE ON saved_searches
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

DROP TRIGGER IF EXISTS property_alerts_updated_at_trigger ON property_alerts;
CREATE TRIGGER property_alerts_updated_at_trigger
BEFORE UPDATE ON property_alerts
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verification_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
CREATE POLICY "Users can insert own notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can view property related payments" ON payments;
CREATE POLICY "Owners can view property related payments" ON payments
  FOR SELECT USING (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
    OR booking_id IN (SELECT id FROM bookings WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own messages" ON messages;
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (participants @> ARRAY[auth.uid()]::UUID[]);
DROP POLICY IF EXISTS "Users can create conversations they join" ON conversations;
CREATE POLICY "Users can create conversations they join" ON conversations
  FOR INSERT WITH CHECK (participants @> ARRAY[auth.uid()]::UUID[]);
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (participants @> ARRAY[auth.uid()]::UUID[]);
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE USING (participants @> ARRAY[auth.uid()]::UUID[]);

DROP POLICY IF EXISTS "Conversation participants can view conversation messages" ON messages;
CREATE POLICY "Conversation participants can view conversation messages" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE participants @> ARRAY[auth.uid()]::UUID[]
    )
  );
DROP POLICY IF EXISTS "Conversation participants can create messages" ON messages;
CREATE POLICY "Conversation participants can create messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND (
      conversation_id IS NULL
      OR conversation_id IN (
        SELECT id FROM conversations WHERE participants @> ARRAY[auth.uid()]::UUID[]
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage own read receipts" ON read_receipts;
CREATE POLICY "Users can manage own read receipts" ON read_receipts
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own read receipts" ON read_receipts;
CREATE POLICY "Users can insert own read receipts" ON read_receipts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view payment configuration" ON payment_configuration;
CREATE POLICY "Users can view payment configuration" ON payment_configuration
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view related rent payments" ON rent_payments;
CREATE POLICY "Users can view related rent payments" ON rent_payments
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.uid() = tenant_id
    OR property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view related refunds" ON refunds;
CREATE POLICY "Users can view related refunds" ON refunds
  FOR SELECT USING (
    auth.uid() = user_id
    OR payment_id IN (
      SELECT id::TEXT FROM payments WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can view smart meter readings" ON smart_meter_readings;
CREATE POLICY "Owners can view smart meter readings" ON smart_meter_readings
  FOR SELECT USING (
    service_id IN (
      SELECT id FROM property_services WHERE property_id IN (
        SELECT id FROM properties WHERE owner_id = auth.uid()
      )
    )
    OR smart_meter_id IN (
      SELECT id FROM smart_meters WHERE property_id IN (
        SELECT id FROM properties WHERE owner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Owners can insert smart meter readings" ON smart_meter_readings;
CREATE POLICY "Owners can insert smart meter readings" ON smart_meter_readings
  FOR INSERT WITH CHECK (
    service_id IN (
      SELECT id FROM property_services WHERE property_id IN (
        SELECT id FROM properties WHERE owner_id = auth.uid()
      )
    )
    OR smart_meter_id IN (
      SELECT id FROM smart_meters WHERE property_id IN (
        SELECT id FROM properties WHERE owner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can view own verification documents" ON verification_documents;
CREATE POLICY "Users can view own verification documents" ON verification_documents
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own verification documents" ON verification_documents;
CREATE POLICY "Users can insert own verification documents" ON verification_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own verification documents" ON verification_documents;
CREATE POLICY "Users can update own verification documents" ON verification_documents
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own verification status" ON user_verification_status;
CREATE POLICY "Users can view own verification status" ON user_verification_status
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own verification badges" ON verification_badges;
CREATE POLICY "Users can view own verification badges" ON verification_badges
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own sessions" ON user_sessions;
CREATE POLICY "Users can insert own sessions" ON user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own fraud alerts" ON fraud_alerts;
CREATE POLICY "Users can view own fraud alerts" ON fraud_alerts
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own fraud alerts" ON fraud_alerts;
CREATE POLICY "Users can create own fraud alerts" ON fraud_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view related property tenants" ON property_tenants;
CREATE POLICY "Users can view related property tenants" ON property_tenants
  FOR SELECT USING (
    auth.uid() = tenant_id
    OR auth.uid() = user_id
    OR property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners can view own property expenses" ON property_expenses;
CREATE POLICY "Owners can view own property expenses" ON property_expenses
  FOR SELECT USING (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "Owners can insert own property expenses" ON property_expenses;
CREATE POLICY "Owners can insert own property expenses" ON property_expenses
  FOR INSERT WITH CHECK (
    property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view related complaints" ON complaints;
CREATE POLICY "Users can view related complaints" ON complaints
  FOR SELECT USING (
    auth.uid() = user_id
    OR property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "Users can create related complaints" ON complaints;
CREATE POLICY "Users can create related complaints" ON complaints
  FOR INSERT WITH CHECK (auth.uid() = user_id);



