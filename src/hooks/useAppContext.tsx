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
import { User, Property, AppState, SearchFilters, Notification, Theme } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { authService } from '../services/supabaseApi';
import { consumePendingOAuthRole } from '../utils/auth';
import { mapSupabaseUserToAppUser } from '../utils/authUser';
import { applyTheme, normalizeTheme } from '../utils/theme';

// Safe check for browser APIs
const isBrowser = typeof window !== 'undefined';
const hasIntersectionObserver = isBrowser && 'IntersectionObserver' in window;
const hasLocalStorage = isBrowser && 'localStorage' in window;
const USER_STORAGE_KEYS = ['currentUser', 'propertyHubUser'] as const;
const FAVORITES_STORAGE_KEY = 'favoriteProperties';
const COMPARED_STORAGE_KEY = 'comparedProperties';
const RECENTLY_VIEWED_STORAGE_KEY = 'recentlyViewedProperties';
const REDUCED_MOTION_STORAGE_KEY = 'reducedMotion';

const hydrateSupabaseUser = async (authUser: SupabaseAuthUser): Promise<User> => {
  const preferredRole = consumePendingOAuthRole();
  const { data: profile, error } = await authService.syncAuthUserProfile(authUser, preferredRole);

  if (error) {
    console.warn('Failed to sync Supabase profile, using auth metadata instead:', error);
  }

  return mapSupabaseUserToAppUser(authUser, profile, preferredRole);
};

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
        setState(prev => ({
          ...prev,
          currentUser: null,
          isAuthenticated: false,
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
        setState(prev => ({ ...prev, properties: [], loading: false }));
        return;
      }

      setState(prev => ({ ...prev, loading: true }));

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const properties = (data || []) as Property[];
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
      setState(prev => ({ ...prev, loading: false, error: 'Failed to load properties' }));
    }
  }, []);

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
        setState(prev => ({
          ...prev,
          currentUser: null,
          isAuthenticated: false,
          appState: 'auth-landing'
        }));
      }
    },
    
    updateUser: async (userData: Partial<User>) => {
      if (!state.currentUser) return;
      
      const updatedUser = { ...state.currentUser, ...userData };
      persistCachedUser(updatedUser);
      
      setState(prev => ({
        ...prev,
        currentUser: updatedUser
      }));
    },
    
    // Properties
    addProperty: async (property: Property) => {
      setState(prev => ({
        ...prev,
        properties: [property, ...prev.properties]
      }));
    },

    deleteProperty: async (propertyId: string) => {
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
      const newFavorites = state.favoriteProperties.includes(propertyId)
        ? state.favoriteProperties.filter(id => id !== propertyId)
        : [...state.favoriteProperties, propertyId];

      persistStringArray(FAVORITES_STORAGE_KEY, newFavorites);
      setState(prev => ({ ...prev, favoriteProperties: newFavorites }));
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
      setState(prev => ({
        ...prev,
        properties: prev.properties.map(p => 
          p.id === propertyId ? { ...p, ...updates } : p
        )
      }));
    },
    
    refreshProperties: async () => {
      await loadProperties();
    },
    
    // Search
    setSearchQuery: (query: string) => {
      setState(prev => ({ ...prev, searchQuery: query }));
      if (query.trim()) {
        actions.performSearch();
      } else {
        setState(prev => ({ ...prev, searchResults: [] }));
      }
    },
    
    updateSearchFilters: (filters: Partial<SearchFilters>) => {
      setState(prev => ({
        ...prev,
        searchFilters: { ...prev.searchFilters, ...filters }
      }));
      actions.performSearch();
    },
    
    performSearch: async () => {
      const query = state.searchQuery.toLowerCase().trim();
      if (!query) {
        setState(prev => ({ ...prev, searchResults: [] }));
        return;
      }
      
      const results = state.properties.filter(property => {
        const locationString = typeof property.location === 'string' 
          ? property.location 
          : property.location?.city || '';
        
        return property.title.toLowerCase().includes(query) ||
               property.description.toLowerCase().includes(query) ||
               locationString.toLowerCase().includes(query);
      });
      
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
    
  }), [state, loadProperties, navigationHistory, syncData]);
  
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
