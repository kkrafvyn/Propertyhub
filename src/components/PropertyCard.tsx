import React, { useState } from 'react';
import { AppState, Property, User } from '../types';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import {
  ArrowRight,
  Bath,
  Bed,
  CreditCard,
  Heart,
  MapPin,
  Scale,
  ShieldCheck,
  Sparkles,
  Square,
  Star,
} from 'lucide-react';

import { CheckoutWrapper } from './payments/CheckoutWrapper';
import type { TransactionType } from './payments/CheckoutWrapper';

import { formatPrice } from '../utils/propertyFiltering';
import { getLocationLabel, getPropertyPrice } from '../utils/location';
import { toast } from 'sonner';
import { cn } from './ui/utils';
import { BrandMark } from './BrandMark';
import { useAppContext } from '../hooks/useAppContext';

interface PropertyCardProps {
  property: Property;
  currentUser?: User | null;
  onSelect: (property: Property) => void;
  onNavigate?: (state: AppState) => void;
  showQuickActions?: boolean;
}

const formatLabel = (value: string) =>
  value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getListingLabel = (property: Property) => {
  if (property.listingType === 'rent') return 'Monthly stay';
  if (property.listingType === 'sale') return 'For sale';
  if (property.listingType === 'shortlet') return 'Short stay';
  return formatLabel(property.listingType);
};

const getPriceSuffix = (property: Property) => {
  if (property.listingType === 'sale') return 'total';
  if (property.pricing?.period === 'daily') return 'night';
  if (property.pricing?.period === 'yearly') return 'year';
  return 'month';
};

const getQuickActionConfig = (
  property: Property
): { label: string; transactionType: TransactionType } => {
  if (property.listingType === 'rent') {
    return { label: 'Start rent', transactionType: 'rent' };
  }

  if (property.listingType === 'lease') {
    return { label: 'Start lease', transactionType: 'lease' };
  }

  if (property.listingType === 'shortlet') {
    return { label: 'Book stay', transactionType: 'booking' };
  }

  return { label: 'Buy now', transactionType: 'purchase' };
};

