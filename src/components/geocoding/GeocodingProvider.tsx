import React, { createContext, useContext } from 'react';
import { geocodeAddressWithAvailableProvider } from '../../utils/mapService';

interface GeocodingResult {
  formattedAddress: string;
  coordinates: { lat: number; lng: number };
}

interface GeocodingContextType {
  geocodeAddress: (address: string) => Promise<GeocodingResult | null>;
}

const GeocodingContext = createContext<GeocodingContextType | undefined>(undefined);

export function GeocodingProvider({ children }: { children: React.ReactNode }) {
  const geocodeAddress = async (address: string): Promise<GeocodingResult | null> => {
    try {
      return await geocodeAddressWithAvailableProvider(address);
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const value = {
    geocodeAddress
  };

  return (
    <GeocodingContext.Provider value={value}>
      {children}
    </GeocodingContext.Provider>
  );
}

export function useGeocoding() {
  const context = useContext(GeocodingContext);
  if (!context) {
    throw new Error('useGeocoding must be used within GeocodingProvider');
  }
  return context;
}
