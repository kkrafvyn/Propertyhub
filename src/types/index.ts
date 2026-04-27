/**
 * PropertyHub Type Definitions
 * 
 * Comprehensive type definitions for the PropertyHub application.
 * These types provide excellent IDE support with IntelliSense, auto-completion,
 * and compile-time type checking.
 * 
 * @author PropertyHub Development Team
 * @version 2.0.0
 */

// ========================================
// Base Types and Utilities
// ========================================

/**
 * Common utility types for better development experience
 */
export type ID = string;
export type Timestamp = string; // ISO 8601 format
export type Currency = 'GHS' | 'USD' | 'EUR' | 'NGN' | string;
export type Theme = 'light' | 'dark' | 'system' | 'high-contrast';
export type Language = 'en' | 'fr' | 'tw' | 'ga';

/**
 * Utility type for making properties optional
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Utility type for making properties required
 */
export type MarkRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * API Response wrapper type
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Timestamp;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Paginated response type
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

// ========================================
// User Management Types
// ========================================

/**
 * User role definitions with legacy string compatibility
 */
export type UserRole =
  | 'user'
  | 'host'
  | 'manager'
  | 'admin'
  | string;

/**
 * User status definitions
 */
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending' | 'banned' | string;

/**
 * User preferences interface
 */
export interface UserPreferences {
  theme: Theme;
  language: Language;
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
    marketing: boolean;
    inApp?: boolean;
    soundEnabled?: boolean;
    doNotDisturb?: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
  };
  privacy: {
    showProfile: boolean;
    showActivity: boolean;
  };
  display: {
    currency: Currency;
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    timeFormat: '12h' | '24h';
  };
  security?: {
    biometrics?: {
      enabled: boolean;
      promptOnLaunch: boolean;
      allowDeviceCredentials: boolean;
      lastVerifiedAt?: Timestamp;
      biometryType?: string;
    };
  };
}

/**
 * User profile interface
 */
export interface UserProfile {
  firstName: string;
  lastName: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  address?: Address;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
}

/**
 * Complete user interface
 */
export interface User {
  id: ID;
  email: string;
  name: string;
  role: UserRole;
  status?: UserStatus;
  avatar?: string;
  verified?: boolean;
  profile?: UserProfile;
  preferences?: UserPreferences;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  lastLoginAt?: Timestamp;
  lastLogin?: Timestamp;
  joinedAt?: Timestamp;
  joinDate?: Timestamp;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  phone?: string;
  location?: string;
  bio?: string;
  security?: {
    twoFactorEnabled?: boolean;
    lastLogin?: string;
    loginAttempts?: number;
    accountLocked?: boolean;
  };
  stats?: {
    propertiesViewed?: number;
    propertiesLiked?: number;
    propertiesSaved?: number;
    reviewsGiven?: number;
    responseRate?: number;
  };
  
  // Role-specific data
  hostData?: HostData;
  managerData?: ManagerData;
  serviceProviderData?: ServiceProviderData;
  financeOpsData?: FinanceOpsData;
}

/**
 * Host-specific data
 */
export interface HostData {
  verified: boolean;
  rating: number;
  totalProperties: number;
  totalBookings: number;
  joinedDate: Timestamp;
  responseRate: number; // percentage
  responseTime: number; // in minutes
  languages: Language[];
  about?: string;
}

/**
 * Manager-specific data
 */
export interface ManagerData {
  assignedProperties: ID[];
  permissions: ManagerPermission[];
  supervisor: ID; // admin who assigned this manager
  territory?: string;
}

/**
 * Service provider specific data
 */
export interface ServiceProviderData {
  specialties: string[];
  activeJobs: number;
  completedJobs: number;
  averageResponseTimeHours?: number;
  serviceArea?: string;
  rating?: number;
}

/**
 * Finance operations specific data
 */
export interface FinanceOpsData {
  permissions: Array<'audit_payments' | 'approve_refunds' | 'manage_escrow' | 'handle_disputes'>;
  managedTransactionVolume?: number;
  openDisputes?: number;
  pendingRefunds?: number;
}

