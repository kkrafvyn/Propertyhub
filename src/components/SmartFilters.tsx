import React, { useMemo, useState } from 'react';
import {
  Bath,
  Bed,
  Building2,
  DollarSign,
  Home,
  MapPin,
  RotateCcw,
  Ruler,
  SlidersHorizontal,
  Sparkles,
  Store,
  TreePine,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PropertyFilters } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { cn } from './ui/utils';

interface SmartFiltersProps {
  filters: PropertyFilters;
  setFilters: (filters: PropertyFilters) => void;
  propertyCount?: number;
  showAdvanced?: boolean;
  compact?: boolean;
  onLocationSearch?: (
    query: string
  ) => Promise<Array<{ name: string; coordinates: [number, number] }>>;
}

const DEFAULT_FILTERS: PropertyFilters = {
  type: [],
  priceRange: [0, 500000],
  location: [],
  bedrooms: [],
  bathrooms: [],
  areaRange: [0, 10000],
  amenities: [],
  availability: [],
};

const PROPERTY_TYPES = [
  { id: 'house', label: 'House', icon: Home },
  { id: 'apartment', label: 'Apartment', icon: Building2 },
  { id: 'land', label: 'Land', icon: TreePine },
  { id: 'shop', label: 'Shop', icon: Store },
];

const BEDROOM_OPTIONS = ['1', '2', '3', '4', '5+'];
const BATHROOM_OPTIONS = ['1', '2', '3', '4+'];
const AVAILABILITY_OPTIONS = [
  { id: 'available', label: 'Available now' },
  { id: 'coming-soon', label: 'Coming soon' },
  { id: 'reserved', label: 'Reserved' },
];

const AMENITY_GROUPS: Array<{ title: string; items: string[] }> = [
  { title: 'Basics', items: ['WiFi', 'Air Conditioning', 'Heating', 'Laundry'] },
  { title: 'Parking & Access', items: ['Parking', 'Garage', 'Elevator', 'Accessibility'] },
  { title: 'Security', items: ['Security System', 'Gated Community', 'CCTV', 'Smart Locks'] },
  { title: 'Lifestyle', items: ['Pool', 'Gym', 'Garden', 'Balcony', 'Pet Friendly'] },
];

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];

const normalizeMixedArray = (value: unknown): Array<string | number> =>
  Array.isArray(value)
    ? value.filter((item): item is string | number => typeof item === 'string' || typeof item === 'number')
    : [];

const countActiveFilters = (filters: PropertyFilters) => {
  const type = normalizeStringArray(filters.type);
  const location = normalizeStringArray(filters.location);
  const bedrooms = normalizeMixedArray(filters.bedrooms);
  const bathrooms = normalizeMixedArray(filters.bathrooms);
  const amenities = normalizeStringArray(filters.amenities);
  const availability = normalizeStringArray(filters.availability);

  return (
    type.length +
    location.length +
    bedrooms.length +
    bathrooms.length +
    amenities.length +
    availability.length +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < DEFAULT_FILTERS.priceRange[1] ? 1 : 0) +
    (filters.areaRange[0] > 0 || filters.areaRange[1] < DEFAULT_FILTERS.areaRange[1] ? 1 : 0)
  );
};

