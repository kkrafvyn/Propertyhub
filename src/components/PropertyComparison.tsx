import React from 'react';
import { motion } from 'motion/react';
import { BarChart3, Heart, Home, MapPin, Scale, Star, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import type { Property } from '../types';
import { formatPrice } from '../utils/propertyFiltering';
import { getLocationLabel, getPropertyPrice } from '../utils/location';

interface PropertyComparisonProps {
  properties?: Property[];
  onClose?: () => void;
  onClear?: () => void;
  onRemoveProperty?: (propertyId: string) => void;
  onSelectProperty?: (property: Property) => void;
}

const comparisonRows = [
  {
    label: 'Price',
    getValue: (property: Property) =>
      `${property.pricing?.currency || property.currency || 'GHS'} ${formatPrice(getPropertyPrice(property))}`,
  },
  {
    label: 'Type',
    getValue: (property: Property) => property.type,
  },
  {
    label: 'Location',
    getValue: (property: Property) => getLocationLabel(property.location),
  },
  {
    label: 'Bedrooms',
    getValue: (property: Property) => String(property.bedrooms ?? property.features?.bedrooms ?? '-'),
  },
  {
    label: 'Bathrooms',
    getValue: (property: Property) => String(property.bathrooms ?? property.features?.bathrooms ?? '-'),
  },
  {
    label: 'Area',
    getValue: (property: Property) =>
      property.area || property.features?.area ? `${property.area || property.features?.area} m2` : '-',
  },
  {
    label: 'Rating',
    getValue: (property: Property) => property.rating?.toFixed(1) || 'New',
  },
  {
    label: 'Availability',
    getValue: (property: Property) =>
      property.available ?? property.status === 'available' ? 'Available now' : 'Currently unavailable',
  },
];

export function PropertyComparison({
  properties = [],
  onClose,
  onClear,
  onRemoveProperty,
  onSelectProperty,
}: PropertyComparisonProps) {
  if (!properties.length) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card className="rounded-[32px] border border-dashed border-border bg-card">
          <CardContent className="px-6 py-10 text-center">
            <Scale className="mx-auto h-10 w-10 text-primary" />
            <h3 className="mt-4 text-xl font-semibold text-foreground">Build a comparison set</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Add two or more homes to compare price, size, availability, and trust details side by side.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Comparison studio</p>
          <h2 className="text-2xl font-semibold text-foreground">Compare shortlisted homes</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {onClear && (
            <Button variant="outline" className="rounded-full" onClick={onClear}>
              Clear all
            </Button>
          )}
          {onClose && (
            <Button variant="outline" className="rounded-full" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {properties.map((property) => (
          <Card key={property.id} className="rounded-[28px] border border-border bg-card">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-lg font-semibold text-foreground">{property.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{getLocationLabel(property.location)}</p>
                </div>
                {onRemoveProperty && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() => onRemoveProperty(property.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {comparisonRows.map((row) => (
                  <div key={`${property.id}-${row.label}`} className="rounded-[20px] bg-secondary/60 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {row.label}
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">{row.getValue(property)}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {property.amenities.slice(0, 4).map((amenity) => (
                  <span
                    key={`${property.id}-${amenity}`}
                    className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
                  >
                    {amenity}
                  </span>
                ))}
              </div>

              {onSelectProperty && (
                <Button className="w-full rounded-full" onClick={() => onSelectProperty(property)}>
                  View home
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `minmax(150px, 180px) repeat(${properties.length}, minmax(220px, 1fr))`,
          }}
        >
          <Card className="rounded-[28px] border border-border bg-card">
            <CardContent className="flex h-full flex-col justify-between p-4">
              <div>
                <div className="theme-accent-icon flex h-12 w-12 items-center justify-center rounded-2xl">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <p className="mt-4 text-lg font-semibold text-foreground">Decision view</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Price, layout, trust, and availability lined up in one place.
                </p>
              </div>
            </CardContent>
          </Card>

          {properties.map((property) => (
            <Card key={property.id} className="rounded-[28px] border border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-lg font-semibold text-foreground">{property.title}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 text-primary" />
                      {getLocationLabel(property.location)}
                    </p>
                  </div>
                  {onRemoveProperty && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={() => onRemoveProperty(property.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="theme-accent-badge inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium">
                    <Home className="h-3.5 w-3.5" />
                    {property.type}
                  </span>
                  <span className="theme-success-badge inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium">
                    <Heart className="h-3.5 w-3.5" />
                    {property.available ?? property.status === 'available' ? 'Available' : 'Unavailable'}
                  </span>
                  <span className="theme-warning-badge inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium">
                    <Star className="h-3.5 w-3.5" />
                    {property.rating?.toFixed(1) || 'New'}
                  </span>
                </div>

                {onSelectProperty && (
                  <Button className="mt-4 w-full rounded-full" onClick={() => onSelectProperty(property)}>
                    View home
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}

          {comparisonRows.map((row) => (
            <React.Fragment key={row.label}>
              <div className="rounded-[24px] bg-secondary/60 p-4">
                <p className="text-sm font-semibold text-foreground">{row.label}</p>
              </div>
              {properties.map((property) => (
                <div
                  key={`${property.id}-${row.label}`}
                  className="rounded-[24px] border border-border bg-card p-4 text-sm text-foreground"
                >
                  {row.getValue(property)}
                </div>
              ))}
            </React.Fragment>
          ))}

          <div className="rounded-[24px] bg-secondary/60 p-4">
            <p className="text-sm font-semibold text-foreground">Amenities</p>
          </div>
          {properties.map((property) => (
            <div key={`${property.id}-amenities`} className="rounded-[24px] border border-border bg-card p-4">
              <div className="flex flex-wrap gap-2">
                {property.amenities.slice(0, 4).map((amenity) => (
                  <span
                    key={`${property.id}-${amenity}`}
                    className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs text-muted-foreground"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

export default PropertyComparison;