/**
 * Manager permissions
 */
export type ManagerPermission = 
  | 'view_properties' 
  | 'edit_properties' 
  | 'manage_bookings' 
  | 'view_analytics' 
  | 'handle_support';

// ========================================
// Property Types
// ========================================

/**
 * Property type definitions
 */
export type PropertyType = 'house' | 'apartment' | 'land' | 'shop' | 'office' | 'warehouse' | 'commercial' | string;

/**
 * Property status definitions
 */
export type PropertyStatus = 'available' | 'rented' | 'sold' | 'maintenance' | 'pending' | string;

/**
 * Property listing type
 */
export type ListingType = 'rent' | 'sale' | 'lease' | 'purchase' | string;

/**
 * Address interface
 */
export interface Address {
  address?: string;
  street?: string;
  city: string;
  region: string;
  country: string;
  postalCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  landmark?: string;
}

/**
 * Property features interface
 */
export interface PropertyFeatures {
  bedrooms?: number;
  bathrooms?: number;
  area: number; // in square meters
  lotSize?: number; // for land/houses
  floors?: number;
  parking?: boolean;
  parkingSpaces?: number;
  furnished?: boolean;
  petFriendly?: boolean;
  garden?: boolean;
  balcony?: boolean;
  elevator?: boolean;
  accessibility?: boolean;
}

/**
 * Property amenities
 */
export type PropertyAmenity = string;

/**
 * Property media interface
 */
export interface PropertyMedia {
  id: ID;
  url: string;
  type: 'image' | 'video' | '360_tour';
  caption?: string;
  order: number;
  thumbnail?: string;
}

/**
 * Property pricing interface
 */
export interface PropertyPricing {
  amount: number;
  currency: Currency;
  period?: 'monthly' | 'yearly' | 'daily'; // for rentals
  deposit?: number;
  commission?: number; // for agents
  negotiable: boolean;
  priceHistory?: Array<{
    amount: number;
    date: Timestamp;
    reason?: string;
  }>;
}

/**
 * Complete property interface
 */
export interface Property {
  id: ID;
  title: string;
  description: string;
  type: PropertyType;
  listingType: ListingType;
  status: PropertyStatus;
  pricing: PropertyPricing;
  location: Address | string;
  features: PropertyFeatures;
  amenities: PropertyAmenity[];
  media: PropertyMedia[];
  
  // Ownership and management
  ownerId: ID;
  managerId?: ID; // if managed by a property manager
  agentId?: ID; // if listed through an agent
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;
  
  // Engagement metrics
  views: number;
  favorites: number;
  inquiries: number;
  
  // SEO and searchability
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  
  // Legacy support (for backward compatibility)
  price?: number; // deprecated, use pricing.amount
  currency?: Currency; // deprecated, use pricing.currency
  images?: string[]; // deprecated, use media
  
  // Additional compatibility fields
  rating?: number;
  reviews?: number;
  featured?: boolean;
  available?: boolean;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  owner?: string;
  coordinates?: [number, number];
  relevanceScore?: number;
}

// ========================================
// Booking and Transaction Types
// ========================================

/**
 * Booking status definitions
 */
export type BookingStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'cancelled' 
  | 'completed' 
  | 'in_progress'
  | 'disputed'
  | 'active'
  | string;

/**
 * Payment status definitions
 */
export type PaymentStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'refunded'
  | 'partial_refund';

/**
 * Payment method definitions
 */
export type PaymentMethod = 
  | 'card' 
  | 'mobile_money' 
  | 'bank_transfer' 
  | 'cash'
  | 'paystack';

/**
 * Booking interface
 */
export interface Booking {
  id: ID;
  propertyId: ID;
  userId: ID;
  hostId: ID;
  
  // Booking details
  startDate: Timestamp;
  endDate: Timestamp;
  totalAmount: number;
  currency: Currency;
  
  // Status and metadata
  status: BookingStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  confirmationCode: string;
  
