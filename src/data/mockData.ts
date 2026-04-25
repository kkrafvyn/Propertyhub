import { User, Property } from '../types';

// PRODUCTION DATA MODULE
// All mock data has been removed for production build.
// Real data is now fetched from the Supabase backend.

export const mockUsers: any[] = [];
export const mockProperties: any[] = [];
export const mockTransactions: any[] = [];
export const mockChatRooms: any[] = [];

export const getDefaultFilters = () => ({
  type: [],
  priceRange: [0, 1000000] as [number, number],
  location: [],
  bedrooms: [],
  bathrooms: [],
  areaRange: [0, 10000] as [number, number],
  amenities: [],
  availability: []
});

export const getDefaultUserPreferences = () => ({
  theme: 'system',
  notifications: true,
  emailUpdates: true,
  currency: 'USD',
  language: 'en',
  privacy: {
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false,
    allowDataCollection: true,
    allowMarketing: false,
    allowAnalytics: true,
    twoFactorEnabled: false
  }
});
