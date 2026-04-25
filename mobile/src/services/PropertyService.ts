/**
 * PropertyHub Mobile - Property Service
 * 
 * This service handles all property-related API calls and data management.
 * It provides methods for fetching, searching, and managing properties
 * with proper error handling and offline support.
 * 
 * Features:
 * - Property listing and search
 * - Featured properties
 * - Property details
 * - Favorites management
 * - Location-based filtering
 * - Caching and offline support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Types
import type { 
  Property, 
  PropertyFilter, 
  PropertySearchResult,
  Location,
  User 
} from '../types';

// Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.propertyhub.app';
const CACHE_KEYS = {
  PROPERTIES: 'properties_cache',
  FEATURED: 'featured_properties_cache',
  FAVORITES: 'favorites_cache',
  SEARCH_RESULTS: 'search_results_cache',
};

class PropertyService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = API_BASE_URL;
  }

  /**
   * Get featured properties
   */
  async getFeaturedProperties(userId?: string): Promise<Property[]> {
    try {
      const isOnline = await NetInfo.fetch().then(state => state.isConnected);
      
      if (!isOnline) {
        // Return cached featured properties
        return this.getCachedFeaturedProperties();
      }

      const response = await fetch(`${this.apiUrl}/properties/featured`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(userId && { 'X-User-ID': userId }),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const properties = data.properties || [];

      // Cache the featured properties
      await this.cacheFeaturedProperties(properties);

      return properties;
    } catch (error) {
      console.error('❌ Error fetching featured properties:', error);
      
      // Fallback to cached data
      const cachedProperties = await this.getCachedFeaturedProperties();
      if (cachedProperties.length > 0) {
        return cachedProperties;
      }

      // If no cache, return mock data
      return this.getMockFeaturedProperties();
    }
  }

  /**
   * Get properties with filters and pagination
   */
  async getProperties(options: PropertyFilter & {
    page?: number;
    limit?: number;
  }): Promise<PropertySearchResult> {
    try {
      const isOnline = await NetInfo.fetch().then(state => state.isConnected);
      
      if (!isOnline) {
        // Return cached properties
        return this.getCachedProperties(options);
      }

      const params = new URLSearchParams();
      
      // Add filters to params
      if (options.search) params.append('search', options.search);
      if (options.category) params.append('category', options.category);
      if (options.minPrice) params.append('minPrice', options.minPrice.toString());
      if (options.maxPrice) params.append('maxPrice', options.maxPrice.toString());
      if (options.location) {
        params.append('lat', options.location.latitude.toString());
        params.append('lng', options.location.longitude.toString());
      }
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());

      const response = await fetch(`${this.apiUrl}/properties?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.userId && { 'X-User-ID': options.userId }),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const result: PropertySearchResult = {
        properties: data.properties || [],
        total: data.total || 0,
        hasMore: data.hasMore || false,
        page: data.page || 0,
      };

      // Cache the search results
      await this.cacheProperties(result, options);

      return result;
    } catch (error) {
      console.error('❌ Error fetching properties:', error);
      
      // Fallback to cached data
      const cachedResult = await this.getCachedProperties(options);
      if (cachedResult.properties.length > 0) {
        return cachedResult;
      }

      // If no cache, return mock data
      return this.getMockProperties(options);
    }
  }

  /**
   * Get property details by ID
   */
  async getPropertyDetails(propertyId: string, userId?: string): Promise<Property> {
    try {
      const isOnline = await NetInfo.fetch().then(state => state.isConnected);
      
      if (!isOnline) {
        // Try to get from cached properties
        const cachedProperty = await this.getCachedPropertyById(propertyId);
        if (cachedProperty) {
          return cachedProperty;
        }
        throw new Error('Property not available offline');
      }

      const response = await fetch(`${this.apiUrl}/properties/${propertyId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(userId && { 'X-User-ID': userId }),
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Property not found');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const property = await response.json();

      // Cache the property details
      await this.cachePropertyDetails(property);

      return property;
    } catch (error) {
      console.error(`❌ Error fetching property ${propertyId}:`, error);
      throw error;
    }
  }

  /**
   * Add property to favorites
   */
  async addToFavorites(propertyId: string, userId: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/users/${userId}/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ propertyId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update local favorites cache
      await this.updateFavoritesCache(propertyId, userId, 'add');
    } catch (error) {
      console.error('❌ Error adding to favorites:', error);
      throw error;
    }
  }

  /**
   * Remove property from favorites
   */
  async removeFromFavorites(propertyId: string, userId: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/users/${userId}/favorites/${propertyId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update local favorites cache
      await this.updateFavoritesCache(propertyId, userId, 'remove');
    } catch (error) {
      console.error('❌ Error removing from favorites:', error);
      throw error;
    }
  }

  /**
   * Get user's favorite properties
   */
  async getFavoriteProperties(userId: string): Promise<Property[]> {
    try {
      const isOnline = await NetInfo.fetch().then(state => state.isConnected);
      
      if (!isOnline) {
        return this.getCachedFavorites(userId);
      }

      const response = await fetch(`${this.apiUrl}/users/${userId}/favorites`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const favorites = data.favorites || [];

      // Cache the favorites
      await this.cacheFavorites(favorites, userId);

      return favorites;
    } catch (error) {
      console.error('❌ Error fetching favorite properties:', error);
      
      // Fallback to cached favorites
      return this.getCachedFavorites(userId);
    }
  }

  // Private caching methods

  private async cacheFeaturedProperties(properties: Property[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        CACHE_KEYS.FEATURED,
        JSON.stringify({
          properties,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error('❌ Error caching featured properties:', error);
    }
  }

  private async getCachedFeaturedProperties(): Promise<Property[]> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.FEATURED);
      if (!cached) return [];

      const { properties, timestamp } = JSON.parse(cached);
      
      // Check if cache is still valid (24 hours)
      if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
        return [];
      }

      return properties || [];
    } catch (error) {
      console.error('❌ Error getting cached featured properties:', error);
      return [];
    }
  }

  private async cacheProperties(
    result: PropertySearchResult,
    options: PropertyFilter & { page?: number; limit?: number }
  ): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.PROPERTIES}_${JSON.stringify(options)}`;
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          result,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error('❌ Error caching properties:', error);
    }
  }

  private async getCachedProperties(
    options: PropertyFilter & { page?: number; limit?: number }
  ): Promise<PropertySearchResult> {
    try {
      const cacheKey = `${CACHE_KEYS.PROPERTIES}_${JSON.stringify(options)}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) {
        return { properties: [], total: 0, hasMore: false, page: 0 };
      }

      const { result, timestamp } = JSON.parse(cached);
      
      // Check if cache is still valid (1 hour)
      if (Date.now() - timestamp > 60 * 60 * 1000) {
        return { properties: [], total: 0, hasMore: false, page: 0 };
      }

      return result;
    } catch (error) {
      console.error('❌ Error getting cached properties:', error);
      return { properties: [], total: 0, hasMore: false, page: 0 };
    }
  }

  private async cachePropertyDetails(property: Property): Promise<void> {
    try {
      const cacheKey = `property_details_${property.id}`;
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          property,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error('❌ Error caching property details:', error);
    }
  }

  private async getCachedPropertyById(propertyId: string): Promise<Property | null> {
    try {
      const cacheKey = `property_details_${propertyId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) return null;

      const { property, timestamp } = JSON.parse(cached);
      
      // Check if cache is still valid (2 hours)
      if (Date.now() - timestamp > 2 * 60 * 60 * 1000) {
        return null;
      }

      return property;
    } catch (error) {
      console.error('❌ Error getting cached property details:', error);
      return null;
    }
  }

  private async updateFavoritesCache(
    propertyId: string,
    userId: string,
    action: 'add' | 'remove'
  ): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.FAVORITES}_${userId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) return;

      const { favorites } = JSON.parse(cached);
      let updatedFavorites = [...favorites];

      if (action === 'add') {
        // Add property to favorites if not already there
        if (!updatedFavorites.find((p: Property) => p.id === propertyId)) {
          // We'd need to fetch the property details to add it properly
          // For now, just mark it as favorite
        }
      } else {
        // Remove property from favorites
        updatedFavorites = updatedFavorites.filter((p: Property) => p.id !== propertyId);
      }

      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          favorites: updatedFavorites,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error('❌ Error updating favorites cache:', error);
    }
  }

  private async cacheFavorites(favorites: Property[], userId: string): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.FAVORITES}_${userId}`;
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          favorites,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error('❌ Error caching favorites:', error);
    }
  }

  private async getCachedFavorites(userId: string): Promise<Property[]> {
    try {
      const cacheKey = `${CACHE_KEYS.FAVORITES}_${userId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) return [];

      const { favorites, timestamp } = JSON.parse(cached);
      
      // Check if cache is still valid (1 hour)
      if (Date.now() - timestamp > 60 * 60 * 1000) {
        return [];
      }

      return favorites || [];
    } catch (error) {
      console.error('❌ Error getting cached favorites:', error);
      return [];
    }
  }

  // Mock data methods for offline fallback

  private getMockFeaturedProperties(): Property[] {
    return [
      {
        id: 'mock-1',
        title: 'Luxury Villa in Victoria Island',
        description: 'Beautiful 4-bedroom villa with ocean view',
        price: 75000000,
        location: {
          address: 'Victoria Island, Lagos',
          city: 'Lagos',
          state: 'Lagos',
          country: 'Nigeria',
          latitude: 6.4281,
          longitude: 3.4219,
        },
        images: ['https://via.placeholder.com/400x300'],
        type: 'house',
        bedrooms: 4,
        bathrooms: 3,
        area: 250,
        features: ['Pool', 'Garden', 'Parking'],
        hostId: 'host-1',
        hostName: 'John Doe',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'mock-2',
        title: 'Modern Apartment in Lekki',
        description: 'Contemporary 3-bedroom apartment',
        price: 45000000,
        location: {
          address: 'Lekki Phase 1, Lagos',
          city: 'Lagos',
          state: 'Lagos',
          country: 'Nigeria',
          latitude: 6.4698,
          longitude: 3.5852,
        },
        images: ['https://via.placeholder.com/400x300'],
        type: 'apartment',
        bedrooms: 3,
        bathrooms: 2,
        area: 180,
        features: ['Gym', 'Security', 'Parking'],
        hostId: 'host-2',
        hostName: 'Jane Smith',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  private getMockProperties(
    options: PropertyFilter & { page?: number; limit?: number }
  ): PropertySearchResult {
    const allMockProperties = this.getMockFeaturedProperties();
    
    return {
      properties: allMockProperties,
      total: allMockProperties.length,
      hasMore: false,
      page: options.page || 0,
    };
  }
}

// Export singleton instance
export const propertyService = new PropertyService();
export default propertyService;