  // Payment information
  paymentId?: ID;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  
  // Additional details
  guestCount?: number;
  specialRequests?: string;
  propertyTitle?: string;
  propertyImage?: string;
  type?: 'rent' | 'purchase' | 'lease' | string;
  amount?: number;
  duration?: string;
  paymentReference?: string;
  
  // Review status
  guestReviewId?: ID;
  hostReviewId?: ID;
}

/**
 * Payment transaction interface
 */
export interface Payment {
  id: ID;
  bookingId: ID;
  userId: ID;
  
  // Payment details
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  status: PaymentStatus;
  
  // External payment reference
  externalTransactionId?: string;
  paymentGateway: 'paystack' | 'stripe' | 'flutterwave';
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  paidAt?: Timestamp;
  
  // Additional info
  fees: {
    platform: number;
    gateway: number;
    tax: number;
  };
  
  // Refund information
  refunds?: Array<{
    id: ID;
    amount: number;
    reason: string;
    processedAt: Timestamp;
  }>;
}

// ========================================
// Communication Types
// ========================================

/**
 * Chat message types
 */
export type MessageType = 'text' | 'image' | 'file' | 'system' | 'location' | 'audio' | 'video' | string;

/**
 * Chat room types
 */
export type ChatRoomType = 'direct' | 'group' | 'support' | 'property_inquiry';

/**
 * Message status
 */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

/**
 * Chat message interface
 */
export interface ChatMessage {
  id: ID;
  roomId: ID;
  senderId: ID;
  senderName?: string;
  senderAvatar?: string;
  
  // Message content
  type: MessageType;
  content: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    fileUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
    coordinates?: { lat: number; lng: number };
    replyTo?: ID; // for threaded conversations
  };
  fileUrl?: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  mimeType?: string;
  edited?: boolean;
  
  // Status and timing
  status: MessageStatus;
  createdAt: Timestamp;
  timestamp?: Timestamp;
  updatedAt?: Timestamp;
  editedAt?: Timestamp;
  
  // Reactions and engagement
  reactions?: Array<{
    userId: ID;
    reaction: string; // emoji
  }>;
  
  // System messages
  systemType?: 'user_joined' | 'user_left' | 'booking_created' | 'booking_confirmed';
}

/**
 * Chat room interface
 */
export interface ChatRoom {
  id: ID;
  type: ChatRoomType;
  name?: string; // for group chats
  description?: string;
  avatar?: string;
  
  // Participants
  participants: ID[];
  admins: ID[]; // can manage the room
  
  // Room settings
  settings: {
    allowFileUploads: boolean;
    allowGuestMessages: boolean;
    autoDeleteAfterDays?: number;
    maxParticipants?: number;
  };
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastMessageAt?: Timestamp;
  
  // Related data
  propertyId?: ID; // for property inquiries
  bookingId?: ID; // for booking-related chats
  
  // Message management
  lastMessage?: ChatMessage;
  unreadCount?: Record<ID, number> | number; // unread count per user
}

// ========================================
// Notification Types
// ========================================

/**
 * Notification types
 */
export type NotificationType = 
  | 'booking_request'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'payment_received'
  | 'payment_failed'
  | 'message_received'
  | 'property_inquiry'
  | 'review_received'
  | 'system_update'
  | 'account_activity'
  | 'marketing'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'chat'
  | 'booking'
  | 'property'
  | 'system'
  | string;

/**
 * Notification priority
 */
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent' | 'normal' | string;

/**
 * Notification interface
 */
export interface Notification {
  id: ID;
  userId: ID;
  
  // Notification content
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  
  // Action data
  actionUrl?: string;
  actionData?: Record<string, any>;
  
  // Status
  read: boolean;
  readAt?: Timestamp;
  
  // Metadata
  createdAt?: Timestamp;
  timestamp: Timestamp;
  expiresAt?: Timestamp;
  category: string;
  
  // Push notification data
  pushSent?: boolean;
  emailSent?: boolean;
  smsSent?: boolean;
}

