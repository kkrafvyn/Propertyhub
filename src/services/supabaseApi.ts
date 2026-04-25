import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type { 
  UserDB, 
  PropertyDB, 
  BookingDB, 
  ReviewDB, 
  MessageDB,
  PaymentDB,
  NotificationDB 
} from '../types/database';
import {
  buildAuthAvatar,
  buildAuthDisplayName,
  buildAuthRole,
  defaultAuthPreferences,
} from '../utils/authUser';

export type OAuthProvider = 'google' | 'apple';

/**
 * Authentication Service
 */
export const authService = {
  /**
   * Sign up with email and password
   */
  async signup(email: string, password: string, userData: Partial<UserDB>) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.name,
            name: userData.name,
            role: userData.role,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        return { user: null, session: authData.session, profile: null, error: null };
      }

      if (!authData.session) {
        return { user: authData.user, session: null, profile: null, error: null };
      }

      const { data: profile, error: profileError } = await authService.syncAuthUserProfile(
        authData.user,
        userData.role,
        userData
      );

      if (profileError) {
        console.warn('Profile sync after signup failed, continuing with auth user only:', profileError);
        return { user: authData.user, session: authData.session, profile: null, error: null };
      }

      return { user: authData.user, session: authData.session, profile, error: null };
    } catch (error) {
      return { user: null, session: null, profile: null, error };
    }
  },

  /**
   * Sign in with email and password
   */
  async signin(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: profile, error: profileError } = data.user
        ? await authService.syncAuthUserProfile(data.user)
        : { data: null, error: null };

      if (profileError) {
        console.warn('Profile sync after sign-in failed, continuing with auth user only:', profileError);
      }

      return { user: data.user, session: data.session, profile, error: null };
    } catch (error) {
      return { user: null, session: null, profile: null, error };
    }
  },

  /**
   * Sign in with Google or Apple OAuth
   */
  async signInWithOAuth(provider: OAuthProvider, redirectTo?: string) {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          scopes: provider === 'apple' ? 'name email' : 'email profile',
          queryParams:
            provider === 'google'
              ? {
                  access_type: 'offline',
                  prompt: 'consent',
                }
              : undefined,
        },
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Sign out current user
   */
  async signout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  /**
   * Get current session
   */
  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { session: data.session, error: null };
    } catch (error) {
      return { session: null, error };
    }
  },

  /**
   * Get current user
   */
  async getUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { user, error: null };
    } catch (error) {
      return { user: null, error };
    }
  },

  /**
   * Resend signup verification email
   */
  async resendSignupVerification(email: string) {
    try {
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Send a password reset email
   */
  async sendPasswordReset(email: string) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Ensure an authenticated Supabase user also has an app profile row
   */
  async syncAuthUserProfile(
    authUser: SupabaseAuthUser,
    preferredRole?: UserDB['role'],
    profileOverrides?: Partial<UserDB>
  ) {
    try {
      const timestamp = new Date().toISOString();
      const { data: existingProfile, error: existingProfileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (existingProfileError) throw existingProfileError;

      const baseProfile = {
        email: profileOverrides?.email || authUser.email || existingProfile?.email || '',
        name: profileOverrides?.name || existingProfile?.name || buildAuthDisplayName(authUser),
        role:
          profileOverrides?.role ||
          existingProfile?.role ||
          preferredRole ||
          buildAuthRole(authUser) ||
          'user',
        status: profileOverrides?.status || existingProfile?.status || 'active',
        avatar: profileOverrides?.avatar || buildAuthAvatar(authUser) || existingProfile?.avatar,
        bio: profileOverrides?.bio || existingProfile?.bio,
        phone: profileOverrides?.phone || existingProfile?.phone,
        verified:
          profileOverrides?.verified ?? existingProfile?.verified ?? Boolean(authUser.email_confirmed_at),
        rating: profileOverrides?.rating ?? existingProfile?.rating ?? 0,
        response_time: profileOverrides?.response_time ?? existingProfile?.response_time,
        response_rate: profileOverrides?.response_rate ?? existingProfile?.response_rate,
        total_properties: profileOverrides?.total_properties ?? existingProfile?.total_properties,
        total_bookings: profileOverrides?.total_bookings ?? existingProfile?.total_bookings,
        languages: profileOverrides?.languages || existingProfile?.languages,
        preferences: profileOverrides?.preferences || existingProfile?.preferences || defaultAuthPreferences,
        updated_at: timestamp,
        last_login_at: timestamp,
      };

      if (existingProfile) {
        const { data, error } = await supabase
          .from('users')
          .update(baseProfile)
          .eq('id', authUser.id)
          .select()
          .single();

        if (error) throw error;
        return { data, error: null };
      }

      const { data, error } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          ...baseProfile,
          created_at: timestamp,
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

/**
 * User Profile Service
 */
export const userService = {
  /**
   * Get user profile by ID
   */
  async getProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<UserDB>) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get user by email
   */
  async getUserByEmail(email: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

/**
 * Property Service
 */
export const propertyService = {
  /**
   * Get all properties with optional filters
   */
  async getProperties(filters?: {
    location?: string;
    priceMin?: number;
    priceMax?: number;
    type?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      let query = supabase.from('properties').select('*');

      if (filters?.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.priceMin) {
        query = query.gte('price', filters.priceMin);
      }
      if (filters?.priceMax) {
        query = query.lte('price', filters.priceMax);
      }

      const limit = filters?.limit || 20;
      const offset = filters?.offset || 0;

      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;
      return { data, count, error: null };
    } catch (error) {
      return { data: null, count: null, error };
    }
  },

  /**
   * Get property by ID
   */
  async getProperty(propertyId: string) {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Create new property
   */
  async createProperty(userId: string, propertyData: Partial<PropertyDB>) {
    try {
      const { data, error } = await supabase
        .from('properties')
        .insert({
          owner_id: userId,
          ...propertyData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Update property
   */
  async updateProperty(propertyId: string, updates: Partial<PropertyDB>) {
    try {
      const { data, error } = await supabase
        .from('properties')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', propertyId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Delete property
   */
  async deleteProperty(propertyId: string) {
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  /**
   * Get properties by owner
   */
  async getPropertiesByOwner(userId: string) {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

/**
 * Booking Service
 */
export const bookingService = {
  /**
   * Create booking
   */
  async createBooking(bookingData: Partial<BookingDB>) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          ...bookingData,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get booking by ID
   */
  async getBooking(bookingId: string) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get user's bookings
   */
  async getUserBookings(userId: string) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .order('check_in', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Update booking status
   */
  async updateBookingStatus(bookingId: string, status: string) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

/**
 * Review Service
 */
export const reviewService = {
  /**
   * Create review
   */
  async createReview(reviewData: Partial<ReviewDB>) {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          ...reviewData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get reviews for property
   */
  async getPropertyReviews(propertyId: string) {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get reviews for user (as reviewer)
   */
  async getUserReviews(userId: string) {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('reviewer_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

/**
 * Message Service
 */
export const messageService = {
  /**
   * Send message
   */
  async sendMessage(messageData: Partial<MessageDB>) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          ...messageData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get conversation messages
   */
  async getConversationMessages(userId1: string, userId2: string) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get user conversations
   */
  async getUserConversations(userId: string) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by conversation partner
      const conversations = data?.reduce((acc: any, msg: any) => {
        const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        if (!acc[partnerId]) {
          acc[partnerId] = [];
        }
        acc[partnerId].push(msg);
        return acc;
      }, {});

      return { data: conversations, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string) {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },
};

export default {
  auth: authService,
  users: userService,
  properties: propertyService,
  bookings: bookingService,
  reviews: reviewService,
  messages: messageService,
};
