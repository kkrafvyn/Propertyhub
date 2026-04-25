import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Navigation, 
  Car, 
  Clock,
  Star,
  Phone,
  MessageCircle,
  Bookmark,
  Share,
  ChevronLeft,
  ChevronRight,
  Layers,
  Satellite,
  Route,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Download,
  WifiOff,
  Settings
} from 'lucide-react';
import { Property, User as UserType, Booking, LocationData } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { getLocationLabel, getPropertyCoordinates } from '../utils/location';
import { toast } from "sonner";
import { googleMapsService } from '../utils/googleMaps';
import { offlineMapManager, getNetworkStatus } from '../utils/offlineMapManager';

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

// Mock Google Maps API functions for demonstration
const mockGoogleMapsAPI = {
  calculateRoute: async (origin: LocationData, destination: [number, number]): Promise<DirectionsData> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const distance = Math.random() * 50 + 5; // 5-55 km
    const duration = Math.random() * 60 + 10; // 10-70 minutes
    
    return {
      distance: `${distance.toFixed(1)} km`,
      duration: `${duration.toFixed(0)} min`,
      overview: `Head ${Math.random() > 0.5 ? 'north' : 'south'} on Main St, then follow the route to your destination.`,
      steps: [
        {
          instruction: "Head north on Current Location St",
          distance: "0.5 km",
          duration: "2 min",
          maneuver: "straight"
        },
        {
          instruction: "Turn right onto Highway 101",
          distance: `${(distance * 0.8).toFixed(1)} km`,
          duration: `${(duration * 0.8).toFixed(0)} min`,
          maneuver: "turn-right"
        },
        {
          instruction: "Turn left onto Destination Ave",
          distance: "0.3 km",
          duration: "1 min",
          maneuver: "turn-left"
        },
        {
          instruction: "Arrive at destination",
          distance: "0 km",
          duration: "0 min",
          maneuver: "arrive"
        }
      ]
    };
  },
  
  reverseGeocode: async (lat: number, lng: number): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return `${Math.floor(Math.random() * 9999)} Example St, City, State ${Math.floor(Math.random() * 90000 + 10000)}`;
  }
};

