import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  Car,
  CheckCircle,
  Clock,
  Layers,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Route,
  Satellite,
  Share,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Booking, LocationData, Property, User as UserType } from '../types';
import {
  getCurrentLocation,
  openExternalUrl,
  shareContent,
  watchLocation,
} from '../services/nativeCapabilities';
import { getLocationLabel, getPropertyCoordinates } from '../utils/location';
import {
  buildExternalMapUrl,
  buildMapPreviewSource,
  calculateRouteWithAvailableProvider,
  getMapDisplayProvider,
  searchNearbyPlacesWithAvailableProvider,
} from '../utils/mapService';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface EnhancedMapViewProps {
  properties?: Property[];
  currentUser: UserType;
  selectedProperty?: Property;
  userBookings?: Booking[];
  onBack: () => void;
  onPropertySelect?: (property: Property) => void;
  onNavigateToProperty?: (property: Property) => void;
  mode: 'browse' | 'directions' | 'booking-details';
  targetBooking?: Booking;
}

interface DirectionsData {
  distance: string;
  duration: string;
  steps: DirectionStep[];
  overview: string;
}

interface DirectionStep {
  instruction: string;
  distance: string;
  duration: string;
  maneuver: string;
}

interface NearbyPlace {
  name: string;
  type: string;
  distance: string;
  rating?: number;
}

