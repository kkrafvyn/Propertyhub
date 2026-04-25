/**
 * EnhancedPropertyDetailsView - Comprehensive property details with booking integration
 * 
 * Features:
 * - Interactive image gallery with virtual tours
 * - Detailed property information and amenities
 * - Reviews and ratings system
 * - Host information and communication
 * - Integrated booking system
 * - Map with neighborhood information
 * - Similar properties recommendations
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import PropertyBookingSystem from './PropertyBookingSystem';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { 
  ChevronLeft,
  ChevronRight,
  Heart,
  Share,
  Star,
  MapPin,
  Users,
  Calendar,
  Wifi,
  Car,
  Shield,
  Zap,
  Home,
  Camera,
  Play,
  MessageSquare,
  Phone,
  Mail,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Clock,
  CreditCard,
  Globe,
  Utensils,
  Dumbbell,
  Waves,
  TreePine,
  Building,
  GraduationCap,
  ShoppingBag,
  Navigation
} from 'lucide-react';

interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  price: number;
  originalPrice?: number;
  currency: string;
  type: string;
  category: string;
  bedrooms?: number;
  bathrooms?: number;
  area: number;
  images: string[];
  amenities: string[];
  features: string[];
  owner: {
    id: string;
    name: string;
    avatar?: string;
    verified: boolean;
    rating: number;
    responseTime: number;
    joinedAt: string;
    languages: string[];
    totalProperties: number;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  likes: number;
  saved: number;
  bookings: number;
  featured: boolean;
  verified: boolean;
  instantBook: boolean;
  selfCheckIn: boolean;
  petFriendly: boolean;
  smokingAllowed: boolean;
  partiesAllowed: boolean;
  virtualTour?: string;
  videoTour?: string;
  availability: {
    calendar: { [key: string]: boolean };
    checkInTime: string;
    checkOutTime: string;
    minimumStay: number;
    maximumStay: number;
  };
  pricing: {
    basePrice: number;
    weeklyDiscount?: number;
    monthlyDiscount?: number;
    cleaningFee?: number;
    securityDeposit?: number;
    extraGuestFee?: number;
    maxGuests: number;
  };
  policies: {
    cancellation: 'flexible' | 'moderate' | 'strict';
    houseRules: string[];
    safetyFeatures: string[];
  };
  nearby: {
    schools: number;
    hospitals: number;
    shopping: number;
    transport: number;
    restaurants: number;
    attractions: number;
  };
  ratings: {
    overall: number;
    cleanliness: number;
    accuracy: number;
    checkIn: number;
    communication: number;
    location: number;
    value: number;
    reviews: number;
  };
}

interface PropertyDetailsViewProps {
  property: Property;
  onClose: () => void;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  isLiked: boolean;
  isSaved: boolean;
  className?: string;
}

const mockReviews = [
  {
    id: '1',
    user: { name: 'Sarah M.', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=100' },
    rating: 5,
    date: '2024-01-15',
    comment: 'Absolutely stunning property! Everything was exactly as described. The host was incredibly responsive and helpful.',
    helpful: 12
  },
  {
    id: '2',
    user: { name: 'Michael K.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
    rating: 4,
    date: '2024-01-10',
    comment: 'Great location and beautiful space. Minor issues with WiFi but overall excellent stay.',
    helpful: 8
  }
];

export const EnhancedPropertyDetailsView: React.FC<PropertyDetailsViewProps> = ({
  property,
  onClose,
  onLike,
  onSave,
  isLiked,
  isSaved,
  className = ""
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showBookingSystem, setShowBookingSystem] = useState(false);
  const [showVirtualTour, setShowVirtualTour] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const nextImage = useCallback(() => {
    setCurrentImageIndex((prev) => 
      prev === property.images.length - 1 ? 0 : prev + 1
    );
  }, [property.images.length]);

  const prevImage = useCallback(() => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? property.images.length - 1 : prev - 1
    );
  }, [property.images.length]);

  const amenityIcons: { [key: string]: React.ReactNode } = {
    'WiFi': <Wifi className="w-5 h-5" />,
    'Parking': <Car className="w-5 h-5" />,
    'Security': <Shield className="w-5 h-5" />,
    'Generator': <Zap className="w-5 h-5" />,
    'Swimming Pool': <Waves className="w-5 h-5" />,
    'Gym': <Dumbbell className="w-5 h-5" />,
    'Garden': <TreePine className="w-5 h-5" />,
    'Kitchen': <Utensils className="w-5 h-5" />
  };

  const nearbyIcons: { [key: string]: React.ReactNode } = {
    'schools': <GraduationCap className="w-4 h-4" />,
    'hospitals': <Building className="w-4 h-4" />,
    'shopping': <ShoppingBag className="w-4 h-4" />,
    'transport': <Navigation className="w-4 h-4" />,
    'restaurants': <Utensils className="w-4 h-4" />,
    'attractions': <Camera className="w-4 h-4" />
  };

  const handleBookingComplete = useCallback((booking: any) => {
    console.log('Booking completed:', booking);
    setShowBookingSystem(false);
    // Handle booking completion (e.g., redirect to booking confirmation)
  }, []);

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 overflow-y-auto ${className}`}>
      <div className="min-h-screen py-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 z-30">
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="rounded-full"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1">
                    {property.title}
                  </h1>
                  <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                    <MapPin className="w-4 h-4 mr-1" />
                    {property.location}
                    {property.verified && (
                      <Badge className="ml-2 bg-green-500">
                        <Shield className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSave(property.id)}
                  className={isSaved ? 'text-blue-600' : ''}
                >
                  <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                </Button>
                <Button variant="ghost" size="sm">
                  <Share className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Image Gallery */}
          <div className="relative h-96 md:h-[500px]">
            <ImageWithFallback
              src={property.images[currentImageIndex]}
              alt={property.title}
              className="w-full h-full object-cover"
            />
            
            {/* Image Navigation */}
            {property.images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-3"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-3"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </>
            )}

            {/* Image Indicators */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {property.images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>

            {/* Tour Buttons */}
            <div className="absolute top-4 right-4 flex space-x-2">
              {property.virtualTour && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVirtualTour(true)}
                  className="bg-white/80 hover:bg-white"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Virtual Tour
                </Button>
              )}
              {property.videoTour && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/80 hover:bg-white"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Video Tour
                </Button>
              )}
            </div>

            {/* Property Stats */}
            <div className="absolute bottom-4 left-4 flex space-x-4">
              <div className="bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                <Star className="w-4 h-4 inline mr-1" />
                {property.ratings.overall} ({property.ratings.reviews})
              </div>
              <div className="bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                {property.views} views
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="amenities">Amenities</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                  <TabsTrigger value="location">Location</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 mt-6">
                  {/* Property Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Property Details</span>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Home className="w-4 h-4 mr-1" />
                            {property.type}
                          </div>
                          {property.bedrooms && (
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {property.bedrooms} bed
                            </div>
                          )}
                          <div>{property.area} m²</div>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {property.description}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Host Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Meet Your Host</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start space-x-4">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={property.owner.avatar} />
                          <AvatarFallback>{property.owner.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {property.owner.name}
                            </h4>
                            {property.owner.verified && (
                              <Badge className="bg-green-500">
                                <Shield className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-600 dark:text-gray-300">
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-yellow-400 mr-1" />
                              {property.owner.rating} rating
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              Responds in ~{property.owner.responseTime || 'N/A'} min
                            </div>
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              Joined {property.owner.joinedAt ? new Date(property.owner.joinedAt).getFullYear() : 'Recently'}
                            </div>
                            <div className="flex items-center">
                              <Home className="w-4 h-4 mr-1" />
                              {property.owner.totalProperties || 1} properties
                            </div>
                          </div>

                          {property.owner.languages && property.owner.languages.length > 0 && (
                            <div className="flex items-center space-x-2 mb-4">
                              <span className="text-sm text-gray-600">Languages:</span>
                              {property.owner.languages.map((lang) => (
                                <Badge key={lang} variant="outline">{lang}</Badge>
                              ))}
                            </div>
                          )}

                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Message Host
                            </Button>
                            <Button variant="outline" size="sm">
                              <Phone className="w-4 h-4 mr-2" />
                              Call
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Policies */}
                  <Card>
                    <CardHeader>
                      <CardTitle>House Rules & Policies</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h5 className="font-medium mb-2">Check-in & Check-out</h5>
                        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          <div>Check-in: {property.availability?.checkInTime || 'Flexible'}</div>
                          <div>Check-out: {property.availability?.checkOutTime || 'Flexible'}</div>
                          <div>Minimum stay: {property.availability?.minimumStay || 1} nights</div>
                          {property.selfCheckIn && (
                            <div className="flex items-center text-green-600">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Self check-in available
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h5 className="font-medium mb-2">House Rules</h5>
                        <div className="space-y-2">
                          {property.policies?.houseRules?.map((rule, index) => (
                            <div key={index} className="flex items-center text-sm">
                              <AlertCircle className="w-4 h-4 mr-2 text-gray-400" />
                              {rule}
                            </div>
                          )) || (
                            <div className="text-sm text-gray-500">No specific house rules</div>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h5 className="font-medium mb-2">Cancellation Policy</h5>
                        <Badge variant="outline" className="capitalize">
                          {property.policies?.cancellation || 'Standard'}
                        </Badge>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                          {property.policies?.cancellation === 'flexible' && 'Free cancellation for 48 hours after booking'}
                          {property.policies?.cancellation === 'moderate' && 'Free cancellation up to 5 days before check-in'}
                          {property.policies?.cancellation === 'strict' && 'Non-refundable'}
                          {!property.policies?.cancellation && 'Standard cancellation policy applies'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="amenities" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>What this place offers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {property.amenities.map((amenity) => (
                          <div key={amenity} className="flex items-center space-x-3">
                            {amenityIcons[amenity] || <CheckCircle className="w-5 h-5 text-green-500" />}
                            <span className="text-gray-900 dark:text-white">{amenity}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {property.features.map((feature) => (
                          <div key={feature} className="flex items-center space-x-3">
                            <Star className="w-5 h-5 text-blue-500" />
                            <span className="text-gray-900 dark:text-white">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Safety Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {property.policies?.safetyFeatures?.map((safety) => (
                          <div key={safety} className="flex items-center space-x-3">
                            <Shield className="w-5 h-5 text-green-500" />
                            <span className="text-gray-900 dark:text-white">{safety}</span>
                          </div>
                        )) || (
                          <div className="text-sm text-gray-500">Basic safety features included</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="reviews" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Guest Reviews</span>
                        <div className="flex items-center space-x-2">
                          <Star className="w-5 h-5 text-yellow-400 fill-current" />
                          <span className="text-xl font-bold">{property.ratings.overall}</span>
                          <span className="text-gray-500">({property.ratings.reviews} reviews)</span>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Rating Breakdown */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                        {Object.entries({
                          'Cleanliness': property.ratings.cleanliness,
                          'Accuracy': property.ratings.accuracy,
                          'Check-in': property.ratings.checkIn,
                          'Communication': property.ratings.communication,
                          'Location': property.ratings.location,
                          'Value': property.ratings.value
                        }).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <div className="flex justify-between mb-1">
                              <span>{key}</span>
                              <span>{value}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${(value / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <Separator className="my-6" />

                      {/* Individual Reviews */}
                      <div className="space-y-6">
                        {mockReviews.map((review) => (
                          <div key={review.id} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0">
                            <div className="flex items-start space-x-4">
                              <Avatar>
                                <AvatarImage src={review.user.avatar} />
                                <AvatarFallback>{review.user.name[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <h4 className="font-medium">{review.user.name}</h4>
                                    <div className="flex items-center text-sm text-gray-500">
                                      <div className="flex items-center mr-2">
                                        {[...Array(5)].map((_, i) => (
                                          <Star
                                            key={i}
                                            className={`w-3 h-3 ${
                                              i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                            }`}
                                          />
                                        ))}
                                      </div>
                                      <span>{new Date(review.date).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 mb-2">{review.comment}</p>
                                <button className="text-sm text-gray-500 hover:text-gray-700">
                                  Helpful ({review.helpful})
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button variant="outline" className="w-full mt-6">
                        Show all {property.ratings.reviews} reviews
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="location" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Where you'll be</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                          <MapPin className="w-12 h-12 text-gray-400" />
                          <span className="ml-2 text-gray-500">Interactive Map</span>
                        </div>

                        <div>
                          <h4 className="font-medium mb-4">What's nearby</h4>
                          <div className="grid grid-cols-2 gap-4">
                            {Object.entries(property.nearby).map(([key, count]) => (
                              <div key={key} className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  {nearbyIcons[key]}
                                  <span className="capitalize">{key}</span>
                                </div>
                                <span className="text-gray-600">{count} nearby</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Booking Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <Card className="shadow-lg">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-2xl font-bold text-gray-900 dark:text-white">
                            {property.currency} {property.price}
                          </span>
                          <span className="text-gray-500 ml-1">per night</span>
                          {property.originalPrice && property.originalPrice > property.price && (
                            <span className="text-sm text-gray-400 line-through ml-2">
                              {property.currency} {property.originalPrice}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-sm">
                          <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                          {property.ratings.overall} ({property.ratings.reviews})
                        </div>
                      </div>

                      {property.instantBook && (
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                          <div className="flex items-center text-sm text-green-800 dark:text-green-200">
                            <Zap className="w-4 h-4 mr-2" />
                            Instant Book available
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={() => setShowBookingSystem(true)}
                        className="w-full h-12"
                        size="lg"
                      >
                        {property.instantBook ? (
                          <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Reserve Instantly
                          </>
                        ) : (
                          'Check Availability'
                        )}
                      </Button>

                      <div className="text-center text-sm text-gray-500">
                        You won't be charged yet
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span>Response time</span>
                          <span>~{property.owner.responseTime || 'N/A'} minutes</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Total bookings</span>
                          <span>{property.bookings || 0}</span>
                        </div>
                        {property.pricing?.weeklyDiscount && (
                          <div className="flex items-center justify-between text-sm text-green-600">
                            <span>Weekly discount</span>
                            <span>{property.pricing.weeklyDiscount}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <div className="mt-4 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => onLike(property.id)}
                  >
                    <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-current text-red-500' : ''}`} />
                    {isLiked ? 'Liked' : 'Like'}
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Share className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Booking System Modal */}
      <AnimatePresence>
        {showBookingSystem && (
          <PropertyBookingSystem
            property={property}
            onBookingComplete={handleBookingComplete}
            onClose={() => setShowBookingSystem(false)}
          />
        )}
      </AnimatePresence>

      {/* Virtual Tour Modal */}
      <AnimatePresence>
        {showVirtualTour && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          >
            <div className="w-full h-full relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVirtualTour(false)}
                className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white text-gray-700"
              >
                ×
              </Button>
              <iframe
                src={property.virtualTour}
                className="w-full h-full"
                allowFullScreen
                title="Virtual Tour"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedPropertyDetailsView;