import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Car,
  DollarSign,
  Home,
  MapPin,
  Navigation,
  Route,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Booking, LocationData, Property, User as UserType } from '../types';
import { getCurrentLocation, openExternalUrl, shareContent } from '../services/nativeCapabilities';
import { getLocationLabel, getPropertyCoordinates } from '../utils/location';
import {
  buildExternalDirectionsUrl,
  buildExternalMapUrl,
  calculateRouteWithAvailableProvider,
} from '../utils/mapService';
import { EnhancedMapView } from './EnhancedMapView';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface BookingDirectionsProps {
  booking?: Partial<Booking> | null;
  property: Property;
  currentUser: UserType;
  onBack: () => void;
}

interface TravelInfo {
  distance: string;
  duration: string;
  estimatedArrival: string;
  overview?: string;
}

const calculateArrivalTime = (durationText: string): string => {
  const match = durationText.match(/(\d+)\s*(hour|hours|hr|hrs|minute|minutes|min|mins)/i);
  const now = new Date();

  if (!match) {
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const rawValue = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const minutesToAdd = unit.startsWith('hour') || unit.startsWith('hr') ? rawValue * 60 : rawValue;
  const arrival = new Date(now.getTime() + minutesToAdd * 60 * 1000);

  return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const titleCaseStatus = (status?: string): string =>
  (status || 'scheduled')
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());

export function BookingDirections({
  booking,
  property,
  currentUser,
  onBack,
}: BookingDirectionsProps) {
  const propertyLocation = getLocationLabel(property.location);
  const propertyCoordinates = getPropertyCoordinates(property);
  const destination = useMemo(
    () => ({ lat: propertyCoordinates[0], lng: propertyCoordinates[1] }),
    [propertyCoordinates],
  );

  const [showMap, setShowMap] = useState(false);
  const [travelInfo, setTravelInfo] = useState<TravelInfo | null>(null);
  const [loadingTravelInfo, setLoadingTravelInfo] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const bookingStartDate = booking?.startDate || new Date().toISOString();
  const bookingEndDate = booking?.endDate;
  const bookingType = booking?.type || property.listingType || 'visit';
  const bookingAmount =
    Number(booking?.amount ?? booking?.totalAmount ?? property.pricing?.amount ?? property.price ?? 0);
  const bookingStatus = booking?.status || 'scheduled';

  useEffect(() => {
    let cancelled = false;

    const loadTravelInfo = async () => {
      setLoadingTravelInfo(true);

      try {
        const location = await getCurrentLocation();
        if (cancelled) return;

        setUserLocation(location);

        const directions = await calculateRouteWithAvailableProvider(location, destination);
        if (cancelled) return;

        setTravelInfo({
          distance: directions.distance,
          duration: directions.duration,
          overview: directions.overview,
          estimatedArrival: calculateArrivalTime(directions.duration),
        });
      } catch (error) {
        if (!cancelled) {
          console.error('Error getting travel information:', error);
          toast.error('Unable to load live travel information right now.');
        }
      } finally {
        if (!cancelled) {
          setLoadingTravelInfo(false);
        }
      }
    };

    void loadTravelInfo();

    return () => {
      cancelled = true;
    };
  }, [destination]);

  const handleGetDirections = () => {
    if (!userLocation && loadingTravelInfo) {
      toast.error('Location is still loading. Please try again in a moment.');
      return;
    }

    setShowMap(true);
  };

  const handleShareLocation = async () => {
    const locationUrl = buildExternalMapUrl(propertyCoordinates[0], propertyCoordinates[1]);

    try {
      await shareContent({
        title: `${property.title} location`,
        text: `Here is the location for ${property.title}`,
        url: locationUrl,
        dialogTitle: 'Share property location',
      });
    } catch (error) {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(locationUrl);
        toast.success('Location link copied to clipboard.');
        return;
      }

      toast.error(
        error instanceof Error ? error.message : 'Unable to share this location right now.',
      );
    }
  };

  const handleAddToCalendar = () => {
    const startDate = new Date(bookingStartDate);
    const endDate = bookingEndDate ? new Date(bookingEndDate) : startDate;
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `${bookingType} - ${property.title}`,
    )}&dates=${startDate
      .toISOString()
      .replace(/[-:]/g, '')
      .split('.')[0]}Z/${endDate
      .toISOString()
      .replace(/[-:]/g, '')
      .split('.')[0]}Z&details=${encodeURIComponent(
      `${bookingType} booking for ${property.title} at ${propertyLocation}`,
    )}&location=${encodeURIComponent(propertyLocation)}`;

    void openExternalUrl(calendarUrl);
    toast.success('Calendar details opened.');
  };

  const handleBookRide = () => {
    const rideUrl = buildExternalDirectionsUrl(
      { lat: propertyCoordinates[0], lng: propertyCoordinates[1] },
      userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : undefined,
    );

    void openExternalUrl(rideUrl);
    toast.info('Opening external navigation...');
  };

  if (showMap) {
    return (
      <EnhancedMapView
        currentUser={currentUser}
        selectedProperty={property}
        onBack={() => setShowMap(false)}
        mode="booking-details"
        targetBooking={booking as Booking}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <motion.header
        className="sticky top-0 z-50 border-b border-border bg-card/80 p-4 backdrop-blur-lg"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Property Location</h1>
              <p className="text-sm text-muted-foreground">
                Your booked property details and directions
              </p>
            </div>
          </div>

          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            {titleCaseStatus(bookingStatus)}
          </Badge>
        </div>
      </motion.header>

      <div className="mx-auto max-w-4xl space-y-6 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{property.title}</CardTitle>
                  <p className="mt-1 flex items-center text-muted-foreground">
                    <MapPin className="mr-1 h-4 w-4" />
                    {propertyLocation}
                  </p>
                </div>
                <Badge variant={bookingStatus === 'active' ? 'default' : 'secondary'}>
                  {titleCaseStatus(bookingStatus)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                <img
                  src={property.images[0]}
                  alt={property.title}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="flex items-center space-x-3 rounded-lg bg-muted/50 p-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Duration</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(bookingStartDate).toLocaleDateString()}
                      {bookingEndDate
                        ? ` - ${new Date(bookingEndDate).toLocaleDateString()}`
                        : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 rounded-lg bg-muted/50 p-3">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Amount Paid</p>
                    <p className="text-sm text-muted-foreground">
                      {property.pricing?.currency || property.currency || 'GHS'}{' '}
                      {bookingAmount.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 rounded-lg bg-muted/50 p-3">
                  <Home className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Type</p>
                    <p className="text-sm capitalize text-muted-foreground">{bookingType}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 md:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{property.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Area</p>
                  <p className="font-medium">{property.area} sqft</p>
                </div>
                {property.bedrooms ? (
                  <div>
                    <p className="text-sm text-muted-foreground">Bedrooms</p>
                    <p className="font-medium">{property.bedrooms}</p>
                  </div>
                ) : null}
                {property.bathrooms ? (
                  <div>
                    <p className="text-sm text-muted-foreground">Bathrooms</p>
                    <p className="font-medium">{property.bathrooms}</p>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Route className="mr-2 h-5 w-5" />
                Travel Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTravelInfo ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Navigation className="h-5 w-5 animate-pulse" />
                    <span>Getting live travel information...</span>
                  </div>
                </div>
              ) : travelInfo ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="flex items-center space-x-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
                      <Car className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium">Distance</p>
                        <p className="text-sm text-muted-foreground">{travelInfo.distance}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 rounded-lg bg-green-50 p-3 dark:bg-green-950/20">
                      <Route className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">Travel Time</p>
                        <p className="text-sm text-muted-foreground">{travelInfo.duration}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 rounded-lg bg-purple-50 p-3 dark:bg-purple-950/20">
                      <Navigation className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium">Estimated Arrival</p>
                        <p className="text-sm text-muted-foreground">
                          {travelInfo.estimatedArrival}
                        </p>
                      </div>
                    </div>
                  </div>

                  {travelInfo.overview ? (
                    <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                      {travelInfo.overview}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row">
                    <Button onClick={handleGetDirections} className="flex-1">
                      <Navigation className="mr-2 h-4 w-4" />
                      Get Directions
                    </Button>
                    <Button variant="outline" onClick={() => void handleShareLocation()} className="flex-1">
                      <MapPin className="mr-2 h-4 w-4" />
                      Share Location
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">Unable to get travel information</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Check your location settings and try again.
                  </p>
                  <Button className="mt-4" onClick={handleGetDirections}>
                    <Navigation className="mr-2 h-4 w-4" />
                    Open Map Anyway
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Button variant="outline" className="h-auto p-4" onClick={handleGetDirections}>
                  <div className="text-center">
                    <Navigation className="mx-auto mb-2 h-6 w-6" />
                    <p className="text-sm font-medium">Navigate</p>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4"
                  onClick={() => {
                    void handleShareLocation();
                  }}
                >
                  <div className="text-center">
                    <MapPin className="mx-auto mb-2 h-6 w-6" />
                    <p className="text-sm font-medium">Share Location</p>
                  </div>
                </Button>

                <Button variant="outline" className="h-auto p-4" onClick={handleAddToCalendar}>
                  <div className="text-center">
                    <Calendar className="mx-auto mb-2 h-6 w-6" />
                    <p className="text-sm font-medium">Add to Calendar</p>
                  </div>
                </Button>

                <Button variant="outline" className="h-auto p-4" onClick={handleBookRide}>
                  <div className="text-center">
                    <Car className="mx-auto mb-2 h-6 w-6" />
                    <p className="text-sm font-medium">Open Route</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Property Owner Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{property.owner}</p>
                  <p className="text-sm text-muted-foreground">Property Owner</p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    Call
                  </Button>
                  <Button variant="outline" size="sm">
                    Message
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
