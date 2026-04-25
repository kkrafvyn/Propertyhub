import React, { useMemo, useState } from 'react';
import { AppState, Property, User } from '../types';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import {
  ArrowLeft,
  Bath,
  Bed,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  MessageCircle,
  Scale,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  Square,
  Star,
  TrendingUp,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

import { CheckoutWrapper } from './payments/CheckoutWrapper';
import { MobileCheckoutButton } from './payments/MobileCheckoutButton';
import type { TransactionType } from './payments/CheckoutWrapper';

import { useMobile } from '../hooks/useMobile';
import { useAppContext } from '../hooks/useAppContext';
import { Calendar } from './ui/calendar';

import { formatPrice } from '../utils/propertyFiltering';
import { getLocationLabel, getPropertyPrice } from '../utils/location';
import { toast } from 'sonner';
import { BrandMark } from './BrandMark';
import { PropertyCard } from './PropertyCard';
import { cn } from './ui/utils';

interface PropertyDetailsViewProps {
  selectedProperty: Property;
  currentUser: User;
  onBack: () => void;
  onNavigation: (route: AppState) => void;
}

const getListingLabel = (property: Property) => {
  if (property.listingType === 'sale') return 'For sale';
  if (property.pricing?.period === 'daily' || property.listingType === 'shortlet') return 'Per night';
  if (property.pricing?.period === 'yearly') return 'Per year';
  return 'Per month';
};

const getPrimaryTransactionType = (property: Property): TransactionType => {
  if (property.listingType === 'sale') return 'purchase';
  if (property.pricing?.period === 'yearly') return 'lease';
  if (property.pricing?.period === 'daily' || property.listingType === 'shortlet') return 'booking';
  return 'rent';
};

const getPrimaryActionLabel = (transactionType: TransactionType) => {
  if (transactionType === 'purchase') return 'Buy now';
  if (transactionType === 'lease') return 'Start lease';
  if (transactionType === 'booking') return 'Reserve';
  return 'Rent now';
};

const formatTypeLabel = (value: string) =>
  value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const buildGeneratedPriceTrend = (price: number) => {
  const labels = ['4 mo', '3 mo', '2 mo', 'Now'];
  return labels.map((label, index) => ({
    label,
    amount: Math.max(0, Math.round(price * (0.9 + index * 0.035))),
  }));
};

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const formatReadableDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export function PropertyDetailsView({
  selectedProperty,
  currentUser,
  onBack,
  onNavigation,
}: PropertyDetailsViewProps) {
  const isMobile = useMobile();
  const {
    properties,
    favoriteProperties,
    comparedProperties,
    toggleFavorite,
    toggleCompareProperty,
    setSelectedProperty,
  } = useAppContext();
  const propertyLocation = getLocationLabel(selectedProperty.location);
  const propertyPrice = getPropertyPrice(selectedProperty);
  const propertyCurrency = selectedProperty.pricing?.currency || selectedProperty.currency || 'GHS';
  const isAvailable = selectedProperty.available ?? selectedProperty.status === 'available';
  const isFavorite = favoriteProperties.includes(selectedProperty.id);
  const isCompared = comparedProperties.includes(selectedProperty.id);
  const primaryTransactionType = getPrimaryTransactionType(selectedProperty);
  const primaryActionLabel = getPrimaryActionLabel(primaryTransactionType);
  const bedrooms = selectedProperty.bedrooms ?? selectedProperty.features?.bedrooms ?? '-';
  const bathrooms = selectedProperty.bathrooms ?? selectedProperty.features?.bathrooms ?? '-';
  const squareArea = selectedProperty.area ?? selectedProperty.features?.area ?? '-';

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedTransactionType, setSelectedTransactionType] =
    useState<TransactionType>(primaryTransactionType);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const galleryImages = useMemo(() => {
    const imageUrls = selectedProperty.images?.filter(Boolean) || [];
    if (imageUrls.length) return imageUrls.slice(0, 6);
    return selectedProperty.media?.map((item) => item.url).slice(0, 6) || [];
  }, [selectedProperty.images, selectedProperty.media]);

  const amenityHighlights = selectedProperty.amenities.slice(0, 12);
  const priceTrend = useMemo(
    () =>
      selectedProperty.pricing?.priceHistory?.length
        ? selectedProperty.pricing.priceHistory.slice(-4).map((entry, index) => ({
            label: ['4 mo', '3 mo', '2 mo', 'Now'][index] || new Date(entry.date).toLocaleDateString(),
            amount: entry.amount,
          }))
        : buildGeneratedPriceTrend(propertyPrice),
    [propertyPrice, selectedProperty.pricing?.priceHistory]
  );
  const maxTrendPrice = Math.max(...priceTrend.map((entry) => entry.amount), 1);
  const similarProperties = useMemo(
    () =>
      properties
        .filter((property) => property.id !== selectedProperty.id)
        .filter((property) => {
          const sameType = property.type === selectedProperty.type;
          const sameLocation =
            getLocationLabel(property.location).split(',')[0] === propertyLocation.split(',')[0];
          return sameType || sameLocation;
        })
        .slice(0, 3),
    [properties, propertyLocation, selectedProperty.id, selectedProperty.type]
  );
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?property=${selectedProperty.id}`
      : `property:${selectedProperty.id}`;
  const availableUntil = isAvailable ? addDays(new Date(), 45) : addDays(new Date(), 0);
  const disabledDates = isAvailable
    ? { before: new Date() }
    : { from: new Date(), to: addDays(new Date(), 365) };
  const trustHighlights = [
    {
      icon: ShieldCheck,
      title: 'Verified identity',
      description: 'Host details and listing ownership have already been reviewed.',
    },
    {
      icon: Shield,
      title: 'Protected payment flow',
      description: 'Checkout, receipts, and transaction history stay inside the platform.',
    },
    {
      icon: MessageCircle,
      title: 'Fast follow-up',
      description: 'Use in-app messaging to clarify pricing, availability, and next steps.',
    },
  ];

  const handleCheckoutOpen = (transactionType: TransactionType): void => {
    setSelectedTransactionType(transactionType);
    setIsCheckoutOpen(true);
  };

  const handleCheckoutClose = (): void => {
    setIsCheckoutOpen(false);
  };

  const handleCheckoutSuccess = (transactionId: string): void => {
    setIsCheckoutOpen(false);
    toast.success(`Transaction completed! ID: ${transactionId}`);
    onNavigation('dashboard');
  };

  const handleLoginRequired = (): void => {
    toast.info('Please log in to continue with payment');
    onNavigation('login');
  };

  const handlePrimaryCheckout = (): void => {
    if (!currentUser) {
      handleLoginRequired();
      return;
    }

    if (!isAvailable) {
      toast.error('This property is currently not available');
      return;
    }

    handleCheckoutOpen(primaryTransactionType);
  };

  const handleShareListing = async (): Promise<void> => {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: selectedProperty.title,
          text: `Take a look at ${selectedProperty.title} on PropertyHub`,
          url: shareUrl,
        });
        return;
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Listing link copied to clipboard');
        return;
      }

      toast.info(`Share this listing: ${shareUrl}`);
    } catch (_error) {
      toast.error('We could not share this listing right now.');
    }
  };

  const handleGalleryStep = (direction: 'next' | 'previous') => {
    if (!galleryImages.length) return;

    setActiveImageIndex((currentIndex) => {
      if (direction === 'next') {
        return (currentIndex + 1) % galleryImages.length;
      }

      return (currentIndex - 1 + galleryImages.length) % galleryImages.length;
    });
  };

  const handleSelectSimilarProperty = (property: Property) => {
    setSelectedProperty(property);
    setSelectedDate(undefined);
    setActiveImageIndex(0);
    setIsGalleryOpen(false);

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-32 pt-20 lg:pb-12">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-11 rounded-full border-border bg-card px-5 shadow-sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to homes
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Verified listing
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm">
              <MapPin className="h-4 w-4 text-primary" />
              {propertyLocation}
            </span>
            <Button variant="outline" size="sm" className="rounded-full" onClick={handleShareListing}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button
              variant={isFavorite ? 'secondary' : 'outline'}
              size="sm"
              className="rounded-full"
              onClick={() => toggleFavorite(selectedProperty.id)}
            >
              <Heart className={cn('mr-2 h-4 w-4', isFavorite && 'fill-current')} />
              {isFavorite ? 'Saved' : 'Save'}
            </Button>
            <Button
              variant={isCompared ? 'secondary' : 'outline'}
              size="sm"
              className="rounded-full"
              onClick={() => toggleCompareProperty(selectedProperty.id)}
            >
              <Scale className="mr-2 h-4 w-4" />
              {isCompared ? 'Comparing' : 'Compare'}
            </Button>
          </div>
        </div>

        <section className="mt-6 overflow-hidden rounded-[36px] border border-border bg-card shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
          <div className="grid gap-8 p-4 sm:p-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(290px,360px)] xl:p-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {selectedProperty.featured && (
                    <span className="theme-accent-badge inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
                      <Sparkles className="h-4 w-4" />
                      Guest favorite
                    </span>
                  )}
                  <span className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground">
                    {formatTypeLabel(selectedProperty.type)}
                  </span>
                  <span className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground">
                    {isAvailable ? 'Available now' : 'Currently unavailable'}
                  </span>
                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {selectedProperty.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-current text-[color:var(--warning)]" />
                    {selectedProperty.rating?.toFixed(1) || 'New'}
                  </span>
                  <span>{getListingLabel(selectedProperty)}</span>
                  <span>{propertyLocation}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.7fr)]">
                  <div className="relative overflow-hidden rounded-[32px] bg-secondary">
                    {galleryImages[activeImageIndex] ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsGalleryOpen(true)}
                          className="block w-full"
                        >
                          <img
                            src={galleryImages[activeImageIndex]}
                            alt={selectedProperty.title}
                            className="h-full min-h-[320px] w-full object-cover"
                          />
                        </button>
                        {galleryImages.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleGalleryStep('previous')}
                              className="theme-panel-soft absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleGalleryStep('next')}
                              className="theme-panel-soft absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
                          <span className="theme-panel-soft rounded-full border px-3 py-1.5 text-xs font-medium">
                            {activeImageIndex + 1} / {galleryImages.length}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full border-white/20 bg-black/35 text-white backdrop-blur hover:bg-black/50 hover:text-white"
                            onClick={() => setIsGalleryOpen(true)}
                          >
                            Open gallery
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex min-h-[320px] items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(255,56,92,0.16),transparent_30%),linear-gradient(180deg,rgba(17,24,39,0.12),rgba(17,24,39,0.02))]">
                        <BrandMark className="h-24 w-24 rounded-[30px] shadow-[0_18px_48px_rgba(15,23,42,0.18)]" />
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    {galleryImages.slice(1, 3).map((image, index) => (
                      <button
                        key={image}
                        type="button"
                        onClick={() => {
                          setActiveImageIndex(index + 1);
                          setIsGalleryOpen(true);
                        }}
                        className="overflow-hidden rounded-[28px] bg-secondary text-left"
                      >
                        <img
                          src={image}
                          alt={`${selectedProperty.title} view ${index + 2}`}
                          className="h-full min-h-[154px] w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                        />
                      </button>
                    ))}

                    {galleryImages.length <= 1 && (
                      <div className="flex min-h-[154px] items-center justify-center rounded-[28px] border border-dashed border-border bg-secondary/70 p-6 text-center">
                        <div>
                          <p className="text-sm font-semibold text-foreground">More gallery views coming soon</p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            We will surface extra photos, tours, and media here as listings are expanded.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {galleryImages.length > 1 && (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {galleryImages.map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => setActiveImageIndex(index)}
                        className={cn(
                          'overflow-hidden rounded-[22px] border transition-all',
                          activeImageIndex === index
                            ? 'border-primary shadow-[0_14px_34px_color-mix(in_srgb,var(--primary)_18%,transparent)]'
                            : 'border-border'
                        )}
                      >
                        <img
                          src={image}
                          alt={`${selectedProperty.title} thumbnail ${index + 1}`}
                          className="h-20 w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] bg-secondary/80 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Bed className="h-4 w-4 text-primary" />
                    Bedrooms
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-foreground">{bedrooms}</p>
                </div>
                <div className="rounded-[24px] bg-secondary/80 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Bath className="h-4 w-4 text-primary" />
                    Bathrooms
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-foreground">{bathrooms}</p>
                </div>
                <div className="rounded-[24px] bg-secondary/80 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Square className="h-4 w-4 text-primary" />
                    Space
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-foreground">
                    {typeof squareArea === 'number' ? `${squareArea} m2` : squareArea}
                  </p>
                </div>
              </div>

              <Card className="rounded-[32px] border border-border bg-card shadow-sm">
                <CardContent className="p-6 sm:p-7">
                  <h2 className="text-2xl font-semibold text-foreground">About this home</h2>
                  <p className="mt-4 text-base leading-7 text-muted-foreground">
                    {selectedProperty.description}
                  </p>
                </CardContent>
              </Card>

              {amenityHighlights.length > 0 && (
                <Card className="rounded-[32px] border border-border bg-card shadow-sm">
                  <CardContent className="p-6 sm:p-7">
                    <h2 className="text-2xl font-semibold text-foreground">What this place offers</h2>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {amenityHighlights.map((amenity) => (
                        <div
                          key={amenity}
                          className="rounded-[22px] border border-border bg-secondary/70 px-4 py-3 text-sm font-medium text-foreground"
                        >
                          {amenity}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                <Card className="rounded-[32px] border border-border bg-card shadow-sm">
                  <CardContent className="p-6 sm:p-7">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-2xl font-semibold text-foreground">Availability calendar</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Pick a date to plan your stay or move-in timeline before checkout.
                        </p>
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium',
                          isAvailable ? 'theme-success-badge' : 'theme-warning-badge'
                        )}
                      >
                        <CalendarDays className="h-4 w-4" />
                        {isAvailable ? 'Open dates' : 'Waitlist only'}
                      </span>
                    </div>

                    <div className="mt-6 overflow-hidden rounded-[28px] border border-border bg-secondary/40">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={disabledDates}
                        className="w-full"
                        classNames={{
                          months: 'flex w-full flex-col',
                          month: 'w-full',
                          table: 'w-full border-collapse',
                        }}
                      />
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] bg-secondary/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                          Selected date
                        </p>
                        <p className="mt-3 text-lg font-semibold text-foreground">
                          {selectedDate ? formatReadableDate(selectedDate) : 'Choose a day'}
                        </p>
                      </div>
                      <div className="rounded-[22px] bg-secondary/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                          Next window
                        </p>
                        <p className="mt-3 text-lg font-semibold text-foreground">
                          {isAvailable ? `Through ${formatReadableDate(availableUntil)}` : 'Join waitlist'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[32px] border border-border bg-card shadow-sm">
                  <CardContent className="p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-semibold text-foreground">Price trend</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Recent pricing movement helps you gauge momentum before you commit.
                        </p>
                      </div>
                      <div className="theme-info-badge inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium">
                        <TrendingUp className="h-4 w-4" />
                        Live pricing
                      </div>
                    </div>

                    <div className="mt-8 grid h-52 grid-cols-4 items-end gap-3">
                      {priceTrend.map((entry) => (
                        <div key={entry.label} className="flex h-full flex-col justify-end gap-3">
                          <div className="flex-1 rounded-[24px] bg-secondary/70 p-2">
                            <div className="flex h-full items-end">
                              <div
                                className="theme-accent-badge w-full rounded-[18px] transition-all"
                                style={{
                                  height: `${Math.max(24, (entry.amount / maxTrendPrice) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                              {entry.label}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                              {propertyCurrency} {formatPrice(entry.amount)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="theme-info-badge mt-6 rounded-[24px] p-4">
                      <p className="text-sm font-medium">
                        {selectedProperty.pricing?.negotiable
                          ? 'Pricing is marked negotiable, so message the host if you want to discuss terms.'
                          : 'Pricing has stayed fairly steady, which can make planning simpler for buyers and renters.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
              <Card className="rounded-[32px] border border-border bg-card shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
                <CardContent className="space-y-5 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Starting from
                      </p>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-semibold text-foreground">
                          {propertyCurrency} {formatPrice(propertyPrice)}
                        </span>
                        <span className="text-sm text-muted-foreground">{getListingLabel(selectedProperty)}</span>
                      </div>
                    </div>

                    <div className="theme-accent-badge rounded-full px-3 py-1.5 text-sm font-semibold">
                      {selectedProperty.rating?.toFixed(1) || 'New'}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-[22px] bg-secondary/70 px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">Secure checkout</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Pay through the marketplace with a cleaner, clearer booking flow.
                      </p>
                    </div>
                    <div className="rounded-[22px] bg-secondary/70 px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">Plan around availability</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedDate
                          ? `You selected ${formatReadableDate(selectedDate)} as your preferred start date.`
                          : `This home is ${isAvailable ? 'open for new inquiries now.' : 'currently paused for bookings.'}`}
                      </p>
                    </div>
                  </div>

                  <MobileCheckoutButton
                    property={selectedProperty}
                    currentUser={currentUser}
                    defaultTransactionType={primaryTransactionType}
                    onCheckoutOpen={handleCheckoutOpen}
                    onLoginRequired={handleLoginRequired}
                    variant={isMobile ? 'expanded' : 'default'}
                    showPaymentMethods
                    className="w-full"
                  />

                  <Button
                    variant="outline"
                    className="h-12 w-full rounded-full border-border bg-card"
                    onClick={() => onNavigation('chat')}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Message owner
                  </Button>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={isFavorite ? 'secondary' : 'outline'}
                      className="flex-1 rounded-full"
                      onClick={() => toggleFavorite(selectedProperty.id)}
                    >
                      <Heart className={cn('mr-2 h-4 w-4', isFavorite && 'fill-current')} />
                      {isFavorite ? 'Saved' : 'Save'}
                    </Button>
                    <Button
                      variant={isCompared ? 'secondary' : 'outline'}
                      className="flex-1 rounded-full"
                      onClick={() => toggleCompareProperty(selectedProperty.id)}
                    >
                      <Scale className="mr-2 h-4 w-4" />
                      {isCompared ? 'Comparing' : 'Compare'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[32px] border border-border bg-card shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="theme-accent-icon flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold">
                      {selectedProperty.owner?.charAt(0) || selectedProperty.ownerId?.charAt(0) || 'O'}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {selectedProperty.owner || 'Property owner'}
                      </p>
                      <p className="text-sm text-muted-foreground">Verified host on PropertyHub</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {trustHighlights.map((item) => {
                      const Icon = item.icon;

                      return (
                        <div
                          key={item.title}
                          className="rounded-[22px] border border-border bg-secondary/60 p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="theme-accent-icon flex h-10 w-10 items-center justify-center rounded-2xl">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{item.title}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[32px] border border-border bg-card shadow-sm">
                <CardContent className="space-y-4 p-6">
                  <div className="flex flex-wrap gap-2">
                    <span className="theme-success-badge inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Verified listing
                    </span>
                    <span className="theme-info-badge inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium">
                      <Share2 className="h-3.5 w-3.5" />
                      Easy share link
                    </span>
                    <span className="theme-warning-badge inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium">
                      <Sparkles className="h-3.5 w-3.5" />
                      Cleaner checkout flow
                    </span>
                  </div>

                  <div className="rounded-[22px] bg-secondary/70 p-4">
                    <p className="text-sm font-semibold text-foreground">Why this page feels safer</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Saved homes, comparison, price trend context, and in-app messaging now all stay connected to the same listing flow.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {similarProperties.length > 0 && (
          <section className="mt-8 space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Keep browsing</p>
              <h2 className="text-2xl font-semibold text-foreground">Similar listings you may like</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {similarProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  currentUser={currentUser}
                  onSelect={handleSelectSimilarProperty}
                  onNavigate={onNavigation}
                  showQuickActions
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="fixed inset-x-3 bottom-[6.4rem] z-40 lg:hidden">
        <div className="wire-navbar rounded-[26px] px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] wire-navbar-subtle">
                {getListingLabel(selectedProperty)}
              </p>
              <p className="mt-1 text-lg font-semibold">
                {propertyCurrency} {formatPrice(propertyPrice)}
              </p>
            </div>
            <div
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium',
                isAvailable ? 'theme-success-badge' : 'theme-warning-badge'
              )}
            >
              {isAvailable ? 'Available' : 'Paused'}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[52px_minmax(0,1fr)_minmax(0,1fr)] gap-2">
            <Button
              variant={isFavorite ? 'secondary' : 'outline'}
              className="h-11 rounded-full px-0"
              onClick={() => toggleFavorite(selectedProperty.id)}
            >
              <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-full"
              onClick={() => onNavigation('chat')}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Message
            </Button>
            <Button className="h-11 rounded-full" onClick={handlePrimaryCheckout}>
              {primaryActionLabel}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-hidden border-border bg-background p-0 sm:rounded-[32px]">
          <div className="grid max-h-[92vh] overflow-hidden lg:grid-cols-[minmax(0,1.15fr)_360px]">
            <div className="relative flex min-h-[320px] items-center justify-center bg-black">
              {galleryImages[activeImageIndex] ? (
                <img
                  src={galleryImages[activeImageIndex]}
                  alt={`${selectedProperty.title} gallery view ${activeImageIndex + 1}`}
                  className="h-full max-h-[92vh] w-full object-contain"
                />
              ) : (
                <BrandMark className="h-24 w-24 rounded-[30px]" />
              )}

              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => handleGalleryStep('previous')}
                    className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGalleryStep('next')}
                    className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}

              <div className="absolute bottom-4 left-4 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
                {activeImageIndex + 1} / {galleryImages.length || 1}
              </div>
            </div>

            <div className="overflow-y-auto p-5 sm:p-6">
              <div className="pr-10">
                <DialogTitle className="text-2xl font-semibold text-foreground">
                  {selectedProperty.title}
                </DialogTitle>
                <DialogDescription className="mt-2 text-sm text-muted-foreground">
                  {propertyLocation}
                </DialogDescription>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {galleryImages.map((image, index) => (
                  <button
                    key={`${image}-dialog-${index}`}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={cn(
                      'overflow-hidden rounded-[20px] border transition-all',
                      activeImageIndex === index ? 'border-primary' : 'border-border'
                    )}
                  >
                    <img
                      src={image}
                      alt={`${selectedProperty.title} gallery thumbnail ${index + 1}`}
                      className="h-20 w-full object-cover"
                    />
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-[24px] bg-secondary/70 p-4">
                <p className="text-sm font-semibold text-foreground">Listing snapshot</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {selectedProperty.description}
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] bg-secondary/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Price
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {propertyCurrency} {formatPrice(propertyPrice)}
                  </p>
                </div>
                <div className="rounded-[22px] bg-secondary/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Rating
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {selectedProperty.rating?.toFixed(1) || 'New'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CheckoutWrapper
        property={selectedProperty}
        currentUser={currentUser}
        transactionType={selectedTransactionType}
        isOpen={isCheckoutOpen}
        onClose={handleCheckoutClose}
        onSuccess={handleCheckoutSuccess}
        onNavigate={onNavigation}
      />
    </div>
  );
}

export default PropertyDetailsView;
