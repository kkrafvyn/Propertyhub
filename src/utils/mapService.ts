import type { LocationData } from '../types';
import { googleMapsService } from './googleMaps';

export type MapDisplayProvider = 'mapbox' | 'google' | 'fallback';
export type MapPreviewKind = 'image' | 'iframe';
export type MapDisplayMode = 'roadmap' | 'satellite';

export interface MapPreviewSource {
  kind: MapPreviewKind;
  provider: MapDisplayProvider;
  src: string;
}

export interface MapGeocodeResult {
  formattedAddress: string;
  coordinates: { lat: number; lng: number };
}

export interface MapRouteStep {
  instruction: string;
  distance: string;
  duration: string;
  maneuver: string;
  location: { lat: number; lng: number };
}

export interface MapRouteDetails {
  distance: string;
  duration: string;
  steps: MapRouteStep[];
  overview: string;
  polyline?: string;
}

export interface MapNearbyPlace {
  name: string;
  type: string;
  distance: number;
  rating?: number;
  vicinity: string;
  placeId: string;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || '';
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() || '';
const MAP_DISPLAY_PROVIDER = import.meta.env.VITE_MAP_DISPLAY_PROVIDER?.trim().toLowerCase() || '';

const hasValue = (value: string): boolean => value.trim().length > 0;

const formatDistance = (distanceInMeters: number): string => {
  if (!Number.isFinite(distanceInMeters) || distanceInMeters <= 0) {
    return '';
  }

  if (distanceInMeters >= 1000) {
    return `${(distanceInMeters / 1000).toFixed(distanceInMeters >= 10000 ? 0 : 1)} km`;
  }

  return `${Math.round(distanceInMeters)} m`;
};

const formatDuration = (durationInSeconds: number): string => {
  if (!Number.isFinite(durationInSeconds) || durationInSeconds <= 0) {
    return '';
  }

  const hours = Math.floor(durationInSeconds / 3600);
  const minutes = Math.round((durationInSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${Math.max(minutes, 1)}m`;
};

const getOriginCoordinates = (
  origin: LocationData | { lat: number; lng: number }
): { lat: number; lng: number } =>
  'latitude' in origin
    ? { lat: origin.latitude, lng: origin.longitude }
    : origin;

export const hasGoogleMapsProvider = (): boolean => hasValue(GOOGLE_MAPS_API_KEY);

export const hasMapboxProvider = (): boolean => hasValue(MAPBOX_ACCESS_TOKEN);

export const getMapDisplayProvider = (): MapDisplayProvider => {
  if (MAP_DISPLAY_PROVIDER === 'google' && hasGoogleMapsProvider()) {
    return 'google';
  }

  if (MAP_DISPLAY_PROVIDER === 'mapbox' && hasMapboxProvider()) {
    return 'mapbox';
  }

  if (hasMapboxProvider()) {
    return 'mapbox';
  }

  if (hasGoogleMapsProvider()) {
    return 'google';
  }

  return 'fallback';
};

export const getAvailableMapProviders = (): MapDisplayProvider[] => {
  const providers: MapDisplayProvider[] = [];

  if (hasMapboxProvider()) {
    providers.push('mapbox');
  }

  if (hasGoogleMapsProvider()) {
    providers.push('google');
  }

  if (providers.length === 0) {
    providers.push('fallback');
  }

  return providers;
};

export const buildMapPreviewSource = (
  latitude: number,
  longitude: number,
  mapType: MapDisplayMode,
  dimensions: { width?: number; height?: number } = {}
): MapPreviewSource | null => {
  if (!latitude && !longitude) {
    return null;
  }

  const width = Math.max(320, Math.min(Math.round(dimensions.width || 1200), 1280));
  const height = Math.max(240, Math.min(Math.round(dimensions.height || 800), 1280));
  const provider = getMapDisplayProvider();

  if (provider === 'mapbox') {
    const styleId = mapType === 'satellite' ? 'satellite-streets-v12' : 'streets-v12';
    return {
      kind: 'image',
      provider,
      src: `https://api.mapbox.com/styles/v1/mapbox/${styleId}/static/pin-s+0f172a(${longitude},${latitude})/${longitude},${latitude},14,0/${width}x${height}@2x?access_token=${MAPBOX_ACCESS_TOKEN}`,
    };
  }

  if (provider === 'google') {
    return {
      kind: 'iframe',
      provider,
      src: `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed&t=${mapType === 'satellite' ? 'k' : 'm'}`,
    };
  }

  return null;
};

export const buildExternalMapUrl = (latitude: number, longitude: number): string => {
  if (hasGoogleMapsProvider()) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }

  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`;
};

export const buildExternalDirectionsUrl = (
  destination: { lat: number; lng: number },
  origin?: { lat: number; lng: number }
): string => {
  if (hasGoogleMapsProvider()) {
    const originQuery = origin ? `&origin=${origin.lat},${origin.lng}` : '';
    return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}${originQuery}&travelmode=driving`;
  }

  if (origin) {
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${origin.lat}%2C${origin.lng}%3B${destination.lat}%2C${destination.lng}`;
  }

  return buildExternalMapUrl(destination.lat, destination.lng);
};

const geocodeWithMapbox = async (address: string): Promise<MapGeocodeResult | null> => {
  if (!hasMapboxProvider()) return null;

  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      address
    )}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`
  );

  if (!response.ok) {
    throw new Error(`Mapbox geocoding failed with status ${response.status}`);
  }

  const payload = await response.json();
  const feature = payload?.features?.[0];

  if (!feature?.center || !Array.isArray(feature.center) || feature.center.length < 2) {
    return null;
  }

  return {
    formattedAddress: feature.place_name || address,
    coordinates: {
      lat: feature.center[1],
      lng: feature.center[0],
    },
  };
};

