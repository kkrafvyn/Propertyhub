import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Mic, MicOff, Clock, MapPin, Home, Sparkles, X, Save, History, Star } from 'lucide-react';
import { useSearch } from './SearchProvider';
import { Property } from '../types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';

interface EnhancedSearchProps {
  properties: Property[];
  placeholder?: string;
  className?: string;
  showQuickFilters?: boolean;
  showSavedSearches?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function EnhancedSearch({ 
  properties, 
  placeholder = "Search properties, locations, amenities...",
  className = "",
  showQuickFilters = true,
  showSavedSearches = true,
  size = 'lg'
}: EnhancedSearchProps) {
  const {
    searchTerm,
    setSearchTerm,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    isSearching,
    searchHistory,
    clearSearchHistory,
    savedSearches,
    saveCurrentSearch,
    deleteSavedSearch,
    applySavedSearch,
    generateSuggestions,
    handleSearchSelect,
    isVoiceSearchSupported,
    isListening,
    startVoiceSearch,
    stopVoiceSearch,
    quickFilters,
    applyQuickFilter
  } = useSearch();

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Handle search input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    generateSuggestions(value, properties);
    setShowSuggestions(true);
  };

  // Handle search form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    searchInputRef.current?.blur();
  };

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowSuggestions]);

  // Focus search input on key press
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' && e.ctrlKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'p-3 text-sm';
      case 'md':
        return 'p-4';
      case 'lg':
      default:
        return 'p-6';
    }
  };

  const handleSaveSearch = () => {
    if (saveSearchName.trim() && searchTerm.trim()) {
      saveCurrentSearch(saveSearchName, {}, searchTerm, properties.length);
      setSaveSearchName('');
      setShowSaveDialog(false);
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'location':
        return <MapPin className="w-4 h-4 text-blue-500" />;
      case 'property':
        return <Home className="w-4 h-4 text-green-500" />;
      case 'amenity':
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      case 'recent':
        return <Clock className="w-4 h-4 text-gray-500" />;
      default:
        return <Search className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Search Container */}
      <motion.div
        className={`relative bg-card/80 backdrop-blur-lg border border-border/50 rounded-2xl shadow-xl ${getSizeClasses()}`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
          {/* Search Icon */}
          <motion.div
            className="flex-shrink-0"
            animate={{ rotate: isSearching ? 360 : 0 }}
            transition={{ duration: 0.5, repeat: isSearching ? Infinity : 0, ease: "linear" }}
          >
            <Search className="w-5 h-5 text-muted-foreground" />
          </motion.div>

          {/* Search Input */}
          <div className="flex-1 relative">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={placeholder}
              value={searchTerm}
              onChange={handleInputChange}
              onFocus={() => {
                generateSuggestions(searchTerm, properties);
                setShowSuggestions(true);
              }}
              className="border-0 bg-transparent p-0 focus:ring-0 placeholder:text-muted-foreground"
            />
            
            {/* Keyboard Shortcut Hint */}
            {!searchTerm && size === 'lg' && (
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                <Badge variant="outline" className="text-xs">
                  Ctrl + /
                </Badge>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Clear Button */}
            {searchTerm && (
              <motion.button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-1 hover:bg-muted rounded-full transition-colors"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            )}

            {/* Voice Search Button */}
            {isVoiceSearchSupported && (
              <motion.button
                type="button"
                onClick={isListening ? stopVoiceSearch : startVoiceSearch}
                className={`p-2 rounded-full transition-colors ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'hover:bg-muted text-muted-foreground'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={isListening ? "Stop listening" : "Voice search"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </motion.button>
            )}

            {/* Save Search Button */}
            {searchTerm && showSavedSearches && (
              <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2" title="Save this search">
                    <Save className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Search</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Enter a name for this search..."
                      value={saveSearchName}
                      onChange={(e) => setSaveSearchName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveSearch();
                        }
                      }}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveSearch} disabled={!saveSearchName.trim()}>
                        Save Search
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Search History Button */}
            {searchHistory.length > 0 && (
              <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2" title="Search history">
                    <History className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Search History</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {searchHistory.map((history) => (
                        <motion.div
                          key={history.id}
                          className="flex items-center justify-between p-2 hover:bg-muted rounded-lg cursor-pointer"
                          onClick={() => {
                            setSearchTerm(history.term);
                            setShowHistoryDialog(false);
                          }}
                          whileHover={{ x: 4 }}
                        >
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">{history.term}</div>
                              <div className="text-xs text-muted-foreground">
                                {history.resultsCount} results • {new Date(history.timestamp).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={clearSearchHistory}>
                      Clear History
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Search Button */}
            <Button type="submit" className="rounded-xl px-6">
              Search
            </Button>
          </div>
        </form>
      </motion.div>

      {/* Search Suggestions */}
      <AnimatePresence>
        {showSuggestions && (suggestions.length > 0 || searchHistory.length > 0) && (
          <motion.div
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <ScrollArea className="max-h-96">
              <div className="p-4">
                {/* Search Suggestions */}
                {suggestions.length > 0 && (
                  <>
                    <div className="text-sm font-medium text-muted-foreground mb-3">
                      Suggestions
                    </div>
                    {suggestions.map((suggestion) => (
                      <motion.div
                        key={suggestion.id}
                        className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer"
                        onClick={() => handleSearchSelect(suggestion)}
                        whileHover={{ x: 4 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {getSuggestionIcon(suggestion.type)}
                        <div className="flex-1">
                          <div className="text-sm">{suggestion.text}</div>
                          {suggestion.count !== undefined && (
                            <div className="text-xs text-muted-foreground">
                              {suggestion.count} properties
                            </div>
                          )}
                        </div>
                        {suggestion.type === 'recent' && (
                          <Badge variant="secondary" className="text-xs">Recent</Badge>
                        )}
                      </motion.div>
                    ))}
                    <Separator className="my-3" />
                  </>
                )}

                {/* Saved Searches */}
                {savedSearches.length > 0 && showSavedSearches && (
                  <>
                    <div className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Saved Searches
                    </div>
                    {savedSearches.slice(0, 3).map((savedSearch) => (
                      <motion.div
                        key={savedSearch.id}
                        className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer group"
                        onClick={() => {
                          applySavedSearch(savedSearch);
                          setShowSuggestions(false);
                        }}
                        whileHover={{ x: 4 }}
                      >
                        <Star className="w-4 h-4 text-yellow-500" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{savedSearch.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {savedSearch.searchTerm} • {new Date(savedSearch.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSavedSearch(savedSearch.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-all"
                          whileHover={{ scale: 1.1 }}
                        >
                          <X className="w-3 h-3 text-destructive" />
                        </motion.button>
                      </motion.div>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Filters */}
      {showQuickFilters && size === 'lg' && (
        <motion.div
          className="mt-4 flex flex-wrap gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {quickFilters.map((filter, index) => (
            <motion.div
              key={filter.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => applyQuickFilter(filter.filter)}
              >
                {filter.label}
              </Badge>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

export default EnhancedSearch;