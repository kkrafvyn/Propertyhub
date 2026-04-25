import React from 'react';
import { PropertyFilters } from '../types';
import { SmartFilters } from './SmartFilters';

interface FiltersProps {
  filters: PropertyFilters;
  setFilters: (filters: PropertyFilters) => void;
}

export function Filters({ filters, setFilters }: FiltersProps) {
  // Location search from database/API - implement with actual location service
  const handleLocationSearch = async (query: string) => {
    // TODO: Implement real location search from Supabase
    // Example: return await supabase.from('locations').select('*').ilike('name', `%${query}%`);
    return [];
  };

  // Calculate property count for display
  const getActiveFilterCount = () => {
    return (
      filters.type.length +
      filters.location.length +
      filters.bedrooms.length +
      filters.bathrooms.length +
      filters.amenities.length +
      filters.availability.length +
      (filters.priceRange[0] > 0 || filters.priceRange[1] < 500000 ? 1 : 0) +
      (filters.areaRange[0] > 0 || filters.areaRange[1] < 10000 ? 1 : 0)
    );
  };

  return (
    <SmartFilters
      filters={filters}
      setFilters={setFilters}
      propertyCount={0} // This will be populated by parent component
      showAdvanced={true}
      compact={false}
      onLocationSearch={handleLocationSearch}
    />
  );
}