/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module 'sonner@2.0.3' {
  export * from 'sonner';
}

declare module '@radix-ui/react-alert-dialog@1.1.6' {
  export * from '@radix-ui/react-alert-dialog';
}

declare module 'class-variance-authority@0.7.1' {
  export * from 'class-variance-authority';
}

declare module '@radix-ui/react-slot@1.1.2' {
  export * from '@radix-ui/react-slot';
}

declare module '@radix-ui/react-label@2.1.2' {
  export * from '@radix-ui/react-label';
}

declare module '@radix-ui/react-radio-group@1.2.3' {
  export * from '@radix-ui/react-radio-group';
}

declare module '@radix-ui/react-separator@1.1.2' {
  export * from '@radix-ui/react-separator';
}

declare module 'lucide-react@0.487.0' {
  export * from 'lucide-react';
}

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
  serve: (...args: any[]) => void;
};

declare namespace google {
  namespace maps {
    type Map = any;
    type Marker = any;
    type LatLngBounds = any;
    type LatLng = any;
    type DirectionsLeg = any;
    type DirectionsService = any;
    type DirectionsRenderer = any;
    type DirectionsRendererOptions = any;
    type DirectionsResult = any;
    type DirectionsStatus = any;
    type Geocoder = any;
    type GeocoderStatus = any;
    type MapOptions = any;
    type MapTypeId = any;
    type TravelMode = any;
    type UnitSystem = any;
    type Icon = any;
    type Symbol = any;
    type Animation = any;
    namespace places {
      type PlacesService = any;
      type PlaceSearchRequest = any;
      type PlacesServiceStatus = any;
    }
  }
}

declare const google: any;

interface ImportMetaEnv {
  readonly VITE_WEBSOCKET_URL?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_MONITORING_ENDPOINT?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PROJECT_ID?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_EDGE_FUNCTION_NAME?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_MAPBOX_ACCESS_TOKEN?: string;
  readonly VITE_MAP_DISPLAY_PROVIDER?: 'google' | 'mapbox';
  
  // Payment Configuration
  readonly VITE_PAYSTACK_PUBLIC_KEY?: string;
  readonly VITE_FLUTTERWAVE_PUBLIC_KEY?: string;
  readonly VITE_STRIPE_PUBLIC_KEY?: string;
  
  // Payment Settings
  readonly VITE_PAYMENT_COMMISSION_RATE?: string;
  readonly VITE_ESCROW_HOLD_DAYS?: string;
  readonly VITE_ESCROW_DISPUTE_WINDOW_HOURS?: string;
  
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