export function EnhancedMapView({ 
  properties = [], 
  currentUser, 
  selectedProperty, 
  userBookings = [],
  onBack, 
  onPropertySelect,
  onNavigateToProperty,
  mode,
  targetBooking
}: EnhancedMapViewProps) {
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [directionsData, setDirectionsData] = useState<DirectionsData | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [showNearbyPlaces, setShowNearbyPlaces] = useState(false);
  const [activeProperty, setActiveProperty] = useState<Property | null>(selectedProperty || null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [routeStarted, setRouteStarted] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Unable to get your location. Please enable location services.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    }
  }, []);

  // Calculate directions to selected property
  const calculateDirections = useCallback(async (property: Property) => {
    if (!userLocation) {
      toast.error('Location not available. Please enable location services.');
      return;
    }

    setIsCalculatingRoute(true);
    try {
      const directions = await mockGoogleMapsAPI.calculateRoute(
        userLocation,
        getPropertyCoordinates(property)
      );
      setDirectionsData(directions);
      setActiveProperty(property);
      toast.success('Route calculated successfully!');
    } catch (error) {
      console.error('Error calculating directions:', error);
      toast.error('Failed to calculate directions. Please try again.');
    } finally {
      setIsCalculatingRoute(false);
    }
  }, [userLocation]);

  // Start navigation
  const startNavigation = useCallback(() => {
    if (!activeProperty || !directionsData) return;
    
    setIsNavigating(true);
    setRouteStarted(true);
    toast.success('Navigation started! Follow the directions below.');
    
    // Start location tracking for navigation
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          });
        },
        (error) => console.error('Navigation tracking error:', error),
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 15000
        }
      );

      // Clean up watch on component unmount
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [activeProperty, directionsData]);

  // Get property to display (based on mode)
  const displayProperty = mode === 'booking-details' && targetBooking 
    ? properties.find(p => p.id === targetBooking.propertyId) || activeProperty
    : activeProperty;

  // Get user's bookings for map markers
  const bookedProperties = properties.filter(property => 
    userBookings.some(booking => 
      booking.propertyId === property.id && 
      booking.status === 'active'
    )
  );

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <motion.header 
        className="bg-card/80 backdrop-blur-lg border-b border-border p-4 flex items-center justify-between"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-semibold">
              {mode === 'directions' ? 'Navigation' : 
               mode === 'booking-details' ? 'Property Location' : 'Map View'}
            </h1>
            {displayProperty && (
              <p className="text-sm text-muted-foreground">
                {displayProperty.title} • {getLocationLabel(displayProperty.location)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Map Type Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMapType(mapType === 'roadmap' ? 'satellite' : 'roadmap')}
          >
            {mapType === 'roadmap' ? <Satellite className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
          </Button>

          {/* Navigation Controls */}
          {displayProperty && !isNavigating && (
            <Button
              variant="default"
              size="sm"
              onClick={() => calculateDirections(displayProperty)}
              disabled={isCalculatingRoute || !userLocation}
            >
              {isCalculatingRoute ? (
                <Clock className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Route className="w-4 h-4 mr-2" />
              )}
              Get Directions
            </Button>
          )}

          {directionsData && !isNavigating && (
            <Button
              variant="default"
              size="sm"
              onClick={startNavigation}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Start Navigation
            </Button>
          )}
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="relative flex min-h-0 flex-1">
        {/* Map Container */}
        <div className="flex-1 relative">
          <motion.div
            ref={mapRef}
            className="relative h-full w-full overflow-hidden"
            style={{
              background:
                mapType === 'satellite'
                  ? 'linear-gradient(135deg, color-mix(in srgb, var(--foreground) 82%, #0f1216) 0%, color-mix(in srgb, var(--primary) 28%, #111418) 52%, color-mix(in srgb, var(--muted-foreground) 42%, #090b0f) 100%)'
                  : 'linear-gradient(135deg, color-mix(in srgb, var(--secondary) 74%, white) 0%, var(--card) 52%, color-mix(in srgb, var(--accent) 24%, var(--card)) 100%)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            {/* Mock Map Background */}
            <div className="absolute inset-0">
              {mapType === 'roadmap' ? (
                <div
                  className="h-full w-full"
                  style={{
                    background:
                      'linear-gradient(135deg, color-mix(in srgb, var(--secondary) 78%, white) 0%, var(--card) 54%, color-mix(in srgb, var(--accent) 18%, var(--card)) 100%)',
                  }}
                >
                  <svg className="w-full h-full">
                    <defs>
                      <pattern id="map-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#map-grid)" />
                  </svg>
                </div>
              ) : (
                <div
                  className="h-full w-full opacity-75"
                  style={{
                    background:
                      'linear-gradient(135deg, color-mix(in srgb, var(--foreground) 88%, #0f1216) 0%, color-mix(in srgb, var(--primary) 32%, #111418) 48%, color-mix(in srgb, var(--muted-foreground) 45%, #090b0f) 100%)',
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(35deg, transparent 0%, color-mix(in srgb, var(--accent) 18%, transparent) 48%, color-mix(in srgb, var(--info) 22%, transparent) 100%)',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Property Markers */}
            <AnimatePresence>
              {(mode === 'browse' ? properties : displayProperty ? [displayProperty] : []).map((property, index) => {
                const isBooked = userBookings.some(booking => 
                  booking.propertyId === property.id && booking.status === 'active'
                );
                const isTarget = mode === 'booking-details' && targetBooking?.propertyId === property.id;
                
                return (
                  <motion.div
                    key={property.id}
                    className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 z-20"
                    style={{
                      left: `${50 + (Math.random() - 0.5) * 60}%`,
                      top: `${50 + (Math.random() - 0.5) * 60}%`,
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: isTarget ? 1.3 : 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ scale: isTarget ? 1.4 : 1.2, zIndex: 30 }}
                    onClick={() => {
                      setActiveProperty(property);
                      onPropertySelect?.(property);
                    }}
                  >
                    <div className={`relative ${
                      isTarget ? 'text-primary' : 
                      isBooked ? 'text-[color:var(--success)]' : 
                      'text-[color:var(--info)]'
                    }`}>
                      <MapPin className="w-8 h-8 drop-shadow-lg" fill="currentColor" />
                      
                      {/* Status Badge */}
                      {(isBooked || isTarget) && (
                        <motion.div
                          className={`absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center ${
                            isTarget ? 'bg-primary' : 'bg-[color:var(--success)]'
                          }`}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          <CheckCircle className="w-3 h-3 text-white" />
                        </motion.div>
                      )}
                      
                      {/* Pulse Effect for Active Property */}
                      {isTarget && (
                        <motion.div
                          className="absolute top-1/2 left-1/2 w-8 h-8 -mt-4 -ml-4 rounded-full bg-primary/20"
                          animate={{
                            scale: [1, 2.5, 1],
                            opacity: [0.5, 0, 0.5],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                          }}
                        />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* User Location Marker */}
            {userLocation && (
              <motion.div
                className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 z-30"
                style={{
                  left: '30%',
                  top: '70%',
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="relative text-primary">
                  <div className="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg"></div>
                  <motion.div
                    className="absolute top-1/2 left-1/2 w-8 h-8 -mt-4 -ml-4 rounded-full bg-primary/30"
                    animate={{
                      scale: [1, 2, 1],
                      opacity: [0.3, 0, 0.3],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  />
                </div>
              </motion.div>
            )}

            {/* Route Path */}
            {directionsData && routeStarted && (
              <motion.svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, ease: "easeInOut" }}
              >
                <motion.path
                  d="M 30% 70% Q 40% 40% 50% 50%"
                  stroke="var(--primary)"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray="10,5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                />
              </motion.svg>
            )}
          </motion.div>

          {/* Navigation Status Card */}
          {isNavigating && directionsData && (
            <motion.div
              className="absolute top-4 left-4 right-4 bg-card/95 backdrop-blur-lg border border-border rounded-xl p-4 shadow-lg z-40"
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Navigation className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Navigating to {displayProperty?.title}</p>
                    <p className="text-sm text-muted-foreground">{directionsData.distance} • {directionsData.duration}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsNavigating(false);
                    setRouteStarted(false);
                  }}
                >
                  Stop
                </Button>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium mb-1">Next Step:</p>
                <p className="text-sm">{directionsData.steps[0]?.instruction}</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Side Panel */}
        <AnimatePresence>
          {displayProperty && (
            <motion.div
              className="absolute inset-x-0 bottom-0 z-40 flex h-[min(72vh,680px)] flex-col border-t border-border bg-card/98 backdrop-blur-xl md:static md:z-auto md:h-full md:w-96 md:border-l md:border-t-0 md:bg-card md:backdrop-blur-none"
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <Tabs defaultValue="details" className="flex min-h-0 flex-1 flex-col">
                <TabsList className="grid w-full grid-cols-3 m-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="directions">Route</TabsTrigger>
                  <TabsTrigger value="nearby">Nearby</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="flex-1 space-y-4 overflow-y-auto p-4">
                  {/* Property Details */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{displayProperty.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">{getLocationLabel(displayProperty.location)}</p>
                        </div>
                        <Badge variant={displayProperty.available ? 'default' : 'secondary'}>
                          {displayProperty.available ? 'Available' : 'Not Available'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                        <img
                          src={displayProperty.images[0]}
                          alt={displayProperty.title}
                          className="w-full h-full object-cover"
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
                        {displayProperty.bedrooms && (
                          <div>
                            <span className="text-muted-foreground">Bedrooms:</span>
                            <span className="ml-2">{displayProperty.bedrooms}</span>
                          </div>
                        )}
                        {displayProperty.bathrooms && (
                          <div>
                            <span className="text-muted-foreground">Bathrooms:</span>
                            <span className="ml-2">{displayProperty.bathrooms}</span>
                          </div>
                        )}
                      </div>

                      {mode === 'booking-details' && targetBooking && (
                        <div className="theme-success-badge rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <CheckCircle className="h-4 w-4 text-[color:var(--success)]" />
                            <span className="font-medium text-[color:var(--success-soft-foreground)]">Active Booking</span>
                          </div>
                          <div className="text-sm space-y-1">
                            <p><span className="text-muted-foreground">Type:</span> {targetBooking.type}</p>
                            <p><span className="text-muted-foreground">Start:</span> {new Date(targetBooking.startDate).toLocaleDateString()}</p>
                            {targetBooking.endDate && (
                              <p><span className="text-muted-foreground">End:</span> {new Date(targetBooking.endDate).toLocaleDateString()}</p>
                            )}
                            <p><span className="text-muted-foreground">Amount:</span> ${targetBooking.amount.toLocaleString()}</p>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        {!directionsData ? (
                          <Button 
                            className="w-full" 
                            onClick={() => calculateDirections(displayProperty)}
                            disabled={isCalculatingRoute || !userLocation}
                          >
                            {isCalculatingRoute ? (
                              <>
                                <Clock className="w-4 h-4 mr-2 animate-spin" />
                                Calculating...
                              </>
                            ) : (
                              <>
                                <Route className="w-4 h-4 mr-2" />
                                Get Directions
                              </>
                            )}
                          </Button>
                        ) : !isNavigating ? (
                          <Button className="w-full" onClick={startNavigation}>
                            <Navigation className="w-4 h-4 mr-2" />
                            Start Navigation
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => {
                              setIsNavigating(false);
                              setRouteStarted(false);
                            }}
                          >
                            Stop Navigation
                          </Button>
                        )}
                        
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Phone className="w-4 h-4 mr-2" />
                            Call
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Message
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            <Share className="w-4 h-4 mr-2" />
                            Share
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="directions" className="flex-1 overflow-y-auto p-4">
                  {directionsData ? (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center">
                            <Route className="w-5 h-5 mr-2" />
                            Route Overview
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span>{directionsData.duration}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Car className="w-4 h-4 text-muted-foreground" />
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
                              <div key={index} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50">
                                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary mt-0.5">
                                  {index + 1}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{step.instruction}</p>
                                  <p className="text-xs text-muted-foreground">{step.distance} • {step.duration}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Get directions to see route details</p>
                        <Button 
                          className="mt-4" 
                          onClick={() => calculateDirections(displayProperty)}
                          disabled={!userLocation}
                        >
                          <Route className="w-4 h-4 mr-2" />
                          Calculate Route
                        </Button>
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
                      <div className="space-y-3">
                        {[
                          { name: 'Starbucks Coffee', type: 'Cafe', distance: '0.2 km', rating: 4.5 },
                          { name: 'Central Park', type: 'Park', distance: '0.5 km', rating: 4.8 },
                          { name: 'Metro Station', type: 'Transport', distance: '0.3 km', rating: 4.2 },
                          { name: 'Grocery Store', type: 'Shopping', distance: '0.7 km', rating: 4.3 },
                          { name: 'Hospital', type: 'Healthcare', distance: '1.2 km', rating: 4.6 },
                        ].map((place, index) => (
                          <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                            <div>
                              <p className="font-medium text-sm">{place.name}</p>
                              <p className="text-xs text-muted-foreground">{place.type} • {place.distance}</p>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 fill-current text-[color:var(--warning)]" />
                              <span className="text-xs">{place.rating}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
