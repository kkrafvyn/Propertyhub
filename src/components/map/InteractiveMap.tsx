import React from 'react';
import { Property } from '../../types';
import { Card, CardContent } from '../ui/card';
import { Compass, Layers3, MapPin, SlidersHorizontal, ZoomIn, ZoomOut } from 'lucide-react';

interface InteractiveMapProps {
  properties: Property[];
  selectedProperty: Property | null;
  onPropertySelect: (property: Property) => void;
  height?: string;
  showControls?: boolean;
  showPropertyFilters?: boolean;
}

export function InteractiveMap({ 
  properties, 
  selectedProperty, 
  onPropertySelect,
  height = '400px',
  showControls = false,
  showPropertyFilters = false
}: InteractiveMapProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div 
          className="relative flex items-center justify-center bg-[linear-gradient(180deg,color-mix(in_srgb,var(--secondary)_88%,var(--card))_0%,var(--card)_100%)]"
          style={{ height }}
        >
          {showControls && (
            <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
              <button type="button" className="theme-panel-soft flex h-10 w-10 items-center justify-center rounded-full border shadow-sm">
                <ZoomIn className="h-4 w-4" />
              </button>
              <button type="button" className="theme-panel-soft flex h-10 w-10 items-center justify-center rounded-full border shadow-sm">
                <ZoomOut className="h-4 w-4" />
              </button>
              <button type="button" className="theme-panel-soft flex h-10 w-10 items-center justify-center rounded-full border shadow-sm">
                <Compass className="h-4 w-4" />
              </button>
            </div>
          )}

          {showPropertyFilters && (
            <div className="absolute right-4 top-4 z-10 flex gap-2">
              <div className="theme-accent-badge inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium shadow-sm">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {properties.length} homes
              </div>
              <div className="theme-info-badge inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium shadow-sm">
                <Layers3 className="h-3.5 w-3.5" />
                Theme-safe controls
              </div>
            </div>
          )}

          {/* Map placeholder */}
          <div className="text-center space-y-4">
            <MapPin className="w-16 h-16 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Interactive Map</h3>
              <p className="text-muted-foreground">
                Map integration with Google Maps API will be shown here
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {properties.length} properties in this area
              </p>
            </div>
          </div>

          {/* Property markers overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {properties.slice(0, 5).map((property, index) => (
              <div
                key={property.id}
                className="absolute bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold pointer-events-auto cursor-pointer hover:scale-110 transition-transform"
                style={{
                  left: `${20 + index * 15}%`,
                  top: `${30 + index * 10}%`
                }}
                onClick={() => onPropertySelect(property)}
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