export function SmartFilters({
  filters,
  setFilters,
  propertyCount = 0,
  showAdvanced = true,
  compact = false,
  onLocationSearch,
}: SmartFiltersProps) {
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<
    Array<{ name: string; coordinates: [number, number] }>
  >([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);
  const selectedTypes = normalizeStringArray(filters.type);
  const selectedLocations = normalizeStringArray(filters.location);
  const selectedAmenities = normalizeStringArray(filters.amenities);
  const selectedAvailability = normalizeStringArray(filters.availability);
  const selectedBedrooms = normalizeMixedArray(filters.bedrooms).map(String);
  const selectedBathrooms = normalizeMixedArray(filters.bathrooms).map(String);

  const updateFilters = (updates: Partial<PropertyFilters>) => {
    setFilters({
      ...filters,
      ...updates,
    });
  };

  const toggleStringFilter = (
    key: 'type' | 'location' | 'amenities' | 'availability',
    value: string
  ) => {
    const currentValues = normalizeStringArray(filters[key]);
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];

    updateFilters({ [key]: nextValues } as Partial<PropertyFilters>);
  };

  const toggleMixedFilter = (key: 'bedrooms' | 'bathrooms', value: string) => {
    const currentValues = normalizeMixedArray(filters[key]).map(String);
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];

    updateFilters({ [key]: nextValues } as Partial<PropertyFilters>);
  };

  const clearAllFilters = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setLocationQuery('');
    setLocationSuggestions([]);
    toast.success('Filters cleared');
  };

  const handleLocationInput = async (value: string) => {
    setLocationQuery(value);

    if (!onLocationSearch || value.trim().length < 3) {
      setLocationSuggestions([]);
      return;
    }

    setIsSearchingLocation(true);

    try {
      const nextSuggestions = await onLocationSearch(value.trim());
      setLocationSuggestions(nextSuggestions);
    } catch (error) {
      console.error('Location search failed:', error);
      setLocationSuggestions([]);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleLocationSelect = (location: string) => {
    if (!selectedLocations.includes(location)) {
      updateFilters({ location: [...selectedLocations, location] });
    }

    setLocationQuery('');
    setLocationSuggestions([]);
  };

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          Filters
          {activeCount > 0 ? (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{activeCount}</span>
          ) : null}
        </div>
        {activeCount > 0 ? (
          <Button variant="outline" size="sm" className="rounded-full" onClick={clearAllFilters}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Clear
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <Card className="rounded-[28px] border border-border bg-card/95 shadow-none">
      <CardHeader className="space-y-4 px-4 pb-0 pt-4 sm:px-6 sm:pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-3 text-xl font-semibold">
              <div className="theme-avatar-soft flex h-10 w-10 items-center justify-center rounded-2xl">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              Filter homes
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {propertyCount} homes match right now
              {activeCount > 0 ? ` • ${activeCount} active filter${activeCount === 1 ? '' : 's'}` : ''}
            </p>
          </div>

          <Button
            variant="outline"
            className="rounded-full"
            onClick={clearAllFilters}
            disabled={activeCount === 0}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Clear all
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-4 pb-4 pt-6 sm:px-6 sm:pb-6">
        <section className="space-y-4 rounded-[24px] border border-border bg-background/60 p-4">
          <div className="space-y-1">
            <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Property type
            </Label>
            <p className="text-xs text-muted-foreground">Pick the kind of place you want to browse.</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PROPERTY_TYPES.map((type) => {
              const Icon = type.icon;
              const isActive = selectedTypes.includes(type.id);

              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => toggleStringFilter('type', type.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-[18px] border px-3 py-3 text-left text-sm font-medium transition-colors',
                    isActive
                      ? 'border-transparent bg-secondary text-foreground shadow-sm'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4 rounded-[24px] border border-border bg-background/60 p-4">
            <div className="space-y-1">
              <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <DollarSign className="h-4 w-4 text-primary" />
                Budget
              </Label>
              <p className="text-xs text-muted-foreground">
                GHS {filters.priceRange[0].toLocaleString()} - GHS {filters.priceRange[1].toLocaleString()}
              </p>
            </div>

            <Slider
              value={filters.priceRange}
              onValueChange={(value) => updateFilters({ priceRange: value as [number, number] })}
              min={0}
              max={500000}
              step={5000}
            />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>500k+</span>
            </div>
          </div>

          <div className="space-y-4 rounded-[24px] border border-border bg-background/60 p-4">
            <div className="space-y-1">
              <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Ruler className="h-4 w-4 text-primary" />
                Area
              </Label>
              <p className="text-xs text-muted-foreground">
                {filters.areaRange[0].toLocaleString()} - {filters.areaRange[1].toLocaleString()} sqft
              </p>
            </div>

            <Slider
              value={filters.areaRange}
              onValueChange={(value) => updateFilters({ areaRange: value as [number, number] })}
              min={0}
              max={10000}
              step={100}
            />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>10k+</span>
            </div>
          </div>
        </section>

        {showAdvanced ? (
          <>
            <section className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-4 rounded-[24px] border border-border bg-background/60 p-4">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Bed className="h-4 w-4 text-primary" />
                    Bedrooms
                  </Label>
                  <p className="text-xs text-muted-foreground">Choose the room count that fits.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {BEDROOM_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleMixedFilter('bedrooms', option)}
                      className={cn(
                        'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                        selectedBedrooms.includes(option)
                          ? 'border-transparent bg-secondary text-foreground shadow-sm'
                          : 'border-border bg-card text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 rounded-[24px] border border-border bg-background/60 p-4">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Bath className="h-4 w-4 text-primary" />
                    Bathrooms
                  </Label>
                  <p className="text-xs text-muted-foreground">Keep the shortlist aligned with your needs.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {BATHROOM_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleMixedFilter('bathrooms', option)}
                      className={cn(
                        'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                        selectedBathrooms.includes(option)
                          ? 'border-transparent bg-secondary text-foreground shadow-sm'
                          : 'border-border bg-card text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-[24px] border border-border bg-background/60 p-4">
              <div className="space-y-1">
                <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Availability
                </Label>
                <p className="text-xs text-muted-foreground">Show homes that match your timing.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {AVAILABILITY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleStringFilter('availability', option.id)}
                    className={cn(
                      'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                      selectedAvailability.includes(option.id)
                        ? 'border-transparent bg-secondary text-foreground shadow-sm'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : null}

        <section className="space-y-4 rounded-[24px] border border-border bg-background/60 p-4">
          <div className="space-y-1">
            <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              Location
            </Label>
            <p className="text-xs text-muted-foreground">Search a neighborhood, area, or full address.</p>
          </div>

          <div className="relative">
            <Input
              value={locationQuery}
              onChange={(event) => {
                void handleLocationInput(event.target.value);
              }}
              placeholder="Search for areas or addresses"
              className="h-11 rounded-2xl border border-border bg-card pl-10"
            />
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            {locationQuery.trim().length >= 3 && (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
                {isSearchingLocation ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">Searching locations...</div>
                ) : locationSuggestions.length > 0 ? (
                  locationSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.name}
                      type="button"
                      onClick={() => handleLocationSelect(suggestion.name)}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-secondary"
                    >
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="truncate">{suggestion.name}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-muted-foreground">No matching locations</div>
                )}
              </div>
            )}
          </div>

          {selectedLocations.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedLocations.map((location) => (
                <button
                  key={location}
                  type="button"
                  onClick={() => toggleStringFilter('location', location)}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-foreground"
                >
                  <span className="truncate">{location}</span>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          ) : null}
        </section>

        {showAdvanced ? (
          <section className="space-y-4 rounded-[24px] border border-border bg-background/60 p-4">
            <div className="space-y-1">
              <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Amenities
              </Label>
              <p className="text-xs text-muted-foreground">Add the details that make a place feel right.</p>
            </div>

            <div className="space-y-4">
              {AMENITY_GROUPS.map((group) => (
                <div key={group.title} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {group.title}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((amenity) => (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleStringFilter('amenities', amenity)}
                        className={cn(
                          'rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                          selectedAmenities.includes(amenity)
                            ? 'border-transparent bg-secondary text-foreground shadow-sm'
                            : 'border-border bg-card text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {amenity}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {activeCount > 0 ? (
          <section className="rounded-[24px] border border-border bg-secondary/35 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {activeCount} filter{activeCount === 1 ? '' : 's'} applied
                </p>
                <p className="text-xs text-muted-foreground">{propertyCount} homes currently match</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedTypes.map((type) => (
                  <span
                    key={type}
                    className="rounded-full bg-card px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    {type}
                  </span>
                ))}
                {selectedLocations.slice(0, 2).map((location) => (
                  <span
                    key={location}
                    className="rounded-full bg-card px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    {location}
                  </span>
                ))}
                {selectedAmenities.slice(0, 2).map((amenity) => (
                  <span
                    key={amenity}
                    className="rounded-full bg-card px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default SmartFilters;
