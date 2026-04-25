import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface SearchFilters {
  query: string;
  type: string[];
  category: string[];
  priceRange: [number, number];
  location: string;
  bedrooms: number[];
  bathrooms: number[];
  areaRange: [number, number];
  amenities: string[];
  features: string[];
  sortBy: string;
  viewMode: 'grid' | 'list' | 'map';
}

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'location' | 'property' | 'amenity' | 'recent';
  count?: number;
}

interface SavedSearch {
  id: string;
  name: string;
  filters: Partial<SearchFilters>;
  searchTerm: string;
  resultsCount: number;
  createdAt: string;
}

interface SearchHistory {
  id: string;
  term: string;
  resultsCount: number;
  timestamp: string;
}

interface QuickFilter {
  label: string;
  filter: Partial<SearchFilters>;
}

interface SearchProviderState {
  // Core state
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: SearchFilters;
  updateFilters: (filters: Partial<SearchFilters>) => void;
  resetFilters: () => void;
  
  // Search functionality
  suggestions: SearchSuggestion[];
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  isSearching: boolean;
  generateSuggestions: (term: string, properties: any[]) => void;
  handleSearchSelect: (suggestion: SearchSuggestion) => void;
  
  // History and saved searches
  searchHistory: SearchHistory[];
  clearSearchHistory: () => void;
  savedSearches: SavedSearch[];
  saveCurrentSearch: (name: string, filters: Partial<SearchFilters>, term: string, count: number) => void;
  deleteSavedSearch: (id: string) => void;
  applySavedSearch: (search: SavedSearch) => void;
  
  // Voice search
  isVoiceSearchSupported: boolean;
  isListening: boolean;
  startVoiceSearch: () => void;
  stopVoiceSearch: () => void;
  
  // Quick filters
  quickFilters: QuickFilter[];
  applyQuickFilter: (filter: Partial<SearchFilters>) => void;
}

const defaultFilters: SearchFilters = {
  query: '',
  type: [],
  category: [],
  priceRange: [0, 1000000],
  location: '',
  bedrooms: [],
  bathrooms: [],
  areaRange: [0, 1000],
  amenities: [],
  features: [],
  sortBy: 'featured',
  viewMode: 'grid'
};

const SearchContext = createContext<SearchProviderState>({
  // Core state
  searchTerm: '',
  setSearchTerm: () => {},
  filters: defaultFilters,
  updateFilters: () => {},
  resetFilters: () => {},
  
  // Search functionality
  suggestions: [],
  showSuggestions: false,
  setShowSuggestions: () => {},
  isSearching: false,
  generateSuggestions: () => {},
  handleSearchSelect: () => {},
  
  // History and saved searches
  searchHistory: [],
  clearSearchHistory: () => {},
  savedSearches: [],
  saveCurrentSearch: () => {},
  deleteSavedSearch: () => {},
  applySavedSearch: () => {},
  
  // Voice search
  isVoiceSearchSupported: false,
  isListening: false,
  startVoiceSearch: () => {},
  stopVoiceSearch: () => {},
  
  // Quick filters
  quickFilters: [],
  applyQuickFilter: () => {},
});

interface SearchProviderProps {
  children: React.ReactNode;
}

