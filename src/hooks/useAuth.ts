/**
 * useAuth Hook
 * 
 * Custom React hook for authentication operations using Supabase
 * Provides sign up, sign in, sign out, and session management
 * 
 * @author PropertyHub Team
 */

import { useCallback, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { authService } from '../services/supabaseApi';
import { supabase } from '../services/supabaseClient';
import type { UserDB } from '../types/database';

export interface AuthState {
  user: UserDB | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
}

export interface UseAuthReturn extends AuthState {
  signup: (email: string, password: string, userData: Partial<UserDB>) => Promise<void>;
  signin: (email: string, password: string) => Promise<void>;
  signout: () => Promise<void>;
  isAuthenticated: boolean;
  clearError: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  /**
   * Check for existing session on mount
   */
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { session, error } = await authService.getSession();
        if (error) throw error;

        if (session?.user?.id) {
          const { user, error: userError } = await authService.getUser();
          if (userError) throw userError;
          setState({
            user: user as unknown as UserDB,
            session,
            loading: false,
            error: null,
          });
        } else {
          setState({
            user: null,
            session: null,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        setState({
          user: null,
          session: null,
          loading: false,
          error: error instanceof Error ? error : new Error('Failed to check session'),
        });
      }
    };

    checkSession();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { user, error } = await authService.getUser();
        setState({
          user: user as unknown as UserDB,
          session,
          loading: false,
          error: error instanceof Error ? error : null,
        });
      } else {
        setState({
          user: null,
          session: null,
          loading: false,
          error: null,
        });
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signup = useCallback(
    async (email: string, password: string, userData: Partial<UserDB>) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const { user, error } = await authService.signup(email, password, userData);
        if (error) throw error;

        setState({
          user: user as unknown as UserDB,
          session: null,
          loading: false,
          error: null,
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error : new Error('Signup failed'),
        }));
        throw error;
      }
    },
    []
  );

  const signin = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { user, session, error } = await authService.signin(email, password);
      if (error) throw error;

      setState({
        user: user as unknown as UserDB,
        session,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error : new Error('Sign in failed'),
      }));
      throw error;
    }
  }, []);

  const signout = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await authService.signout();
      if (error) throw error;

      setState({
        user: null,
        session: null,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error : new Error('Sign out failed'),
      }));
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    signup,
    signin,
    signout,
    isAuthenticated: !!state.user && !!state.session,
    clearError,
  };
};

export default useAuth;