export function PropertyCard({
  property,
  currentUser,
  onSelect,
  onNavigate,
  showQuickActions = false,
}: PropertyCardProps) {
  const { favoriteProperties, comparedProperties, toggleFavorite, toggleCompareProperty } =
    useAppContext();
  const propertyLocation = getLocationLabel(property.location);
  const propertyPrice = getPropertyPrice(property);
  const propertyCurrency = property.pricing?.currency || property.currency || 'GHS';
  const amenityHighlights = Array.isArray(property.amenities) ? property.amenities.slice(0, 3) : [];
  const isAvailable = property.available ?? property.status === 'available';
  const isFavorite = favoriteProperties.includes(property.id);
  const isCompared = comparedProperties.includes(property.id);
  const propertyDescription =
    property.description?.trim() || 'Refined living space in a well-connected neighborhood.';
  const quickAction = getQuickActionConfig(property);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedTransactionType, setSelectedTransactionType] =
    useState<TransactionType>('purchase');

  const handleCardClick = (event: React.MouseEvent): void => {
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }

    onSelect(property);
  };

  const handleCheckoutOpen = (transactionType: TransactionType): void => {
    setSelectedTransactionType(transactionType);
    setIsCheckoutOpen(true);
  };

  const handleCheckoutClose = (): void => {
    setIsCheckoutOpen(false);
  };

  const handleFavoriteToggle = (event: React.MouseEvent): void => {
    event.stopPropagation();
    toggleFavorite(property.id);
  };

  const handleCompareToggle = (event: React.MouseEvent): void => {
    event.stopPropagation();
    toggleCompareProperty(property.id);
  };

  const handleCheckoutSuccess = (transactionId: string): void => {
    setIsCheckoutOpen(false);
    toast.success(`Transaction completed! ID: ${transactionId}`);
    onNavigate?.('dashboard');
  };

  return (
    <>
      <Card
        className="property-card group cursor-pointer gap-0 overflow-hidden rounded-[34px] border border-border/80 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card)_97%,white),color-mix(in_srgb,var(--card)_88%,var(--secondary)))]"
        onClick={handleCardClick}
      >
        <div className="relative z-[1] aspect-[4/3] overflow-hidden bg-secondary">
          {property.images?.[0] ? (
            <img
              src={property.images[0]}
              alt={property.title}
              className="property-card-image h-full w-full object-cover transition-transform duration-500"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--primary)_18%,transparent),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.08),rgba(15,23,42,0.02))]">
              <BrandMark className="h-20 w-20 rounded-[24px]" />
            </div>
          )}

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,14,10,0.04),rgba(18,14,10,0.06)_28%,rgba(18,14,10,0.52)_100%)]" />

          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur ${
                  isAvailable ? 'theme-available-badge' : 'theme-occupied-badge'
                }`}
              >
                {isAvailable ? 'Available' : 'Occupied'}
              </span>
              <span className="property-card-glass-chip text-xs font-semibold">
                {getListingLabel(property)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFavoriteToggle}
                className={cn(
                  'property-card-icon-button',
                  isFavorite &&
                    'border-[color:var(--accent-soft-border)] bg-[color:var(--accent-soft)] text-[color:var(--accent-soft-foreground)]'
                )}
                aria-label={isFavorite ? 'Remove from saved homes' : 'Save home'}
              >
                <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
              </button>

              <button
                type="button"
                onClick={handleCompareToggle}
                className={cn(
                  'property-card-icon-button',
                  isCompared &&
                    'border-[color:var(--info-soft-border)] bg-[color:var(--info-soft)] text-[color:var(--info-soft-foreground)]'
                )}
                aria-label={isCompared ? 'Remove from compare' : 'Add home to compare'}
              >
                <Scale className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
            <div className="property-card-price-panel max-w-[calc(100%-5rem)] rounded-[24px] px-4 py-3">
              <p className="text-[11px] font-medium text-white/72">Starting from</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-2xl font-semibold text-white">
                  {propertyCurrency} {formatPrice(propertyPrice)}
                </span>
                <span className="text-sm text-white/76">/ {getPriceSuffix(property)}</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <span className="property-card-glass-chip inline-flex items-center gap-1 text-xs font-semibold">
                <Star className="h-3.5 w-3.5 fill-current text-[#ffd36a]" />
                {property.rating?.toFixed(1) || 'New'}
              </span>

              {property.featured && (
                <div className="theme-accent-badge inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" />
                  Featured
                </div>
              )}
            </div>
          </div>
        </div>

        <CardContent className="property-card-content relative z-[1] space-y-5 p-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="truncate">{propertyLocation}</span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="line-clamp-2 text-[1.35rem] font-semibold leading-tight text-foreground">
                  {property.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatLabel(property.type)} residence
                </p>
              </div>

              <div className="theme-success-badge inline-flex shrink-0 items-center gap-1.5 px-3 py-1 text-xs font-semibold">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified
              </div>
            </div>

            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
              {propertyDescription}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="property-card-stat rounded-[20px] px-3 py-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Bed className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-medium text-muted-foreground">Beds</span>
              </div>
              <p className="mt-2 text-base font-semibold text-foreground">{property.bedrooms || '-'}</p>
            </div>

            <div className="property-card-stat rounded-[20px] px-3 py-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Bath className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-medium text-muted-foreground">Baths</span>
              </div>
              <p className="mt-2 text-base font-semibold text-foreground">{property.bathrooms || '-'}</p>
            </div>

            <div className="property-card-stat rounded-[20px] px-3 py-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Square className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-medium text-muted-foreground">Area</span>
              </div>
              <p className="mt-2 text-base font-semibold text-foreground">
                {property.area ? `${property.area} m2` : '-'}
              </p>
            </div>
          </div>

          {amenityHighlights.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {amenityHighlights.map((amenity) => (
                <span
                  key={amenity}
                  className="property-card-inline-chip rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  {amenity}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Verified listing
              </span>
              {isFavorite && (
                <span className="theme-accent-badge inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium">
                  <Heart className="h-3.5 w-3.5 fill-current" />
                  Saved
                </span>
              )}
              {isCompared && (
                <span className="theme-info-badge inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium">
                  <Scale className="h-3.5 w-3.5" />
                  Comparing
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {showQuickActions && currentUser && isAvailable && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleCheckoutOpen(quickAction.transactionType);
                  }}
                  className="h-11 rounded-full px-5"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {quickAction.label}
                </Button>
              )}

              <Button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(property);
                }}
                className="h-11 rounded-full px-5"
              >
                View home
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isCheckoutOpen && (
        <CheckoutWrapper
          property={property}
          currentUser={currentUser!}
          transactionType={selectedTransactionType}
          isOpen={isCheckoutOpen}
          onClose={handleCheckoutClose}
          onSuccess={handleCheckoutSuccess}
          onNavigate={onNavigate}
        />
      )}
    </>
  );
}

export default PropertyCard;
