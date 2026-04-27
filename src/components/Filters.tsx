import React from 'react';
import { PropertyFilters } from '../types';
import supabase from '../services/supabaseClient';
import { SmartFilters } from './SmartFilters';

interface FiltersProps {
  filters: PropertyFilters;
  setFilters: (filters: PropertyFilters) => void;
}

export function Filters({ filters, setFilters }: FiltersProps) {
  const handleLocationSearch = async (query: string) => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 3) {
      return [];
    }

    const { data, error } = await supabase
      .from('properties')
      .select('location, latitude, longitude')
      .ilike('location', `%${trimmedQuery}%`)
      .limit(8);

    if (error) {
      console.error('Location search failed:', error);
      return [];
    }

    const uniqueLocations = new Map<
      string,
      { name: string; coordinates: [number, number] }
    >();

    for (const row of data || []) {
      const name =
        typeof row.location === 'string'
          ? row.location.trim()
          : '';

      if (!name || uniqueLocations.has(name)) {
        continue;
      }

      uniqueLocations.set(name, {
        name,
        coordinates: [
          Number(row.latitude || 0),
          Number(row.longitude || 0),
        ],
      });
    }

    return Array.from(uniqueLocations.values());
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
