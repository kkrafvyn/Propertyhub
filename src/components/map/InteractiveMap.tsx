import React, { useMemo, useState } from 'react';
import type { Property } from '../../types';
import { getLocationLabel, getPropertyCoordinates, getPropertyPrice } from '../../utils/location';
import { Card, CardContent } from '../ui/card';
import {
  Compass,
  Layers3,
  MapPin,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { cn } from '../ui/utils';

interface InteractiveMapProps {
  properties: Property[];
  selectedProperty: Property | null;
  onPropertySelect: (property: Property) => void;
  height?: string;
  showControls?: boolean;
  showPropertyFilters?: boolean;
}

type MarkerSnapshot = {
  property: Property;
  left: number;
  top: number;
  priceLabel: string;
  locationLabel: string;
  hasCoordinates: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const hashString = (value: string) => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
};

const formatPriceLabel = (property: Property) => {
  const price = getPropertyPrice(property);
  const currency = property.pricing?.currency || property.currency || 'GHS';

  if (!price) {
    return 'Quote';
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: price >= 1000 ? 0 : 2,
    }).format(price);
  } catch {
    return `${currency} ${price.toLocaleString('en-US')}`;
  }
};

const buildMarkerSnapshot = (property: Property, index: number, properties: Property[]): MarkerSnapshot => {
  const locationLabel = getLocationLabel(property.location);
  const [latitude, longitude] = getPropertyCoordinates(property);
  const pricedProperties = properties.map((entry) => getPropertyCoordinates(entry));
  const knownCoordinates = pricedProperties.filter(
    ([entryLat, entryLng]) => entryLat !== 0 || entryLng !== 0,
  );

  if (knownCoordinates.length > 0 && (latitude !== 0 || longitude !== 0)) {
    const latitudes = knownCoordinates.map(([entryLat]) => entryLat);
    const longitudes = knownCoordinates.map(([, entryLng]) => entryLng);
    const minLatitude = Math.min(...latitudes);
    const maxLatitude = Math.max(...latitudes);
    const minLongitude = Math.min(...longitudes);
    const maxLongitude = Math.max(...longitudes);
    const latitudeRange = maxLatitude - minLatitude || 1;
    const longitudeRange = maxLongitude - minLongitude || 1;

    return {
      property,
      left: clamp(12 + ((longitude - minLongitude) / longitudeRange) * 76, 10, 90),
      top: clamp(18 + (1 - (latitude - minLatitude) / latitudeRange) * 60, 12, 86),
      priceLabel: formatPriceLabel(property),
      locationLabel,
      hasCoordinates: true,
    };
  }

  const fallbackHash = hashString(`${property.id}-${locationLabel}-${property.title}`);

  return {
    property,
    left: 14 + (fallbackHash % 70),
    top: 18 + ((Math.floor(fallbackHash / 11) + index * 9) % 58),
    priceLabel: formatPriceLabel(property),
    locationLabel,
    hasCoordinates: false,
  };
};

