import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AppState, Property, PropertyFilters, User } from '../types';
import { applyPropertyFilters, formatPrice } from '../utils/propertyFiltering';
import { useMobile } from '../hooks/useMobile';
import { useSearch } from './EnhancedSearchProvider';
import { useGeocoding } from './geocoding/GeocodingProvider';
import { InteractiveMap } from './map/InteractiveMap';
import { PropertyCard } from './PropertyCard';
import { BrandMark } from './BrandMark';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import { SmartFilters } from './SmartFilters';
import { PropertyComparison } from './PropertyComparison';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from './ui/drawer';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { useAppContext } from '../hooks/useAppContext';
import {
  Clock,
  Filter,
  Grid3X3,
  Heart,
  List,
  MapPin,
  RefreshCcw,
  Scale,
  Search,
  SlidersHorizontal,
  Star,
  TrendingUp,
} from 'lucide-react';

interface MarketplaceProps {
  properties: Property[];
  filters: PropertyFilters;
  setFilters: (filters: PropertyFilters) => void;
  onPropertySelect: (property: Property) => void;
  onNavigation?: (state: AppState) => void;
  currentUser: User | null;
}

const formatCategoryLabel = (value: string) =>
  value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getSortablePrice = (property: Property) => property.pricing?.amount || property.price || 0;

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

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];

const toFilterValueArray = (value: unknown): Array<number | string> =>
  Array.isArray(value)
    ? value.filter((item): item is number | string => typeof item === 'number' || typeof item === 'string')
    : [];

const toRange = (value: unknown, fallback: [number, number]): [number, number] => {
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  ) {
    return [value[0], value[1]];
  }

  return fallback;
};

const normalizeFilters = (filters: Partial<PropertyFilters> | null | undefined): PropertyFilters => ({
  type: toStringArray(filters?.type),
  priceRange: toRange(filters?.priceRange, DEFAULT_FILTERS.priceRange),
  location: toStringArray(filters?.location),
  bedrooms: toFilterValueArray(filters?.bedrooms),
  bathrooms: toFilterValueArray(filters?.bathrooms),
  areaRange: toRange(filters?.areaRange, DEFAULT_FILTERS.areaRange),
  amenities: toStringArray(filters?.amenities),
  availability: toStringArray(filters?.availability),
});

