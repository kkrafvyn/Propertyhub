/**
 * PropertyHub Mobile - Type Definitions
 * 
 * This file contains all TypeScript type definitions used throughout
 * the mobile application. It ensures type safety and better IDE support.
 */

// Base types
export type ID = string;
export type Timestamp = string; // ISO 8601 string

// Location and Geography
export interface Location {
  address: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  postalCode?: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// User and Authentication
export interface User {
  id: ID;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  preferences: UserPreferences;
  verificationStatus: VerificationStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type UserRole = 'user' | 'host' | 'manager' | 'admin';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  currency: string;
  notifications: NotificationPreferences;
}

export interface NotificationPreferences {
  push: boolean;
  email: boolean;
  sms: boolean;
  marketing: boolean;
  propertyUpdates: boolean;
  chatMessages: boolean;
}

export interface VerificationStatus {
  email: boolean;
  phone: boolean;
  identity: boolean;
  paymentMethod: boolean;
}

// Property Management
export interface Property {
  id: ID;
  title: string;
  description: string;
  price: number;
  currency?: string;
  location: Location;
  images: string[];
  videos?: string[];
  virtualTourUrl?: string;
  type: PropertyType;
  category: PropertyCategory;
  bedrooms?: number;
  bathrooms?: number;
  area: number; // in square meters
  areaUnit?: 'sqm' | 'sqft';
  features: string[];
  amenities?: string[];
  utilities?: string[];
  furnishingStatus: FurnishingStatus;
  availabilityStatus: AvailabilityStatus;
  listingType: ListingType;
  hostId: ID;
  hostName: string;
  hostAvatar?: string;
  hostRating?: number;
  hostResponseRate?: number;
  hostResponseTime?: string; // e.g., "within an hour"
  ratings: PropertyRating;
  reviews?: PropertyReview[];
  bookings?: Booking[];
  viewCount: number;
  favoriteCount: number;
  isFeatured: boolean;
  tags: string[];
  seoKeywords?: string[];
  metadata?: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type PropertyType = 
  | 'house' 
  | 'apartment' 
  | 'condo' 
  | 'townhouse' 
  | 'villa' 
  | 'studio' 
  | 'loft' 
  | 'duplex' 
  | 'penthouse';

export type PropertyCategory = 
  | 'residential' 
  | 'commercial' 
  | 'land' 
  | 'industrial' 
  | 'mixed-use';

export type FurnishingStatus = 
  | 'furnished' 
  | 'semi-furnished' 
  | 'unfurnished';

export type AvailabilityStatus = 
  | 'available' 
  | 'occupied' 
  | 'maintenance' 
  | 'reserved' 
  | 'sold' 
  | 'rented';

export type ListingType = 
  | 'sale' 
  | 'rent' 
  | 'lease' 
  | 'auction';

export interface PropertyRating {
  overall: number;
  cleanliness?: number;
  location: number;
  value: number;
  communication?: number;
  checkIn?: number;
  accuracy?: number;
  totalReviews: number;
}

export interface PropertyReview {
  id: ID;
  propertyId: ID;
  userId: ID;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  photos?: string[];
  helpful: number;
  response?: {
    hostResponse: string;
    responseDate: Timestamp;
  };
  createdAt: Timestamp;
}

// Property Search and Filtering
export interface PropertyFilter {
  search?: string;
  category?: PropertyCategory;
  type?: PropertyType;
  listingType?: ListingType;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minArea?: number;
  maxArea?: number;
  location?: Location | Coordinates;
  radius?: number; // in kilometers
  features?: string[];
  amenities?: string[];
  furnishingStatus?: FurnishingStatus;
  availabilityStatus?: AvailabilityStatus[];
  minRating?: number;
  hostType?: 'individual' | 'professional';
  instantBook?: boolean;
  petFriendly?: boolean;
  accessibilityFeatures?: boolean;
  userId?: ID; // for personalized results
}

export interface PropertySearchResult {
  properties: Property[];
  total: number;
  page: number;
  hasMore: boolean;
  aggregations?: {
    priceRange: { min: number; max: number };
    locationCounts: Record<string, number>;
    typeFrequency: Record<PropertyType, number>;
    averagePrice: number;
  };
}

// Booking and Reservations
export interface Booking {
  id: ID;
  propertyId: ID;
  property: Property;
  guestId: ID;
  guest: User;
  hostId: ID;
  host: User;
  checkInDate: Timestamp;
  checkOutDate: Timestamp;
  guests: number;
  totalPrice: number;
  currency: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  specialRequests?: string;
  cancellationPolicy: CancellationPolicy;
  houseRules: string[];
  confirmationCode: string;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type BookingStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'checked-in' 
  | 'checked-out' 
  | 'cancelled' 
  | 'completed';

export type PaymentStatus = 
  | 'pending' 
  | 'processing' 
  | 'paid' 
  | 'partially-paid' 
  | 'failed' 
  | 'refunded' 
  | 'partially-refunded';

export interface PaymentMethod {
  id: ID;
  type: 'card' | 'bank-transfer' | 'mobile-money' | 'crypto';
  provider: string; // e.g., 'paystack', 'stripe', 'flutterwave'
  details: Record<string, any>;
  isDefault: boolean;
}

export type CancellationPolicy = 
  | 'flexible' 
  | 'moderate' 
  | 'strict' 
  | 'super-strict';

// Chat and Communication
export interface ChatRoom {
  id: ID;
  name: string;
  type: ChatRoomType;
  participants: ChatRoomParticipant[];
  lastMessage?: Message;
  unreadCount: number;
  propertyId?: ID; // for property-related chats
  bookingId?: ID; // for booking-related chats
  isArchived: boolean;
  isMuted: boolean;
  settings: ChatRoomSettings;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ChatRoomType = 
  | 'property' 
  | 'booking' 
  | 'support' 
  | 'general';

export interface ChatRoomParticipant {
  id: ID;
  name: string;
  avatar?: string;
  role: ChatParticipantRole;
  joinedAt: Timestamp;
  lastSeenAt?: Timestamp;
  permissions: ChatPermissions;
}

export type ChatParticipantRole = 
  | 'guest' 
  | 'host' 
  | 'manager' 
  | 'admin' 
  | 'support';

export interface ChatPermissions {
  canSendMessages: boolean;
  canSendFiles: boolean;
  canSendVoice: boolean;
  canDeleteMessages: boolean;
  canInviteUsers: boolean;
  canManageRoom: boolean;
}

export interface ChatRoomSettings {
  encryptionEnabled: boolean;
  fileUploadsEnabled: boolean;
  voiceMessagesEnabled: boolean;
  maxFileSize: number; // in bytes
  allowedFileTypes: string[];
  messageRetention: number; // in days, 0 = forever
}

export interface Message {
  id: ID;
  roomId: ID;
  senderId: ID;
  content: string;
  type: MessageType;
  status: MessageStatus;
  replyTo?: ID; // ID of message being replied to
  editedAt?: Timestamp;
  deletedAt?: Timestamp;
  reactions?: MessageReaction[];
  metadata?: MessageMetadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type MessageType = 
  | 'text' 
  | 'image' 
  | 'video' 
  | 'file' 
  | 'voice' 
  | 'location' 
  | 'contact' 
  | 'system';

export type MessageStatus = 
  | 'sending' 
  | 'sent' 
  | 'delivered' 
  | 'read' 
  | 'failed' 
  | 'pending';

export interface MessageReaction {
  emoji: string;
  userId: ID;
  userName: string;
  createdAt: Timestamp;
}

export interface MessageMetadata {
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  duration?: number; // for voice/video messages
  thumbnailUrl?: string;
  coordinates?: Coordinates; // for location messages
  width?: number; // for images/videos
  height?: number; // for images/videos
  isEncrypted?: boolean;
}

// Notifications
export interface Notification {
  id: ID;
  userId: ID;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  actionUrl?: string;
  imageUrl?: string;
  priority: NotificationPriority;
  expiresAt?: Timestamp;
  createdAt: Timestamp;
}

export type NotificationType = 
  | 'booking_request' 
  | 'booking_confirmation' 
  | 'booking_cancellation' 
  | 'payment_success' 
  | 'payment_failed' 
  | 'message_received' 
  | 'property_update' 
  | 'property_approved' 
  | 'property_rejected' 
  | 'review_received' 
  | 'system_maintenance' 
  | 'promotional';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// Analytics and Insights
export interface PropertyAnalytics {
  propertyId: ID;
  period: {
    start: Timestamp;
    end: Timestamp;
  };
  metrics: {
    views: number;
    favorites: number;
    inquiries: number;
    bookings: number;
    revenue: number;
    occupancyRate: number;
    averageRating: number;
    responseRate: number;
    conversionRate: number;
  };
  trends: {
    viewsTrend: number[];
    bookingsTrend: number[];
    revenueTrend: number[];
  };
  demographics: {
    ageGroups: Record<string, number>;
    locations: Record<string, number>;
    devices: Record<string, number>;
  };
}

// Application State
export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  properties: Property[];
  favorites: Property[];
  bookings: Booking[];
  chatRooms: ChatRoom[];
  notifications: Notification[];
  currentLocation?: Location;
  searchFilters: PropertyFilter;
  theme: 'light' | 'dark' | 'system';
  language: string;
  currency: string;
  isOnline: boolean;
  lastSyncAt?: Timestamp;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
    timestamp: Timestamp;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Timestamp;
}

// WebSocket Events
export interface WebSocketEvent {
  type: WebSocketEventType;
  data: any;
  timestamp: Timestamp;
  userId?: ID;
  roomId?: ID;
}

export type WebSocketEventType = 
  | 'message_received' 
  | 'message_sent' 
  | 'message_read' 
  | 'user_joined' 
  | 'user_left' 
  | 'user_typing' 
  | 'user_stopped_typing' 
  | 'room_updated' 
  | 'notification_received' 
  | 'property_updated' 
  | 'booking_updated';

// Form and Validation
export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  options?: FormFieldOption[];
  validation?: ValidationRule[];
  helperText?: string;
  errorText?: string;
  value?: any;
}

export type FormFieldType = 
  | 'text' 
  | 'email' 
  | 'password' 
  | 'number' 
  | 'select' 
  | 'multiselect' 
  | 'checkbox' 
  | 'radio' 
  | 'date' 
  | 'time' 
  | 'datetime' 
  | 'textarea' 
  | 'file' 
  | 'image' 
  | 'location';

export interface FormFieldOption {
  label: string;
  value: any;
  disabled?: boolean;
}

export interface ValidationRule {
  type: 'required' | 'email' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

// Utility Types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface LoadingAction<T = any> {
  state: LoadingState;
  data?: T;
  error?: string;
}

export type ConnectionStatus = 
  | 'connected' 
  | 'connecting' 
  | 'disconnected' 
  | 'error';

// React Navigation Types (for type-safe navigation)
export type RootStackParamList = {
  '(tabs)': undefined;
  '(auth)': undefined;
  'property/[id]': { id: string };
  'chat/[roomId]': { roomId: string; propertyId?: string };
  'profile/settings': undefined;
  'map': { properties?: Property[]; selectedPropertyId?: string };
};

export type TabParamList = {
  index: undefined;
  search: undefined;
  messages: undefined;
  favorites: undefined;
  profile: undefined;
};

export type AuthStackParamList = {
  index: undefined;
  login: undefined;
  signup: undefined;
};

// Export utility type helpers
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;