import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { backendApiRequest } from './backendApi';
import type { 
  UserDB, 
  PropertyDB, 
  BookingDB, 
  ReviewDB, 
  MessageDB,
  PaymentDB,
  NotificationDB,
  FavoriteDB,
  SearchHistoryDB,
  SavedSearchDB,
  PropertyAlertDB,
} from '../types/database';
import { envConfig } from '../utils/envConfig';
import {
  buildAuthAvatar,
  buildAuthDisplayName,
  buildAuthRole,
  defaultAuthPreferences,
} from '../utils/authUser';
import { normalizeUserRole } from '../utils/roleCapabilities';

export type OAuthProvider = 'google' | 'apple';

const hasBackendApi = (): boolean => Boolean(envConfig.API_URL);

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
          normalizeUserRole(
            profileOverrides?.role ||
              existingProfile?.role ||
              preferredRole ||
              buildAuthRole(authUser) ||
              'user'
          ),
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
 * Favorites / saved homes service
 */
export const favoriteService = {
  async getUserFavorites(userId: string) {
    try {
      if (hasBackendApi()) {
        const data = await backendApiRequest<FavoriteDB[]>(`/api/v1/favorites/${encodeURIComponent(userId)}`);
        return { data: data || [], error: null };
      }

      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: (data || []) as FavoriteDB[], error: null };
    } catch (error) {
      return { data: [] as FavoriteDB[], error };
    }
  },

  async addFavorite(userId: string, propertyId: string, note?: string) {
    try {
      if (hasBackendApi()) {
        const data = await backendApiRequest<FavoriteDB>('/api/v1/favorites', {
          method: 'POST',
          body: JSON.stringify({
            userId,
            propertyId,
            note,
          }),
        });
        return { data, error: null };
      }

      const { data, error } = await supabase
        .from('favorites')
        .upsert(
          {
            user_id: userId,
            property_id: propertyId,
            note,
            created_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,property_id',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return { data: data as FavoriteDB, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async removeFavorite(userId: string, propertyId: string) {
    try {
      if (hasBackendApi()) {
        await backendApiRequest(`/api/v1/favorites/${encodeURIComponent(propertyId)}`, {
          method: 'DELETE',
          body: JSON.stringify({ userId }),
        });
        return { error: null };
      }

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('property_id', propertyId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },
};

/**
 * Search persistence service
 */
export const searchService = {
  async getSearchHistory(userId: string, limit: number = 10) {
    try {
      if (hasBackendApi()) {
        const data = await backendApiRequest<SearchHistoryDB[]>(
          `/api/v1/search/history/${encodeURIComponent(userId)}?limit=${encodeURIComponent(String(limit))}`
        );
        return { data: data || [], error: null };
      }

      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data: (data || []) as SearchHistoryDB[], error: null };
    } catch (error) {
      return { data: [] as SearchHistoryDB[], error };
    }
  },

  async recordSearchHistory(
    userId: string,
    payload: {
      query: string;
      filters?: Record<string, any>;
      resultsCount?: number;
      clickedPropertyId?: string;
    }
  ) {
    try {
      if (hasBackendApi()) {
        const data = await backendApiRequest<SearchHistoryDB>('/api/v1/search/history', {
          method: 'POST',
          body: JSON.stringify({
            userId,
            query: payload.query,
            filters: payload.filters || {},
            resultsCount: payload.resultsCount,
            clickedPropertyId: payload.clickedPropertyId,
          }),
        });
        return { data, error: null };
      }

      const { data, error } = await supabase
        .from('search_history')
        .insert({
          user_id: userId,
          query: payload.query,
          filters: payload.filters || {},
          results_count: payload.resultsCount,
          clicked_property_id: payload.clickedPropertyId,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data: data as SearchHistoryDB, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async clearSearchHistory(userId: string) {
    try {
      if (hasBackendApi()) {
        await backendApiRequest(`/api/v1/search/history/${encodeURIComponent(userId)}`, {
          method: 'DELETE',
        });
        return { error: null };
      }

      const { error } = await supabase.from('search_history').delete().eq('user_id', userId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  async getSavedSearches(userId: string) {
    try {
      if (hasBackendApi()) {
        const data = await backendApiRequest<SavedSearchDB[]>(
          `/api/v1/search/saved/${encodeURIComponent(userId)}`
        );
        return { data: data || [], error: null };
      }

      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return { data: (data || []) as SavedSearchDB[], error: null };
    } catch (error) {
      return { data: [] as SavedSearchDB[], error };
    }
  },

  async createSavedSearch(
    userId: string,
    payload: {
      name: string;
      searchTerm?: string;
      filters?: Record<string, any>;
      resultsCount?: number;
      alertEnabled?: boolean;
      alertFrequency?: 'instant' | 'daily' | 'weekly';
    }
  ) {
    try {
      if (hasBackendApi()) {
        const data = await backendApiRequest<SavedSearchDB>('/api/v1/search/saved', {
          method: 'POST',
          body: JSON.stringify({
            userId,
            name: payload.name,
            searchTerm: payload.searchTerm,
            filters: payload.filters || {},
            resultsCount: payload.resultsCount || 0,
            alertEnabled: payload.alertEnabled || false,
            alertFrequency: payload.alertFrequency || 'daily',
          }),
        });
        return { data, error: null };
      }

      const timestamp = new Date().toISOString();
      const { data, error } = await supabase
        .from('saved_searches')
        .insert({
          user_id: userId,
          name: payload.name,
          search_term: payload.searchTerm,
          filters: payload.filters || {},
          results_count: payload.resultsCount || 0,
          alert_enabled: payload.alertEnabled || false,
          alert_frequency: payload.alertFrequency || 'daily',
          created_at: timestamp,
          updated_at: timestamp,
        })
        .select()
        .single();

      if (error) throw error;
      return { data: data as SavedSearchDB, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async deleteSavedSearch(savedSearchId: string) {
    try {
      if (hasBackendApi()) {
        await backendApiRequest(`/api/v1/search/saved/${encodeURIComponent(savedSearchId)}`, {
          method: 'DELETE',
        });
        return { error: null };
      }

      const { error } = await supabase.from('saved_searches').delete().eq('id', savedSearchId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  async updateSavedSearch(savedSearchId: string, updates: Partial<SavedSearchDB>) {
    try {
      if (hasBackendApi()) {
        const data = await backendApiRequest<SavedSearchDB>(
          `/api/v1/search/saved/${encodeURIComponent(savedSearchId)}`,
          {
            method: 'PUT',
            body: JSON.stringify(updates),
          }
        );
        return { data, error: null };
      }

      const { data, error } = await supabase
        .from('saved_searches')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', savedSearchId)
        .select()
        .single();

      if (error) throw error;
      return { data: data as SavedSearchDB, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getPropertyAlerts(userId: string) {
    try {
      if (hasBackendApi()) {
        const data = await backendApiRequest<PropertyAlertDB[]>(
          `/api/v1/search/alerts/${encodeURIComponent(userId)}`
        );
        return { data: data || [], error: null };
      }

      const { data, error } = await supabase
        .from('property_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return { data: (data || []) as PropertyAlertDB[], error: null };
    } catch (error) {
      return { data: [] as PropertyAlertDB[], error };
    }
  },

  async createPropertyAlert(
    userId: string,
    payload: {
      name: string;
      criteria?: Record<string, any>;
      frequency?: 'instant' | 'daily' | 'weekly';
      enabled?: boolean;
      matchCount?: number;
      email?: string;
      pushNotifications?: boolean;
    }
  ) {
    try {
      if (hasBackendApi()) {
        const data = await backendApiRequest<PropertyAlertDB>('/api/v1/search/alerts', {
          method: 'POST',
          body: JSON.stringify({
            userId,
            name: payload.name,
            criteria: payload.criteria || {},
            frequency: payload.frequency || 'daily',
            enabled: payload.enabled ?? true,
            matchCount: payload.matchCount || 0,
            email: payload.email,
            pushNotifications: payload.pushNotifications ?? true,
          }),
        });
        return { data, error: null };
      }

      const timestamp = new Date().toISOString();
      const { data, error } = await supabase
        .from('property_alerts')
        .insert({
          user_id: userId,
          name: payload.name,
          criteria: payload.criteria || {},
          frequency: payload.frequency || 'daily',
          enabled: payload.enabled ?? true,
          match_count: payload.matchCount || 0,
          email: payload.email,
          push_notifications: payload.pushNotifications ?? true,
          created_at: timestamp,
          updated_at: timestamp,
        })
        .select()
        .single();

      if (error) throw error;
      return { data: data as PropertyAlertDB, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async updatePropertyAlert(alertId: string, updates: Partial<PropertyAlertDB>) {
    try {
      if (hasBackendApi()) {
        const data = await backendApiRequest<PropertyAlertDB>(
          `/api/v1/search/alerts/${encodeURIComponent(alertId)}`,
          {
            method: 'PUT',
            body: JSON.stringify(updates),
          }
        );
        return { data, error: null };
      }

      const { data, error } = await supabase
        .from('property_alerts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;
      return { data: data as PropertyAlertDB, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async deletePropertyAlert(alertId: string) {
    try {
      if (hasBackendApi()) {
        await backendApiRequest(`/api/v1/search/alerts/${encodeURIComponent(alertId)}`, {
          method: 'DELETE',
        });
        return { error: null };
      }

      const { error } = await supabase.from('property_alerts').delete().eq('id', alertId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
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
      let query = supabase.from('properties').select('*', { count: 'exact' });

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

  /**
   * Search properties with richer filters
   */
  async searchProperties(params: {
    query?: string;
    filters?: {
      city?: string;
      region?: string;
      type?: string[];
      listingType?: string[];
      priceRange?: {
        min: number;
        max: number;
      };
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
      amenities?: string[];
      features?: string[];
      furnished?: boolean;
      petFriendly?: boolean;
      sortBy?: string;
      page?: number;
      limit?: number;
    };
  }) {
    try {
      let query = supabase.from('properties').select('*', { count: 'exact' });
      const normalizedQuery = params.query?.trim();

      if (normalizedQuery) {
        query = query.or(
          `title.ilike.%${normalizedQuery}%,description.ilike.%${normalizedQuery}%,location.ilike.%${normalizedQuery}%`
        );
      }

      if (params.filters?.city) {
        query = query.ilike('location', `%${params.filters.city}%`);
      }

      if (params.filters?.region) {
        query = query.ilike('location', `%${params.filters.region}%`);
      }

      if (params.filters?.type?.length) {
        query = query.in('type', params.filters.type);
      }

      if (params.filters?.listingType?.length) {
        query = query.in('listing_type', params.filters.listingType);
      }

      if (params.filters?.priceRange) {
        query = query
          .gte('price', params.filters.priceRange.min)
          .lte('price', params.filters.priceRange.max);
      }

      if (params.filters?.bedrooms?.min !== undefined) {
        query = query.gte('bedrooms', params.filters.bedrooms.min);
      }

      if (params.filters?.bedrooms?.max !== undefined) {
        query = query.lte('bedrooms', params.filters.bedrooms.max);
      }

      if (params.filters?.bathrooms?.min !== undefined) {
        query = query.gte('bathrooms', params.filters.bathrooms.min);
      }

      if (params.filters?.bathrooms?.max !== undefined) {
        query = query.lte('bathrooms', params.filters.bathrooms.max);
      }

      if (params.filters?.area?.min !== undefined) {
        query = query.gte('area', params.filters.area.min);
      }

      if (params.filters?.area?.max !== undefined) {
        query = query.lte('area', params.filters.area.max);
      }

      if (params.filters?.amenities?.length) {
        query = query.contains('amenities', params.filters.amenities);
      }

      if (params.filters?.features?.length) {
        params.filters.features.forEach((feature) => {
          query = query.contains('features', { [feature]: true });
        });
      }

      if (params.filters?.furnished !== undefined) {
        query = query.contains('features', { furnished: params.filters.furnished });
      }

      if (params.filters?.petFriendly !== undefined) {
        query = query.contains('features', { petFriendly: params.filters.petFriendly });
      }

      const sortBy = params.filters?.sortBy || 'date_desc';

      switch (sortBy) {
        case 'price_asc':
          query = query.order('price', { ascending: true, nullsFirst: false });
          break;
        case 'price_desc':
          query = query.order('price', { ascending: false, nullsFirst: false });
          break;
        case 'date_asc':
          query = query.order('created_at', { ascending: true });
          break;
        case 'popularity':
          query = query.order('views', { ascending: false, nullsFirst: false });
          break;
        case 'date_desc':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      const page = Math.max(params.filters?.page || 1, 1);
      const limit = Math.max(params.filters?.limit || 20, 1);
      const offset = (page - 1) * limit;

      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;
      return { data, count, error: null };
    } catch (error) {
      return { data: null, count: null, error };
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
      if (hasBackendApi()) {
        try {
          const data = await backendApiRequest<BookingDB>('/api/v1/bookings', {
            method: 'POST',
            body: JSON.stringify(bookingData),
          });
          return { data, error: null };
        } catch (backendError) {
          console.warn('Backend booking creation failed, falling back to Supabase:', backendError);
        }
      }

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
      if (hasBackendApi()) {
        try {
          const data = await backendApiRequest<BookingDB>(`/api/v1/bookings/${encodeURIComponent(bookingId)}`);
          return { data, error: null };
        } catch (backendError) {
          console.warn('Backend booking lookup failed, falling back to Supabase:', backendError);
        }
      }

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
      if (hasBackendApi()) {
        try {
          const data = await backendApiRequest<BookingDB[]>(
            `/api/v1/bookings/user/${encodeURIComponent(userId)}`
          );
          return { data, error: null };
        } catch (backendError) {
          console.warn('Backend booking history failed, falling back to Supabase:', backendError);
        }
      }

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
      if (hasBackendApi()) {
        try {
          const data = await backendApiRequest<BookingDB>(
            `/api/v1/bookings/${encodeURIComponent(bookingId)}/status`,
            {
              method: 'PATCH',
              body: JSON.stringify({ status }),
            }
          );
          return { data, error: null };
        } catch (backendError) {
          console.warn('Backend booking status update failed, falling back to Supabase:', backendError);
        }
      }

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
