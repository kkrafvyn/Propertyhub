import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { 
  Home, 
  Search, 
  Heart, 
  Calendar, 
  User, 
  Bell, 
  Settings,
  Download,
  Share,
  Navigation,
  Filter,
  MapPin,
  Star,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageCircle,
} from 'lucide-react';
import { Property, User as UserType, Booking, ExtendedAppState } from '../types';
import { getLocationLabel } from '../utils/location';

export type MobileAppView = 'marketplace' | 'search' | 'favorites' | 'bookings' | 'profile';

export interface PWAInstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>;
}
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Card } from './ui/card';
import { useAppContext } from '../hooks/useAppContext';
import { bookingService } from '../services/supabaseApi';
import type { BookingDB } from '../types/database';

interface MobileAppProps {
  properties: Property[];
  currentUser: UserType | null;
  onLogout: () => void;
  onPropertySelect: (property: Property) => void;
  selectedProperty: Property | null;
  onNavigation: (view: ExtendedAppState) => void;
  appState: ExtendedAppState;
}

interface SwipeableCardProps {
  property: Property;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTap: () => void;
}

// PWA Install Prompt Hook
function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<PWAInstallPrompt | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as any);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        setIsInstallable(false);
      }
    } catch (error) {
      console.error('Error installing PWA:', error);
    }
  };

  return { isInstallable, installApp };
}

