/**
 * Verification & Trust Types
 * 
 * ID verification, fraud detection, landlord rating system
 */

export type VerificationType = 'email' | 'phone' | 'id_document' | 'address' | 'income' | 'landlord_badge';
export type IDDocumentType = 'national_id' | 'passport' | 'drivers_license' | 'voters_card';
export type VerificationStatus = 'pending' | 'verified' | 'failed' | 'expired';
export type FraudSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FraudFlagType = 'suspicious_activity' | 'duplicate_listing' | 'payment_fraud' | 'impersonation' | 'other';

/**
 * Verification Record
 */
export interface Verification {
  id: string;
  user_id: string;
  verification_type: VerificationType;
  status: VerificationStatus;
  verified_at?: string;
  expires_at?: string;
  verifier_notes?: string;
  created_at: string;
}

/**
 * Verification Request
 */
export interface VerificationRequest {
  id: string;
  user_id: string;
  verification_type: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  created_at: string;
  updated_at: string;
  verified_at?: string;
  expires_at?: string;
  source?: string;
}

/**
 * Verification Document
 */
export interface VerificationDocument {
  id: string;
  request_id: string;
  document_type: string;
  file_name: string;
  file_type: string;
  file_content: string;
  file_size: number;
  status: 'pending' | 'approved' | 'rejected';
  uploaded_at: string;
  rejection_reason?: string;
  notes?: string;
}

/**
 * Fraud Alert
 */
export interface FraudAlert {
  id: string;
  user_id: string;
  alert_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  reason?: string;
}

/**
 * ID Document
 */
export interface IDDocument {
  id: string;
  user_id: string;
  document_type: IDDocumentType;
  document_number: string;
  issue_date?: string;
  expiry_date?: string;
  front_image_url: string;
  back_image_url?: string;
  verified: boolean;
  verification_date?: string;
  created_at: string;
}

/**
 * Fraud Flag
 */
export interface FraudFlag {
  id: string;
  user_id?: string;
  property_id?: string;
  flag_type: FraudFlagType;
  description: string;
  severity: FraudSeverity;
  status: 'under_review' | 'confirmed' | 'false_positive' | 'resolved';
  action_taken?: string;
  created_at: string;
}

/**
 * User Verification Status
 */
export interface UserVerificationStatus {
  user_id: string;
  email_verified: boolean;
  phone_verified: boolean;
  id_verified: boolean;
  address_verified: boolean;
  income_verified: boolean;
  landlord_verified: boolean;
  overall_score: number; // 0-100
  trust_level: 'low' | 'medium' | 'high' | 'verified';
  
  // Compatibility fields for dashboard and services
  verification_status?: 'pending' | 'approved' | 'rejected' | 'none' | string;
  last_verified_at?: string;
  verification_level?: string;
  badges?: string[];
  fraud_status?: string;
  verified_at?: string;
  expires_at?: string;
}

/**
 * Landlord Badge
 */
export interface LandlordBadge {
  id: string;
  user_id: string;
  verified: boolean;
  properties_listed: number;
  average_rating: number;
  total_reviews: number;
  response_time_hours: number;
  verified_date?: string;
  badge_type: 'verified' | 'trusted' | 'superhost';
}

/**
 * Tenant Scoring
 */
export interface TenantScore {
  tenant_id: string;
  payment_score: number; // 0-100 based on payment history
  property_care_score: number; // 0-100 based on property condition
  communication_score: number; // 0-100 based on responsiveness
  legal_score: number; // 0-100 based on disputes/complaints
  overall_score: number; // 0-100 weighted average
  risk_level: 'low' | 'medium' | 'high';
  recommendation: 'excellent' | 'good' | 'acceptable' | 'risky';
}

/**
 * Verification Review Record
 */
export interface VerificationReview {
  id: string;
  request_id: string;
  reviewer_id: string;
  status: 'approved' | 'rejected';
  rejection_reason?: string;
  notes?: string;
  reviewed_at: string;
}

/**
 * Payment fraud detection
 */
export interface PaymentFraudIndicator {
  transaction_id: string;
  risk_score: number; // 0-1
  flags: Array<{
    flag: string;
    weight: number;
    description: string;
  }>;
  recommendation: 'approve' | 'review' | 'block';
}

/**
 * Verification Summary
 */
export interface VerificationSummary {
  verified_identities: number;
  verified_landlords: number;
  verified_properties: number;
  fraud_cases_detected: number;
  cases_resolved: number;
  pending_verification: number;
}

/**
 * ID Verification Response
 */
export interface IDVerificationResponse {
  status: 'success' | 'failed' | 'pending';
  verified: boolean;
  name?: string;
  date_of_birth?: string;
  id_number?: string;
  expiry_date?: string;
  confidence_score?: number;
  message?: string;
}

/**
 * Landlord Verification Criteria
 */
export interface LandlordVerificationCriteria {
  minimum_properties: number; // 1
  minimum_reviews: number; // 0
  minimum_rating: number; // 0
  must_verify_id: boolean; // true
  must_verify_address: boolean; // true
  background_check: boolean; // false
}

export interface VerificationConfiguration {
  require_id: boolean;
  require_phone: boolean;
  require_email: boolean;
  require_address: boolean;
  require_income: boolean;
  allow_selfie: boolean;
  allow_video: boolean;
}

/**
 * Activity Report
 */
export interface ActivityReport {
  user_id: string;
  report_date: string;
  login_count: number;
  property_views: number;
  messages_sent: number;
  bookings_made: number;
  payments_made: number;
  support_tickets: number;
  fraud_flags_raised: number;
}

