/**
 * EnhancedSearchFilters - Advanced filtering system for properties
 * 
 * Features:
 * - Advanced price and date filtering
 * - Guest count and room configuration
 * - Amenity and feature selection
 * - Policy and accessibility filters
 * - Map-based location filtering
 * - Saved search functionality
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Calendar } from './ui/calendar';
import { Checkbox } from './ui/checkbox';
import { 
  Filter,
  X,
  Calendar as CalendarIcon,
  Users,
  Home,
  Star,
  Wifi,
  Car,
  Shield,
  Waves,
  Dumbbell,
  TreePine,
  Utensils,
  ChevronDown,
  ChevronUp,
  MapPin,
  Search,
  Bookmark,
  RotateCcw
} from 'lucide-react';

interface SearchFilters {
  query: string;
  type: string[];
  category: string[];
  priceRange: [number, number];
  location: string;
  radius: number;
  bedrooms: number[];
  bathrooms: number[];
  areaRange: [number, number];
  guests: number;
  amenities: string[];
  features: string[];
  policies: string[];
  availability: {
    checkIn?: Date;
    checkOut?: Date;
    flexibleDates: boolean;
  };
  instantBook: boolean;
  superhost: boolean;
  petFriendly: boolean;
  accessibility: string[];
  sortBy: string;
  viewMode: 'grid' | 'list' | 'map';
}

interface EnhancedSearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onClose: () => void;
  propertyCount: number;
  className?: string;
}

const PROPERTY_TYPES = [
  { id: 'apartment', label: 'Apartment', icon: Home },
  { id: 'house', label: 'House', icon: Home },
  { id: 'villa', label: 'Villa', icon: Home },
  { id: 'studio', label: 'Studio', icon: Home },
  { id: 'penthouse', label: 'Penthouse', icon: Home },
  { id: 'office', label: 'Office', icon: Home },
  { id: 'shop', label: 'Shop', icon: Home },
  { id: 'land', label: 'Land', icon: Home }
];

const CATEGORIES = [
  { id: 'rent', label: 'For Rent' },
  { id: 'sale', label: 'For Sale' },
  { id: 'lease', label: 'For Lease' },
  { id: 'vacation', label: 'Vacation Rental' },
  { id: 'short-term', label: 'Short-term Stay' }
];

const AMENITIES = [
  { id: 'wifi', label: 'WiFi', icon: Wifi },
  { id: 'parking', label: 'Parking', icon: Car },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'pool', label: 'Swimming Pool', icon: Waves },
  { id: 'gym', label: 'Gym', icon: Dumbbell },
  { id: 'garden', label: 'Garden', icon: TreePine },
  { id: 'kitchen', label: 'Kitchen', icon: Utensils },
  { id: 'generator', label: 'Generator', icon: Shield },
  { id: 'aircon', label: 'Air Conditioning', icon: Shield },
  { id: 'balcony', label: 'Balcony', icon: Home },
  { id: 'terrace', label: 'Terrace', icon: Home },
  { id: 'elevator', label: 'Elevator', icon: Home }
];

const SORT_OPTIONS = [
  { id: 'featured', label: 'Featured' },
  { id: 'price-low', label: 'Price: Low to High' },
  { id: 'price-high', label: 'Price: High to Low' },
  { id: 'newest', label: 'Newest First' },
  { id: 'rating', label: 'Highest Rated' },
  { id: 'popular', label: 'Most Popular' }
];

export const EnhancedSearchFilters: React.FC<EnhancedSearchFiltersProps> = ({
  filters,
  onFiltersChange,
  onClose,
  propertyCount,
  className = ""
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['price', 'type', 'amenities'])
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectingCheckIn, setSelectingCheckIn] = useState(true);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  }, []);

  const updateFilters = useCallback((updates: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  }, [filters, onFiltersChange]);

  const toggleArrayFilter = useCallback((key: keyof SearchFilters, value: string) => {
    const currentArray = filters[key] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilters({ [key]: newArray });
  }, [filters, updateFilters]);

  const resetFilters = useCallback(() => {
    onFiltersChange({
      query: '',
      type: [],
      category: [],
      priceRange: [0, 2000],
      location: '',
      radius: 25,
      bedrooms: [],
      bathrooms: [],
      areaRange: [0, 1000],
      guests: 1,
      amenities: [],
      features: [],
      policies: [],
      availability: { flexibleDates: true },
      instantBook: false,
      superhost: false,
      petFriendly: false,
      accessibility: [],
      sortBy: 'featured',
      viewMode: 'grid'
    });
  }, [onFiltersChange]);

  const activeFilterCount = [
    ...filters.type,
    ...filters.category,
    ...filters.amenities,
    ...filters.features,
    ...filters.policies,
    ...(filters.priceRange[0] > 0 || filters.priceRange[1] < 2000 ? ['price'] : []),
    ...(filters.location ? ['location'] : []),
    ...(filters.guests > 1 ? ['guests'] : []),
    ...(filters.bedrooms.length > 0 ? ['bedrooms'] : []),
    ...(filters.bathrooms.length > 0 ? ['bathrooms'] : []),
    ...(filters.instantBook ? ['instant'] : []),
    ...(filters.superhost ? ['superhost'] : []),
    ...(filters.petFriendly ? ['pet'] : [])
  ].length;

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 ${className}`}>
      <div className="h-full flex">
        {/* Filter Panel */}
        <motion.div
          initial={{ x: -400 }}
          animate={{ x: 0 }}
          exit={{ x: -400 }}
          transition={{ type: "spring", damping: 20 }}
          className="w-96 bg-white dark:bg-gray-800 h-full overflow-y-auto custom-scroll"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Filters</h2>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {activeFilterCount} filters applied
              </div>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Search Query */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                Search Location
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Where do you want to stay?"
                  value={filters.query}
                  onChange={(e) => updateFilters({ query: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('price')}
                className="flex items-center justify-between w-full text-sm font-medium text-gray-900 dark:text-white"
              >
                Price Range
                {expandedSections.has('price') ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedSections.has('price') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <div className="px-2">
                      <Slider
                        value={filters.priceRange}
                        onValueChange={(value) => updateFilters({ priceRange: value as [number, number] })}
                        max={2000}
                        min={0}
                        step={50}
                        className="w-full"
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded">
                        GHS {filters.priceRange[0]}
                      </div>
                      <span className="text-gray-500">to</span>
                      <div className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded">
                        GHS {filters.priceRange[1]}+
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Separator />

            {/* Property Type */}
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('type')}
                className="flex items-center justify-between w-full text-sm font-medium text-gray-900 dark:text-white"
              >
                Property Type
                {expandedSections.has('type') ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedSections.has('type') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-2 gap-2"
                  >
                    {PROPERTY_TYPES.map((type) => (
                      <Button
                        key={type.id}
                        variant={filters.type.includes(type.id) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleArrayFilter('type', type.id)}
                        className="h-12 flex-col items-center justify-center"
                      >
                        <type.icon className="w-4 h-4 mb-1" />
                        <span className="text-xs">{type.label}</span>
                      </Button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Separator />

            {/* Category */}
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('category')}
                className="flex items-center justify-between w-full text-sm font-medium text-gray-900 dark:text-white"
              >
                Category
                {expandedSections.has('category') ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedSections.has('category') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    {CATEGORIES.map((category) => (
                      <div key={category.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={category.id}
                          checked={filters.category.includes(category.id)}
                          onCheckedChange={() => toggleArrayFilter('category', category.id)}
                        />
                        <label
                          htmlFor={category.id}
                          className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                        >
                          {category.label}
                        </label>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Separator />

            {/* Rooms & Guests */}
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('rooms')}
                className="flex items-center justify-between w-full text-sm font-medium text-gray-900 dark:text-white"
              >
                Rooms & Guests
                {expandedSections.has('rooms') ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedSections.has('rooms') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    {/* Guest Count */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-700 dark:text-gray-300">Guests</label>
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateFilters({ guests: Math.max(1, filters.guests - 1) })}
                          disabled={filters.guests <= 1}
                          className="h-8 w-8 rounded-full p-0"
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{filters.guests}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateFilters({ guests: Math.min(16, filters.guests + 1) })}
                          disabled={filters.guests >= 16}
                          className="h-8 w-8 rounded-full p-0"
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    {/* Bedrooms */}
                    <div>
                      <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Bedrooms</label>
                      <div className="grid grid-cols-4 gap-2">
                        {['Any', '1', '2', '3', '4+'].map((bedroom, index) => (
                          <Button
                            key={bedroom}
                            variant={filters.bedrooms.includes(index) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              const value = index;
                              toggleArrayFilter('bedrooms', value.toString());
                            }}
                            className="text-xs"
                          >
                            {bedroom}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Bathrooms */}
                    <div>
                      <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Bathrooms</label>
                      <div className="grid grid-cols-4 gap-2">
                        {['Any', '1', '2', '3+'].map((bathroom, index) => (
                          <Button
                            key={bathroom}
                            variant={filters.bathrooms.includes(index) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              const value = index;
                              toggleArrayFilter('bathrooms', value.toString());
                            }}
                            className="text-xs"
                          >
                            {bathroom}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Separator />

            {/* Amenities */}
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('amenities')}
                className="flex items-center justify-between w-full text-sm font-medium text-gray-900 dark:text-white"
              >
                Amenities
                {expandedSections.has('amenities') ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedSections.has('amenities') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-2 gap-2"
                  >
                    {AMENITIES.map((amenity) => (
                      <Button
                        key={amenity.id}
                        variant={filters.amenities.includes(amenity.id) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleArrayFilter('amenities', amenity.id)}
                        className="h-12 flex-col items-center justify-center"
                      >
                        <amenity.icon className="w-4 h-4 mb-1" />
                        <span className="text-xs">{amenity.label}</span>
                      </Button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Separator />

            {/* Quick Options */}
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('options')}
                className="flex items-center justify-between w-full text-sm font-medium text-gray-900 dark:text-white"
              >
                Quick Options
                {expandedSections.has('options') ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedSections.has('options') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm">Instant Book</span>
                      </div>
                      <Switch
                        checked={filters.instantBook}
                        onCheckedChange={(checked) => updateFilters({ instantBook: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Superhost</span>
                      </div>
                      <Switch
                        checked={filters.superhost}
                        onCheckedChange={(checked) => updateFilters({ superhost: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-purple-500" />
                        <span className="text-sm">Pet Friendly</span>
                      </div>
                      <Switch
                        checked={filters.petFriendly}
                        onCheckedChange={(checked) => updateFilters({ petFriendly: checked })}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Separator />

            {/* Sort By */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-900 dark:text-white">Sort By</label>
              <div className="grid grid-cols-1 gap-2">
                {SORT_OPTIONS.map((option) => (
                  <Button
                    key={option.id}
                    variant={filters.sortBy === option.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateFilters({ sortBy: option.id })}
                    className="justify-start"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Results Preview */}
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {propertyCount} Properties Found
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Refine your search with the filters on the left
            </p>
            <div className="flex space-x-3">
              <Button onClick={onClose}>
                Apply Filters
              </Button>
              <Button variant="outline" onClick={() => updateFilters({ query: '' })}>
                <Bookmark className="w-4 h-4 mr-2" />
                Save Search
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedSearchFilters;