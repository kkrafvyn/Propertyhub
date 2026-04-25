/**
 * Supabase Database Types
 * 
 * Type definitions for Supabase database tables and operations
 * These types align with the Supabase RLS policies and database schema
 * 
 * @author PropertyHub Team
 */

import type { ID, Timestamp, Currency, UserRole, UserStatus, PropertyStatus, ListingType, PropertyAmenity } from './index';

// ========================================
// User Database Types
// ========================================

export interface UserDB {
  id: ID;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  bio?: string;
  phone?: string;
  verified: boolean;
  rating: number;
  response_time?: number;
  response_rate?: number;
  total_properties?: number;
  total_bookings?: number;
  languages?: string[];
  created_at: Timestamp;
  updated_at: Timestamp;
  last_login_at?: Timestamp;
  preferences?: Record<string, any>;
}

// ========================================
// Property Database Types
// ========================================

export interface PropertyDB {
  id: ID;
  owner_id: ID;
  title: string;
  description: string;
  type: string; // 'house' | 'apartment' | 'land' | 'shop' | 'office' | 'warehouse'
  listing_type: ListingType;
  status: PropertyStatus;
  price?: number;
  currency?: Currency;
  period?: string; // 'monthly' | 'yearly' | 'daily'
  bedrooms?: number;
  bathrooms?: number;
  area: number;
  location: string;
  latitude?: number;
  longitude?: number;
  amenities: PropertyAmenity[];
  features?: Record<string, any>;
  images?: string[];
  cover_image?: string;
  rating?: number;
  review_count?: number;
  availability_start?: Timestamp;
  availability_end?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
  views?: number;
  featured: boolean;
  featured_until?: Timestamp;
}

// ========================================
// Booking Database Types
// ========================================

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface BookingDB {
  id: ID;
  property_id: ID;
  user_id: ID;
  owner_id: ID;
  check_in: Timestamp;
  check_out: Timestamp;
  status: BookingStatus;
  guests: number;
  total_price?: number;
  currency?: Currency;
  note?: string;
  payment_status?: 'pending' | 'completed' | 'failed';
  payment_method?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  cancelled_at?: Timestamp;
  cancellation_reason?: string;
}

// ========================================
// Review Database Types
// ========================================

export interface ReviewDB {
  id: ID;
  property_id: ID;
  booking_id?: ID;
  reviewer_id: ID;
  owner_id: ID; // property owner
  rating: number; // 1-5
  title: string;
  comment: string;
  cleanliness?: number;
  accuracy?: number;
  communication?: number;
  location?: number;
  value?: number;
  images?: string[];
  verified_booking: boolean;
  helpful_count?: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ========================================
// Message Database Types
// ========================================

export interface MessageDB {
  id: ID;
  sender_id: ID;
  receiver_id: ID;
  property_id?: ID;
  booking_id?: ID;
  content: string;
  image_url?: string;
  read: boolean;
  read_at?: Timestamp;
  deleted_at?: Timestamp;
  reply_to?: ID;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ========================================
// Payment Database Types
// ========================================

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';

export interface PaymentDB {
  id: ID;
  booking_id: ID;
  user_id: ID;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  payment_method: string; // 'paystack', 'stripe', etc.
  payment_reference?: string;
  transaction_id?: string;
  metadata?: Record<string, any>;
  created_at: Timestamp;
  updated_at: Timestamp;
  completed_at?: Timestamp;
}

// ========================================
// Favorite/Wishlist Database Types
// ========================================

export interface FavoriteDB {
  id: ID;
  user_id: ID;
  property_id: ID;
  created_at: Timestamp;
  note?: string;
}

// ========================================
// Search/History Database Types
// ========================================

export interface SearchHistoryDB {
  id: ID;
  user_id: ID;
  query: string;
  filters?: Record<string, any>;
  results_count?: number;
  clicked_property_id?: ID;
  created_at: Timestamp;
}

// ========================================
// Image/Media Database Types
// ========================================

export interface PropertyImageDB {
  id: ID;
  property_id: ID;
  url: string;
  type: 'image' | 'video' | '360_tour';
  caption?: string;
  order: number;
  thumbnail_url?: string;
  uploaded_at: Timestamp;
}

// ========================================
// Notification Database Types
// ========================================

export type NotificationType = 
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'review_received'
  | 'message_received'
  | 'property_inquiry'
  | 'price_drop'
  | 'property_featured'
  | 'payment_received'
  | 'admin_alert';

export interface NotificationDB {
  id: ID;
  user_id: ID;
  type: NotificationType;
  title: string;
  message: string;
  related_entity_id?: ID; // property_id, booking_id, etc.
  read: boolean;
  read_at?: Timestamp;
  action_url?: string;
  metadata?: Record<string, any>;
  created_at: Timestamp;
}

// ========================================
// Database Response Types
// ========================================

export interface DatabaseResponse<T> {
  data: T | null;
  error: Error | null;
  status: number;
}

export interface DatabaseListResponse<T> {
  data: T[] | null;
  count: number | null;
  error: Error | null;
  status: number;
}

// ========================================
// Real-time Subscription Types
// ========================================

export interface RealtimeMessage<T = any> {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: T | null;
  old_record: T | null;
  errors: null | string[];
}

export interface SupabaseSubscription {
  unsubscribe: () => Promise<void>;
}
