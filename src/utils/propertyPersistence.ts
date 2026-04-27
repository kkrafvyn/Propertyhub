import type { Property, PropertyFeatures } from '../types';
import type { PropertyDB, UserDB } from '../types/database';
import { getLocationLabel, getPropertyCoordinates } from './location';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const getImages = (property: Partial<Property>): string[] => {
  if (Array.isArray(property.images) && property.images.length > 0) {
    return property.images.filter((image): image is string => typeof image === 'string' && image.trim().length > 0);
  }

  if (Array.isArray(property.media) && property.media.length > 0) {
    return property.media
      .map((item) => item?.url)
      .filter((url): url is string => typeof url === 'string' && url.trim().length > 0);
  }

  return [];
};

const resolveArea = (property: Partial<Property>): number =>
  property.area ??
  property.features?.area ??
  0;

const resolveBedrooms = (property: Partial<Property>): number | undefined =>
  property.bedrooms ?? property.features?.bedrooms;

const resolveBathrooms = (property: Partial<Property>): number | undefined =>
  property.bathrooms ?? property.features?.bathrooms;

const buildFeaturePayload = (property: Partial<Property>): Record<string, unknown> => {
  const baseFeatures: PropertyFeatures = {
    area: resolveArea(property),
    ...(property.features || {}),
  };

  const bedrooms = resolveBedrooms(property);
  const bathrooms = resolveBathrooms(property);

  if (isFiniteNumber(bedrooms)) {
    baseFeatures.bedrooms = bedrooms;
  }

  if (isFiniteNumber(bathrooms)) {
    baseFeatures.bathrooms = bathrooms;
  }

  return baseFeatures as unknown as Record<string, unknown>;
};

export const serializePropertyForCreate = (
  property: Property,
  ownerId: string
): Partial<PropertyDB> => {
  const images = getImages(property);
  const [latitude, longitude] = getPropertyCoordinates(property);

  return {
    owner_id: ownerId || property.ownerId,
    title: property.title,
    description: property.description,
    type: property.type || 'apartment',
    listing_type: property.listingType || 'rent',
    status:
      property.status || (property.available === false ? 'maintenance' : 'available'),
    price: property.price ?? property.pricing?.amount ?? 0,
    currency: property.currency ?? property.pricing?.currency ?? 'GHS',
    period: property.pricing?.period,
    bedrooms: resolveBedrooms(property),
    bathrooms: resolveBathrooms(property),
    area: resolveArea(property),
    location: getLocationLabel(property.location),
    latitude: latitude || undefined,
    longitude: longitude || undefined,
    amenities: property.amenities || [],
    features: buildFeaturePayload(property),
    images,
    cover_image: images[0],
    rating: property.rating ?? 0,
    review_count: property.reviews ?? 0,
    views: property.views ?? 0,
    featured: property.featured ?? false,
  };
};

export const serializePropertyForUpdate = (
  updates: Partial<Property>
): Partial<PropertyDB> => {
  const payload: Partial<PropertyDB> = {};

  if ('title' in updates && typeof updates.title === 'string') {
    payload.title = updates.title;
  }

  if ('description' in updates && typeof updates.description === 'string') {
    payload.description = updates.description;
  }

  if ('type' in updates && typeof updates.type === 'string') {
    payload.type = updates.type;
  }

  if ('listingType' in updates && typeof updates.listingType === 'string') {
    payload.listing_type = updates.listingType;
  }

  if ('status' in updates && typeof updates.status === 'string') {
    payload.status = updates.status;
  } else if ('available' in updates && typeof updates.available === 'boolean') {
    payload.status = updates.available ? 'available' : 'maintenance';
  }

  if ('price' in updates || 'pricing' in updates) {
    payload.price = updates.price ?? updates.pricing?.amount ?? undefined;
  }

  if ('currency' in updates || 'pricing' in updates) {
    payload.currency = updates.currency ?? updates.pricing?.currency ?? undefined;
  }

  if ('pricing' in updates && updates.pricing?.period) {
    payload.period = updates.pricing.period;
  }

  if ('bedrooms' in updates || 'features' in updates) {
    payload.bedrooms = resolveBedrooms(updates);
  }

  if ('bathrooms' in updates || 'features' in updates) {
    payload.bathrooms = resolveBathrooms(updates);
  }

  if ('area' in updates || 'features' in updates) {
    payload.area = resolveArea(updates);
  }

  if ('location' in updates) {
    payload.location = getLocationLabel(updates.location);
  }

  if ('location' in updates || 'coordinates' in updates) {
    const [latitude, longitude] = getPropertyCoordinates(updates as Property);
    payload.latitude = latitude || undefined;
    payload.longitude = longitude || undefined;
  }

  if ('amenities' in updates && Array.isArray(updates.amenities)) {
    payload.amenities = updates.amenities;
  }

  if ('features' in updates || 'bedrooms' in updates || 'bathrooms' in updates || 'area' in updates) {
    payload.features = buildFeaturePayload(updates);
  }

  if ('images' in updates || 'media' in updates) {
    const images = getImages(updates);
    payload.images = images;
    payload.cover_image = images[0];
  }

  if ('featured' in updates && typeof updates.featured === 'boolean') {
    payload.featured = updates.featured;
  }

  if ('views' in updates && isFiniteNumber(updates.views)) {
    payload.views = updates.views;
  }

  if ('rating' in updates && isFiniteNumber(updates.rating)) {
    payload.rating = updates.rating;
  }

  if ('reviews' in updates && isFiniteNumber(updates.reviews)) {
    payload.review_count = updates.reviews;
  }

  return payload;
};

export const serializeUserProfileUpdate = (
  updates: Partial<UserDB & { preferences?: UserDB['preferences'] }>
): Partial<UserDB> => {
  const payload: Partial<UserDB> = {};

  if ('email' in updates && typeof updates.email === 'string') payload.email = updates.email;
  if ('name' in updates && typeof updates.name === 'string') payload.name = updates.name;
  if ('role' in updates && typeof updates.role === 'string') payload.role = updates.role;
  if ('status' in updates && typeof updates.status === 'string') payload.status = updates.status;
  if ('avatar' in updates && typeof updates.avatar === 'string') payload.avatar = updates.avatar;
  if ('bio' in updates) payload.bio = updates.bio;
  if ('phone' in updates) payload.phone = updates.phone;
  if ('verified' in updates && typeof updates.verified === 'boolean') payload.verified = updates.verified;
  if ('preferences' in updates && updates.preferences) payload.preferences = updates.preferences;

  return payload;
};
