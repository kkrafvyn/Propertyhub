import React, { createContext, useContext, useState, useCallback } from 'react';
import { Property, PropertyFilters } from '../types';
import { applyPropertyFilters } from '../utils/propertyFiltering';
import { getLocationLabel } from '../utils/location';

interface SearchContextType {
  isSearching: boolean;
  searchResults: Property[];
  searchQuery: string;
  searchHistory: string[];
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
  trackSearchBehavior: (userId: string, action: string, data: any) => void;
  loadRecommendations: (userId: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function EnhancedSearchProvider({ children }: { children: React.ReactNode }) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState({
    recentQueries: [],
    popularLocations: [] // Mock locations removed for production
  });

  const performSearch = useCallback(async (
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
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const addToHistory = useCallback((query: string) => {
    setSearchHistory(prev => {
      const newHistory = [query, ...prev.filter(q => q !== query)].slice(0, 10);
      return newHistory;
    });
  }, []);

  const trackSearchBehavior = useCallback((userId: string, action: string, data: any) => {
    // Track search behavior for analytics
    console.log('Search behavior:', { userId, action, data });
  }, []);

  const loadRecommendations = useCallback((userId: string) => {
    // Load personalized recommendations
    setRecommendations(prev => ({
      ...prev,
      recentQueries: searchHistory.slice(0, 5)
    }));
  }, [searchHistory]);

  const value = {
    isSearching,
    searchResults,
    searchQuery,
    searchHistory,
    recommendations,
    performSearch,
    addToHistory,
    trackSearchBehavior,
    loadRecommendations
  };

  return (
    <SearchContext.Provider value={value}>
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
