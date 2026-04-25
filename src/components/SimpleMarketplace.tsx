/**
 * Simple Marketplace Component
 * 
 * Simplified version to avoid complex imports and dependencies
 */

import React, { useState, useMemo } from 'react';
import { SimplePropertyCard } from './SimplePropertyCard';
import type { Property, PropertyFilters, User, AppState } from '../types';

interface SimpleMarketplaceProps {
  properties: Property[];
  filters: PropertyFilters;
  setFilters: (filters: PropertyFilters) => void;
  onPropertySelect: (property: Property) => void;
  onNavigation?: (state: AppState) => void;
  currentUser: User | null;
}

export function SimpleMarketplace({
  properties,
  filters,
  setFilters,
  onPropertySelect,
  onNavigation,
  currentUser
}: SimpleMarketplaceProps): JSX.Element {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('featured');

  // Filter and sort properties
  const filteredProperties = useMemo(() => {
    let result = [...properties];

    // Apply search
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(property => 
        property.title.toLowerCase().includes(searchLower) ||
        (typeof property.location === 'string' ? property.location : property.location?.city || '').toLowerCase().includes(searchLower) ||
        property.description.toLowerCase().includes(searchLower)
      );
    }

    // Apply filters
    if (filters.type.length > 0) {
      result = result.filter(property => filters.type.includes(property.type));
    }

    if (filters.priceRange) {
      result = result.filter(property => {
        const price = property.pricing?.amount || property.price || 0;
        return price >= filters.priceRange[0] && price <= filters.priceRange[1];
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      const priceA = a.pricing?.amount || a.price || 0;
      const priceB = b.pricing?.amount || b.price || 0;
      
      switch (sortBy) {
        case 'price-low':
          return priceA - priceB;
        case 'price-high':
          return priceB - priceA;
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'newest':
          return new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime();
        default:
          return (b.rating || 0) - (a.rating || 0);
      }
    });

    return result;
  }, [properties, filters, searchTerm, sortBy]);

  return (
    <div className="min-h-screen bg-background pt-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Find Your Perfect <span className="text-primary">Property</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Discover {filteredProperties.length} verified properties
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search properties, locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-6 py-4 text-lg border border-border rounded-full bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button className="absolute right-2 top-2 px-6 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90">
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold">Properties ({filteredProperties.length})</h2>
            <p className="text-muted-foreground">
              {searchTerm ? `Results for "${searchTerm}"` : 'Available properties'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg bg-background"
            >
              <option value="featured">Sort by: Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Rating</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>

        {/* Property Grid */}
        {filteredProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProperties.map((property) => (
              <SimplePropertyCard
                key={property.id}
                property={property}
                onSelect={onPropertySelect}
                currentUser={currentUser}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏠</div>
            <h3 className="text-xl font-semibold mb-2">No properties found</h3>
            <p className="text-muted-foreground mb-6">Try adjusting your search criteria</p>
            <button
              onClick={() => setSearchTerm('')}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SimpleMarketplace;