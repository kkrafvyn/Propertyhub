import { LocationData } from '../types';

// Google Maps API configuration
const GOOGLE_MAPS_API_KEY = 'AIzaSyC4slId_coCqTJDDDRyhjkDgHtIlOWNojU';
const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-script';

// Global interface for Google Maps
declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps: () => void;
  }
}

interface DirectionsResponse {
  distance: string;
  duration: string;
  steps: DirectionStep[];
  overview: string;
  polyline: string;
  legs: google.maps.DirectionsLeg[];
}

interface DirectionStep {
  instruction: string;
  distance: string;
  duration: string;
  maneuver: string;
  location: { lat: number; lng: number };
}

interface NearbyPlace {
  name: string;
  type: string;
  distance: number;
  rating?: number;
  vicinity: string;
  placeId: string;
}

class GoogleMapsService {
  private static instance: GoogleMapsService;
  private map: google.maps.Map | null = null;
  private directionsService: google.maps.DirectionsService | null = null;
  private directionsRenderer: google.maps.DirectionsRenderer | null = null;
  private placesService: google.maps.places.PlacesService | null = null;
  private geocoder: google.maps.Geocoder | null = null;
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): GoogleMapsService {
    if (!GoogleMapsService.instance) {
      GoogleMapsService.instance = new GoogleMapsService();
    }
    return GoogleMapsService.instance;
  }

  async loadGoogleMaps(): Promise<void> {
    if (this.isLoaded) return;
    
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise((resolve, reject) => {
      // Check if script already exists
      const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
      if (existingScript) {
        if (window.google && window.google.maps) {
          this.initializeServices();
          this.isLoaded = true;
          resolve();
          return;
        }
      }

      // Create script element
      const script = document.createElement('script');
      script.id = GOOGLE_MAPS_SCRIPT_ID;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;

      // Set up callback
      window.initGoogleMaps = () => {
        this.initializeServices();
        this.isLoaded = true;
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Failed to load Google Maps API'));
      };

      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  private initializeServices(): void {
    if (!window.google?.maps) return;

    this.directionsService = new google.maps.DirectionsService();
    this.directionsRenderer = new google.maps.DirectionsRenderer({
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#4285f4',
        strokeWeight: 5,
        strokeOpacity: 0.8,
      },
    });
    this.geocoder = new google.maps.Geocoder();
  }

  async createMap(container: HTMLElement, center: { lat: number; lng: number }, zoom: number = 13): Promise<google.maps.Map> {
    await this.loadGoogleMaps();

    const mapOptions: google.maps.MapOptions = {
      center,
      zoom,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: true,
      scaleControl: true,
      streetViewControl: true,
      rotateControl: true,
      fullscreenControl: true,
      gestureHandling: 'auto',
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
      ],
    };

    this.map = new google.maps.Map(container, mapOptions);
    this.placesService = new google.maps.places.PlacesService(this.map);

    return this.map;
  }

  async calculateRoute(
    origin: LocationData | { lat: number; lng: number },
    destination: { lat: number; lng: number },
    travelMode: google.maps.TravelMode = google.maps.TravelMode.DRIVING
  ): Promise<DirectionsResponse> {
    await this.loadGoogleMaps();

    if (!this.directionsService) {
      throw new Error('Directions service not initialized');
    }

    const originLatLng = 'latitude' in origin 
      ? { lat: origin.latitude, lng: origin.longitude }
      : origin;

    return new Promise((resolve, reject) => {
      this.directionsService!.route(
        {
          origin: originLatLng,
          destination: destination,
          travelMode: travelMode,
          unitSystem: google.maps.UnitSystem.METRIC,
          avoidHighways: false,
          avoidTolls: false,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            const route = result.routes[0];
            const leg = route.legs[0];

            const steps: DirectionStep[] = leg.steps.map((step, index) => ({
              instruction: step.instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
              distance: step.distance?.text || '',
              duration: step.duration?.text || '',
              maneuver: this.getManeuverType(step.maneuver),
              location: {
                lat: step.start_location.lat(),
                lng: step.start_location.lng(),
              },
            }));

            resolve({
              distance: leg.distance?.text || '',
              duration: leg.duration?.text || '',
              steps,
              overview: `Route via ${route.summary}`,
              polyline: route.overview_polyline,
              legs: result.routes[0].legs,
            });
          } else {
            reject(new Error(`Directions request failed: ${status}`));
          }
        }
      );
    });
  }

  private getManeuverType(maneuver?: string): string {
    const maneuverMap: { [key: string]: string } = {
      'turn-left': 'turn-left',
      'turn-right': 'turn-right',
      'turn-slight-left': 'turn-slight-left',
      'turn-slight-right': 'turn-slight-right',
      'turn-sharp-left': 'turn-sharp-left',
      'turn-sharp-right': 'turn-sharp-right',
      'uturn-left': 'u-turn',
      'uturn-right': 'u-turn',
      'straight': 'straight',
      'ramp-left': 'ramp-left',
      'ramp-right': 'ramp-right',
      'merge': 'merge',
      'fork-left': 'fork-left',
      'fork-right': 'fork-right',
      'roundabout-left': 'roundabout',
      'roundabout-right': 'roundabout',
    };

    return maneuverMap[maneuver || ''] || 'straight';
  }

  async geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
    await this.loadGoogleMaps();

    if (!this.geocoder) {
      throw new Error('Geocoder not initialized');
    }

    return new Promise((resolve, reject) => {
      this.geocoder!.geocode({ address }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng(),
          });
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  }

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    await this.loadGoogleMaps();

    if (!this.geocoder) {
      throw new Error('Geocoder not initialized');
    }

    return new Promise((resolve, reject) => {
      this.geocoder!.geocode(
        { location: { lat, lng } },
        (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
            resolve(results[0].formatted_address);
          } else {
            reject(new Error(`Reverse geocoding failed: ${status}`));
          }
        }
      );
    });
  }

  async searchNearbyPlaces(
    location: { lat: number; lng: number },
    radius: number = 1000,
    types: string[] = ['restaurant', 'gas_station', 'hospital', 'school']
  ): Promise<NearbyPlace[]> {
    await this.loadGoogleMaps();

    if (!this.placesService) {
      throw new Error('Places service not initialized');
    }

    return new Promise((resolve, reject) => {
      const request: google.maps.places.PlaceSearchRequest = {
        location: new google.maps.LatLng(location.lat, location.lng),
        radius,
        types,
      };

      this.placesService!.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const places: NearbyPlace[] = results.slice(0, 10).map((place) => ({
            name: place.name || 'Unknown',
            type: place.types?.[0] || 'place',
            distance: this.calculateDistance(
              location,
              {
                lat: place.geometry?.location?.lat() || 0,
                lng: place.geometry?.location?.lng() || 0,
              }
            ),
            rating: place.rating,
            vicinity: place.vicinity || '',
            placeId: place.place_id || '',
          }));

          // Sort by distance
          places.sort((a, b) => a.distance - b.distance);
          resolve(places);
        } else {
          reject(new Error(`Places search failed: ${status}`));
        }
      });
    });
  }

  private calculateDistance(
    pos1: { lat: number; lng: number },
    pos2: { lat: number; lng: number }
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(pos2.lat - pos1.lat);
    const dLon = this.deg2rad(pos2.lng - pos1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(pos1.lat)) *
        Math.cos(this.deg2rad(pos2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  createMarker(
    position: { lat: number; lng: number },
    title: string,
    icon?: string | google.maps.Icon | google.maps.Symbol
  ): google.maps.Marker | null {
    if (!this.map) return null;

    return new google.maps.Marker({
      position,
      map: this.map,
      title,
      icon,
      animation: google.maps.Animation.DROP,
    });
  }

  displayRoute(result: google.maps.DirectionsResult): void {
    if (!this.map || !this.directionsRenderer) return;

    this.directionsRenderer.setMap(this.map);
    this.directionsRenderer.setDirections(result);
  }

  clearRoute(): void {
    if (this.directionsRenderer) {
      this.directionsRenderer.setMap(null);
    }
  }

  getCurrentTrafficInfo(): Promise<string> {
    // This would integrate with traffic APIs for real-time data
    return Promise.resolve('Light traffic conditions');
  }

  // Estimate data usage for offline maps
  estimateMapDataSize(bounds: google.maps.LatLngBounds, zoomLevel: number): number {
    // Rough estimate: each tile is ~10-50KB depending on zoom and content
    const tilesCount = Math.pow(4, zoomLevel - 10); // Rough approximation
    return tilesCount * 25; // KB
  }
}

// Export singleton instance
export const googleMapsService = GoogleMapsService.getInstance();

// Utility functions
export const createMapBounds = (
  center: { lat: number; lng: number },
  radiusKm: number
): google.maps.LatLngBounds => {
  const lat = center.lat;
  const lng = center.lng;
  
  // Convert radius from km to degrees (approximate)
  const latOffset = radiusKm / 111; // 1 degree lat ≈ 111 km
  const lngOffset = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

  return new google.maps.LatLngBounds(
    new google.maps.LatLng(lat - latOffset, lng - lngOffset),
    new google.maps.LatLng(lat + latOffset, lng + lngOffset)
  );
};

export const formatDuration = (durationText: string): string => {
  // Parse and format duration text from Google Maps
  return durationText.replace(/(\d+)\s*hours?/, '$1h').replace(/(\d+)\s*mins?/, '$1m');
};

export const formatDistance = (distanceText: string): string => {
  // Parse and format distance text from Google Maps
  return distanceText.replace(/(\d+\.\d+)\s*km/, '$1 km').replace(/(\d+)\s*m/, '$1 m');
};