import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, MapPin, Home, DollarSign, Bed, Bath } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Slider } from '../ui/slider';
import { Checkbox } from '../ui/checkbox';

export function AdvancedSearchSystem() {
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState([0, 1000000]);
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [bedrooms, setBedrooms] = useState<number[]>([]);
  const [bathrooms, setBathrooms] = useState<number[]>([]);

  const propertyTypeOptions = [
    { id: 'apartment', label: 'Apartment', icon: Home },
    { id: 'house', label: 'House', icon: Home },
    { id: 'land', label: 'Land', icon: MapPin },
    { id: 'shop', label: 'Shop', icon: Home },
    { id: 'office', label: 'Office', icon: Home }
  ];

  const bedroomOptions = [1, 2, 3, 4, 5];
  const bathroomOptions = [1, 2, 3, 4];

  const togglePropertyType = (type: string) => {
    setPropertyTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleBedrooms = (count: number) => {
    setBedrooms(prev => 
      prev.includes(count) 
        ? prev.filter(b => b !== count)
        : [...prev, count]
    );
  };

  const toggleBathrooms = (count: number) => {
    setBathrooms(prev => 
      prev.includes(count) 
        ? prev.filter(b => b !== count)
        : [...prev, count]
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Advanced Search
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Find your perfect property with detailed filters
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="w-5 h-5" />
                  <span>Filters</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Location, keywords..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Price Range
                  </label>
                  <div className="space-y-2">
                    <Slider
                      value={priceRange}
                      onValueChange={setPriceRange}
                      max={1000000}
                      step={1000}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>GHS {priceRange[0].toLocaleString()}</span>
                      <span>GHS {priceRange[1].toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Property Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Property Type
                  </label>
                  <div className="space-y-2">
                    {propertyTypeOptions.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={option.id}
                          checked={propertyTypes.includes(option.id)}
                          onCheckedChange={() => togglePropertyType(option.id)}
                        />
                        <label
                          htmlFor={option.id}
                          className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bedrooms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bedrooms
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {bedroomOptions.map((count) => (
                      <Badge
                        key={count}
                        variant={bedrooms.includes(count) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleBedrooms(count)}
                      >
                        <Bed className="w-3 h-3 mr-1" />
                        {count}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Bathrooms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bathrooms
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {bathroomOptions.map((count) => (
                      <Badge
                        key={count}
                        variant={bathrooms.includes(count) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleBathrooms(count)}
                      >
                        <Bath className="w-3 h-3 mr-1" />
                        {count}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button className="w-full">
                    Apply Filters
                  </Button>
                  <Button variant="outline" className="w-full">
                    Clear All
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Results */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Search Results</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Found 156 properties matching your criteria
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sample search results */}
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.1 }}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-shadow"
                    >
                      <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Sample Property {i}
                      </h3>
                      <div className="flex items-center text-gray-600 dark:text-gray-300 mb-2">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span className="text-sm">East Legon, Accra</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          GHS 45,000
                        </span>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Bed className="w-4 h-4 mr-1" />
                            3
                          </span>
                          <span className="flex items-center">
                            <Bath className="w-4 h-4 mr-1" />
                            2
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}