// Swipeable Property Card for mobile
function SwipeableCard({ property, onSwipeLeft, onSwipeRight, onTap }: SwipeableCardProps) {
  const [dragX, setDragX] = useState(0);
  const constraintsRef = useRef(null);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    
    if (info.offset.x > threshold) {
      onSwipeRight();
    } else if (info.offset.x < -threshold) {
      onSwipeLeft();
    }
    
    setDragX(0);
  };

  return (
    <motion.div
      ref={constraintsRef}
      className="relative w-full h-96 cursor-grab active:cursor-grabbing"
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="absolute inset-0 bg-card rounded-3xl shadow-2xl overflow-hidden"
        drag="x"
        dragConstraints={constraintsRef}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={{ x: dragX, rotate: dragX * 0.1 }}
        transition={{ type: "spring", stiffness: 300, damping: 3 }}
        onClick={onTap}
      >
        {/* Background Image */}
        <div className="relative h-64 overflow-hidden">
          <img
            src={property.images[0]}
            alt={property.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          
          {/* Price Badge */}
          <motion.div
            className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full font-semibold"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            GHS {property.price.toLocaleString()}
          </motion.div>
          
          {/* Rating */}
          <div className="absolute bottom-4 left-4 flex items-center space-x-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-1">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-white text-sm font-medium">{property.rating}</span>
          </div>
        </div>
        
        {/* Property Info */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-lg line-clamp-1">{property.title}</h3>
            <p className="text-muted-foreground text-sm flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              {getLocationLabel(property.location)}
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-sm text-muted-foreground">
              {property.bedrooms && (
                <span>{property.bedrooms} bed</span>
              )}
              {property.bathrooms && (
                <span>{property.bathrooms} bath</span>
              )}
              <span>{property.area} sqft</span>
            </div>
            
            <Badge variant={property.type === 'house' ? 'default' : property.type === 'shop' ? 'secondary' : 'outline'}>
              {property.type}
            </Badge>
          </div>
        </div>
      </motion.div>
      
      {/* Swipe Indicators */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50">
        <div className="bg-red-500 text-white p-2 rounded-full">
          <ChevronLeft className="w-6 h-6" />
        </div>
      </div>
      
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50">
        <div className="bg-green-500 text-white p-2 rounded-full">
          <ChevronRight className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
}

const formatBookingDateLabel = (value?: string): string => {
  if (!value) return 'Date pending';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Date pending';

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const mapBookingRecordToMobileBooking = (booking: BookingDB, properties: Property[]): Booking => {
  const property = properties.find((entry) => entry.id === booking.property_id);
  const totalAmount = Number(booking.total_price || property?.price || 0);

  return {
    id: booking.id,
    propertyId: booking.property_id,
    userId: booking.user_id,
    hostId: booking.owner_id,
    startDate: formatBookingDateLabel(booking.check_in),
    endDate: formatBookingDateLabel(booking.check_out),
    totalAmount,
    currency: booking.currency || property?.currency || 'GHS',
    status: booking.status,
    createdAt: booking.created_at,
    updatedAt: booking.updated_at,
    confirmationCode: booking.id.slice(0, 8).toUpperCase(),
    paymentStatus:
      booking.payment_status === 'completed'
        ? 'completed'
        : booking.payment_status === 'failed'
          ? 'failed'
          : 'pending',
    paymentMethod: booking.payment_method as Booking['paymentMethod'],
    guestCount: booking.guests,
    specialRequests: booking.note,
    propertyTitle: property?.title || 'Property',
    propertyImage: property?.images?.[0] || '',
    type: property?.listingType || 'rent',
    amount: totalAmount,
    duration: `${formatBookingDateLabel(booking.check_in)} - ${formatBookingDateLabel(booking.check_out)}`,
  };
};

export function MobileApp({ properties, currentUser, onLogout, onPropertySelect, selectedProperty, onNavigation, appState }: MobileAppProps) {
  const [currentView, setCurrentView] = useState<MobileAppView>('marketplace');
  const [currentPropertyIndex, setCurrentPropertyIndex] = useState(0);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { isInstallable, installApp } = usePWAInstall();
  const {
    favoriteProperties: savedFavoriteIds,
    toggleFavorite: toggleFavoriteProperty,
  } = useAppContext();

  useEffect(() => {
    let isActive = true;

    const loadUserBookings = async () => {
      if (!currentUser) {
        if (isActive) {
          setUserBookings([]);
          setBookingsLoading(false);
        }
        return;
      }

      setBookingsLoading(true);
      const { data, error } = await bookingService.getUserBookings(currentUser.id);

      if (!isActive) return;

      if (error) {
        console.error('Failed to load mobile bookings:', error);
        setUserBookings([]);
        setBookingsLoading(false);
        return;
      }

      setUserBookings(
        (data || []).map((booking) => mapBookingRecordToMobileBooking(booking as BookingDB, properties)),
      );
      setBookingsLoading(false);
    };

    void loadUserBookings();

    return () => {
      isActive = false;
    };
  }, [currentUser, properties]);

  // Filter properties based on search
  const filteredProperties = properties.filter(property =>
    property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getLocationLabel(property.location).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentProperty = filteredProperties[currentPropertyIndex];

  const handleSwipeLeft = () => {
    // Dislike - move to next property
    if (currentPropertyIndex < filteredProperties.length - 1) {
      setCurrentPropertyIndex(currentPropertyIndex + 1);
    }
  };

  const handleSwipeRight = () => {
    // Like - add to favorites and move to next
    if (currentProperty) {
      if (!savedFavoriteIds.includes(currentProperty.id)) {
        toggleFavoriteProperty(currentProperty.id);
      }
      if (currentPropertyIndex < filteredProperties.length - 1) {
        setCurrentPropertyIndex(currentPropertyIndex + 1);
      }
    }
  };

  const favoriteProperties = properties.filter((property) => savedFavoriteIds.includes(property.id));

  // Mobile Navigation Items
  const navItems = [
    { id: 'marketplace', label: 'Home', icon: Home, view: 'marketplace' },
    { id: 'search', label: 'Search', icon: Search, view: 'search' },
    { id: 'favorites', label: 'Saved', icon: Heart, view: 'favorites', badge: savedFavoriteIds.length },
    { id: 'bookings', label: 'Trips', icon: Calendar, view: 'bookings', badge: userBookings.length },
    { id: 'profile', label: 'Profile', icon: User, view: 'profile' },
  ];

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-50">
      {/* Status Bar */}
      <div className="h-11 bg-card border-b border-border flex items-center justify-between px-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-primary rounded-full" />
            <div className="w-1 h-1 bg-primary rounded-full" />
            <div className="w-1 h-1 bg-primary rounded-full" />
          </div>
          <span className="font-medium">PropertyHub</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {isInstallable && (
            <Button variant="ghost" size="sm" onClick={installApp}>
              <Download className="w-4 h-4" />
            </Button>
          )}
          <Bell className="w-4 h-4" />
          <div className="text-xs">100%</div>
        </div>
      </div>

      {/* Header */}
      <motion.div 
        className="bg-card border-b border-border p-4"
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              {currentView === 'marketplace' && 'Discover'}
              {currentView === 'search' && 'Search'}
              {currentView === 'favorites' && 'Saved Properties'}
              {currentView === 'bookings' && 'Your Trips'}
              {currentView === 'profile' && 'Profile'}
            </h1>
            {currentUser && (
              <p className="text-sm text-muted-foreground">
                Welcome back, {currentUser.name.split(' ')[0]}!
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {currentView === 'search' && (
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {currentView === 'marketplace' && (
            <motion.div
              key="marketplace"
              className="h-full flex flex-col items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.3 }}
            >
              {currentProperty ? (
                <div className="w-full max-w-sm space-y-6">
                  <SwipeableCard
                    property={currentProperty}
                    onSwipeLeft={handleSwipeLeft}
                    onSwipeRight={handleSwipeRight}
                    onTap={() => onPropertySelect(currentProperty)}
                  />
                  
                  {/* Action Buttons */}
                  <div className="flex justify-center space-x-4">
                    <motion.button
                      className="w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleSwipeLeft}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </motion.button>
                    
                    <motion.button
                      className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onPropertySelect(currentProperty)}
                    >
                      <Home className="w-8 h-8" />
                    </motion.button>
                    
                    <motion.button
                      className="w-14 h-14 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleSwipeRight}
                    >
                      <Heart className="w-6 h-6" />
                    </motion.button>
                  </div>
                  
                  {/* Progress Indicator */}
                  <div className="flex justify-center">
                    <div className="text-sm text-muted-foreground">
                      {currentPropertyIndex + 1} of {filteredProperties.length}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <Heart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No more properties</h3>
                  <p className="text-muted-foreground">Check back later for new listings!</p>
                </div>
              )}
            </motion.div>
          )}

          {currentView === 'search' && (
            <motion.div
              key="search"
              className="h-full overflow-y-auto"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-4 space-y-4">
                <Input
                  placeholder="Search properties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
                
                <div className="grid gap-4">
                  {filteredProperties.map((property, index) => (
                    <motion.div
                      key={property.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="p-4" onClick={() => onPropertySelect(property)}>
                        <div className="flex space-x-3">
                          <img
                            src={property.images[0]}
                            alt={property.title}
                            className="w-20 h-20 rounded-xl object-cover"
                          />
                          <div className="flex-1 space-y-1">
                            <h3 className="font-semibold line-clamp-1">{property.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-1">{getLocationLabel(property.location)}</p>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">GHS {property.price.toLocaleString()}</span>
                              <Heart
                                className={`w-5 h-5 ${
                                  savedFavoriteIds.includes(property.id)
                                    ? 'fill-red-500 text-red-500'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'favorites' && (
            <motion.div
              key="favorites"
              className="h-full overflow-y-auto"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-4 space-y-4">
                {favoriteProperties.length > 0 ? (
                  favoriteProperties.map((property, index) => (
                    <motion.div
                      key={property.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="p-4" onClick={() => onPropertySelect(property)}>
                        <div className="flex space-x-3">
                          <img
                            src={property.images[0]}
                            alt={property.title}
                            className="w-20 h-20 rounded-xl object-cover"
                          />
                          <div className="flex-1 space-y-1">
                            <h3 className="font-semibold line-clamp-1">{property.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-1">{getLocationLabel(property.location)}</p>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">GHS {property.price.toLocaleString()}</span>
                              <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Heart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No saved properties</h3>
                    <p className="text-muted-foreground">Save properties you like to view them here</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {currentView === 'bookings' && (
            <motion.div
              key="bookings"
              className="h-full overflow-y-auto"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-4 space-y-4">
                {bookingsLoading ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4 animate-pulse" />
                    <h3 className="text-xl font-semibold mb-2">Loading bookings</h3>
                    <p className="text-muted-foreground">Fetching your latest trips and rental activity.</p>
                  </div>
                ) : userBookings.length > 0 ? (
                  userBookings.map((booking, index) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="p-4">
                        <div className="flex space-x-3">
                          <img
                            src={booking.propertyImage}
                            alt={booking.propertyTitle}
                            className="w-20 h-20 rounded-xl object-cover"
                          />
                          <div className="flex-1 space-y-2">
                            <h3 className="font-semibold line-clamp-1">{booking.propertyTitle}</h3>
                            <div className="text-sm text-muted-foreground">
                              <div>{booking.startDate} - {booking.endDate}</div>
                              <div>Status: <Badge variant={booking.status === 'active' ? 'default' : 'secondary'}>{booking.status}</Badge></div>
                            </div>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline">
                                <Phone className="w-4 h-4 mr-1" />
                                Call Host
                              </Button>
                              <Button size="sm" variant="outline">
                                <MessageCircle className="w-4 h-4 mr-1" />
                                Message
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No bookings yet</h3>
                    <p className="text-muted-foreground">Your trips will appear here</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {currentView === 'profile' && currentUser && (
            <motion.div
              key="profile"
              className="h-full overflow-y-auto"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-4 space-y-6">
                <div className="text-center">
                  <Avatar className="w-24 h-24 mx-auto mb-4">
                    <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                    <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-semibold">{currentUser.name}</h2>
                  <p className="text-muted-foreground">{currentUser.email}</p>
                </div>
                
                <div className="space-y-4">
                  <Card className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span>Notifications</span>
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Share App</span>
                        <Share className="w-5 h-5" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Settings</span>
                        <Settings className="w-5 h-5" />
                      </div>
                    </div>
                  </Card>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={onLogout}
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <motion.div 
        className="bg-card border-t border-border px-4 py-2 safe-area-pb"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              className={`flex flex-col items-center space-y-1 py-2 px-3 rounded-lg transition-colors ${
                currentView === item.view 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground'
              }`}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentView(item.view as MobileAppView)}
            >
              <div className="relative">
                <item.icon className="w-6 h-6" />
                {item.badge && item.badge > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 min-w-5 h-5 text-xs px-1"
                    variant="destructive"
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// Default export for lazy loading
export default MobileApp;