// ========================================
// Analytics and Reporting Types
// ========================================

/**
 * Analytics time range
 */
export type AnalyticsTimeRange = '24h' | '7d' | '30d' | '90d' | '1y' | 'all';

/**
 * Property analytics interface
 */
export interface PropertyAnalytics {
  propertyId: ID;
  period: {
    start: Timestamp;
    end: Timestamp;
  };
  
  // Engagement metrics
  views: number;
  uniqueViews: number;
  favorites: number;
  inquiries: number;
  bookings: number;
  
  // Performance metrics
  conversionRate: number; // inquiries to bookings
  averageStayDuration: number; // in days
  occupancyRate: number; // percentage
  
  // Revenue metrics
  totalRevenue: number;
  averageBookingValue: number;
  revenuePerView: number;
  
  // Trends
  trends: {
    views: Array<{ date: string; value: number }>;
    bookings: Array<{ date: string; value: number }>;
    revenue: Array<{ date: string; value: number }>;
  };
}

/**
 * User analytics interface
 */
export interface UserAnalytics {
  userId: ID;
  period: {
    start: Timestamp;
    end: Timestamp;
  };
  
  // Activity metrics
  propertiesViewed: number;
  searchesPerformed: number;
  messagesExchanged: number;
  bookingsMade: number;
  
  // Engagement metrics
  sessionsCount: number;
  avgSessionDuration: number; // in minutes
  favoriteProperties: number;
  
  // Financial metrics (for hosts)
  totalEarnings?: number;
  averageBookingValue?: number;
  
  // Geographic data
  topCities: Array<{ city: string; count: number }>;
  topPropertyTypes: Array<{ type: PropertyType; count: number }>;
}

// ========================================
// Search and Filter Types
// ========================================

/**
 * Search filters interface
 */
export interface SearchFilters {
  // Location filters
  city?: string;
  region?: string;
  coordinates?: {
    lat: number;
    lng: number;
    radius: number; // in kilometers
  };
  
  // Property filters
  type?: PropertyType[];
  listingType?: ListingType[];
  priceRange?: {
    min: number;
    max: number;
    currency: Currency;
  };
  
  // Feature filters
  bedrooms?: {
    min?: number;
    max?: number;
  };
  bathrooms?: {
    min?: number;
    max?: number;
  };
  area?: {
    min?: number;
    max?: number;
  };
  
  // Amenity filters
  amenities?: PropertyAmenity[];
  features?: Array<keyof PropertyFeatures>;
  
  // Availability filters
  availableFrom?: Timestamp;
  availableTo?: Timestamp;
  
  // Other filters
  furnished?: boolean;
  petFriendly?: boolean;
  verified?: boolean; // verified properties only
  
  // Sorting
  sortBy?: 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc' | 'popularity' | 'distance';
  
  // Pagination
  page?: number;
  limit?: number;
}

/**
 * Search result interface
 */
export interface SearchResult {
  properties: Property[];
  totalCount: number;
  filters: SearchFilters;
  suggestions?: string[];
  facets?: {
    cities: Array<{ name: string; count: number }>;
    types: Array<{ type: PropertyType; count: number }>;
    priceRanges: Array<{ range: string; count: number }>;
  };
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

// ========================================
// Application State Types
// ========================================

/**
 * Application state definitions
 */
export type AppState = 
  | 'splash'
  | 'auth-landing'
  | 'login'
  | 'signup'
  | 'main'
  | 'marketplace'
  | 'dashboard'
  | 'admin'
  | 'profile'
  | 'chat'
  | 'map'
  | 'payments'
  | 'billing'
  | 'help'
  | 'privacy'
  | 'property-details'
  | 'profile-settings'
  | 'property-management'
  | 'directions'
  | 'tour-scheduler'
  | 'offline-maps';

/**
 * Extended application state for compatibility
 */
export type ExtendedAppState = AppState;

/**
 * Application context interface
 */
export interface AppContextType {
  // Current state
  appState: AppState;
  currentUser: User | null;
  
