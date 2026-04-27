import { Property, PropertyFilters } from '../types';
import { getLocationLabel, getPropertyPrice } from './location';

export const formatPrice = (price: number): string => {
  if (!Number.isFinite(price)) {
    return '0';
  }

  return new Intl.NumberFormat('en-NG', {
    maximumFractionDigits: 0,
  }).format(price);
};

export const applyPropertyFilters = (
  properties: Property[], 
  filters: PropertyFilters,
  searchQuery?: string
): Property[] => {
  return properties.filter(property => {
    // Search filter (optional)
    if (searchQuery && 
        !property.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !getLocationLabel(property.location).toLowerCase().includes(searchQuery.toLowerCase()) &&
        !property.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Apply all other filters...
    return applyAllFilters(property, filters);
  });
};

// Helper function for applying filters
const applyAllFilters = (property: Property, filters: PropertyFilters): boolean => {
    // Type filter - handle both array and string formats
    if (Array.isArray(filters.type) && filters.type.length > 0 && !filters.type.includes(property.type)) {
      return false;
    }

    // Price range filter
    const propertyPrice = getPropertyPrice(property);
    if (propertyPrice < filters.priceRange[0] || propertyPrice > filters.priceRange[1]) {
      return false;
    }

    // Location filter - handle both array and string formats
    if (Array.isArray(filters.location) && filters.location.length > 0 && 
        !filters.location.some(loc => 
          getLocationLabel(property.location).toLowerCase().includes(loc.toLowerCase())
        )) {
      return false;
    }

    // Bedrooms filter - handle both array and number formats
    if (Array.isArray(filters.bedrooms) && filters.bedrooms.length > 0 && property.bedrooms) {
      const hasMatchingBedrooms = filters.bedrooms.some(bedCount => {
        if (bedCount === 'any') return true;
        if (bedCount === '4+' || bedCount === '5+') {
          const minimumBedrooms = parseInt(String(bedCount), 10);
          return property.bedrooms! >= minimumBedrooms;
        }
        return property.bedrooms === parseInt(bedCount.toString());
      });
      if (!hasMatchingBedrooms) return false;
    }

    // Bathrooms filter - handle both array and number formats
    if (Array.isArray(filters.bathrooms) && filters.bathrooms.length > 0 && property.bathrooms) {
      const hasMatchingBathrooms = filters.bathrooms.some(bathCount => {
        if (bathCount === 'any') return true;
        if (bathCount === '3+' || bathCount === '4+') {
          const minimumBathrooms = parseInt(String(bathCount), 10);
          return property.bathrooms! >= minimumBathrooms;
        }
        return property.bathrooms === parseInt(bathCount.toString());
      });
      if (!hasMatchingBathrooms) return false;
    }

    // Area filter - handle both areaRange and minArea/maxArea
    if (filters.areaRange && filters.areaRange.length === 2) {
      if (property.area < filters.areaRange[0] || property.area > filters.areaRange[1]) {
        return false;
      }
    }

    // Amenities filter
    if (filters.amenities && filters.amenities.length > 0) {
      const hasMatchingAmenities = filters.amenities.every(amenity =>
        property.amenities.some(propAmenity =>
          propAmenity.toLowerCase().includes(amenity.toLowerCase())
        )
      );
      if (!hasMatchingAmenities) return false;
    }

    // Availability filter
    if (filters.availability && filters.availability.length > 0) {
      const propertyStatus = String(property.status || '').toLowerCase();
      const isAvailable = property.available ?? propertyStatus === 'available';
      const hasMatchingAvailability = filters.availability.some(status => {
        const normalizedStatus = status.toLowerCase();

        if (normalizedStatus === 'available' || normalizedStatus === 'available now') {
          return isAvailable || propertyStatus === 'available';
        }

        if (normalizedStatus === 'coming-soon') {
          return propertyStatus === 'pending' || propertyStatus === 'coming-soon';
        }

        if (normalizedStatus === 'reserved') {
          return propertyStatus === 'reserved';
        }

        if (normalizedStatus === 'unavailable') {
          return !isAvailable;
        }

        if (normalizedStatus === propertyStatus) {
          return true;
        }

        return true;
      });
      if (!hasMatchingAvailability) return false;
    }

    return true;
  };

// Legacy export for backward compatibility
export const filterProperties = (
  properties: Property[], 
  searchQuery: string, 
  filters: PropertyFilters
): Property[] => {
  return applyPropertyFilters(properties, filters, searchQuery);
};
