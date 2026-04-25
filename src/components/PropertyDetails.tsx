import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Separator } from './ui/separator';
import { 
  ArrowLeft, 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  Wifi, 
  Car, 
  Star,
  Heart,
  Share,
  MessageCircle,
  Calendar,
  DollarSign,
  Home,
  Building2,
  TreePine
} from 'lucide-react';
import { Property, User, PendingBooking } from '../types';
import { toast } from "sonner";
import { ReviewsSection } from './ReviewsSection';
import { getLocationLabel } from '../utils/location';

interface PropertyDetailsProps {
  property: Property;
  currentUser: User | null;
  onBack: () => void;
  onBooking: (booking: PendingBooking) => void;
}

export function PropertyDetails({ property, currentUser, onBack, onBooking }: PropertyDetailsProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);

  // Check if user has booked this property (mock implementation)
  const userHasBooked = currentUser ? Math.random() > 0.5 : false;

  const handleBooking = (action: 'rent' | 'buy' | 'lease') => {
    if (!currentUser) {
      toast.error('Please sign in to book properties');
      return;
    }

    if (!property.available) {
      toast.error('This property is not available');
      return;
    }

    const booking: PendingBooking = {
      property,
      action
    };

    onBooking(booking);
  };

  const getActionButton = () => {
    switch (property.type) {
      case 'house':
        return { label: 'Rent Property', action: 'rent' as const, color: 'bg-blue-600 hover:bg-blue-700' };
      case 'land':
        return { label: 'Buy Land', action: 'buy' as const, color: 'bg-green-600 hover:bg-green-700' };
      case 'shop':
        return { label: 'Lease Shop', action: 'lease' as const, color: 'bg-purple-600 hover:bg-purple-700' };
      default:
        return { label: 'Book Now', action: 'rent' as const, color: 'bg-primary hover:bg-primary/90' };
    }
  };

  const actionButton = getActionButton();

  const amenityIcons: { [key: string]: React.ComponentType<{ className?: string }> } = {
    'WiFi': Wifi,
    'Parking': Car,
    'Air Conditioning': Home,
    'Gym': Building2,
    'Pool': TreePine,
    'Garden': TreePine,
    'Security': Building2,
    'Storage': Building2
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.div
        className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.button
              onClick={onBack}
              className="flex items-center text-muted-foreground hover:text-foreground p-2 -ml-2 rounded-lg hover:bg-muted/50 transition-colors"
              whileHover={{ x: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Properties
            </motion.button>

            <div className="flex items-center space-x-2">
              <motion.button
                className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setIsFavorited(!isFavorited);
                  toast.success(isFavorited ? 'Removed from favorites' : 'Added to favorites');
                }}
              >
                <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
              </motion.button>
              <motion.button
                className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => toast.info('Share functionality coming soon!')}
              >
                <Share className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Image Gallery */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Main Image */}
          <motion.div
            className="relative aspect-video rounded-2xl overflow-hidden"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <img
              src={property.images[selectedImageIndex] || property.images[0]}
              alt={property.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4">
              <Badge className="bg-white/90 text-black">
                {selectedImageIndex + 1} / {property.images.length}
              </Badge>
            </div>
          </motion.div>

          {/* Thumbnail Grid */}
          <div className="grid grid-cols-2 gap-4">
            {property.images.slice(0, 4).map((image, index) => (
              <motion.div
                key={index}
                className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer ${
                  selectedImageIndex === index ? 'ring-2 ring-primary' : ''
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedImageIndex(index)}
              >
                <img
                  src={image}
                  alt={`${property.title} ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {index === 3 && property.images.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-semibold">+{property.images.length - 4} more</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Property Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{property.title}</h1>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{getLocationLabel(property.location)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-600">
                    ${property.price.toLocaleString()}
                    {property.type === 'house' && <span className="text-lg font-normal">/month</span>}
                  </div>
                  {property.rating && (
                    <div className="flex items-center mt-2">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 mr-1" />
                      <span className="font-medium">{property.rating}</span>
                      <span className="text-muted-foreground ml-1">({property.reviews} reviews)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                <Badge variant="outline" className="text-sm">
                  {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
                </Badge>
                {property.featured && (
                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                    ⭐ Featured
                  </Badge>
                )}
                <Badge variant={property.available ? "default" : "secondary"}>
                  {property.available ? 'Available' : 'Unavailable'}
                </Badge>
              </div>

              {/* Property Stats */}
              {(property.bedrooms || property.bathrooms || property.area) && (
                <div className="flex items-center gap-6 text-muted-foreground">
                  {property.bedrooms && (
                    <div className="flex items-center">
                      <Bed className="w-4 h-4 mr-1" />
                      <span>{property.bedrooms} Bedrooms</span>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div className="flex items-center">
                      <Bath className="w-4 h-4 mr-1" />
                      <span>{property.bathrooms} Bathrooms</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <Square className="w-4 h-4 mr-1" />
                    <span>{property.area} sqft</span>
                  </div>
                </div>
              )}
            </motion.div>

            <Separator />

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-xl font-semibold mb-4">About this property</h2>
              <p className="text-muted-foreground leading-relaxed">{property.description}</p>
            </motion.div>

            <Separator />

            {/* Amenities */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <h2 className="text-xl font-semibold mb-4">Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {property.amenities.map((amenity, index) => {
                  const IconComponent = amenityIcons[amenity] || Home;
                  return (
                    <motion.div
                      key={amenity}
                      className="flex items-center p-3 border rounded-lg"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <IconComponent className="w-5 h-5 text-primary mr-3" />
                      <span className="font-medium">{amenity}</span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Booking Card */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Price */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ${property.price.toLocaleString()}
                      {property.type === 'house' && <span className="text-sm font-normal text-muted-foreground">/month</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {property.type === 'land' ? 'Total price' : 'Monthly rent'}
                    </p>
                  </div>

                  <Separator />

                  {/* Property Info */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Property Type</span>
                      <span className="font-medium">{property.type.charAt(0).toUpperCase() + property.type.slice(1)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Owner</span>
                      <span className="font-medium">{property.owner || 'Property Owner'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={property.available ? "default" : "secondary"}>
                        {property.available ? 'Available' : 'Unavailable'}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        className={`w-full ${actionButton.color}`}
                        size="lg"
                        onClick={() => handleBooking(actionButton.action)}
                        disabled={!property.available || !currentUser}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        {actionButton.label}
                      </Button>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full"
                        onClick={() => toast.info('Chat feature coming soon!')}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Contact Owner
                      </Button>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full"
                        onClick={() => toast.info('Virtual tour feature coming soon!')}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Visit
                      </Button>
                    </motion.div>
                  </div>

                  {!currentUser && (
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Please sign in to book this property
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Reviews Section */}
        <motion.div
          className="mt-16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <ReviewsSection
            property={property}
            currentUser={currentUser}
            userHasBooked={userHasBooked}
            onSubmitReview={(review) => {
              console.log('New review submitted:', review);
              toast.success('Review submitted successfully!');
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}