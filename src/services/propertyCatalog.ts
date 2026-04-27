import type { Property, SearchFilters } from '../types';
import { normalizeProperties, normalizeProperty } from '../utils/propertyNormalization';
import { propertyService } from './supabaseApi';
import { isSupabaseConfigured } from './supabaseClient';

export interface PropertyCatalogParams {
  limit?: number;
  offset?: number;
  ownerId?: string;
}

export interface PropertySearchParams {
  query: string;
  filters: SearchFilters;
}

export const propertyQueryKeys = {
  all: ['properties'] as const,
  catalog: (params: PropertyCatalogParams = {}) => ['properties', 'catalog', params] as const,
  detail: (propertyId: string) => ['properties', 'detail', propertyId] as const,
  search: (params: PropertySearchParams) => ['properties', 'search', params] as const,
};

const getPropertyPrice = (property: Property): number => property.pricing?.amount ?? property.price ?? 0;

const getLocationLabel = (property: Property): string =>
  typeof property.location === 'string'
    ? property.location
    : [
        property.location.address,
        property.location.city,
        property.location.region,
        property.location.country,
      ]
        .filter(Boolean)
        .join(', ');

const sortProperties = (properties: Property[], sortBy: SearchFilters['sortBy']): Property[] => {
  const sorted = [...properties];

  switch (sortBy) {
    case 'price_asc':
      return sorted.sort((a, b) => getPropertyPrice(a) - getPropertyPrice(b));
    case 'price_desc':
      return sorted.sort((a, b) => getPropertyPrice(b) - getPropertyPrice(a));
    case 'date_asc':
      return sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case 'popularity':
      return sorted.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    case 'distance':
      return sorted;
    case 'date_desc':
    default:
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
};

export const hasMeaningfulSearchFilters = (filters: SearchFilters): boolean =>
  Boolean(
    filters.city ||
      filters.region ||
      filters.coordinates ||
      filters.type?.length ||
      filters.listingType?.length ||
      filters.priceRange ||
      filters.bedrooms?.min !== undefined ||
      filters.bedrooms?.max !== undefined ||
      filters.bathrooms?.min !== undefined ||
      filters.bathrooms?.max !== undefined ||
      filters.area?.min !== undefined ||
      filters.area?.max !== undefined ||
      filters.amenities?.length ||
      filters.features?.length ||
      filters.availableFrom ||
      filters.availableTo ||
      filters.furnished !== undefined ||
      filters.petFriendly !== undefined ||
      filters.verified !== undefined
  );

export const filterPropertiesLocally = (
  properties: Property[],
  query: string,
  filters: SearchFilters
): Property[] => {
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = properties.filter((property) => {
    const locationLabel = getLocationLabel(property).toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      property.title.toLowerCase().includes(normalizedQuery) ||
      property.description.toLowerCase().includes(normalizedQuery) ||
      locationLabel.includes(normalizedQuery);

    const price = getPropertyPrice(property);
    const bedrooms = property.features?.bedrooms ?? property.bedrooms ?? 0;
    const bathrooms = property.features?.bathrooms ?? property.bathrooms ?? 0;
    const area = property.features?.area ?? property.area ?? 0;

    const matchesType = !filters.type?.length || filters.type.includes(property.type);
    const matchesListingType =
      !filters.listingType?.length || filters.listingType.includes(property.listingType);
    const matchesCity = !filters.city || locationLabel.includes(filters.city.toLowerCase());
    const matchesRegion = !filters.region || locationLabel.includes(filters.region.toLowerCase());
    const matchesPrice =
      !filters.priceRange ||
      (price >= filters.priceRange.min && price <= filters.priceRange.max);
    const matchesBedrooms =
      (!filters.bedrooms?.min || bedrooms >= filters.bedrooms.min) &&
      (!filters.bedrooms?.max || bedrooms <= filters.bedrooms.max);
    const matchesBathrooms =
      (!filters.bathrooms?.min || bathrooms >= filters.bathrooms.min) &&
      (!filters.bathrooms?.max || bathrooms <= filters.bathrooms.max);
    const matchesArea =
      (!filters.area?.min || area >= filters.area.min) &&
      (!filters.area?.max || area <= filters.area.max);
    const matchesAmenities =
      !filters.amenities?.length ||
      filters.amenities.every((amenity) => property.amenities.includes(amenity));
    const matchesFeatures =
      !filters.features?.length ||
      filters.features.every((feature) => Boolean(property.features?.[feature]));
    const matchesFurnished =
      filters.furnished === undefined || Boolean(property.features?.furnished) === filters.furnished;
    const matchesPetFriendly =
      filters.petFriendly === undefined ||
      Boolean(property.features?.petFriendly) === filters.petFriendly;

    return (
      matchesQuery &&
      matchesType &&
      matchesListingType &&
      matchesCity &&
      matchesRegion &&
      matchesPrice &&
      matchesBedrooms &&
      matchesBathrooms &&
      matchesArea &&
      matchesAmenities &&
      matchesFeatures &&
      matchesFurnished &&
      matchesPetFriendly
    );
  });

  return sortProperties(filtered, filters.sortBy);
};

export const fetchPropertyCatalog = async (
  params: PropertyCatalogParams = {}
): Promise<Property[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = params.ownerId
    ? await propertyService.getPropertiesByOwner(params.ownerId)
    : await propertyService.getProperties({
        limit: params.limit ?? 100,
        offset: params.offset ?? 0,
      });

  if (error) {
    throw error;
  }

  return normalizeProperties((data || []) as Record<string, unknown>[]);
};

export const fetchPropertyDetail = async (propertyId: string): Promise<Property | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await propertyService.getProperty(propertyId);

  if (error) {
    throw error;
  }

  return data ? normalizeProperty(data as Record<string, unknown>) : null;
};

export const fetchPropertySearch = async (
  params: PropertySearchParams
): Promise<Property[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await propertyService.searchProperties(params);

  if (error) {
    throw error;
  }

  return normalizeProperties((data || []) as Record<string, unknown>[]);
};