  // Data
  properties: Property[];
  selectedProperty: Property | null;
  
  // UI state
  loading: boolean;
  error: string | null;
  
  // Actions
  setAppState: (state: AppState) => void;
  setCurrentUser: (user: User | null) => void;
  setSelectedProperty: (property: Property | null) => void;
}

// ========================================
// API Types
// ========================================

/**
 * API endpoint definitions
 */
export interface ApiEndpoints {
  // Authentication
  login: { method: 'POST'; path: '/auth/login' };
  signup: { method: 'POST'; path: '/auth/signup' };
  logout: { method: 'POST'; path: '/auth/logout' };
  refresh: { method: 'POST'; path: '/auth/refresh' };
  
  // Properties
  getProperties: { method: 'GET'; path: '/properties' };
  getProperty: { method: 'GET'; path: '/properties/:id' };
  createProperty: { method: 'POST'; path: '/properties' };
  updateProperty: { method: 'PUT'; path: '/properties/:id' };
  deleteProperty: { method: 'DELETE'; path: '/properties/:id' };
  
  // Bookings
  createBooking: { method: 'POST'; path: '/bookings' };
  getBookings: { method: 'GET'; path: '/bookings' };
  getBooking: { method: 'GET'; path: '/bookings/:id' };
  updateBooking: { method: 'PUT'; path: '/bookings/:id' };
  
  // Payments
  createPayment: { method: 'POST'; path: '/payments' };
  getPayments: { method: 'GET'; path: '/payments' };
  processRefund: { method: 'POST'; path: '/payments/:id/refund' };
  
  // Chat
  getRooms: { method: 'GET'; path: '/chat/rooms' };
  getRoom: { method: 'GET'; path: '/chat/rooms/:id' };
  getMessages: { method: 'GET'; path: '/chat/rooms/:id/messages' };
  sendMessage: { method: 'POST'; path: '/chat/rooms/:id/messages' };
  
  // Notifications
  getNotifications: { method: 'GET'; path: '/notifications' };
  markAsRead: { method: 'PUT'; path: '/notifications/:id/read' };
  
  // Analytics
  getPropertyAnalytics: { method: 'GET'; path: '/analytics/properties/:id' };
  getUserAnalytics: { method: 'GET'; path: '/analytics/users/:id' };
  
  // Search
  search: { method: 'GET'; path: '/search' };
  suggest: { method: 'GET'; path: '/search/suggest' };
}

// ========================================
// Configuration Types
// ========================================

/**
 * Application configuration interface
 */
export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
  };
  
  supabase: {
    url: string;
    anonKey: string;
  };
  
  maps: {
    googleApiKey?: string;
    mapboxAccessToken?: string;
    displayProvider?: 'google' | 'mapbox' | 'fallback';
    defaultCenter: { lat: number; lng: number };
    defaultZoom: number;
  };
  
  payments: {
    paystack: {
      publicKey: string;
      testMode: boolean;
    };
  };
  
  features: {
    enableChat: boolean;
    enablePWA: boolean;
    enableAnalytics: boolean;
    enablePushNotifications: boolean;
  };
  
  ui: {
    defaultTheme: Theme;
    defaultLanguage: Language;
    enableThemeToggle: boolean;
  };
}

// ========================================
// Error Types
// ========================================

/**
 * Application error types
 */
export type ErrorType = 
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'not_found'
  | 'server_error'
  | 'rate_limit'
  | 'unknown'
  | 'database'
  | 'websocket'
  | 'payment'
  | 'file_upload'
  | 'geolocation'
  | 'pwa';

/**
 * Application error interface
 */
export interface AppError {
  type: ErrorType;
  message: string;
  code?: string | number;
  details?: any;
  timestamp: Timestamp;
  userId?: ID;
  action?: string;
  stack?: string;
}

export type ErrorCategory = ErrorType;

export interface ErrorDetails {
  code?: string | number;
  message: string;
  stack?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category: ErrorCategory;
  context: ErrorContext;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
}