export function Marketplace({
  properties,
  filters,
  setFilters,
  onPropertySelect,
  onNavigation,
  currentUser,
}: MarketplaceProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [selectedMapProperty, setSelectedMapProperty] = useState<Property | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const isMobile = useMobile();
  const compareSectionRef = useRef<HTMLElement | null>(null);
  const safeFilters = useMemo(() => normalizeFilters(filters), [filters]);

  const {
    favoriteProperties,
    comparedProperties,
    recentlyViewedProperties,
    clearComparedProperties,
    toggleCompareProperty,
  } = useAppContext();

  const {
    isSearching,
    searchResults,
    searchQuery,
    searchHistory,
    recommendations,
    performSearch,
    addToHistory,
    trackSearchBehavior,
    loadRecommendations,
  } = useSearch();

  const { geocodeAddress } = useGeocoding();

  useEffect(() => {
    if (currentUser) {
      loadRecommendations(currentUser.id);
    }
  }, [currentUser, loadRecommendations]);

  const displayProperties = searchQuery ? searchResults : properties;

  const filteredProperties = useMemo(() => {
    let result = applyPropertyFilters(displayProperties, safeFilters);

    if (searchTerm.trim() && !searchQuery) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter((property) => {
        const locationStr =
          typeof property.location === 'string' ? property.location : property.location?.city || '';
        const amenityList = Array.isArray(property.amenities) ? property.amenities : [];
        const description = property.description || '';
        const title = property.title || '';

        return (
          title.toLowerCase().includes(searchLower) ||
          locationStr.toLowerCase().includes(searchLower) ||
          description.toLowerCase().includes(searchLower) ||
          amenityList.some((amenity) => amenity.toLowerCase().includes(searchLower))
        );
      });
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return getSortablePrice(a) - getSortablePrice(b);
        case 'price-high':
          return getSortablePrice(b) - getSortablePrice(a);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'newest': {
          const aDate = a.createdAt ? new Date(a.createdAt).getTime() : parseInt(a.id, 10) || 0;
          const bDate = b.createdAt ? new Date(b.createdAt).getTime() : parseInt(b.id, 10) || 0;
          return bDate - aDate;
        }
        case 'relevance':
          return (b.relevanceScore || 0) - (a.relevanceScore || 0);
        case 'featured':
        default:
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return (b.rating || 0) - (a.rating || 0);
      }
    });

    return result;
  }, [displayProperties, safeFilters, searchQuery, searchTerm, sortBy]);

  const inspirationChips = useMemo(
    () =>
      Array.from(
        new Set([
          ...(searchHistory || []).slice(-3).reverse(),
          ...(recommendations.recentQueries || []).slice(0, 3),
          ...(recommendations.popularLocations || []).slice(0, 3),
        ])
      ).slice(0, 6),
    [recommendations.popularLocations, recommendations.recentQueries, searchHistory]
  );

  const categoryOptions = useMemo(
    () => Array.from(new Set(properties.map((property) => property.type))).slice(0, 5),
    [properties]
  );

  const spotlightProperties = filteredProperties.slice(0, 3);
  const hasSpotlightRail = spotlightProperties.length > 0;
  const featuredCount = filteredProperties.filter((property) => property.featured).length;

  const averageRating = useMemo(() => {
    const ratedProperties = filteredProperties.filter((property) => typeof property.rating === 'number');
    if (!ratedProperties.length) return null;

    const total = ratedProperties.reduce((sum, property) => sum + (property.rating || 0), 0);
    return (total / ratedProperties.length).toFixed(1);
  }, [filteredProperties]);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!searchTerm.trim()) return;

    addToHistory(searchTerm);

    if (currentUser) {
      trackSearchBehavior(currentUser.id, 'search_initiated', {
        query: searchTerm,
        filters: safeFilters,
        source: 'marketplace_search',
      });
    }

    await performSearch(searchTerm, safeFilters, currentUser?.id, properties);
  };

  const handleQuickSearch = (query: string) => {
    setSearchTerm(query);
    void performSearch(query, safeFilters, currentUser?.id, properties);
  };

  const handleLocationSearch = async (location: string) => {
    const result = await geocodeAddress(location);
    if (!result) return;

    const nextFilters = {
      ...safeFilters,
      location: [result.formattedAddress],
    };

    setFilters(nextFilters);
    await performSearch(location, nextFilters, currentUser?.id, properties);
  };

  const handleTypeToggle = (type: Property['type']) => {
    const nextTypes = safeFilters.type.includes(type)
      ? safeFilters.type.filter((item) => item !== type)
      : [type];

    setFilters({
      ...safeFilters,
      type: nextTypes,
    });
  };

  const renderPropertyCard = (property: Property, index: number) => (
    <motion.div
      key={property.id}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3) }}
    >
      <PropertyCard
        property={property}
        currentUser={currentUser}
        onSelect={onPropertySelect}
        onNavigate={onNavigation}
        showQuickActions
      />
    </motion.div>
  );

  const comparedHomes = useMemo(
    () =>
      comparedProperties
        .map((propertyId) => properties.find((property) => property.id === propertyId))
        .filter((property): property is Property => Boolean(property)),
    [comparedProperties, properties]
  );

  const savedHomes = useMemo(
    () =>
      favoriteProperties
        .map((propertyId) => properties.find((property) => property.id === propertyId))
        .filter((property): property is Property => Boolean(property))
        .slice(0, 3),
    [favoriteProperties, properties]
  );

  const recentlyViewedHomes = useMemo(
    () =>
      recentlyViewedProperties
        .map((propertyId) => properties.find((property) => property.id === propertyId))
        .filter((property): property is Property => Boolean(property))
        .filter((property) => property.id !== selectedMapProperty?.id)
        .slice(0, 3),
    [properties, recentlyViewedProperties, selectedMapProperty?.id]
  );

  const activeFilterCount = useMemo(() => {
    return (
      safeFilters.type.length +
      safeFilters.location.length +
      safeFilters.bedrooms.length +
      safeFilters.bathrooms.length +
      safeFilters.amenities.length +
      safeFilters.availability.length +
      (safeFilters.priceRange[0] > 0 || safeFilters.priceRange[1] < 500000 ? 1 : 0) +
      (safeFilters.areaRange[0] > 0 || safeFilters.areaRange[1] < 10000 ? 1 : 0)
    );
  }, [safeFilters]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilters({ ...DEFAULT_FILTERS });
  };

  const filterPanel = (
    <div className="space-y-4 pb-6">
      <SmartFilters
        filters={safeFilters}
        setFilters={setFilters}
        propertyCount={filteredProperties.length}
        showAdvanced
        compact={false}
        onLocationSearch={async (query) => {
          const result = await geocodeAddress(query);
          if (!result) {
            return [];
          }

          const { lat, lng } = result.coordinates;
          return [{ name: result.formattedAddress, coordinates: [lng, lat] as [number, number] }];
        }}
      />
      <div className="flex flex-wrap justify-end gap-2 px-1">
        <Button variant="outline" className="rounded-full" onClick={handleResetFilters}>
          Reset filters
        </Button>
        <Button className="rounded-full" onClick={() => setIsFilterPanelOpen(false)}>
          Apply filters
        </Button>
      </div>
    </div>
  );

  const renderLoadingSkeletons = () =>
    Array.from({ length: 6 }, (_, index) => (
      <div
        key={`marketplace-skeleton-${index}`}
        className="overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
      >
        <div className="aspect-[4/3] animate-pulse bg-secondary/80" />
        <div className="space-y-3 p-5">
          <div className="h-4 w-1/3 animate-pulse rounded-full bg-secondary/80" />
          <div className="h-6 w-3/4 animate-pulse rounded-full bg-secondary/70" />
          <div className="h-4 w-full animate-pulse rounded-full bg-secondary/60" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }, (_unused, statIndex) => (
              <div
                key={`marketplace-skeleton-stat-${statIndex}`}
                className="h-20 animate-pulse rounded-[20px] bg-secondary/70"
              />
            ))}
          </div>
        </div>
      </div>
    ));

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-28 pt-4 sm:space-y-8 sm:px-6 lg:px-8">
      <section className="air-panel relative overflow-hidden rounded-[32px] px-5 py-5 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
        <div className="theme-page-glow absolute inset-0" />
        <div
          className={`relative grid gap-8 ${hasSpotlightRail ? 'xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] xl:items-center' : ''}`}
        >
          <div className="space-y-6">
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[3.25rem]">
              Search homes
            </h1>

            <form
              onSubmit={handleSearch}
              className="air-search-shell rounded-[30px] p-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1 rounded-[22px] bg-card/60 px-4 py-3">
                  <label htmlFor="marketplace-search" className="sr-only">
                    Search homes
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="marketplace-search"
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="City, neighborhood, amenity, or property name"
                      className="h-7 w-full border-0 bg-transparent pl-7 pr-2 text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSearching}
                  className="btn-primary h-12 rounded-full px-6 text-sm font-semibold"
                >
                  {isSearching ? 'Searching...' : 'Search homes'}
                </Button>
              </div>
            </form>

            {inspirationChips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {inspirationChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() =>
                      recommendations.popularLocations?.includes(chip)
                        ? handleLocationSearch(chip)
                        : handleQuickSearch(chip)
                    }
                    className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-secondary"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="air-surface rounded-[24px] p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Featured homes
                </div>
                <p className="mt-3 text-2xl font-semibold text-foreground">{featuredCount}</p>
              </div>
              <div className="air-surface rounded-[24px] p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  Live areas
                </div>
                <p className="mt-3 text-2xl font-semibold text-foreground">
                  {new Set(
                    filteredProperties.map((property) =>
                      typeof property.location === 'string'
                        ? property.location
                        : property.location?.city || 'Unknown'
                    )
                  ).size || 0}
                </p>
              </div>
              <div className="air-surface rounded-[24px] p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="h-4 w-4 text-primary" />
                  Average rating
                </div>
                <p className="mt-3 text-2xl font-semibold text-foreground">{averageRating || 'New'}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="theme-accent-badge inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
                <Heart className="h-4 w-4" />
                {favoriteProperties.length} saved
              </div>
              <div className="theme-info-badge inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
                <Scale className="h-4 w-4" />
                {comparedHomes.length} in compare
              </div>
            </div>
          </div>

          {hasSpotlightRail ? (
            <div className="air-panel rounded-[32px] p-5 sm:p-6">
              <div className="space-y-3">
                {spotlightProperties.map((property) => (
                  <button
                    key={property.id}
                    type="button"
                    onClick={() => onPropertySelect(property)}
                    className="air-surface-muted flex w-full items-center gap-3 rounded-[24px] p-3 text-left transition hover:bg-secondary/92"
                  >
                    <div className="air-surface h-20 w-20 overflow-hidden rounded-[18px]">
                      {property.images?.[0] ? (
                        <img
                          src={property.images[0]}
                          alt={property.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="air-surface flex h-full w-full items-center justify-center">
                          <BrandMark className="h-12 w-12 rounded-[16px]" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{property.title}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {typeof property.location === 'string'
                          ? property.location
                          : property.location?.city || 'Unknown area'}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>
                          <span className="theme-price-text">
                            {property.pricing?.currency || property.currency || 'GHS'}{' '}
                            {formatPrice(getSortablePrice(property))}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-current text-[color:var(--warning)]" />
                          {property.rating?.toFixed(1) || 'New'}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[32px] border border-border bg-card/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <h2 className="text-2xl font-semibold text-foreground">{filteredProperties.length} homes</h2>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFilterPanelOpen(true)}
              className="h-11 rounded-full border-border bg-card px-5"
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="theme-accent-badge ml-2 rounded-full px-2 py-0.5 text-xs">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {comparedHomes.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => compareSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="h-11 rounded-full border-border bg-card px-5"
              >
                <Scale className="mr-2 h-4 w-4" />
                Compare {comparedHomes.length}
              </Button>
            )}

            <div className="flex w-full items-center justify-between rounded-full border border-border bg-secondary/80 p-1 sm:w-auto sm:justify-start">
              {[
                { value: 'grid', icon: Grid3X3, label: 'Grid' },
                { value: 'list', icon: List, label: 'List' },
                { value: 'map', icon: MapPin, label: 'Map' },
              ].map((option) => {
                const Icon = option.icon;
                const isActive = viewMode === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setViewMode(option.value as typeof viewMode)}
                    className={cn(
                      'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {!isMobile && <span>{option.label}</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex w-full items-center justify-between gap-3 rounded-full border border-border bg-card px-4 py-2 shadow-sm sm:w-auto sm:justify-start">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none sm:flex-none"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="featured">Featured first</option>
                {searchQuery && <option value="relevance">Best match</option>}
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="rating">Top rated</option>
                <option value="newest">Newest listings</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilters({ ...safeFilters, type: [] })}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
              safeFilters.type.length === 0
                ? 'border-transparent bg-secondary text-foreground shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            )}
          >
            All homes
          </button>

          {categoryOptions.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeToggle(type)}
              className={cn(
                'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                safeFilters.type.includes(type)
                  ? 'border-transparent bg-secondary text-foreground shadow-sm'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              )}
            >
              {formatCategoryLabel(type)}
            </button>
          ))}

        </div>
      </section>

      {isMobile ? (
        <Drawer open={isFilterPanelOpen} onOpenChange={setIsFilterPanelOpen}>
          <DrawerContent className="max-h-[92vh] rounded-t-[32px] border-border bg-background">
            <DrawerHeader>
              <DrawerTitle>Filter homes</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4">{filterPanel}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={isFilterPanelOpen} onOpenChange={setIsFilterPanelOpen}>
          <SheetContent className="w-full overflow-y-auto border-l border-border bg-background sm:max-w-3xl">
            <SheetHeader>
              <SheetTitle>Marketplace filters</SheetTitle>
            </SheetHeader>
            <div className="px-4">{filterPanel}</div>
          </SheetContent>
        </Sheet>
      )}

      {viewMode === 'map' ? (
        <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-[32px] border border-border bg-card shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <InteractiveMap
              properties={filteredProperties}
              selectedProperty={selectedMapProperty}
              onPropertySelect={setSelectedMapProperty}
              height={isMobile ? '380px' : '560px'}
              showControls
              showPropertyFilters
            />
          </div>

          <div className="space-y-4">
            {selectedMapProperty ? (
              renderPropertyCard(selectedMapProperty, 0)
            ) : (
              <div className="rounded-[32px] border border-border bg-card p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <MapPin className="mx-auto h-10 w-10 text-primary" />
                <h3 className="mt-4 text-xl font-semibold text-foreground">Select a home on the map</h3>
              </div>
            )}
          </div>
        </section>
      ) : viewMode === 'list' ? (
        <section className="space-y-4">
          {isSearching ? renderLoadingSkeletons() : filteredProperties.map((property, index) => renderPropertyCard(property, index))}
        </section>
      ) : (
        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {isSearching ? renderLoadingSkeletons() : filteredProperties.map((property, index) => renderPropertyCard(property, index))}
        </section>
      )}

      {comparedHomes.length > 0 && (
        <section ref={compareSectionRef} className="rounded-[36px] border border-border bg-card/95 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-6">
          <PropertyComparison
            properties={comparedHomes}
            onClear={clearComparedProperties}
            onRemoveProperty={toggleCompareProperty}
            onSelectProperty={onPropertySelect}
          />
        </section>
      )}

      {savedHomes.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">Saved homes</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {savedHomes.map((property, index) => renderPropertyCard(property, index))}
          </div>
        </section>
      )}

      {recentlyViewedHomes.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Recently viewed</h2>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {recentlyViewedHomes.map((property, index) => renderPropertyCard(property, index))}
          </div>
        </section>
      )}

      {!isSearching && filteredProperties.length === 0 && (
        <section className="rounded-[32px] border border-dashed border-border bg-card px-6 py-12 text-center shadow-sm">
          <Clock className="mx-auto h-10 w-10 text-primary" />
          <h3 className="mt-4 text-xl font-semibold text-foreground">No homes found</h3>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={handleResetFilters} className="rounded-full px-6">
              Reset search
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsFilterPanelOpen(true)}
              className="rounded-full px-6"
            >
              Adjust filters
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                void performSearch('', filters, currentUser?.id, properties);
              }}
              className="rounded-full px-6"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </div>
        </section>
      )}

      {comparedHomes.length > 0 && (
        <div className="fixed inset-x-3 bottom-[6.4rem] z-40 lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-sm">
          <button
            type="button"
            onClick={() => compareSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="wire-navbar flex w-full items-center justify-between gap-3 rounded-[24px] px-4 py-3 text-left"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">Comparison ready</p>
              <p className="wire-navbar-subtle text-xs">{comparedHomes.length} homes selected</p>
            </div>
            <div className="wire-nav-link-active inline-flex h-10 w-10 items-center justify-center rounded-full">
              <Scale className="h-4 w-4" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

export default Marketplace;
