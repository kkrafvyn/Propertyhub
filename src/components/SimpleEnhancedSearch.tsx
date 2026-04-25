/**
 * Simple Enhanced Search - Fallback version without heavy dependencies
 */

import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

interface SimpleEnhancedSearchProps {
  properties: any[];
  placeholder?: string;
  showQuickFilters?: boolean;
  showSavedSearches?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onSearchChange?: (query: string) => void;
}

export function SimpleEnhancedSearch({ 
  properties, 
  placeholder = "Search properties, locations, amenities...",
  showQuickFilters = true,
  size = 'lg',
  onSearchChange
}: SimpleEnhancedSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearchChange?.(value);
  };

  const clearSearch = () => {
    setSearchTerm('');
    onSearchChange?.('');
  };

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

  const quickFilters = [
    'Featured',
    'Verified', 
    'Apartments',
    'Houses',
    'For Rent',
    'For Sale'
  ];

  return (
    <div className="relative">
      {/* Main Search Container */}
      <div className={`relative bg-card/80 backdrop-blur-lg border border-border/50 rounded-2xl shadow-xl ${getSizeClasses()}`}>
        <div className="flex items-center gap-3">
          {/* Search Icon */}
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />

          {/* Search Input */}
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder={placeholder}
              value={searchTerm}
              onChange={handleSearchChange}
              className="border-0 bg-transparent p-0 focus:ring-0 placeholder:text-muted-foreground"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Clear Button */}
            {searchTerm && (
              <button
                type="button"
                onClick={clearSearch}
                className="p-1 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}

            {/* Search Button */}
            <Button type="submit" className="rounded-xl px-6">
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Filters */}
      {showQuickFilters && size === 'lg' && (
        <div className="mt-4 flex flex-wrap gap-2">
          {quickFilters.map((filter) => (
            <Badge
              key={filter}
              variant="outline"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {filter}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default SimpleEnhancedSearch;