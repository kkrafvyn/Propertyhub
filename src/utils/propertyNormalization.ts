import type { Address, Property, PropertyFeatures, PropertyMedia } from '../types';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const asOptionalNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const asOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];

const asDefined = <T>(value: T | null): value is T => value !== null;

const getCoordinates = (property: UnknownRecord): [number, number] | undefined => {
  if (
    Array.isArray(property.coordinates) &&
    property.coordinates.length === 2 &&
    typeof property.coordinates[0] === 'number' &&
    typeof property.coordinates[1] === 'number'
  ) {
    return [property.coordinates[0], property.coordinates[1]];
  }

  if (typeof property.latitude === 'number' && typeof property.longitude === 'number') {
    return [property.latitude, property.longitude];
  }

  if (isRecord(property.location) && isRecord(property.location.coordinates)) {
    const { lat, lng } = property.location.coordinates;
    if (typeof lat === 'number' && typeof lng === 'number') {
      return [lat, lng];
    }
  }

  return undefined;
};

const getLocation = (property: UnknownRecord, coordinates?: [number, number]): Address | string => {
  const rawLocation = property.location;

  if (typeof rawLocation === 'string' && rawLocation.trim().length > 0) {
    return rawLocation;
  }

  if (isRecord(rawLocation)) {
    const city = asString(rawLocation.city, 'Unknown area');
    const region = asString(rawLocation.region, '');
    const country = asString(rawLocation.country, '');

    return {
      address: asString(rawLocation.address, asString(rawLocation.street)),
      street: asString(rawLocation.street),
      city,
      region,
      country,
      postalCode: asString(rawLocation.postalCode),
      landmark: asString(rawLocation.landmark),
      coordinates:
        coordinates && coordinates.length === 2
          ? { lat: coordinates[0], lng: coordinates[1] }
          : undefined,
    };
  }

  return 'Location unavailable';
};

const getFeatures = (property: UnknownRecord, area: number, bedrooms?: number, bathrooms?: number): PropertyFeatures => {
  const rawFeatures = isRecord(property.features) ? property.features : {};

  return {
    area,
    bedrooms: asNumber(rawFeatures.bedrooms, bedrooms ?? 0) || bedrooms,
    bathrooms: asNumber(rawFeatures.bathrooms, bathrooms ?? 0) || bathrooms,
    lotSize: asOptionalNumber(rawFeatures.lotSize),
    floors: asOptionalNumber(rawFeatures.floors),
    parking: typeof rawFeatures.parking === 'boolean' ? rawFeatures.parking : undefined,
    parkingSpaces: asOptionalNumber(rawFeatures.parkingSpaces),
    furnished: typeof rawFeatures.furnished === 'boolean' ? rawFeatures.furnished : undefined,
    petFriendly: typeof rawFeatures.petFriendly === 'boolean' ? rawFeatures.petFriendly : undefined,
    garden: typeof rawFeatures.garden === 'boolean' ? rawFeatures.garden : undefined,
    balcony: typeof rawFeatures.balcony === 'boolean' ? rawFeatures.balcony : undefined,
    elevator: typeof rawFeatures.elevator === 'boolean' ? rawFeatures.elevator : undefined,
    accessibility: typeof rawFeatures.accessibility === 'boolean' ? rawFeatures.accessibility : undefined,
  };
};

const getMedia = (property: UnknownRecord, images: string[]): PropertyMedia[] => {
  if (Array.isArray(property.media)) {
    const mappedMedia = property.media
      .map((item, index) => {
        if (!isRecord(item)) return null;

        const url = asString(item.url);
        if (!url) return null;

        const media: PropertyMedia = {
          id: asString(item.id, `${asString(property.id, 'property')}-media-${index}`),
          url,
          type:
            item.type === 'video' || item.type === '360_tour'
              ? item.type
              : 'image',
          order: asNumber(item.order, index),
        };

        const caption = asOptionalString(item.caption);
        if (caption) {
          media.caption = caption;
        }

        const thumbnail = asOptionalString(item.thumbnail);
        if (thumbnail) {
          media.thumbnail = thumbnail;
        }

        return media;
      })
      .filter(asDefined);

    if (mappedMedia.length > 0) {
      return mappedMedia;
    }
  }

  return images.map((url, index) => ({
    id: `${asString(property.id, 'property')}-image-${index}`,
    url,
    type: 'image',
    order: index,
  }));
};