export function InteractiveMap({
  properties,
  selectedProperty,
  onPropertySelect,
  height = '400px',
  showControls = false,
  showPropertyFilters = false,
}: InteractiveMapProps) {
  const [zoom, setZoom] = useState(1);

  const visibleProperties = useMemo(() => properties.slice(0, 24), [properties]);
  const selected = selectedProperty || visibleProperties[0] || null;

  const markers = useMemo(
    () =>
      visibleProperties.map((property, index) =>
        buildMarkerSnapshot(property, index, visibleProperties),
      ),
    [visibleProperties],
  );

  const uniqueDistricts = useMemo(() => {
    const districts = visibleProperties
      .map((property) => getLocationLabel(property.location).split(',')[0]?.trim())
      .filter((value): value is string => Boolean(value));

    return Array.from(new Set(districts)).slice(0, 4);
  }, [visibleProperties]);

  return (
    <Card className="overflow-hidden rounded-[28px] border border-border bg-card shadow-none">
      <CardContent className="p-0">
        <div
          className="relative overflow-hidden bg-[linear-gradient(180deg,color-mix(in_srgb,var(--secondary)_90%,var(--card))_0%,color-mix(in_srgb,var(--card)_94%,var(--secondary))_100%)]"
          style={{ height }}
        >
          <div className="absolute inset-0 opacity-50">
            <div className="absolute inset-x-0 top-1/4 h-px bg-border/60" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-border/60" />
            <div className="absolute inset-x-0 bottom-1/4 h-px bg-border/60" />
            <div className="absolute inset-y-0 left-1/4 w-px bg-border/60" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-border/60" />
            <div className="absolute inset-y-0 right-1/4 w-px bg-border/60" />
          </div>

          {showControls ? (
            <div className="absolute left-4 top-4 z-20 flex flex-col gap-2">
              <button
                type="button"
                className="theme-panel-soft flex h-10 w-10 items-center justify-center rounded-full border shadow-sm"
                onClick={() => setZoom((current) => clamp(current + 0.1, 0.8, 1.4))}
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="theme-panel-soft flex h-10 w-10 items-center justify-center rounded-full border shadow-sm"
                onClick={() => setZoom((current) => clamp(current - 0.1, 0.8, 1.4))}
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="theme-panel-soft flex h-10 w-10 items-center justify-center rounded-full border shadow-sm"
                onClick={() => setZoom(1)}
              >
                <Compass className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {showPropertyFilters ? (
            <div className="absolute right-4 top-4 z-20 flex flex-wrap justify-end gap-2">
              <div className="theme-accent-badge inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium shadow-sm">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {properties.length} homes
              </div>
              <div className="theme-info-badge inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium shadow-sm">
                <Layers3 className="h-3.5 w-3.5" />
                {markers.some((marker) => marker.hasCoordinates) ? 'Coordinate-based layout' : 'Neighborhood layout'}
              </div>
            </div>
          ) : null}

          {uniqueDistricts.map((district, index) => (
            <div
              key={district}
              className="absolute z-0 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/70"
              style={{
                left: `${12 + index * 18}%`,
                top: `${18 + (index % 2) * 26}%`,
              }}
            >
              {district}
            </div>
          ))}

          {markers.length === 0 ? (
            <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <MapPin className="h-14 w-14 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">No homes to map yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Adjust your search or filters and we will plot matching listings here.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div
                className="absolute inset-0 transition-transform duration-300"
                style={{ transform: `scale(${zoom})` }}
              >
                {markers.map((marker, index) => {
                  const isSelected = selected?.id === marker.property.id;

                  return (
                    <button
                      key={marker.property.id}
                      type="button"
                      onClick={() => onPropertySelect(marker.property)}
                      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-left"
                      style={{
                        left: `${marker.left}%`,
                        top: `${marker.top}%`,
                      }}
                    >
                      <div
                        className={cn(
                          'min-w-[92px] rounded-[18px] border px-3 py-2 shadow-[0_14px_28px_rgba(15,23,42,0.14)] transition-all',
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-card/95 text-foreground backdrop-blur',
                        )}
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80">
                          Spot {index + 1}
                        </div>
                        <div className="mt-1 text-sm font-semibold leading-tight">
                          {marker.priceLabel}
                        </div>
                      </div>
                      <div
                        className={cn(
                          'mx-auto h-3 w-3 -translate-y-1 rotate-45 border',
                          isSelected
                            ? 'border-primary bg-primary'
                            : 'border-border bg-card/95',
                        )}
                      />
                    </button>
                  );
                })}
              </div>

              {selected ? (
                <div className="absolute inset-x-4 bottom-4 z-20 rounded-[24px] border border-border bg-card/95 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.16)] backdrop-blur">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {markers.find((marker) => marker.property.id === selected.id)?.hasCoordinates
                          ? 'Coordinate-backed preview'
                          : 'Neighborhood-backed preview'}
                      </div>
                      <h3 className="mt-2 truncate text-lg font-semibold">{selected.title}</h3>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {getLocationLabel(selected.location)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Current ask
                        </div>
                        <div className="text-base font-semibold">{formatPriceLabel(selected)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onPropertySelect(selected)}
                        className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                      >
                        Open listing
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default InteractiveMap;
