import type { Address, Property } from '../types';

export const getLocationLabel = (location?: Address | string | null): string => {
  if (!location) {
    return 'Location unavailable';
  }

  if (typeof location === 'string') {
    return location;
  }

  const parts = [
    location.address,
    location.street,
    location.city,
    location.region,
    location.country,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'Location unavailable';
};

export const getPropertyCoordinates = (property?: Property | null): [number, number] => {
  if (property?.coordinates && property.coordinates.length === 2) {
    return property.coordinates;
  }

  const addressCoordinates =
    typeof property?.location === 'string' ? undefined : property?.location?.coordinates;

  if (addressCoordinates) {
    return [addressCoordinates.lat, addressCoordinates.lng];
  }

  return [0, 0];
};

export const getPropertyPrice = (property?: Property | null): number => {
  return property?.price ?? property?.pricing?.amount ?? 0;
};