export interface ErrorContext {
  action?: string;
  userId?: ID;
  route?: string;
  component?: string;
  function?: string;
  errorId?: string;
  retryCount?: number;
  additionalData?: any;
  metadata?: Record<string, any>;
  url?: string;
}

export interface AnalyticsEvent {
  name: string;
  category: string;
  properties?: Record<string, any>;
  timestamp?: Timestamp;
}

export interface ValidationRule {
  field: string;
  message: string;
  validate?: (value: any) => boolean;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
}

export interface FormFieldError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: FormFieldError[];
  warnings?: any[];
}

export type AppView = 
  | 'marketplace' 
  | 'dashboard' 
  | 'admin' 
  | 'profile' 
  | 'chat' 
  | 'map' 
  | 'payments' 
  | 'billing'
  | 'help'
  | 'privacy'
  | 'property-details' 
  | 'profile-settings' 
  | 'property-management' 
  | 'directions' 
  | 'tour-scheduler' 
  | 'offline-maps'
  | 'verification';

/**
 * Property review interface
 */
export interface Review {
  id: ID;
  propertyId: ID;
  userId: ID;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string | Timestamp;
  helpful: number;
  verified: boolean;
  categories: {
    cleanliness: number;
    communication: number;
    checkIn: number;
    accuracy: number;
    location: number;
    value: number;
  };
}

// ========================================
// Export All Types
// ========================================

export type {
  // Utility types are already exported above
};

/**
 * Type guards for runtime type checking
 */
export const isUser = (obj: any): obj is User => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.role === 'string'
  );
};

export const isProperty = (obj: any): obj is Property => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.type === 'string' &&
    ['house', 'apartment', 'land', 'shop', 'office', 'warehouse'].includes(obj.type)
  );
};

export const isChatMessage = (obj: any): obj is ChatMessage => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.roomId === 'string' &&
    typeof obj.senderId === 'string' &&
    typeof obj.content === 'string'
  );
};

/**
 * Default values for common interfaces
 */
export const defaultUserPreferences: UserPreferences = {
  theme: 'system',
  language: 'en',
  notifications: {
    push: true,
    email: true,
    sms: false,
    marketing: false,
    inApp: true,
    soundEnabled: true,
    doNotDisturb: {
      enabled: false,
      startTime: '22:00',
      endTime: '07:00',
    },
  },
  privacy: {
    showProfile: true,
    showActivity: false
  },
  display: {
    currency: 'GHS',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h'
  },
  security: {
    biometrics: {
      enabled: false,
      promptOnLaunch: false,
      allowDeviceCredentials: true,
    },
  },
};

export const defaultSearchFilters: SearchFilters = {
  sortBy: 'date_desc',
  page: 1,
  limit: 20
};

/**
 * Simple property filters interface for compatibility
 */
export interface PropertyFilters {
  type: string[];
  priceRange: [number, number];
  location: string[];
  bedrooms: Array<number | string>;
  bathrooms: Array<number | string>;
  areaRange: [number, number];
  amenities: string[];
  availability: string[];
}

/**
 * Type utility functions
 */
export const createEmptyPagination = (): PaginationMeta => ({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false
});

export const createApiResponse = <T>(
  data?: T,
  success: boolean = true,
  error?: string,
  message?: string
): ApiResponse<T> => ({
  success,
  data,
  error,
  message,
  timestamp: new Date().toISOString()
});

/**
 * Development Notes:
 * 
 * 1. These types provide comprehensive coverage of the PropertyHub application
 * 2. All interfaces are designed to be extensible and backward-compatible
 * 3. Type guards are provided for runtime type checking
 * 4. Default values are provided for commonly used interfaces
 * 5. The types support both the current implementation and future enhancements
 * 6. JSDoc comments provide context for better IDE support
 * 7. Utility types help with common patterns like optional fields and API responses
 */
/**
 * Interface for property booking actions before finalization
 */
export interface PendingBooking {
  property: Property;
  action: 'rent' | 'buy' | 'lease';
}