export function EnhancedMapView({
  properties = [],
  currentUser,
  selectedProperty,
  userBookings = [],
  onBack,
  onPropertySelect,
  mode,
  targetBooking,
}: EnhancedMapViewProps) {
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [directionsData, setDirectionsData] = useState<DirectionsData | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [activeProperty, setActiveProperty] = useState<Property | null>(selectedProperty || null);
  const [isNavigating, setIsNavigating] = useState(false);
  const stopNavigationRef = useRef<(() => void) | null>(null);

  const displayProperty =
    mode === 'booking-details' && targetBooking
      ? properties.find((property) => property.id === targetBooking.propertyId) || activeProperty
      : activeProperty;

  const bookedProperties = useMemo(
    () =>
      properties.filter((property) =>
        userBookings.some(
          (booking) => booking.propertyId === property.id && booking.status === 'active',
        ),
      ),
    [properties, userBookings],
  );

  const displayCoordinates = useMemo(() => {
    const [latitude, longitude] = getPropertyCoordinates(displayProperty);
    return { latitude, longitude };
  }, [displayProperty]);
  const mapPreviewSource = useMemo(
    () =>
      buildMapPreviewSource(displayCoordinates.latitude, displayCoordinates.longitude, mapType),
    [displayCoordinates.latitude, displayCoordinates.longitude, mapType]
  );
  const mapProviderLabel = useMemo(() => {
    const provider = getMapDisplayProvider();
    return provider === 'fallback' ? 'No live map provider' : provider === 'mapbox' ? 'Mapbox preview' : 'Google Maps';
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLocation = async () => {
      try {
        const location = await getCurrentLocation();
        if (!cancelled) {
          setUserLocation(location);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error getting location:', error);
          toast.error('Unable to get your location. Please enable location services.');
        }
      }
    };

    void loadLocation();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadNearbyPlaces = async () => {
      if (!displayProperty) {
        setNearbyPlaces([]);
        return;
      }

      if (displayCoordinates.latitude === 0 && displayCoordinates.longitude === 0) {
        setNearbyPlaces([]);
        return;
      }

      try {
        const places = await searchNearbyPlacesWithAvailableProvider(
          {
            lat: displayCoordinates.latitude,
            lng: displayCoordinates.longitude,
          },
          1500,
        );

        if (!cancelled) {
          setNearbyPlaces(
            places.slice(0, 6).map((place) => ({
              name: place.name,
              type: place.type.replace(/_/g, ' '),
              distance: `${place.distance.toFixed(1)} km`,
              rating: place.rating,
            })),
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading nearby places:', error);
          setNearbyPlaces([]);
        }
      }
    };

    void loadNearbyPlaces();

    return () => {
      cancelled = true;
    };
  }, [displayCoordinates.latitude, displayCoordinates.longitude, displayProperty]);

  useEffect(
    () => () => {
      if (stopNavigationRef.current) {
        stopNavigationRef.current();
      }
    },
    [],
  );

  const calculateDirections = useCallback(
    async (property: Property) => {
      if (!userLocation) {
        toast.error('Location not available yet. Please try again in a moment.');
        return;
      }

      const [latitude, longitude] = getPropertyCoordinates(property);
      if (latitude === 0 && longitude === 0) {
        toast.error('This property is missing map coordinates.');
        return;
      }

      setIsCalculatingRoute(true);

      try {
        const directions = await calculateRouteWithAvailableProvider(userLocation, {
          lat: latitude,
          lng: longitude,
        });

        setDirectionsData(directions);
        setActiveProperty(property);
        toast.success('Route calculated successfully.');
      } catch (error) {
        console.error('Error calculating directions:', error);
        toast.error('Failed to calculate directions.');
      } finally {
        setIsCalculatingRoute(false);
      }
    },
    [userLocation],
  );

  const startNavigation = useCallback(() => {
    if (!displayProperty || !directionsData) return;

    setIsNavigating(true);
    toast.success('Navigation started. We will keep your location current.');

    if (stopNavigationRef.current) {
      stopNavigationRef.current();
    }

    void (async () => {
      try {
        stopNavigationRef.current = await watchLocation(
          (location) => {
            setUserLocation(location);
          },
          (error) => {
            console.error('Navigation tracking error:', error);
          },
        );
      } catch (error) {
        console.error('Unable to start navigation tracking:', error);
        toast.error('Unable to start live navigation tracking.');
      }
    })();
  }, [directionsData, displayProperty]);

  const stopNavigation = useCallback(() => {
    if (stopNavigationRef.current) {
      stopNavigationRef.current();
      stopNavigationRef.current = null;
    }

    setIsNavigating(false);
  }, []);

  const handleOpenExternalMaps = useCallback(async () => {
    if (!displayProperty) return;

    await openExternalUrl(
      buildExternalMapUrl(displayCoordinates.latitude, displayCoordinates.longitude),
    );
  }, [displayCoordinates.latitude, displayCoordinates.longitude, displayProperty]);

  const handleSharePropertyLocation = useCallback(async () => {
    if (!displayProperty) return;

    try {
      await shareContent({
        title: `${displayProperty.title} location`,
        text: `Navigate to ${displayProperty.title}`,
        url: buildExternalMapUrl(displayCoordinates.latitude, displayCoordinates.longitude),
        dialogTitle: 'Share property location',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to share this location.');
    }
  }, [displayCoordinates.latitude, displayCoordinates.longitude, displayProperty]);

  const headerTitle =
    mode === 'directions'
      ? 'Navigation'
      : mode === 'booking-details'
        ? 'Property Location'
        : 'Map View';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <motion.header
        className="border-b border-border bg-card/80 p-4 backdrop-blur-lg"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{headerTitle}</h1>
              {displayProperty ? (
                <p className="text-sm text-muted-foreground">
                  {displayProperty.title} • {getLocationLabel(displayProperty.location)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMapType(mapType === 'roadmap' ? 'satellite' : 'roadmap')}
            >
              {mapType === 'roadmap' ? (
                <Satellite className="h-4 w-4" />
              ) : (
                <Layers className="h-4 w-4" />
              )}
            </Button>

            {displayProperty ? (
              <Button
                variant="default"
                size="sm"
                disabled={isCalculatingRoute || !userLocation}
                onClick={() => {
                  void calculateDirections(displayProperty);
                }}
              >
                {isCalculatingRoute ? (
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Route className="mr-2 h-4 w-4" />
                )}
                Get Directions
              </Button>
            ) : null}
            <Badge variant="outline" className="hidden md:inline-flex">
              {mapProviderLabel}
            </Badge>
          </div>
        </div>
      </motion.header>

      <div className="relative flex min-h-0 flex-1">
        <div className="relative flex-1 bg-muted">
          {displayProperty &&
          displayCoordinates.latitude !== 0 &&
          displayCoordinates.longitude !== 0 &&
          mapPreviewSource ? (
            mapPreviewSource.kind === 'iframe' ? (
              <iframe
                title={`${displayProperty.title} map`}
                src={mapPreviewSource.src}
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <img
                src={mapPreviewSource.src}
                alt={`${displayProperty.title} map preview`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center bg-secondary/60">
              <div className="text-center text-muted-foreground">
                <MapPin className="mx-auto mb-3 h-10 w-10" />
                <p>Map preview is unavailable for this listing.</p>
              </div>
            </div>
          )}

          {isNavigating && directionsData ? (
            <motion.div
              className="absolute left-4 right-4 top-4 z-20 rounded-xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-lg"
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                    <Navigation className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Navigating to {displayProperty?.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {directionsData.distance} • {directionsData.duration}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={stopNavigation}>
                  Stop
                </Button>
              </div>

              <div className="rounded-lg bg-muted/50 p-3">
                <p className="mb-1 text-sm font-medium">Next Step</p>
                <p className="text-sm">{directionsData.steps[0]?.instruction || directionsData.overview}</p>
              </div>
            </motion.div>
          ) : null}
        </div>

        <motion.div
          className="absolute inset-x-0 bottom-0 z-20 flex h-[min(72vh,680px)] flex-col border-t border-border bg-card/98 backdrop-blur-xl md:static md:h-full md:w-96 md:border-l md:border-t-0 md:bg-card md:backdrop-blur-none"
          initial={{ x: 280, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        >
          <Tabs defaultValue="details" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="m-4 grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="directions">Route</TabsTrigger>
              <TabsTrigger value="nearby">Nearby</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="flex-1 space-y-4 overflow-y-auto p-4">
              {displayProperty ? (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{displayProperty.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {getLocationLabel(displayProperty.location)}
                        </p>
                      </div>
                      <Badge variant={displayProperty.available ? 'default' : 'secondary'}>
                        {displayProperty.available ? 'Available' : 'Not Available'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                      <img
                        src={displayProperty.images[0]}
                        alt={displayProperty.title}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold">${displayProperty.price.toLocaleString()}</div>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 fill-current text-[color:var(--warning)]" />
                        <span className="text-sm">{displayProperty.rating}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <span className="ml-2 capitalize">{displayProperty.type}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Area:</span>
                        <span className="ml-2">{displayProperty.area} sqft</span>
                      </div>
                      {displayProperty.bedrooms ? (
                        <div>
                          <span className="text-muted-foreground">Bedrooms:</span>
                          <span className="ml-2">{displayProperty.bedrooms}</span>
                        </div>
                      ) : null}
                      {displayProperty.bathrooms ? (
                        <div>
                          <span className="text-muted-foreground">Bathrooms:</span>
                          <span className="ml-2">{displayProperty.bathrooms}</span>
                        </div>
                      ) : null}
                    </div>

                    {mode === 'booking-details' && targetBooking ? (
                      <div className="rounded-lg p-3 theme-success-badge">
                        <div className="mb-2 flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-[color:var(--success)]" />
                          <span className="font-medium text-[color:var(--success-soft-foreground)]">
                            Active Booking
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="text-muted-foreground">Type:</span> {targetBooking.type}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Start:</span>{' '}
                            {new Date(targetBooking.startDate).toLocaleDateString()}
                          </p>
                          {targetBooking.endDate ? (
                            <p>
                              <span className="text-muted-foreground">End:</span>{' '}
                              {new Date(targetBooking.endDate).toLocaleDateString()}
                            </p>
                          ) : null}
                          <p>
                            <span className="text-muted-foreground">Amount:</span> $
                            {targetBooking.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      {!directionsData ? (
                        <Button
                          className="w-full"
                          disabled={isCalculatingRoute || !userLocation}
                          onClick={() => {
                            void calculateDirections(displayProperty);
                          }}
                        >
                          {isCalculatingRoute ? (
                            <>
                              <Clock className="mr-2 h-4 w-4 animate-spin" />
                              Calculating...
                            </>
                          ) : (
                            <>
                              <Route className="mr-2 h-4 w-4" />
                              Get Directions
                            </>
                          )}
                        </Button>
                      ) : !isNavigating ? (
                        <Button className="w-full" onClick={startNavigation}>
                          <Navigation className="mr-2 h-4 w-4" />
                          Start Navigation
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full" onClick={stopNavigation}>
                          Stop Navigation
                        </Button>
                      )}

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            void handleOpenExternalMaps();
                          }}
                        >
                          <Phone className="mr-2 h-4 w-4" />
                          Open Maps
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Message
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            void handleSharePropertyLocation();
                          }}
                        >
                          <Share className="mr-2 h-4 w-4" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {mode === 'browse' && bookedProperties.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Active Booking Pins</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {bookedProperties.map((property) => (
                      <button
                        key={property.id}
                        type="button"
                        className="w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50"
                        onClick={() => {
                          setActiveProperty(property);
                          onPropertySelect?.(property);
                        }}
                      >
                        <div className="font-medium">{property.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {getLocationLabel(property.location)}
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              ) : null}
            </TabsContent>

            <TabsContent value="directions" className="flex-1 overflow-y-auto p-4">
              {directionsData ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <Route className="mr-2 h-5 w-5" />
                        Route Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{directionsData.duration}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <span>{directionsData.distance}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{directionsData.overview}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Turn-by-Turn Directions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {directionsData.steps.map((step, index) => (
                          <div
                            key={`${step.instruction}-${index}`}
                            className="flex items-start space-x-3 rounded-lg p-2 hover:bg-muted/50"
                          >
                            <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{step.instruction}</p>
                              <p className="text-xs text-muted-foreground">
                                {step.distance} • {step.duration}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Get directions to see route details.
                    </p>
                    {displayProperty ? (
                      <Button
                        className="mt-4"
                        disabled={!userLocation}
                        onClick={() => {
                          void calculateDirections(displayProperty);
                        }}
                      >
                        <Route className="mr-2 h-4 w-4" />
                        Calculate Route
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="nearby" className="flex-1 overflow-y-auto p-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Nearby Places</CardTitle>
                </CardHeader>
                <CardContent>
                  {nearbyPlaces.length > 0 ? (
                    <div className="space-y-3">
                      {nearbyPlaces.map((place) => (
                        <div
                          key={`${place.name}-${place.distance}`}
                          className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/50"
                        >
                          <div>
                            <p className="text-sm font-medium">{place.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {place.type} • {place.distance}
                            </p>
                          </div>
                          {typeof place.rating === 'number' ? (
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 fill-current text-[color:var(--warning)]" />
                              <span className="text-xs">{place.rating}</span>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                      Nearby places will appear here when the map service returns results for this
                      property.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