export const geocodeAddressWithAvailableProvider = async (
  address: string
): Promise<MapGeocodeResult | null> => {
  if (hasGoogleMapsProvider()) {
    try {
      const coordinates = await googleMapsService.geocodeAddress(address);
      return {
        formattedAddress: address,
        coordinates,
      };
    } catch (error) {
      console.warn('Google geocoding failed, falling back to Mapbox when available:', error);
    }
  }

  return geocodeWithMapbox(address);
};

const calculateRouteWithMapbox = async (
  origin: LocationData | { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<MapRouteDetails> => {
  if (!hasMapboxProvider()) {
    throw new Error('Mapbox is not configured.');
  }

  const normalizedOrigin = getOriginCoordinates(origin);
  const response = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${normalizedOrigin.lng},${normalizedOrigin.lat};${destination.lng},${destination.lat}?alternatives=false&geometries=polyline&language=en&overview=full&steps=true&access_token=${MAPBOX_ACCESS_TOKEN}`
  );

  if (!response.ok) {
    throw new Error(`Mapbox directions failed with status ${response.status}`);
  }

  const payload = await response.json();
  const route = payload?.routes?.[0];
  const leg = route?.legs?.[0];

  if (!route || !leg) {
    throw new Error('Mapbox directions did not return a route.');
  }

  return {
    distance: formatDistance(route.distance),
    duration: formatDuration(route.duration),
    steps: (leg.steps || []).map((step: any) => ({
      instruction: step?.maneuver?.instruction || 'Continue',
      distance: formatDistance(step?.distance || 0),
      duration: formatDuration(step?.duration || 0),
      maneuver: step?.maneuver?.type || 'straight',
      location: {
        lat: step?.maneuver?.location?.[1] || normalizedOrigin.lat,
        lng: step?.maneuver?.location?.[0] || normalizedOrigin.lng,
      },
    })),
    overview: route.legs?.[0]?.summary || 'Route available',
    polyline: route.geometry,
  };
};

export const calculateRouteWithAvailableProvider = async (
  origin: LocationData | { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<MapRouteDetails> => {
  if (hasGoogleMapsProvider()) {
    return googleMapsService.calculateRoute(origin, destination);
  }

  return calculateRouteWithMapbox(origin, destination);
};

export const searchNearbyPlacesWithAvailableProvider = async (
  location: { lat: number; lng: number },
  radius = 1000,
  types?: string[]
): Promise<MapNearbyPlace[]> => {
  if (hasGoogleMapsProvider()) {
    return googleMapsService.searchNearbyPlaces(location, radius, types);
  }

  return [];
};
