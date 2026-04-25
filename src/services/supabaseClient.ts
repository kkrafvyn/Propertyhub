/**
 * Supabase Client Initialization
 * 
 * Central configuration for Supabase client initialization
 * Handles authentication, real-time subscriptions, and database operations
 * 
 * @author PropertyHub Team
 */

import { createClient } from '@supabase/supabase-js';
import { publicAnonKey, supabaseUrl } from './supabaseProject';

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  publicAnonKey;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    'Supabase URL or Publishable Key not configured. Some features may not work.',
    { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabasePublishableKey }
  );
}

/**
 * Supabase client instance
 * Used for all database, authentication, and real-time operations
 */
export const supabase = createClient(
  supabaseUrl || '',
  supabasePublishableKey || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : ({} as any),
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

/**
 * Check if Supabase is properly configured
 */
export const isSupabaseConfigured = (): boolean => {
  return !!supabaseUrl && !!supabasePublishableKey;
};

export default supabase;
