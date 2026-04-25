import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Car, 
  ChevronRight,
  Calendar,
  DollarSign,
  Home,
  ArrowLeft,
  Route,
  AlertCircle
} from 'lucide-react';
import { Booking, Property, User as UserType, LocationData } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { EnhancedMapView } from './EnhancedMapView';
import { getLocationLabel, getPropertyCoordinates } from '../utils/location';
import { toast } from "sonner";

interface BookingDirectionsProps {
  booking: Booking;
  property: Property;
  currentUser: UserType;
  onBack: () => void;
}

interface TravelInfo {
  distance: string;
  duration: string;
  trafficDelay?: string;
  estimatedArrival: string;
}

// Mock function to get travel information
const getTravelInfo = async (destination: [number, number]): Promise<TravelInfo> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const distance = Math.random() * 50 + 5;
  const baseMinutes = Math.random() * 60 + 10;
  const trafficDelay = Math.random() * 20;
  const totalMinutes = baseMinutes + trafficDelay;
  
  const now = new Date();
  const arrivalTime = new Date(now.getTime() + totalMinutes * 60000);
  
  return {
    distance: `${distance.toFixed(1)} km`,
    duration: `${baseMinutes.toFixed(0)} min`,
    trafficDelay: trafficDelay > 5 ? `+${trafficDelay.toFixed(0)} min traffic` : undefined,
    estimatedArrival: arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
};

