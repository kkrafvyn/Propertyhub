import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Property, PropertyFilters } from '../types';
import { applyPropertyFilters } from '../utils/propertyFiltering';
import { getLocationLabel } from '../utils/location';
import { useAppContext } from '../hooks/useAppContext';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { searchService } from '../services/supabaseApi';

export interface SavedSearchRecord {
  id: string;
  name: string;
  searchTerm: string;
  filters: Partial<PropertyFilters>;
  resultsCount: number;
  createdAt: string;
  updatedAt?: string;
  alertEnabled?: boolean;
  alertFrequency?: 'instant' | 'daily' | 'weekly';
}

export interface PropertyAlertRecord {
  id: string;
  name: string;
  criteria: Record<string, any>;
  frequency: 'instant' | 'daily' | 'weekly';
  enabled: boolean;
  matchCount: number;
  lastTriggeredAt?: string;
  email?: string;
  pushNotifications: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface SearchContextType {
  isSearching: boolean;
  searchResults: Property[];
  searchQuery: string;
  searchHistory: string[];
  savedSearches: SavedSearchRecord[];
  propertyAlerts: PropertyAlertRecord[];
  recommendations: {
    recentQueries: string[];
    popularLocations: string[];
  };
  performSearch: (
    query: string,
    filters?: PropertyFilters,
    userId?: string,
    availableProperties?: Property[]
  ) => Promise<void>;
  addToHistory: (query: string) => void;
  clearSearchHistory: () => Promise<void>;
  saveSearch: (
    name: string,
    filters: Partial<PropertyFilters>,
    term: string,
    count: number,
    options?: {
      alertEnabled?: boolean;
      alertFrequency?: 'instant' | 'daily' | 'weekly';
    }
  ) => Promise<void>;
  deleteSavedSearch: (savedSearchId: string) => Promise<void>;
  createAlert: (
    name: string,
    criteria: Record<string, any>,
    options?: {
      frequency?: 'instant' | 'daily' | 'weekly';
      pushNotifications?: boolean;
      email?: string;
      matchCount?: number;
    }
  ) => Promise<void>;
  toggleAlert: (alertId: string) => Promise<void>;
  deleteAlert: (alertId: string) => Promise<void>;
  trackSearchBehavior: (userId: string, action: string, data: any) => void;
  loadRecommendations: (userId: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

const SEARCH_HISTORY_STORAGE_KEY = 'propertyhub.search.history';
const SAVED_SEARCHES_STORAGE_KEY = 'propertyhub.search.saved';
const PROPERTY_ALERTS_STORAGE_KEY = 'propertyhub.search.alerts';

const readGuestCollection = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch (error) {
    console.warn(`Failed to read ${key}:`, error);
    return fallback;
  }
};

const writeGuestCollection = (key: string, value: unknown): void => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to persist ${key}:`, error);
  }
};

const mapSavedSearchRecord = (row: Record<string, any>): SavedSearchRecord => ({
  id: String(row.id),
  name: String(row.name || 'Saved search'),
  searchTerm: typeof row.search_term === 'string' ? row.search_term : '',
  filters:
    row.filters && typeof row.filters === 'object' && !Array.isArray(row.filters)
      ? (row.filters as Partial<PropertyFilters>)
      : {},
  resultsCount: typeof row.results_count === 'number' ? row.results_count : 0,
  createdAt: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
  updatedAt: typeof row.updated_at === 'string' ? row.updated_at : undefined,
  alertEnabled: row.alert_enabled === true,
  alertFrequency:
    row.alert_frequency === 'instant' || row.alert_frequency === 'weekly'
      ? row.alert_frequency
      : 'daily',
});

const mapPropertyAlertRecord = (row: Record<string, any>): PropertyAlertRecord => ({
  id: String(row.id),
  name: String(row.name || 'Property alert'),
  criteria:
    row.criteria && typeof row.criteria === 'object' && !Array.isArray(row.criteria)
      ? (row.criteria as Record<string, any>)
      : {},
  frequency: row.frequency === 'instant' || row.frequency === 'weekly' ? row.frequency : 'daily',
  enabled: row.enabled !== false,
  matchCount: typeof row.match_count === 'number' ? row.match_count : 0,
  lastTriggeredAt: typeof row.last_triggered_at === 'string' ? row.last_triggered_at : undefined,
  email: typeof row.email === 'string' ? row.email : undefined,
  pushNotifications: row.push_notifications !== false,
  createdAt: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
  updatedAt: typeof row.updated_at === 'string' ? row.updated_at : undefined,
});

const dedupeHistory = (history: string[]) =>
  history.filter((term, index, values) => values.indexOf(term) === index).slice(0, 10);

export function EnhancedSearchProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAppContext();
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearchRecord[]>([]);
  const [propertyAlerts, setPropertyAlerts] = useState<PropertyAlertRecord[]>([]);
  const [recommendations, setRecommendations] = useState({
    recentQueries: [] as string[],
    popularLocations: [] as string[],
  });

  useEffect(() => {
    let isMounted = true;

    const loadPersistedSearchState = async () => {
      if (currentUser?.id && isSupabaseConfigured()) {
        try {
          const [historyResult, savedSearchResult, alertResult] = await Promise.all([
            searchService.getSearchHistory(currentUser.id, 10),
            searchService.getSavedSearches(currentUser.id),
            searchService.getPropertyAlerts(currentUser.id),
          ]);

          if (!isMounted) return;

          setSearchHistory(
            dedupeHistory(
              (historyResult.data || [])
                .map((entry) => entry.query)
                .filter((query): query is string => typeof query === 'string' && query.trim().length > 0)
            )
          );
          setSavedSearches((savedSearchResult.data || []).map((entry) => mapSavedSearchRecord(entry)));
          setPropertyAlerts((alertResult.data || []).map((entry) => mapPropertyAlertRecord(entry)));
          return;
        } catch (error) {
          console.error('Failed to load persisted search state:', error);
        }
      }

      if (!isMounted) return;

      setSearchHistory(readGuestCollection<string[]>(SEARCH_HISTORY_STORAGE_KEY, []));
      setSavedSearches(readGuestCollection<SavedSearchRecord[]>(SAVED_SEARCHES_STORAGE_KEY, []));
      setPropertyAlerts(readGuestCollection<PropertyAlertRecord[]>(PROPERTY_ALERTS_STORAGE_KEY, []));
    };

    void loadPersistedSearchState();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    const popularLocations = Array.from(
      new Set(
        savedSearches.flatMap((savedSearch) =>
          Array.isArray(savedSearch.filters.location)
            ? savedSearch.filters.location.filter(
                (location): location is string => typeof location === 'string' && location.trim().length > 0
              )
            : []
        )
      )
    ).slice(0, 5);

    setRecommendations({
      recentQueries: searchHistory.slice(0, 5),
      popularLocations,
    });
  }, [savedSearches, searchHistory]);

  useEffect(() => {
    if (currentUser?.id) return;
    writeGuestCollection(SEARCH_HISTORY_STORAGE_KEY, searchHistory);
  }, [currentUser?.id, searchHistory]);

  useEffect(() => {
    if (currentUser?.id) return;
    writeGuestCollection(SAVED_SEARCHES_STORAGE_KEY, savedSearches);
  }, [currentUser?.id, savedSearches]);

  useEffect(() => {
    if (currentUser?.id) return;
    writeGuestCollection(PROPERTY_ALERTS_STORAGE_KEY, propertyAlerts);
  }, [currentUser?.id, propertyAlerts]);

  const performSearch = useCallback(
    async (
      query: string,
      filters?: PropertyFilters,
      userId?: string,
      availableProperties: Property[] = []
    ) => {
      setIsSearching(true);
      setSearchQuery(query);

      try {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) {
          setSearchResults([]);
          return;
        }

        const searchableProperties =
          filters && availableProperties.length > 0
            ? applyPropertyFilters(availableProperties, filters)
            : availableProperties;

        const nextResults = searchableProperties.filter((property) => {
          const locationLabel = getLocationLabel(property.location).toLowerCase();

          return (
            property.title.toLowerCase().includes(normalizedQuery) ||
            property.description.toLowerCase().includes(normalizedQuery) ||
            locationLabel.includes(normalizedQuery) ||
            property.amenities.some((amenity) => amenity.toLowerCase().includes(normalizedQuery))
          );
        });

        setSearchResults(nextResults);
        setSearchHistory((prev) => dedupeHistory([query, ...prev]));

        const activeUserId = userId || currentUser?.id;
        if (activeUserId && isSupabaseConfigured()) {
          void searchService.recordSearchHistory(activeUserId, {
            query,
            filters: filters || {},
            resultsCount: nextResults.length,
          });
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [currentUser?.id]
  );

  const addToHistory = useCallback((query: string) => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return;

    setSearchHistory((prev) => dedupeHistory([normalizedQuery, ...prev]));
  }, []);

  const clearSearchHistory = useCallback(async () => {
    setSearchHistory([]);

    if (currentUser?.id && isSupabaseConfigured()) {
      const { error } = await searchService.clearSearchHistory(currentUser.id);
      if (error) {
        console.error('Failed to clear search history:', error);
      }
      return;
    }

    writeGuestCollection(SEARCH_HISTORY_STORAGE_KEY, []);
  }, [currentUser?.id]);

  const saveSearch = useCallback(
    async (
      name: string,
      filters: Partial<PropertyFilters>,
      term: string,
      count: number,
      options?: {
        alertEnabled?: boolean;
        alertFrequency?: 'instant' | 'daily' | 'weekly';
      }
    ) => {
      const trimmedName = name.trim();
      if (!trimmedName) return;

      if (currentUser?.id && isSupabaseConfigured()) {
        const { data, error } = await searchService.createSavedSearch(currentUser.id, {
          name: trimmedName,
          searchTerm: term,
          filters,
          resultsCount: count,
          alertEnabled: options?.alertEnabled,
          alertFrequency: options?.alertFrequency,
        });

        if (error) {
          console.error('Failed to save search:', error);
          throw error;
        }

        if (data) {
          setSavedSearches((prev) => [mapSavedSearchRecord(data), ...prev.filter((entry) => entry.id !== data.id)]);
        }

        return;
      }

      const guestSavedSearch: SavedSearchRecord = {
        id: `guest-search-${Date.now()}`,
        name: trimmedName,
        searchTerm: term,
        filters,
        resultsCount: count,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        alertEnabled: options?.alertEnabled,
        alertFrequency: options?.alertFrequency || 'daily',
      };

      setSavedSearches((prev) => [guestSavedSearch, ...prev]);
    },
    [currentUser?.id]
  );

  const deleteSavedSearch = useCallback(
    async (savedSearchId: string) => {
      const previousSearches = savedSearches;
      setSavedSearches((prev) => prev.filter((entry) => entry.id !== savedSearchId));

      if (currentUser?.id && isSupabaseConfigured()) {
        const { error } = await searchService.deleteSavedSearch(savedSearchId);
        if (error) {
          setSavedSearches(previousSearches);
          console.error('Failed to delete saved search:', error);
          throw error;
        }
      }
    },
    [currentUser?.id, savedSearches]
  );

  const createAlert = useCallback(
    async (
      name: string,
      criteria: Record<string, any>,
      options?: {
        frequency?: 'instant' | 'daily' | 'weekly';
        pushNotifications?: boolean;
        email?: string;
        matchCount?: number;
      }
    ) => {
      const trimmedName = name.trim();
      if (!trimmedName) return;

      if (currentUser?.id && isSupabaseConfigured()) {
        const { data, error } = await searchService.createPropertyAlert(currentUser.id, {
          name: trimmedName,
          criteria,
          frequency: options?.frequency,
          email: options?.email,
          pushNotifications: options?.pushNotifications,
          matchCount: options?.matchCount,
        });

        if (error) {
          console.error('Failed to create property alert:', error);
          throw error;
        }

        if (data) {
          setPropertyAlerts((prev) => [mapPropertyAlertRecord(data), ...prev.filter((entry) => entry.id !== data.id)]);
        }

        return;
      }

      const guestAlert: PropertyAlertRecord = {
        id: `guest-alert-${Date.now()}`,
        name: trimmedName,
        criteria,
        frequency: options?.frequency || 'daily',
        enabled: true,
        matchCount: options?.matchCount || 0,
        email: options?.email,
        pushNotifications: options?.pushNotifications ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setPropertyAlerts((prev) => [guestAlert, ...prev]);
    },
    [currentUser?.id]
  );

  const toggleAlert = useCallback(
    async (alertId: string) => {
      const existingAlert = propertyAlerts.find((alert) => alert.id === alertId);
      if (!existingAlert) return;

      const nextAlerts = propertyAlerts.map((alert) =>
        alert.id === alertId ? { ...alert, enabled: !alert.enabled } : alert
      );
      setPropertyAlerts(nextAlerts);

      if (currentUser?.id && isSupabaseConfigured()) {
        const { error } = await searchService.updatePropertyAlert(alertId, {
          enabled: !existingAlert.enabled,
        });

        if (error) {
          setPropertyAlerts(propertyAlerts);
          console.error('Failed to toggle property alert:', error);
          throw error;
        }
      }
    },
    [currentUser?.id, propertyAlerts]
  );

  const deleteAlert = useCallback(
    async (alertId: string) => {
      const previousAlerts = propertyAlerts;
      setPropertyAlerts((prev) => prev.filter((alert) => alert.id !== alertId));

      if (currentUser?.id && isSupabaseConfigured()) {
        const { error } = await searchService.deletePropertyAlert(alertId);
        if (error) {
          setPropertyAlerts(previousAlerts);
          console.error('Failed to delete property alert:', error);
          throw error;
        }
      }
    },
    [currentUser?.id, propertyAlerts]
  );

  const trackSearchBehavior = useCallback((userId: string, action: string, data: any) => {
    console.log('Search behavior:', { userId, action, data });
  }, []);

  const loadRecommendations = useCallback((_userId: string) => {
    setRecommendations((prev) => ({
      ...prev,
      recentQueries: searchHistory.slice(0, 5),
    }));
  }, [searchHistory]);

  return (
    <SearchContext.Provider
      value={{
        isSearching,
        searchResults,
        searchQuery,
        searchHistory,
        savedSearches,
        propertyAlerts,
        recommendations,
        performSearch,
        addToHistory,
        clearSearchHistory,
        saveSearch,
        deleteSavedSearch,
        createAlert,
        toggleAlert,
        deleteAlert,
        trackSearchBehavior,
        loadRecommendations,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within EnhancedSearchProvider');
  }
  return context;
}
