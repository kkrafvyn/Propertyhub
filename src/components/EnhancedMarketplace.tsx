/**
 * PropertyHub Enhanced Marketplace Component
 * Advanced property search and filtering system
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, Search, Filter, MapPin, Star, Heart, Shield, CheckCircle, 
  Eye, ThumbsUp, Bookmark, X, Bed, Bath, Square, Calendar, Camera, Play
} from 'lucide-react';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'host' | 'manager' | 'admin';
  avatar?: string;
  verified?: boolean;
}

interface Property {
  id: string;
  title: string;
  description: string;
  price?: number;
  originalPrice?: number;
  currency?: string;
  images?: string[];
  location?: string;
  coordinates?: { lat: number; lng: number };
  type: string;
  category: string;
  bedrooms?: number;
  bathrooms?: number;
  area: number;
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
    phone?: string;
    email?: string;
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
  performance?: {
    conversionRate: number;
    responseRate: number;
    averageStay: number;
    revenue: number;
  };
}

interface SearchFilters {
  query: string;
  type: string[];
  category: string[];
  priceRange: [number, number];
  location: string;
  amenities: string[];
  bedrooms: string[];
  bathrooms: string[];
  instantBook: boolean;
  petFriendly: boolean;
  superhost: boolean;
}

interface EnhancedMarketplaceProps {
  onPropertySelect?: (property: Property) => void;
  currentUser?: User;
}

// Mock data generator
const generateMockProperties = (): Property[] => {
  const types = ['Apartment', 'House', 'Land', 'Commercial'];
  const categories = ['Rent', 'Sale', 'Lease'];
  const locations = [
    'East Legon, Accra',
    'Tema, Greater Accra',
    'Kumasi, Ashanti',
    'Cape Coast, Central',
    'Takoradi, Western',
    'Tamale, Northern',
    'Ho, Volta',
    'Sunyani, Bono',
    'Koforidua, Eastern',
    'Wa, Upper West'
  ];
  const amenities = [
    'WiFi', 'Parking', 'Pool', 'Gym', 'Kitchen', 'AC', 'Garden', 'Security',
    'Laundry', 'Balcony', 'Furnished', 'Generator', 'CCTV', 'Elevator'
  ];

  const propertyImages = [
    'https://images.unsplash.com/photo-1560184897-68f5c90129ba?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop'
  ];

  return Array.from({ length: 24 }, (_, i) => ({
    id: `property-${i + 1}`,
    title: `${types[i % types.length]} in ${locations[i % locations.length].split(',')[0]}`,
    description: `Beautiful ${types[i % types.length].toLowerCase()} with modern amenities and excellent location. Perfect for ${categories[i % categories.length].toLowerCase()}. This property offers comfort, style, and convenience in one of Ghana's most sought-after neighborhoods.`,
    price: Math.floor(Math.random() * 5000) + 800,
    originalPrice: Math.floor(Math.random() * 6000) + 1000,
    currency: 'GHS',
    images: [
      propertyImages[i % propertyImages.length],
      propertyImages[(i + 1) % propertyImages.length],
      propertyImages[(i + 2) % propertyImages.length]
    ],
    location: locations[i % locations.length],
    type: types[i % types.length],
    category: categories[i % categories.length],
    bedrooms: Math.floor(Math.random() * 5) + 1,
    bathrooms: Math.floor(Math.random() * 4) + 1,
    area: Math.floor(Math.random() * 300) + 80,
    amenities: amenities.slice(0, Math.floor(Math.random() * 8) + 4),
    features: ['Modern Design', 'Great Location', 'Value for Money', 'Well Maintained'],
    owner: {
      id: `owner-${i + 1}`,
      name: `${['Kwame', 'Ama', 'Kofi', 'Akosua', 'Yaw', 'Efua'][i % 6]} ${['Asante', 'Mensah', 'Adjei', 'Boateng', 'Osei', 'Gyasi'][i % 6]}`,
      verified: Math.random() > 0.2,
      rating: Math.round((Math.random() * 2 + 3) * 10) / 10,
      responseTime: Math.floor(Math.random() * 120) + 5,
      joinedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      languages: ['English', 'Twi', 'Ga', 'Ewe'].slice(0, Math.floor(Math.random() * 3) + 1),
      totalProperties: Math.floor(Math.random() * 25) + 1,
      phone: `+233 ${Math.floor(Math.random() * 900000000) + 100000000}`,
      email: `owner${i + 1}@propertyhub.gh`
    },
    status: 'active',
    createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    views: Math.floor(Math.random() * 2000) + 100,
    likes: Math.floor(Math.random() * 150) + 20,
    saved: Math.floor(Math.random() * 80) + 10,
    bookings: Math.floor(Math.random() * 30) + 5,
    featured: Math.random() > 0.7,
    verified: Math.random() > 0.3,
    instantBook: Math.random() > 0.5,
    selfCheckIn: Math.random() > 0.6,
    petFriendly: Math.random() > 0.7,
    smokingAllowed: Math.random() > 0.8,
    partiesAllowed: Math.random() > 0.9,
    virtualTour: Math.random() > 0.7 ? `https://tour.propertyhub.gh/property-${i + 1}` : undefined,
    videoTour: Math.random() > 0.8 ? `https://video.propertyhub.gh/property-${i + 1}` : undefined,
    availability: {
      calendar: {},
      checkInTime: '14:00',
      checkOutTime: '11:00',
      minimumStay: Math.floor(Math.random() * 7) + 1,
      maximumStay: Math.floor(Math.random() * 365) + 30
    },
    pricing: {
      basePrice: Math.floor(Math.random() * 5000) + 800,
      weeklyDiscount: Math.random() > 0.5 ? Math.floor(Math.random() * 20) + 5 : undefined,
      monthlyDiscount: Math.random() > 0.6 ? Math.floor(Math.random() * 30) + 10 : undefined,
      cleaningFee: Math.floor(Math.random() * 200) + 50,
      securityDeposit: Math.floor(Math.random() * 1000) + 500,
      extraGuestFee: Math.floor(Math.random() * 100) + 25,
      maxGuests: Math.floor(Math.random() * 8) + 2
    },
    policies: {
      cancellation: ['flexible', 'moderate', 'strict'][Math.floor(Math.random() * 3)] as 'flexible' | 'moderate' | 'strict',
      houseRules: [
        'No smoking inside',
        'No pets allowed',
        'No parties or events',
        'Check-in after 2 PM',
        'Check-out before 11 AM'
      ].slice(0, Math.floor(Math.random() * 3) + 2),
      safetyFeatures: [
        'Smoke detector',
        'Carbon monoxide detector',
        'Fire extinguisher',
        'First aid kit',
        'Security cameras'
      ].slice(0, Math.floor(Math.random() * 3) + 2)
    },
    nearby: {
      schools: Math.floor(Math.random() * 5) + 1,
      hospitals: Math.floor(Math.random() * 3) + 1,
      shopping: Math.floor(Math.random() * 8) + 2,
      transport: Math.floor(Math.random() * 6) + 1,
      restaurants: Math.floor(Math.random() * 15) + 5,
      attractions: Math.floor(Math.random() * 10) + 2
    },
    ratings: {
      overall: Math.round((Math.random() * 2 + 3) * 10) / 10,
      cleanliness: Math.round((Math.random() * 2 + 3) * 10) / 10,
      accuracy: Math.round((Math.random() * 2 + 3) * 10) / 10,
      checkIn: Math.round((Math.random() * 2 + 3) * 10) / 10,
      communication: Math.round((Math.random() * 2 + 3) * 10) / 10,
      location: Math.round((Math.random() * 2 + 3) * 10) / 10,
      value: Math.round((Math.random() * 2 + 3) * 10) / 10,
      reviews: Math.floor(Math.random() * 100) + 10
    },
    performance: {
      conversionRate: Math.round(Math.random() * 50 + 20),
      responseRate: Math.round(Math.random() * 30 + 70),
      averageStay: Math.round(Math.random() * 10 + 3),
      revenue: Math.floor(Math.random() * 50000) + 10000
    }
  }));
};

export const EnhancedMarketplace: React.FC<EnhancedMarketplaceProps> = ({ 
  onPropertySelect = () => {}, 
  currentUser 
}) => {
  const [properties] = React.useState<Property[]>(generateMockProperties());
  const [searchFilters, setSearchFilters] = React.useState<SearchFilters>({
    query: '',
    type: [],
    category: [],
    priceRange: [0, 10000],
    location: '',
    amenities: [],
    bedrooms: [],
    bathrooms: [],
    instantBook: false,
    petFriendly: false,
    superhost: false
  });
  const [likedProperties, setLikedProperties] = React.useState<Set<string>>(new Set());
  const [savedProperties, setSavedProperties] = React.useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'grid' | 'list' | 'map'>('grid');

  const onFiltersChange = (filters: SearchFilters) => {
    setSearchFilters(filters);
  };

  const onPropertyLike = (id: string) => {
    setLikedProperties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const onPropertySave = (id: string) => {
    setSavedProperties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Filter properties based on search filters
  const filteredProperties = React.useMemo(() => {
    return properties.filter(property => {
      if (searchFilters.query) {
        const query = searchFilters.query.toLowerCase();
        const searchFields = [
          property.title,
          property.description,
          property.location,
          ...property.amenities,
          ...property.features,
          property.type,
          property.category
        ].join(' ').toLowerCase();
        
        if (!searchFields.includes(query)) return false;
      }

      if (searchFilters.type.length > 0 && !searchFilters.type.includes(property.type)) return false;
      if (searchFilters.category.length > 0 && !searchFilters.category.includes(property.category)) return false;
      
      if (property.price) {
        if (property.price < searchFilters.priceRange[0] || property.price > searchFilters.priceRange[1]) {
          return false;
        }
      }

      if (searchFilters.amenities.length > 0) {
        const hasRequiredAmenities = searchFilters.amenities.every((amenity: string) => 
          property.amenities.some(propAmenity => propAmenity.toLowerCase().includes(amenity.toLowerCase()))
        );
        if (!hasRequiredAmenities) return false;
      }

      if (searchFilters.bedrooms.length > 0 && property.bedrooms) {
        if (!searchFilters.bedrooms.includes(property.bedrooms.toString())) return false;
      }

      if (searchFilters.instantBook && !property.instantBook) return false;
      if (searchFilters.petFriendly && !property.petFriendly) return false;

      return true;
    });
  }, [properties, searchFilters]);

  const PropertyCard: React.FC<{ property: Property }> = ({ property }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="property-card bg-card border rounded-2xl overflow-hidden hover-lift group cursor-pointer"
      onClick={() => onPropertySelect(property)}
    >
      <div className="property-card-image relative">
        {property.images && property.images[0] ? (
          <img 
            src={property.images[0]}
            alt={property.title}
            className="w-full h-56 object-cover"
            onError={(e) => {
              e.currentTarget.src = `https://images.unsplash.com/photo-1560184897-68f5c90129ba?w=800&h=600&fit=crop`;
            }}
          />
        ) : (
          <div className="w-full h-56 bg-muted flex items-center justify-center">
            <Building2 className="w-16 h-16 text-muted-foreground" />
          </div>
        )}
        
        {/* Property badges */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          {property.featured && (
            <span className="property-badge bg-yellow-500 text-white text-xs px-3 py-1 rounded-full font-medium animate-glow">
              ⭐ Featured
            </span>
          )}
          {property.verified && (
            <span className="property-badge bg-green-500 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1 font-medium">
              <CheckCircle className="w-3 h-3" />
              Verified
            </span>
          )}
          {property.instantBook && (
            <span className="property-badge bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-medium">
              ⚡ Instant Book
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onPropertyLike(property.id);
            }}
            className={`p-3 rounded-full bg-white/90 hover:bg-white transition-all shadow-lg ${
              likedProperties.has(property.id) ? 'text-red-500' : 'text-gray-600'
            }`}
          >
            <Heart className={`w-5 h-5 ${likedProperties.has(property.id) ? 'fill-current like-button liked' : 'like-button'}`} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onPropertySave(property.id);
            }}
            className={`p-3 rounded-full bg-white/90 hover:bg-white transition-all shadow-lg ${
              savedProperties.has(property.id) ? 'text-blue-500' : 'text-gray-600'
            }`}
          >
            <Bookmark className={`w-5 h-5 ${savedProperties.has(property.id) ? 'fill-current' : ''}`} />
          </motion.button>
        </div>

        {/* Virtual tour badge */}
        {property.virtualTour && (
          <div className="absolute bottom-4 right-4">
            <span className="bg-purple-500 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1 font-medium">
              <Camera className="w-3 h-3" />
              360° Tour
            </span>
          </div>
        )}
      </div>

      <div className="property-card-content p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-xl line-clamp-1">{property.title}</h3>
          {property.ratings.overall > 0 && (
            <div className="flex items-center gap-1 text-sm bg-yellow-50 px-2 py-1 rounded-lg">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="font-medium">{property.ratings.overall}</span>
              <span className="text-muted-foreground">({property.ratings.reviews})</span>
            </div>
          )}
        </div>

        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {property.description}
        </p>

        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 text-primary" />
          <span>{property.location}</span>
        </div>

        {/* Property details */}
        <div className="flex items-center gap-6 mb-4 text-sm">
          {property.bedrooms && (
            <div className="flex items-center gap-1">
              <Bed className="w-4 h-4 text-muted-foreground" />
              <span>{property.bedrooms} bed{property.bedrooms > 1 ? 's' : ''}</span>
            </div>
          )}
          {property.bathrooms && (
            <div className="flex items-center gap-1">
              <Bath className="w-4 h-4 text-muted-foreground" />
              <span>{property.bathrooms} bath{property.bathrooms > 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Square className="w-4 h-4 text-muted-foreground" />
            <span>{property.area} m²</span>
          </div>
        </div>

        {/* Amenities preview */}
        <div className="flex flex-wrap gap-1 mb-4">
          {property.amenities.slice(0, 3).map((amenity, index) => (
            <span key={index} className="text-xs bg-muted px-2 py-1 rounded-md">
              {amenity}
            </span>
          ))}
          {property.amenities.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{property.amenities.length - 3} more
            </span>
          )}
        </div>

        {/* Property stats */}
        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{property.views.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThumbsUp className="w-3 h-3" />
            <span>{property.likes}</span>
          </div>
          <div className="flex items-center gap-1">
            <Bookmark className="w-3 h-3" />
            <span>{property.saved}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{property.bookings} bookings</span>
          </div>
        </div>

        {/* Price and CTA */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">
                {property.currency || 'GHS'} {property.price?.toLocaleString() || 'N/A'}
              </span>
              {property.category === 'Rent' && (
                <span className="text-sm text-muted-foreground">/month</span>
              )}
            </div>
            {property.originalPrice && property.originalPrice > (property.price || 0) && (
              <span className="text-sm text-muted-foreground line-through">
                {property.currency || 'GHS'} {property.originalPrice.toLocaleString()}
              </span>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onPropertySelect(property);
            }}
            className="btn-primary px-6 py-2 rounded-lg font-medium"
          >
            View Details
          </motion.button>
        </div>
      </div>
    </motion.div>
  );

  const SearchBar = () => (
    <div className="relative">
      <div className="search-bar flex items-center gap-3 p-6 bg-card rounded-2xl border shadow-lg hover-glow">
        <Search className="w-6 h-6 text-muted-foreground" />
        <input
          type="text"
          value={searchFilters.query}
          onChange={(e) => onFiltersChange({ ...searchFilters, query: e.target.value })}
          placeholder="Search for properties, locations, amenities..."
          className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-lg focus-ring"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowFilters(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filters
          {Object.values(searchFilters).some((value: any) => 
            Array.isArray(value) ? value.length > 0 : Boolean(value) && value !== '' && value !== false
          ) && (
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          )}
        </motion.button>
      </div>
    </div>
  );

  const FilterModal = () => {
    if (!showFilters) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowFilters(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scroll"
          >
            <div className="p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">Advanced Filters</h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Property Type */}
                <div>
                  <h3 className="font-semibold mb-4 text-lg">Property Type</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['Apartment', 'House', 'Land', 'Commercial'].map((type) => (
                      <motion.button
                        key={type}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const newTypes = searchFilters.type.includes(type)
                            ? searchFilters.type.filter(t => t !== type)
                            : [...searchFilters.type, type];
                          onFiltersChange({ ...searchFilters, type: newTypes });
                        }}
                        className={`p-3 rounded-xl border transition-all text-sm font-medium ${
                          searchFilters.type.includes(type)
                            ? 'bg-primary text-primary-foreground border-primary shadow-lg'
                            : 'hover:bg-muted border-border'
                        }`}
                      >
                        {type}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <h3 className="font-semibold mb-4 text-lg">Category</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {['Rent', 'Sale', 'Lease'].map((category) => (
                      <motion.button
                        key={category}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const newCategories = searchFilters.category.includes(category)
                            ? searchFilters.category.filter(c => c !== category)
                            : [...searchFilters.category, category];
                          onFiltersChange({ ...searchFilters, category: newCategories });
                        }}
                        className={`p-3 rounded-xl border transition-all text-sm font-medium ${
                          searchFilters.category.includes(category)
                            ? 'bg-primary text-primary-foreground border-primary shadow-lg'
                            : 'hover:bg-muted border-border'
                        }`}
                      >
                        {category}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="font-semibold mb-4 text-lg">Price Range (GHS)</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-2 block">Minimum</label>
                        <input
                          type="number"
                          value={searchFilters.priceRange[0]}
                          onChange={(e) => onFiltersChange({ 
                            ...searchFilters, 
                            priceRange: [Number(e.target.value), searchFilters.priceRange[1]] 
                          })}
                          className="w-full px-4 py-3 border border-border rounded-xl bg-input-background focus-ring"
                          placeholder="Min price"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-2 block">Maximum</label>
                        <input
                          type="number"
                          value={searchFilters.priceRange[1]}
                          onChange={(e) => onFiltersChange({ 
                            ...searchFilters, 
                            priceRange: [searchFilters.priceRange[0], Number(e.target.value)] 
                          })}
                          className="w-full px-4 py-3 border border-border rounded-xl bg-input-background focus-ring"
                          placeholder="Max price"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bedrooms */}
                <div>
                  <h3 className="font-semibold mb-4 text-lg">Bedrooms</h3>
                  <div className="flex gap-2">
                    {['1', '2', '3', '4', '5+'].map((bed) => (
                      <motion.button
                        key={bed}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const newBedrooms = searchFilters.bedrooms.includes(bed)
                            ? searchFilters.bedrooms.filter(b => b !== bed)
                            : [...searchFilters.bedrooms, bed];
                          onFiltersChange({ ...searchFilters, bedrooms: newBedrooms });
                        }}
                        className={`px-4 py-3 rounded-xl border transition-all font-medium ${
                          searchFilters.bedrooms.includes(bed)
                            ? 'bg-primary text-primary-foreground border-primary shadow-lg'
                            : 'hover:bg-muted border-border'
                        }`}
                      >
                        {bed}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div className="mt-8">
                <h3 className="font-semibold mb-4 text-lg">Amenities</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['WiFi', 'Parking', 'Pool', 'Gym', 'Kitchen', 'AC', 'Garden', 'Security', 'Laundry', 'Balcony', 'Furnished', 'Generator'].map((amenity) => (
                    <label key={amenity} className="flex items-center gap-3 p-3 hover:bg-muted rounded-xl transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={searchFilters.amenities.includes(amenity)}
                        onChange={(e) => {
                          const newAmenities = e.target.checked
                            ? [...searchFilters.amenities, amenity]
                            : searchFilters.amenities.filter(a => a !== amenity);
                          onFiltersChange({ ...searchFilters, amenities: newAmenities });
                        }}
                        className="w-5 h-5 rounded border-2 border-border checked:bg-primary checked:border-primary"
                      />
                      <span className="text-sm font-medium">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Special Features */}
              <div className="mt-8">
                <h3 className="font-semibold mb-4 text-lg">Special Features</h3>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-3 p-3 hover:bg-muted rounded-xl transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={searchFilters.instantBook}
                      onChange={(e) => onFiltersChange({ ...searchFilters, instantBook: e.target.checked })}
                      className="w-5 h-5 rounded border-2 border-border checked:bg-primary checked:border-primary"
                    />
                    <span className="text-sm font-medium">Instant Book</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 hover:bg-muted rounded-xl transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={searchFilters.petFriendly}
                      onChange={(e) => onFiltersChange({ ...searchFilters, petFriendly: e.target.checked })}
                      className="w-5 h-5 rounded border-2 border-border checked:bg-primary checked:border-primary"
                    />
                    <span className="text-sm font-medium">Pet Friendly</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 hover:bg-muted rounded-xl transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={searchFilters.superhost}
                      onChange={(e) => onFiltersChange({ ...searchFilters, superhost: e.target.checked })}
                      className="w-5 h-5 rounded border-2 border-border checked:bg-primary checked:border-primary"
                    />
                    <span className="text-sm font-medium">Superhost</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 mt-8">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onFiltersChange({
                      query: '',
                      type: [],
                      category: [],
                      priceRange: [0, 10000],
                      location: '',
                      amenities: [],
                      bedrooms: [],
                      bathrooms: [],
                      instantBook: false,
                      petFriendly: false,
                      superhost: false
                    });
                  }}
                  className="flex-1 py-4 border border-border rounded-xl hover:bg-muted transition-colors font-medium"
                >
                  Clear All Filters
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowFilters(false)}
                  className="flex-1 bg-primary text-primary-foreground py-4 rounded-xl hover:bg-primary/90 transition-colors font-medium"
                >
                  Apply Filters ({filteredProperties.length} properties)
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6 gradient-text animate-pulse3d">
            Find Your Perfect Property
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl mb-8 max-w-3xl mx-auto">
            Discover {filteredProperties.length} verified properties across Ghana's most desirable locations
          </p>
        </motion.div>

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <SearchBar />
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <span className="text-lg font-medium">
              {filteredProperties.length} properties found
            </span>
            {filteredProperties.length !== properties.length && (
              <span className="text-sm text-muted-foreground">
                (filtered from {properties.length} total)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'grid' | 'list' | 'map')}
              className="px-4 py-2 border border-border rounded-lg bg-input-background focus-ring"
            >
              <option value="grid">Grid View</option>
              <option value="list">List View</option>
              <option value="map">Map View</option>
            </select>
          </div>
        </motion.div>

        {/* Properties Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-12"
        >
          {filteredProperties.map((property, index) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="stagger-item"
            >
              <PropertyCard property={property} />
            </motion.div>
          ))}
        </motion.div>

        {/* Empty State */}
        {filteredProperties.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="w-32 h-32 bg-muted rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
              <Search className="w-16 h-16 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold mb-4">No properties found</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Try adjusting your search criteria or filters to find more properties
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onFiltersChange({
                query: '',
                type: [],
                category: [],
                priceRange: [0, 10000],
                location: '',
                amenities: [],
                bedrooms: [],
                bathrooms: [],
                instantBook: false,
                petFriendly: false,
                superhost: false
              })}
              className="btn-primary px-8 py-4 rounded-xl hover-lift"
            >
              Clear All Filters
            </motion.button>
          </motion.div>
        )}

        {/* Filter Modal */}
        <FilterModal />
      </div>
    </div>
  );
};

export default EnhancedMarketplace;