export const normalizeProperty = (value: unknown): Property => {
  const property: UnknownRecord = isRecord(value) ? value : {};
  const id = asString(property.id, `property-${Date.now()}`);
  const title = asString(property.title, 'Untitled property');
  const description = asString(property.description, 'Property details will appear here soon.');
  const amount = asNumber(
    isRecord(property.pricing) ? property.pricing.amount : property.price,
    0
  );
  const bedrooms = asNumber(property.bedrooms, isRecord(property.features) ? asNumber(property.features.bedrooms) : 0) || undefined;
  const bathrooms = asNumber(property.bathrooms, isRecord(property.features) ? asNumber(property.features.bathrooms) : 0) || undefined;
  const area = asNumber(property.area, isRecord(property.features) ? asNumber(property.features.area) : 0);
  const images = asStringArray(property.images);
  const coordinates = getCoordinates(property);
  const features = getFeatures(property, area, bedrooms, bathrooms);
  const status = asString(
    property.status,
    asBoolean(property.available, true) ? 'available' : 'maintenance'
  );

  return {
    id,
    title,
    description,
    type: asString(property.type, 'property'),
    listingType: asString(property.listingType ?? property['listing_type'], 'rent'),
    status,
    pricing: {
      amount,
      currency: asString(
        isRecord(property.pricing) ? property.pricing.currency : property.currency,
        'GHS'
      ),
      period: asString(isRecord(property.pricing) ? property.pricing.period : property['period']) as
        | 'monthly'
        | 'yearly'
        | 'daily'
        | undefined,
      deposit: isRecord(property.pricing) ? asOptionalNumber(property.pricing.deposit) : undefined,
      commission: isRecord(property.pricing) ? asOptionalNumber(property.pricing.commission) : undefined,
      negotiable: isRecord(property.pricing) ? asBoolean(property.pricing.negotiable, false) : false,
      priceHistory:
        isRecord(property.pricing) && Array.isArray(property.pricing.priceHistory)
          ? (property.pricing.priceHistory as Property['pricing']['priceHistory'])
          : undefined,
    },
    location: getLocation(property, coordinates),
    features,
    amenities: asStringArray(property.amenities),
    media: getMedia(property, images),
    ownerId: asString(property.ownerId ?? property['owner_id'], ''),
    managerId: asOptionalString(property.managerId ?? property['manager_id']),
    agentId: asOptionalString(property.agentId ?? property['agent_id']),
    createdAt: asString(property.createdAt ?? property['created_at'], new Date().toISOString()),
    updatedAt: asString(property.updatedAt ?? property['updated_at'], asString(property.createdAt ?? property['created_at'], new Date().toISOString())),
    publishedAt: asOptionalString(property.publishedAt ?? property['published_at']),
    views: asNumber(property.views, 0),
    favorites: asNumber(property.favorites, 0),
    inquiries: asNumber(property.inquiries, 0),
    tags: asStringArray(property.tags),
    seoTitle: asOptionalString(property.seoTitle ?? property['seo_title']),
    seoDescription: asOptionalString(property.seoDescription ?? property['seo_description']),
    price: asNumber(property.price, amount),
    currency: asString(property.currency, asString(isRecord(property.pricing) ? property.pricing.currency : undefined, 'GHS')),
    images,
    rating: asNumber(property.rating, 0),
    reviews: asNumber(property.reviews ?? property['review_count'], 0),
    featured: asBoolean(property.featured, false),
    available: typeof property.available === 'boolean' ? property.available : status === 'available',
    area,
    bedrooms,
    bathrooms,
    owner: asOptionalString(property.owner ?? property['ownerName']),
    coordinates,
    relevanceScore: asNumber(property.relevanceScore, 0),
  };
};

export const normalizeProperties = (properties: unknown[] = []): Property[] =>
  properties.map((property) => normalizeProperty(property));
