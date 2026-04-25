import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../../services/supabaseApi';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import type { User } from '../../types';
import { defaultAuthPreferences, mapSupabaseUserToAppUser } from '../../utils/authUser';

interface AuthProviderState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
}

const AUTH_STORAGE_KEYS = ['propertyhub_user', 'propertyHubUser', 'currentUser'] as const;

const readCachedUser = (): User | null => {
  if (typeof window === 'undefined') return null;

  for (const key of AUTH_STORAGE_KEYS) {
    const value = window.localStorage.getItem(key);
    if (!value) continue;

    try {
      return JSON.parse(value) as User;
    } catch {
      window.localStorage.removeItem(key);
    }
  }

  return null;
};

const persistCachedUser = (user: User): void => {
  if (typeof window === 'undefined') return;

  const serializedUser = JSON.stringify(user);
  AUTH_STORAGE_KEYS.forEach((key) => window.localStorage.setItem(key, serializedUser));
};

const clearCachedUser = (): void => {
  if (typeof window === 'undefined') return;
  AUTH_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
};

const AuthContext = createContext<AuthProviderState>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  register: async () => {},
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const cachedUser = readCachedUser();
        if (cachedUser && isMounted) {
          setUser(cachedUser);
        }

        if (!isSupabaseConfigured()) return;

        const { session, error } = await authService.getSession();
        if (error) throw error;

        if (session?.user && isMounted) {
          const { data: profile } = await authService.syncAuthUserProfile(session.user);
          const authenticatedUser = mapSupabaseUserToAppUser(session.user, profile);
          setUser(authenticatedUser);
          persistCachedUser(authenticatedUser);
        }
      } catch (error) {
        console.warn('Failed to initialize auth session:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void initializeAuth();

    if (!isSupabaseConfigured()) {
      return () => {
        isMounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        void (async () => {
          const { data: profile } = await authService.syncAuthUserProfile(session.user);
          const authenticatedUser = mapSupabaseUserToAppUser(session.user, profile);

          if (!isMounted) return;

          setUser(authenticatedUser);
          persistCachedUser(authenticatedUser);
          setIsLoading(false);
        })();

        return;
      }

      if (event === 'SIGNED_OUT' && isMounted) {
        setUser(null);
        clearCachedUser();
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase auth is not configured.');
    }

    try {
      setIsLoading(true);
      const { user: authUser, profile, error } = await authService.signin(email, password);
      if (error) throw error;
      if (!authUser) throw new Error('Unable to sign in.');

      const authenticatedUser = mapSupabaseUserToAppUser(authUser, profile);
      setUser(authenticatedUser);
      persistCachedUser(authenticatedUser);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase auth is not configured.');
    }

    try {
      setIsLoading(true);
      const { user: authUser, session, profile, error } = await authService.signup(email, password, {
        name,
        role: 'user',
        status: 'active',
        rating: 0,
        verified: false,
        preferences: defaultAuthPreferences,
      });

      if (error) throw error;
      if (!authUser) throw new Error('Unable to create account.');

      if (session) {
        const authenticatedUser = mapSupabaseUserToAppUser(authUser, profile, 'user');
        setUser(authenticatedUser);
        persistCachedUser(authenticatedUser);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (isSupabaseConfigured()) {
        await authService.signout();
      }
    } finally {
      setUser(null);
      clearCachedUser();
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
