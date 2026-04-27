/**
 * Enhanced App Context Hook
 * 
 * Provides centralized state management for PropertyHub with:
 * - Performance optimizations
 * - Error handling
 * - Loading states
 * - Real-time updates
 * 
 * @author PropertyHub Team
 * @version 1.0.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { User, Property, AppState, SearchFilters, Notification, Theme } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { authService, favoriteService, propertyService, userService } from '../services/supabaseApi';
import {
  fetchPropertyCatalog,
  fetchPropertySearch,
  filterPropertiesLocally,
  hasMeaningfulSearchFilters,
  propertyQueryKeys,
} from '../services/propertyCatalog';
import { consumePendingOAuthRole } from '../utils/auth';
import { mapSupabaseUserToAppUser } from '../utils/authUser';
import { applyTheme, normalizeTheme } from '../utils/theme';
import { normalizeProperty, normalizeProperties } from '../utils/propertyNormalization';
import {
  serializePropertyForCreate,
  serializePropertyForUpdate,
  serializeUserProfileUpdate,
} from '../utils/propertyPersistence';

// Safe check for browser APIs
const isBrowser = typeof window !== 'undefined';
const hasIntersectionObserver = isBrowser && 'IntersectionObserver' in window;
const hasLocalStorage = isBrowser && 'localStorage' in window;
const USER_STORAGE_KEYS = ['currentUser', 'propertyHubUser'] as const;
const FAVORITES_STORAGE_KEY = 'favoriteProperties';
const COMPARED_STORAGE_KEY = 'comparedProperties';
const RECENTLY_VIEWED_STORAGE_KEY = 'recentlyViewedProperties';
const REDUCED_MOTION_STORAGE_KEY = 'reducedMotion';
const PROPERTY_CATALOG_PARAMS = {
  limit: 100,
  offset: 0,
} as const;

const hydrateSupabaseUser = async (authUser: SupabaseAuthUser): Promise<User> => {
  const preferredRole = consumePendingOAuthRole();
  const { data: profile, error } = await authService.syncAuthUserProfile(authUser, preferredRole);

  if (error) {
    console.warn('Failed to sync Supabase profile, using auth metadata instead:', error);
  }

  return mapSupabaseUserToAppUser(authUser, profile, preferredRole);
};

const mergeUserProfile = (currentUser: User, profile: Record<string, any>): User => ({
  ...currentUser,
  email: typeof profile.email === 'string' ? profile.email : currentUser.email,
  name: typeof profile.name === 'string' ? profile.name : currentUser.name,
  role: typeof profile.role === 'string' ? profile.role : currentUser.role,
  status: typeof profile.status === 'string' ? profile.status : currentUser.status,
  avatar: typeof profile.avatar === 'string' ? profile.avatar : currentUser.avatar,
  bio: typeof profile.bio === 'string' ? profile.bio : currentUser.bio,
  phone: typeof profile.phone === 'string' ? profile.phone : currentUser.phone,
  verified: typeof profile.verified === 'boolean' ? profile.verified : currentUser.verified,
  preferences: profile.preferences || currentUser.preferences,
  updatedAt: typeof profile.updated_at === 'string' ? profile.updated_at : currentUser.updatedAt,
  lastLoginAt:
    typeof profile.last_login_at === 'string' ? profile.last_login_at : currentUser.lastLoginAt,
});

const readCachedUser = (): User | null => {
  if (!hasLocalStorage) return null;

  for (const key of USER_STORAGE_KEYS) {
    const cachedValue = localStorage.getItem(key);
    if (!cachedValue) continue;

    try {
      return JSON.parse(cachedValue) as User;
    } catch (error) {
      console.warn(`Failed to parse cached user data from ${key}:`, error);
      localStorage.removeItem(key);
    }
  }

  return null;
};

const persistCachedUser = (user: User): void => {
  if (!hasLocalStorage) return;

  try {
    const serializedUser = JSON.stringify(user);
    USER_STORAGE_KEYS.forEach((key) => localStorage.setItem(key, serializedUser));
  } catch (error) {
    console.warn('Failed to cache user data:', error);
  }
};

const clearCachedUser = (): void => {
  if (!hasLocalStorage) return;

  USER_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem('supabase.auth.token');
};

const readStoredArray = (key: string): string[] => {
  if (!hasLocalStorage) return [];

  try {
    const storedValue = localStorage.getItem(key);
    if (!storedValue) return [];

    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue) ? parsedValue.filter((value): value is string => typeof value === 'string') : [];
  } catch (error) {
    console.warn(`Failed to read stored array for ${key}:`, error);
    return [];
  }
};

const persistStringArray = (key: string, values: string[]): void => {
  if (!hasLocalStorage) return;

  try {
    localStorage.setItem(key, JSON.stringify(values));
  } catch (error) {
    console.warn(`Failed to persist array for ${key}:`, error);
  }
};

const readStoredBoolean = (key: string, fallback: boolean): boolean => {
  if (!hasLocalStorage) return fallback;

  try {
    const storedValue = localStorage.getItem(key);
    return storedValue === null ? fallback : JSON.parse(storedValue) === true;
  } catch (error) {
    console.warn(`Failed to read stored boolean for ${key}:`, error);
    return fallback;
  }
};

interface AppContextState {
  // Core state
  appState: AppState;
  currentUser: User | null;
  isAuthenticated: boolean;
  
  // Property data
  properties: Property[];
  selectedProperty: Property | null;
  favoriteProperties: string[];
  comparedProperties: string[];
  recentlyViewedProperties: string[];
  
  // Search state
  searchQuery: string;
  searchFilters: SearchFilters;
  searchResults: Property[];
  
  // UI state
  loading: boolean;
  error: string | null;
  notifications: Notification[];
  viewMode: 'grid' | 'list';
  sidebarOpen: boolean;
  theme: Theme;
  reducedMotion: boolean;
  
  // Performance state
  performanceMetrics: {
    loadTime: number;
    apiCalls: number;
    cacheHits: number;
    lastSync: string | null;
  };
  
  // Offline state
  isOnline: boolean;
  offlineData: {
    properties: Property[];
    lastUpdated: string;
  } | null;
}

interface AppContextActions {
  // Navigation actions
  setAppState: (state: AppState) => void;
  navigateWithHistory: (state: AppState) => void;
  goBack: () => void;
  
  // Auth actions
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  
  // Property actions
  addProperty: (property: Property) => Promise<void>;
  deleteProperty: (propertyId: string) => Promise<void>;
  setSelectedProperty: (property: Property | null) => void;
  toggleFavorite: (propertyId: string) => void;
  toggleCompareProperty: (propertyId: string) => void;
  clearComparedProperties: () => void;
  addRecentlyViewedProperty: (propertyId: string) => void;
  updateProperty: (propertyId: string, updates: Partial<Property>) => Promise<void>;
  refreshProperties: () => Promise<void>;
  
  // Search actions
  setSearchQuery: (query: string) => void;
  updateSearchFilters: (filters: Partial<SearchFilters>) => void;
  performSearch: () => Promise<void>;
  clearSearch: () => void;
  
  // UI actions
  setViewMode: (mode: 'grid' | 'list') => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  setReducedMotion: (enabled: boolean) => void;
  showNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  dismissNotification: (id: string) => void;
  clearError: () => void;
  
  // Performance actions
  trackPerformance: (metric: string, value: number) => void;
  clearCache: () => void;
  syncData: () => Promise<void>;
}

type AppContextType = AppContextState & AppContextActions;

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Default state with safe localStorage access
const getInitialState = (): AppContextState => ({
  appState: 'splash',
  currentUser: null,
  isAuthenticated: false,
  
  properties: [],
  selectedProperty: null,
  favoriteProperties: readStoredArray(FAVORITES_STORAGE_KEY),
  comparedProperties: readStoredArray(COMPARED_STORAGE_KEY),
  recentlyViewedProperties: readStoredArray(RECENTLY_VIEWED_STORAGE_KEY),
  
  searchQuery: '',
  searchFilters: {
    sortBy: 'date_desc',
    page: 1,
    limit: 20
  },
  searchResults: [],
  
  loading: true,
  error: null,
  notifications: [],
  viewMode: (hasLocalStorage ? localStorage.getItem('viewMode') as 'grid' | 'list' : null) || 'grid',
  sidebarOpen: false,
  theme: hasLocalStorage ? normalizeTheme(localStorage.getItem('theme')) : 'system',
  reducedMotion: readStoredBoolean(
    REDUCED_MOTION_STORAGE_KEY,
    isBrowser ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  ),
  
  performanceMetrics: {
    loadTime: 0,
    apiCalls: 0,
    cacheHits: 0,
    lastSync: null
  },
  
  isOnline: isBrowser ? navigator.onLine : true,
  offlineData: hasLocalStorage ? JSON.parse(localStorage.getItem('offlineData') || 'null') : null
});

// Custom hook
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};

// Navigation history management
class NavigationHistory {
  private history: AppState[] = [];
  private currentIndex = -1;
  
  push(state: AppState) {
    this.history = this.history.slice(0, this.currentIndex + 1);
    this.history.push(state);
    this.currentIndex = this.history.length - 1;
  }
  
  goBack(): AppState | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.history[this.currentIndex];
    }
    return null;
  }
  
  canGoBack(): boolean {
    return this.currentIndex > 0;
  }
}

// Context Provider Component
export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppContextState>(getInitialState);
  const [navigationHistory] = useState(() => new NavigationHistory());
  const queryClient = useQueryClient();
  
  // Track online status
  useEffect(() => {
    if (!isBrowser) return;
    
    const handleOnlineStatus = () => {
      setState(prev => ({ ...prev, isOnline: navigator.onLine }));
    };
    
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  useEffect(() => {
    if (!isBrowser) return;
    applyTheme(state.theme);
  }, [state.theme]);

  useEffect(() => {
    if (!isBrowser) return;
    document.documentElement.classList.toggle('reduce-motion', state.reducedMotion);
  }, [state.reducedMotion]);

  useEffect(() => {
    if (!isBrowser || state.theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system');

    handleChange();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [state.theme]);
  
  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      const startTime = performance.now();
      
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        // Check for cached data
        const cachedUser = readCachedUser();
        if (cachedUser) {
          setState(prev => ({ 
            ...prev, 
            currentUser: cachedUser, 
            isAuthenticated: true
          }));
        }

        if (isSupabaseConfigured()) {
          try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) throw sessionError;

            if (session?.user) {
              const authenticatedUser = await hydrateSupabaseUser(session.user);
              persistCachedUser(authenticatedUser);
              setState(prev => ({
                ...prev,
                currentUser: authenticatedUser,
                isAuthenticated: true,
              }));
            }
          } catch (error) {
            console.warn('Failed to restore Supabase session in app context:', error);
          }
        }
        
        // Load properties
        await loadProperties();
        
        const loadTime = performance.now() - startTime;
        setState(prev => ({
          ...prev,
          loading: false,
          performanceMetrics: {
            ...prev.performanceMetrics,
            loadTime,
            lastSync: new Date().toISOString()
          }
        }));
        
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize app'
        }));
      }
    };
    
    initializeApp();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return undefined;

    let isMounted = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        void (async () => {
          const authenticatedUser = await hydrateSupabaseUser(session.user);
          if (!isMounted) return;

          persistCachedUser(authenticatedUser);
          setState(prev => ({
            ...prev,
            currentUser: authenticatedUser,
            isAuthenticated: true,
            appState: prev.appState === 'splash' ? prev.appState : 'main',
          }));
        })();

        return;
      }

      if (event === 'SIGNED_OUT') {
        clearCachedUser();
        persistStringArray(FAVORITES_STORAGE_KEY, []);
        setState(prev => ({
          ...prev,
          currentUser: null,
          isAuthenticated: false,
          favoriteProperties: [],
          appState: prev.appState === 'splash' ? prev.appState : 'auth-landing',
        }));
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load properties function
  const loadProperties = useCallback(async (): Promise<void> => {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, using empty property list.');
        setState(prev => ({
          ...prev,
          properties: [],
          loading: false,
        }));
        return;
      }

      setState(prev => ({ ...prev, loading: true }));

      const properties = await queryClient.fetchQuery({
        queryKey: propertyQueryKeys.catalog(PROPERTY_CATALOG_PARAMS),
        queryFn: () => fetchPropertyCatalog(PROPERTY_CATALOG_PARAMS),
        staleTime: 60_000,
      });

      setState(prev => ({ ...prev, properties, loading: false }));
      
      // Cache for offline use
      if (hasLocalStorage) {
        try {
          localStorage.setItem('offlineProperties', JSON.stringify({
            properties,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          console.warn('Failed to cache properties:', error);
        }
      }
      
      setState(prev => ({
        ...prev,
        performanceMetrics: {
          ...prev.performanceMetrics,
          apiCalls: prev.performanceMetrics.apiCalls + 1
        }
      }));
      
    } catch (error) {
      console.error('Failed to load properties:', error);
      setState(prev => ({
        ...prev,
        properties: prev.properties,
        loading: false,
        error: 'Failed to load properties',
      }));
    }
  }, [queryClient]);

  const loadFavoritePropertyIds = useCallback(async (userId: string): Promise<void> => {
    if (!isSupabaseConfigured()) return;

    try {
      const { data, error } = await favoriteService.getUserFavorites(userId);
      if (error) throw error;

      const favoritePropertyIds = (data || [])
        .map((favorite) => favorite.property_id)
        .filter((propertyId): propertyId is string => typeof propertyId === 'string');

      persistStringArray(FAVORITES_STORAGE_KEY, favoritePropertyIds);
      setState((prev) =>
        prev.currentUser?.id === userId
          ? {
              ...prev,
              favoriteProperties: favoritePropertyIds,
            }
          : prev
      );
    } catch (error) {
      console.error('Failed to load favorite properties:', error);
    }
  }, []);

  useEffect(() => {
    if (!state.currentUser?.id || !isSupabaseConfigured()) return;
    void loadFavoritePropertyIds(state.currentUser.id);
  }, [loadFavoritePropertyIds, state.currentUser?.id]);

  const performSearchRequest = useCallback(
    async (query: string, filters: SearchFilters): Promise<Property[]> => {
      const normalizedQuery = query.trim();
      const hasSearchIntent = Boolean(normalizedQuery) || hasMeaningfulSearchFilters(filters);

      if (!hasSearchIntent) {
        return [];
      }

      if (!isSupabaseConfigured()) {
        return filterPropertiesLocally(state.properties, normalizedQuery, filters);
      }

      try {
        const results = await queryClient.fetchQuery({
          queryKey: propertyQueryKeys.search({
            query: normalizedQuery,
            filters,
          }),
          queryFn: () =>
            fetchPropertySearch({
              query: normalizedQuery,
              filters,
            }),
          staleTime: 30_000,
        });

        return results;
      } catch (error) {
        console.error('Server-side property search failed, using local fallback:', error);
        return filterPropertiesLocally(state.properties, normalizedQuery, filters);
      }
    },
    [queryClient, state.properties]
  );

  const syncData = useCallback(async (): Promise<void> => {
    if (!navigator.onLine) return;

    try {
      await loadProperties();
      setState(prev => ({
        ...prev,
        performanceMetrics: {
          ...prev.performanceMetrics,
          lastSync: new Date().toISOString()
        }
      }));
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }, [loadProperties]);
  
  // Actions implementation
  const actions: AppContextActions = useMemo(() => ({
    // Navigation
    setAppState: (newState: AppState) => {
      setState(prev => ({ ...prev, appState: newState }));
    },
    
    navigateWithHistory: (newState: AppState) => {
      navigationHistory.push(state.appState);
      setState(prev => ({ ...prev, appState: newState }));
    },
    
    goBack: () => {
      const previousState = navigationHistory.goBack();
      if (previousState) {
        setState(prev => ({ ...prev, appState: previousState }));
      }
    },
    
    // Auth
    login: async (user: User) => {
      // In production, we assume the user has already been authenticated via Supabase Auth
      // and passed to this function, or we can implement real Supabase Login here.
      try {
        setState(prev => ({ ...prev, loading: true }));
        persistCachedUser(user);
        
        setState(prev => ({
          ...prev,
          currentUser: user,
          isAuthenticated: true,
          loading: false,
          appState: 'main'
        }));
        
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Login failed'
        }));
      }
    },
    
    logout: async () => {
      try {
        if (isSupabaseConfigured()) {
          await supabase.auth.signOut();
        }
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        clearCachedUser();
        persistStringArray(FAVORITES_STORAGE_KEY, []);
        setState(prev => ({
          ...prev,
          currentUser: null,
          isAuthenticated: false,
          favoriteProperties: [],
          appState: 'auth-landing'
        }));
      }
    },
    
    updateUser: async (userData: Partial<User>) => {
      if (!state.currentUser) return;

      let updatedUser = { ...state.currentUser, ...userData };

      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await userService.updateProfile(
            state.currentUser.id,
            serializeUserProfileUpdate({
              email: updatedUser.email,
              name: updatedUser.name,
              role: updatedUser.role,
              status: updatedUser.status,
              avatar: updatedUser.avatar,
              bio: updatedUser.bio,
              phone: updatedUser.phone,
              verified: updatedUser.verified,
              preferences: updatedUser.preferences as Record<string, any> | undefined,
            })
          );

          if (error) throw error;

          if (data) {
            updatedUser = mergeUserProfile(updatedUser, data as Record<string, any>);
          }
        } catch (error) {
          console.error('Failed to persist profile update:', error);
          setState(prev => ({
            ...prev,
            error: 'Failed to update profile',
          }));
          return;
        }
      }

      persistCachedUser(updatedUser);
      
      setState(prev => ({
        ...prev,
        currentUser: updatedUser
      }));
    },
    
    // Properties
    addProperty: async (property: Property) => {
      if (state.currentUser && isSupabaseConfigured()) {
        try {
          const { data, error } = await propertyService.createProperty(
            state.currentUser.id,
            serializePropertyForCreate(property, state.currentUser.id)
          );

        if (error) throw error;

        const createdProperty = data ? normalizeProperty(data) : property;
        queryClient.setQueryData<Property[]>(
          propertyQueryKeys.catalog(PROPERTY_CATALOG_PARAMS),
          (existing = []) => [createdProperty, ...existing.filter((item) => item.id !== createdProperty.id)]
        );
        queryClient.setQueryData(propertyQueryKeys.detail(createdProperty.id), createdProperty);
        void queryClient.invalidateQueries({ queryKey: propertyQueryKeys.all });
        setState(prev => ({
          ...prev,
          properties: [createdProperty, ...prev.properties],
        }));
        return;
        } catch (error) {
          console.error('Failed to create property:', error);
          setState(prev => ({
            ...prev,
            error: 'Failed to create property',
          }));
          throw error;
        }
      }

      setState(prev => ({
        ...prev,
        properties: [property, ...prev.properties]
      }));
      queryClient.setQueryData<Property[]>(
        propertyQueryKeys.catalog(PROPERTY_CATALOG_PARAMS),
        (existing = []) => [property, ...existing.filter((item) => item.id !== property.id)]
      );
    },

    deleteProperty: async (propertyId: string) => {
      if (isSupabaseConfigured()) {
        try {
          const { error } = await propertyService.deleteProperty(propertyId);
          if (error) throw error;
        } catch (error) {
          console.error('Failed to delete property:', error);
          setState(prev => ({
            ...prev,
            error: 'Failed to delete property',
          }));
          throw error;
        }
      }

      queryClient.setQueryData<Property[]>(
        propertyQueryKeys.catalog(PROPERTY_CATALOG_PARAMS),
        (existing = []) => existing.filter((property) => property.id !== propertyId)
      );
      queryClient.removeQueries({ queryKey: propertyQueryKeys.detail(propertyId), exact: true });
      void queryClient.invalidateQueries({ queryKey: propertyQueryKeys.all });

      setState(prev => ({
        ...prev,
        properties: prev.properties.filter((property) => property.id !== propertyId),
        selectedProperty: prev.selectedProperty?.id === propertyId ? null : prev.selectedProperty,
        favoriteProperties: prev.favoriteProperties.filter((id) => id !== propertyId),
        comparedProperties: prev.comparedProperties.filter((id) => id !== propertyId),
        recentlyViewedProperties: prev.recentlyViewedProperties.filter((id) => id !== propertyId),
      }));

      persistStringArray(FAVORITES_STORAGE_KEY, state.favoriteProperties.filter((id) => id !== propertyId));
      persistStringArray(COMPARED_STORAGE_KEY, state.comparedProperties.filter((id) => id !== propertyId));
      persistStringArray(RECENTLY_VIEWED_STORAGE_KEY, state.recentlyViewedProperties.filter((id) => id !== propertyId));
    },

    setSelectedProperty: (property: Property | null) => {
      if (property) {
        const nextRecentlyViewed = [
          property.id,
          ...state.recentlyViewedProperties.filter((id) => id !== property.id),
        ].slice(0, 12);
        persistStringArray(RECENTLY_VIEWED_STORAGE_KEY, nextRecentlyViewed);
        setState(prev => ({
          ...prev,
          selectedProperty: property,
          recentlyViewedProperties: nextRecentlyViewed,
        }));
        return;
      }

      setState(prev => ({ ...prev, selectedProperty: property }));
    },
    
    toggleFavorite: (propertyId: string) => {
      const wasFavorite = state.favoriteProperties.includes(propertyId);
      const newFavorites = state.favoriteProperties.includes(propertyId)
        ? state.favoriteProperties.filter(id => id !== propertyId)
        : [...state.favoriteProperties, propertyId];

      persistStringArray(FAVORITES_STORAGE_KEY, newFavorites);
      setState(prev => ({ ...prev, favoriteProperties: newFavorites }));

      if (state.currentUser && isSupabaseConfigured()) {
        const previousFavorites = state.favoriteProperties;

        void (async () => {
          try {
            if (wasFavorite) {
              const { error } = await favoriteService.removeFavorite(state.currentUser!.id, propertyId);
              if (error) throw error;
            } else {
              const { error } = await favoriteService.addFavorite(state.currentUser!.id, propertyId);
              if (error) throw error;
            }
          } catch (error) {
            console.error('Failed to persist favorite change:', error);
            persistStringArray(FAVORITES_STORAGE_KEY, previousFavorites);
            setState((prev) => ({
              ...prev,
              favoriteProperties: previousFavorites,
              error: 'Failed to update saved homes',
            }));
          }
        })();
      }
    },

    toggleCompareProperty: (propertyId: string) => {
      const isAlreadyCompared = state.comparedProperties.includes(propertyId);
      const nextComparedProperties = isAlreadyCompared
        ? state.comparedProperties.filter((id) => id !== propertyId)
        : [...state.comparedProperties, propertyId].slice(-4);

      persistStringArray(COMPARED_STORAGE_KEY, nextComparedProperties);
      setState(prev => ({ ...prev, comparedProperties: nextComparedProperties }));
    },

    clearComparedProperties: () => {
      persistStringArray(COMPARED_STORAGE_KEY, []);
      setState(prev => ({ ...prev, comparedProperties: [] }));
    },

    addRecentlyViewedProperty: (propertyId: string) => {
      const nextRecentlyViewed = [
        propertyId,
        ...state.recentlyViewedProperties.filter((id) => id !== propertyId),
      ].slice(0, 12);

      persistStringArray(RECENTLY_VIEWED_STORAGE_KEY, nextRecentlyViewed);
      setState(prev => ({ ...prev, recentlyViewedProperties: nextRecentlyViewed }));
    },
    
    updateProperty: async (propertyId: string, updates: Partial<Property>) => {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await propertyService.updateProperty(
            propertyId,
            serializePropertyForUpdate(updates)
          );

          if (error) throw error;

          const updatedProperty = data
            ? normalizeProperty(data)
            : normalizeProperty({
                ...state.properties.find((property) => property.id === propertyId),
                ...updates,
              });

          queryClient.setQueryData<Property[]>(
            propertyQueryKeys.catalog(PROPERTY_CATALOG_PARAMS),
            (existing = []) =>
              existing.map((property) => (property.id === propertyId ? updatedProperty : property))
          );
          queryClient.setQueryData(propertyQueryKeys.detail(propertyId), updatedProperty);
          void queryClient.invalidateQueries({ queryKey: propertyQueryKeys.all });

          setState(prev => ({
            ...prev,
            properties: prev.properties.map((property) =>
              property.id === propertyId ? updatedProperty : property
            ),
            selectedProperty:
              prev.selectedProperty?.id === propertyId ? updatedProperty : prev.selectedProperty,
          }));
          return;
        } catch (error) {
          console.error('Failed to update property:', error);
          setState(prev => ({
            ...prev,
            error: 'Failed to update property',
          }));
          throw error;
        }
      }

      setState(prev => ({
        ...prev,
        properties: prev.properties.map(p => 
          p.id === propertyId ? { ...p, ...updates } : p
        )
      }));
      queryClient.setQueryData<Property[]>(
        propertyQueryKeys.catalog(PROPERTY_CATALOG_PARAMS),
        (existing = []) =>
          existing.map((property) =>
            property.id === propertyId ? { ...property, ...updates } as Property : property
          )
      );
    },
    
    refreshProperties: async () => {
      await loadProperties();
    },
    
    // Search
    setSearchQuery: (query: string) => {
      setState(prev => ({ ...prev, searchQuery: query }));
      if (!query.trim() && !hasMeaningfulSearchFilters(state.searchFilters)) {
        setState(prev => ({ ...prev, searchResults: [] }));
        return;
      }
      void performSearchRequest(query, state.searchFilters).then((results) => {
        setState((prev) => ({ ...prev, searchResults: results }));
      });
    },
    
    updateSearchFilters: (filters: Partial<SearchFilters>) => {
      const nextFilters = { ...state.searchFilters, ...filters };
      setState(prev => ({
        ...prev,
        searchFilters: nextFilters
      }));
      void performSearchRequest(state.searchQuery, nextFilters).then((results) => {
        setState((prev) => ({ ...prev, searchResults: results }));
      });
    },
    
    performSearch: async () => {
      const results = await performSearchRequest(state.searchQuery, state.searchFilters);
      setState(prev => ({ ...prev, searchResults: results }));
    },
    
    clearSearch: () => {
      setState(prev => ({
        ...prev,
        searchQuery: '',
        searchResults: [],
        searchFilters: {
          sortBy: 'date_desc',
          page: 1,
          limit: 20
        }
      }));
    },
    
    // UI
    setViewMode: (mode: 'grid' | 'list') => {
      if (hasLocalStorage) {
        try {
          localStorage.setItem('viewMode', mode);
        } catch (error) {
          console.warn('Failed to save view mode:', error);
        }
      }
      setState(prev => ({ ...prev, viewMode: mode }));
    },
    
    setSidebarOpen: (open: boolean) => {
      setState(prev => ({ ...prev, sidebarOpen: open }));
    },
    
    setTheme: (theme: Theme) => {
      const normalizedTheme = normalizeTheme(theme);

      if (hasLocalStorage) {
        try {
          localStorage.setItem('theme', normalizedTheme);
        } catch (error) {
          console.warn('Failed to save theme:', error);
        }
      }
      setState(prev => ({ ...prev, theme: normalizedTheme }));
      if (isBrowser) applyTheme(normalizedTheme);
    },

    setReducedMotion: (enabled: boolean) => {
      if (hasLocalStorage) {
        try {
          localStorage.setItem(REDUCED_MOTION_STORAGE_KEY, JSON.stringify(enabled));
        } catch (error) {
          console.warn('Failed to save reduced motion preference:', error);
        }
      }

      if (isBrowser) {
        document.documentElement.classList.toggle('reduce-motion', enabled);
      }

      setState(prev => ({ ...prev, reducedMotion: enabled }));
    },
    
    showNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => {
      const newNotification = {
        ...notification,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        read: false,
        pushSent: false,
        emailSent: false,
        smsSent: false,
        userId: state.currentUser?.id || 'anonymous'
      } as Notification;
      
      setState(prev => ({
        ...prev,
        notifications: [newNotification, ...prev.notifications].slice(0, 50) // Keep only latest 50
      }));
      
      // Auto-dismiss after 5 seconds for non-urgent notifications
      if (notification.priority !== 'urgent') {
        setTimeout(() => {
          actions.dismissNotification(newNotification.id);
        }, 5000);
      }
    },
    
    dismissNotification: (id: string) => {
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.id !== id)
      }));
    },
    
    clearError: () => {
      setState(prev => ({ ...prev, error: null }));
    },
    
    // Performance
    trackPerformance: (metric: string, value: number) => {
      console.log(`Performance metric - ${metric}: ${value}ms`);
    },
    
    clearCache: () => {
      if (hasLocalStorage) {
        try {
          localStorage.removeItem('offlineProperties');
          localStorage.removeItem('offlineData');
        } catch (error) {
          console.warn('Failed to clear cache:', error);
        }
      }
      setState(prev => ({
        ...prev,
        performanceMetrics: {
          ...prev.performanceMetrics,
          cacheHits: 0
        }
      }));
    },
    
    syncData
    
  }), [state, loadProperties, navigationHistory, performSearchRequest, queryClient, syncData]);
  
  const contextValue: AppContextType = useMemo(() => ({
    ...state,
    ...actions,
    // Ensure arrays are never undefined
    properties: state.properties || [],
    notifications: state.notifications || [],
    favoriteProperties: state.favoriteProperties || [],
    comparedProperties: state.comparedProperties || [],
    recentlyViewedProperties: state.recentlyViewedProperties || [],
    searchResults: state.searchResults || []
  }), [state, actions]);
  
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