export function SearchProvider({ children }: SearchProviderProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>(() => {
    try {
      const saved = localStorage.getItem('propertyhub_search_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => {
    try {
      const saved = localStorage.getItem('propertyhub_saved_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setSearchTerm('');
    setSuggestions([]);
  }, []);

  const generateSuggestions = useCallback((term: string, properties: any[]) => {
    if (!term.trim()) {
      setSuggestions([]);
      return;
    }

    const suggestions: SearchSuggestion[] = [];
    const lowerTerm = term.toLowerCase();

    // Location suggestions
    const locations = [...new Set(properties.map(p => p.location))];
    locations.forEach(location => {
      if (location.toLowerCase().includes(lowerTerm)) {
        suggestions.push({
          id: `location-${location}`,
          text: location,
          type: 'location',
          count: properties.filter(p => p.location === location).length
        });
      }
    });

    // Property type suggestions
    const types = [...new Set(properties.map(p => p.type))];
    types.forEach(type => {
      if (type.toLowerCase().includes(lowerTerm)) {
        suggestions.push({
          id: `type-${type}`,
          text: type.charAt(0).toUpperCase() + type.slice(1),
          type: 'property',
          count: properties.filter(p => p.type === type).length
        });
      }
    });

    // Amenity suggestions
    const amenities = [...new Set(properties.flatMap(p => p.amenities || []))];
    amenities.forEach(amenity => {
      if (amenity.toLowerCase().includes(lowerTerm)) {
        suggestions.push({
          id: `amenity-${amenity}`,
          text: amenity,
          type: 'amenity',
          count: properties.filter(p => p.amenities?.includes(amenity)).length
        });
      }
    });

    // Add recent searches
    searchHistory.slice(0, 3).forEach(history => {
      if (history.term.toLowerCase().includes(lowerTerm)) {
        suggestions.push({
          id: `recent-${history.id}`,
          text: history.term,
          type: 'recent'
        });
      }
    });

    setSuggestions(suggestions.slice(0, 10));
  }, [searchHistory]);

  const handleSearchSelect = useCallback((suggestion: SearchSuggestion) => {
    setSearchTerm(suggestion.text);
    setShowSuggestions(false);
    
    // Add to history
    const historyItem: SearchHistory = {
      id: Date.now().toString(),
      term: suggestion.text,
      resultsCount: suggestion.count || 0,
      timestamp: new Date().toISOString()
    };
    
    setSearchHistory(prev => {
      const newHistory = [historyItem, ...prev.filter(item => item.term !== suggestion.text)].slice(0, 10);
      try {
        localStorage.setItem('propertyhub_search_history', JSON.stringify(newHistory));
      } catch (error) {
        console.warn('Failed to save search history:', error);
      }
      return newHistory;
    });

    // Apply appropriate filter
    if (suggestion.type === 'location') {
      updateFilters({ query: suggestion.text });
    } else if (suggestion.type === 'property') {
      updateFilters({ type: [suggestion.text.toLowerCase()] });
    } else if (suggestion.type === 'amenity') {
      updateFilters({ amenities: [suggestion.text.toLowerCase()] });
    } else {
      updateFilters({ query: suggestion.text });
    }
  }, [updateFilters]);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    try {
      localStorage.removeItem('propertyhub_search_history');
    } catch (error) {
      console.warn('Failed to clear search history:', error);
    }
  }, []);

  const saveCurrentSearch = useCallback((name: string, currentFilters: Partial<SearchFilters>, term: string, count: number) => {
    const savedSearch: SavedSearch = {
      id: Date.now().toString(),
      name,
      filters: currentFilters,
      searchTerm: term,
      resultsCount: count,
      createdAt: new Date().toISOString()
    };

    setSavedSearches(prev => {
      const newSaved = [savedSearch, ...prev].slice(0, 20);
      try {
        localStorage.setItem('propertyhub_saved_searches', JSON.stringify(newSaved));
      } catch (error) {
        console.warn('Failed to save search:', error);
      }
      return newSaved;
    });
  }, []);

  const deleteSavedSearch = useCallback((id: string) => {
    setSavedSearches(prev => {
      const newSaved = prev.filter(search => search.id !== id);
      try {
        localStorage.setItem('propertyhub_saved_searches', JSON.stringify(newSaved));
      } catch (error) {
        console.warn('Failed to delete saved search:', error);
      }
      return newSaved;
    });
  }, []);

  const applySavedSearch = useCallback((search: SavedSearch) => {
    setFilters(prev => ({ ...prev, ...search.filters }));
    setSearchTerm(search.searchTerm);
  }, []);

  // Voice search support
  const isVoiceSearchSupported = useMemo(() => {
    return typeof window !== 'undefined' && 'webkitSpeechRecognition' in window;
  }, []);

  const startVoiceSearch = useCallback(() => {
    if (!isVoiceSearchSupported) return;
    
    try {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchTerm(transcript);
        setIsListening(false);
      };
      
      recognition.start();
    } catch (error) {
      console.warn('Voice search failed:', error);
      setIsListening(false);
    }
  }, [isVoiceSearchSupported]);

  const stopVoiceSearch = useCallback(() => {
    setIsListening(false);
  }, []);

  // Quick filters
  const quickFilters: QuickFilter[] = useMemo(() => [
    { label: 'Featured', filter: { featured: true } },
    { label: 'Verified', filter: { verified: true } },
    { label: 'Instant Book', filter: { instantBook: true } },
    { label: 'Pet Friendly', filter: { petFriendly: true } },
    { label: 'Apartments', filter: { type: ['apartment'] } },
    { label: 'Houses', filter: { type: ['house'] } },
    { label: 'For Rent', filter: { category: ['rent'] } },
    { label: 'For Sale', filter: { category: ['sale'] } }
  ], []);

  const applyQuickFilter = useCallback((filter: Partial<SearchFilters>) => {
    updateFilters(filter);
  }, [updateFilters]);

  const value = {
    // Core state
    searchTerm,
    setSearchTerm,
    filters,
    updateFilters,
    resetFilters,
    
    // Search functionality
    suggestions,
    showSuggestions,
    setShowSuggestions,
    isSearching,
    generateSuggestions,
    handleSearchSelect,
    
    // History and saved searches
    searchHistory,
    clearSearchHistory,
    savedSearches,
    saveCurrentSearch,
    deleteSavedSearch,
    applySavedSearch,
    
    // Voice search
    isVoiceSearchSupported,
    isListening,
    startVoiceSearch,
    stopVoiceSearch,
    
    // Quick filters
    quickFilters,
    applyQuickFilter,
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};