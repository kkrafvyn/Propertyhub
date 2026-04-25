import React, { useState } from 'react';
import { AppState, Property, User } from '../types';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import {
  ArrowRight,
  Bath,
  Bed,
  Heart,
  MapPin,
  Scale,
  ShieldCheck,
  Sparkles,
  Square,
  Star,
} from 'lucide-react';

import { CheckoutWrapper } from './payments/CheckoutWrapper';
import { MobileCheckoutButton } from './payments/MobileCheckoutButton';
import type { TransactionType } from './payments/CheckoutWrapper';

import { useMobile } from '../hooks/useMobile';

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

export function PropertyCard({
  property,
  currentUser,
  onSelect,
  onNavigate,
  showQuickActions = false,
}: PropertyCardProps) {
  const isMobile = useMobile();
  const { favoriteProperties, comparedProperties, toggleFavorite, toggleCompareProperty } =
    useAppContext();
  const propertyLocation = getLocationLabel(property.location);
  const propertyPrice = getPropertyPrice(property);
  const propertyCurrency = property.pricing?.currency || property.currency || 'GHS';
  const amenityHighlights = property.amenities.slice(0, 3);
  const isAvailable = property.available ?? property.status === 'available';
  const isFavorite = favoriteProperties.includes(property.id);
  const isCompared = comparedProperties.includes(property.id);

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

  const handleLoginRequired = (): void => {
    toast.info('Please log in to continue with payment');
    onNavigate?.('login');
  };

  return (
    <>
      <Card
        className="property-card group overflow-hidden rounded-[30px] border border-border bg-card/90 shadow-[0_12px_36px_rgba(15,23,42,0.08)] transition-all duration-300"
        onClick={handleCardClick}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
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

          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur ${
                isAvailable ? 'theme-available-badge' : 'theme-occupied-badge'
              }`}
            >
              {isAvailable ? 'Available' : 'Occupied'}
            </span>

            <div className="flex items-start gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card/92 px-3 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur">
                <Star className="h-3.5 w-3.5 fill-current text-[color:var(--warning)]" />
                {property.rating?.toFixed(1) || 'New'}
              </span>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleFavoriteToggle}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/95 text-muted-foreground shadow-sm backdrop-blur transition-colors',
                    isFavorite && 'theme-accent-badge text-[color:var(--accent-soft-foreground)]'
                  )}
                  aria-label={isFavorite ? 'Remove from saved homes' : 'Save home'}
                >
                  <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
                </button>

                <button
                  type="button"
                  onClick={handleCompareToggle}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/95 text-muted-foreground shadow-sm backdrop-blur transition-colors',
                    isCompared && 'theme-info-badge text-[color:var(--info-soft-foreground)]'
                  )}
                  aria-label={isCompared ? 'Remove from compare' : 'Add home to compare'}
                >
                  <Scale className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {property.featured && (
            <div className="theme-accent-badge absolute bottom-4 left-4 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Featured
            </div>
          )}
        </div>

        <CardContent className="space-y-5 p-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="truncate">{propertyLocation}</span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="line-clamp-1 text-xl font-semibold text-foreground">{property.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getListingLabel(property)} - {formatLabel(property.type)}
                </p>
              </div>

              <div className="theme-success-badge hidden px-3 py-1 text-xs font-semibold sm:inline-flex">
                Verified
              </div>
            </div>

            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
              {property.description}
            </p>
          </div>

          <div className="air-surface-muted rounded-[24px] p-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[18px] bg-card/70 px-3 py-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Bed className="h-4 w-4 text-primary" />
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em]">Beds</span>
                </div>
                <p className="mt-2 text-base font-semibold text-foreground">{property.bedrooms || '-'}</p>
              </div>

              <div className="rounded-[18px] bg-card/70 px-3 py-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Bath className="h-4 w-4 text-primary" />
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em]">Baths</span>
                </div>
                <p className="mt-2 text-base font-semibold text-foreground">{property.bathrooms || '-'}</p>
              </div>

              <div className="rounded-[18px] bg-card/70 px-3 py-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Square className="h-4 w-4 text-primary" />
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em]">Area</span>
                </div>
                <p className="mt-2 text-base font-semibold text-foreground">
                  {property.area ? `${property.area} m2` : '-'}
                </p>
              </div>
            </div>
          </div>

          {amenityHighlights.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {amenityHighlights.slice(0, 2).map((amenity) => (
                <span
                  key={amenity}
                  className="rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  {amenity}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Starting from
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="theme-price-text text-2xl font-semibold">
                  {propertyCurrency} {formatPrice(propertyPrice)}
                </span>
                <span className="text-sm text-muted-foreground">/ {getPriceSuffix(property)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
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
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={isCompared ? 'secondary' : 'outline'}
                  onClick={handleCompareToggle}
                  className="h-11 rounded-full px-4"
                >
                  <Scale className="mr-2 h-4 w-4" />
                  {isCompared ? 'Comparing' : 'Compare'}
                </Button>
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
          </div>

          {showQuickActions && currentUser && isAvailable && (
            <MobileCheckoutButton
              property={property}
              currentUser={currentUser}
              defaultTransactionType="purchase"
              onCheckoutOpen={handleCheckoutOpen}
              onLoginRequired={handleLoginRequired}
              variant={isMobile ? 'expanded' : 'default'}
              showPaymentMethods={!isMobile}
              className={cn(isMobile && 'w-full')}
            />
          )}
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