export function BookingDirections({ booking, property, currentUser, onBack }: BookingDirectionsProps) {
  const propertyLocation = getLocationLabel(property.location);
  const propertyCoordinates = getPropertyCoordinates(property);
  const [showMap, setShowMap] = useState(false);
  const [travelInfo, setTravelInfo] = useState<TravelInfo | null>(null);
  const [loadingTravelInfo, setLoadingTravelInfo] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);

  // Get user location and travel info
  useEffect(() => {
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };
          setUserLocation(location);
          
          // Get travel information
          setLoadingTravelInfo(true);
          getTravelInfo(propertyCoordinates)
            .then(setTravelInfo)
            .catch(error => {
              console.error('Error getting travel info:', error);
              toast.error('Unable to get travel information');
            })
            .finally(() => setLoadingTravelInfo(false));
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Please enable location services for navigation features');
        }
      );
    }
  }, [propertyCoordinates]);

  const handleGetDirections = () => {
    if (!userLocation) {
      toast.error('Location not available. Please enable location services.');
      return;
    }
    setShowMap(true);
  };

  const handleShareLocation = async () => {
    if (navigator.share && property) {
      try {
        await navigator.share({
          title: `${property.title} Location`,
          text: `Here's the location for ${property.title}`,
          url: `https://maps.google.com/?q=${propertyCoordinates[0]},${propertyCoordinates[1]}`
        });
      } catch (error) {
        // Fallback to copying to clipboard
        const locationUrl = `https://maps.google.com/?q=${propertyCoordinates[0]},${propertyCoordinates[1]}`;
        navigator.clipboard.writeText(locationUrl);
        toast.success('Location URL copied to clipboard!');
      }
    }
  };

  const handleAddToCalendar = () => {
    const startDate = new Date(booking.startDate);
    const endDate = booking.endDate ? new Date(booking.endDate) : startDate;
    
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${booking.type} - ${property.title}`)}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(`${booking.type} booking for ${property.title} at ${propertyLocation}`)}&location=${encodeURIComponent(propertyLocation)}`;
    
    window.open(calendarUrl, '_blank');
    toast.success('Event added to calendar!');
  };

  const handleBookRide = () => {
    const uberUrl = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${propertyCoordinates[0]}&dropoff[longitude]=${propertyCoordinates[1]}&dropoff[nickname]=${encodeURIComponent(property.title)}`;
    
    window.open(uberUrl, '_blank');
    toast.info('Opening ride booking service...');
  };

  if (showMap) {
    return (
      <EnhancedMapView
        currentUser={currentUser}
        selectedProperty={property}
        onBack={() => setShowMap(false)}
        mode="booking-details"
        targetBooking={booking}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header 
        className="bg-card/80 backdrop-blur-lg border-b border-border p-4 sticky top-0 z-50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Property Location</h1>
              <p className="text-sm text-muted-foreground">Your booked property details and directions</p>
            </div>
          </div>
          
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Active Booking
          </Badge>
        </div>
      </motion.header>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Booking Summary Card */}
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
                  <p className="text-muted-foreground flex items-center mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    {propertyLocation}
                  </p>
                </div>
                <Badge variant={booking.status === 'active' ? 'default' : 'secondary'}>
                  {booking.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Property Image */}
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={property.images[0]}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Booking Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Duration</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(booking.startDate).toLocaleDateString()} 
                      {booking.endDate && ` - ${new Date(booking.endDate).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Amount Paid</p>
                    <p className="text-sm text-muted-foreground">${booking.amount.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  <Home className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Type</p>
                    <p className="text-sm text-muted-foreground capitalize">{booking.type}</p>
                  </div>
                </div>
              </div>

              {/* Property Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{property.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Area</p>
                  <p className="font-medium">{property.area} sqft</p>
                </div>
                {property.bedrooms && (
                  <div>
                    <p className="text-sm text-muted-foreground">Bedrooms</p>
                    <p className="font-medium">{property.bedrooms}</p>
                  </div>
                )}
                {property.bathrooms && (
                  <div>
                    <p className="text-sm text-muted-foreground">Bathrooms</p>
                    <p className="font-medium">{property.bathrooms}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Travel Information Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Route className="w-5 h-5 mr-2" />
                Travel Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTravelInfo ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 animate-spin" />
                    <span>Getting travel information...</span>
                  </div>
                </div>
              ) : travelInfo ? (
                <div className="space-y-4">
                  {/* Travel Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <Car className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium">Distance</p>
                        <p className="text-sm text-muted-foreground">{travelInfo.distance}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <Clock className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">Travel Time</p>
                        <p className="text-sm text-muted-foreground">
                          {travelInfo.duration}
                          {travelInfo.trafficDelay && (
                            <span className="text-orange-600 ml-1">({travelInfo.trafficDelay})</span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                      <Navigation className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium">Estimated Arrival</p>
                        <p className="text-sm text-muted-foreground">{travelInfo.estimatedArrival}</p>
                      </div>
                    </div>
                  </div>

                  {/* Traffic Warning */}
                  {travelInfo.trafficDelay && (
                    <div className="flex items-start space-x-3 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-orange-800 dark:text-orange-200">Traffic Alert</p>
                        <p className="text-sm text-orange-700 dark:text-orange-300">
                          Heavy traffic may add {travelInfo.trafficDelay} to your journey. Consider leaving earlier.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                    <Button onClick={handleGetDirections} className="flex-1">
                      <Navigation className="w-4 h-4 mr-2" />
                      Get Directions
                    </Button>
                    <Button variant="outline" onClick={handleShareLocation} className="flex-1">
                      <MapPin className="w-4 h-4 mr-2" />
                      Share Location
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Unable to get travel information</p>
                  <p className="text-sm text-muted-foreground mt-1">Please check your location settings</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Button variant="outline" className="h-auto p-4" onClick={handleGetDirections}>
                  <div className="text-center">
                    <Navigation className="w-6 h-6 mx-auto mb-2" />
                    <p className="text-sm font-medium">Navigate</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4" onClick={handleShareLocation}>
                  <div className="text-center">
                    <MapPin className="w-6 h-6 mx-auto mb-2" />
                    <p className="text-sm font-medium">Share Location</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4" onClick={handleAddToCalendar}>
                  <div className="text-center">
                    <Calendar className="w-6 h-6 mx-auto mb-2" />
                    <p className="text-sm font-medium">Add to Calendar</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4" onClick={handleBookRide}>
                  <div className="text-center">
                    <Car className="w-6 h-6 mx-auto mb-2" />
                    <p className="text-sm font-medium">Book Ride</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Contact Information */}
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
