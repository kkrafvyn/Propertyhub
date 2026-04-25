/**
 * useSupabase Hook
 * 
 * Custom React hook for real-time Supabase database subscriptions
 * Provides subscribe/unsubscribe functionality for database changes
 * 
 * @author PropertyHub Team
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { RealtimeMessage } from '../types/database';

export interface SubscriptionOptions {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  filter?: string;
}

export interface UseSupabaseSubscriptionReturn<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  isSubscribed: boolean;
}

/**
 * Hook for real-time Supabase subscriptions
 */
export const useSupabaseSubscription = <T extends Record<string, any>>(
  options: SubscriptionOptions
): UseSupabaseSubscriptionReturn<T> => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const subscription = supabase
      .channel(`${options.table}:${options.event || '*'}`)
      .on(
        'postgres_changes' as any,
        {
          event: options.event || '*',
          schema: options.schema || 'public',
          table: options.table,
          filter: options.filter,
        } as any,
        (payload: RealtimeMessage<T>) => {
          console.log(`Received ${payload.type} event:`, payload);

          if (payload.type === 'INSERT' && payload.record) {
            setData((prev) => [...prev, payload.record as T]);
          } else if (payload.type === 'UPDATE' && payload.record) {
            setData((prev) =>
              prev.map((item) =>
                (item as any).id === (payload.record as any).id ? (payload.record as T) : item
              )
            );
          } else if (payload.type === 'DELETE' && payload.old_record) {
            setData((prev) =>
              prev.filter((item) => (item as any).id !== (payload.old_record as any)?.id)
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
          setLoading(false);
        } else if (status === 'CHANNEL_ERROR') {
          setError(new Error('Failed to subscribe to channel'));
          setLoading(false);
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [options.table, options.event, options.schema, options.filter]);

  return {
    data,
    loading,
    error,
    isSubscribed,
  };
};

/**
 * Hook for fetching and watching a specific Supabase table
 */
export const useSupabaseQuery = async <T extends Record<string, any>>(
  table: string,
  select?: string
) => {
  try {
    const query = supabase.from(table).select(select || '*');
    const { data, error } = await query;

    if (error) throw error;
    return data as any as T[];
  } catch (error) {
    console.error(`Error querying ${table}:`, error);
    return [];
  }
};

export default useSupabaseSubscription;
