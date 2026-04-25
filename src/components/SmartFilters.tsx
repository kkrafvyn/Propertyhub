import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SlidersHorizontal, X, MapPin, Home, Star, Wifi, Car, Shield, 
  Sparkles, Filter, RotateCcw, Save, Download, Upload, Trash2,
  ChevronDown, ChevronUp, Calendar, DollarSign, Ruler, Bed, Bath
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { PropertyFilters } from '../types';
import { toast } from "sonner";

interface SmartFiltersProps {
  filters: PropertyFilters;
  setFilters: (filters: PropertyFilters) => void;
  propertyCount?: number;
  showAdvanced?: boolean;
  compact?: boolean;
  onLocationSearch?: (query: string) => Promise<Array<{ name: string; coordinates: [number, number] }>>;
}

interface SavedFilterSet {
  id: string;
  name: string;
  filters: PropertyFilters;
  createdAt: string;
  icon?: string;
}

const PROPERTY_TYPES = [
  { id: 'house', label: 'Houses', icon: '🏠' },
  { id: 'apartment', label: 'Apartments', icon: '🏢' },
  { id: 'land', label: 'Land', icon: '🌾' },
  { id: 'shop', label: 'Shops', icon: '🏪' }
];

const AMENITIES_CATEGORIES = {
  'Basic': ['WiFi', 'Air Conditioning', 'Heating'],
  'Parking & Transport': ['Parking', 'Garage', 'Electric Charging'],
  'Recreation': ['Pool', 'Gym', 'Garden', 'Balcony'],
  'Security': ['Security System', 'Gated Community', 'CCTV'],
  'Smart Features': ['Smart Home', 'Smart Locks', 'Voice Control'],
  'Pet & Family': ['Pet Friendly', 'Playground', 'Family Room'],
  'Storage & Utility': ['Storage', 'Laundry', 'Basement', 'Attic']
};

const AVAILABILITY_OPTIONS = [
  { id: 'available', label: 'Available Now', color: 'green' },
  { id: 'coming-soon', label: 'Coming Soon', color: 'yellow' },
  { id: 'reserved', label: 'Reserved', color: 'orange' }
];

export function SmartFilters({ 
  filters, 
  setFilters, 
  propertyCount = 0, 
  showAdvanced = true,
  compact = false,
  onLocationSearch
}: SmartFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [savedFilterSets, setSavedFilterSets] = useState<SavedFilterSet[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ name: string; coordinates: [number, number] }>>([]);
  const [locationQuery, setLocationQuery] = useState('');
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'location' | 'amenities' | 'advanced'>('basic');

  // Load saved filter sets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('propertyHub_savedFilters');
    if (saved) {
      setSavedFilterSets(JSON.parse(saved));
    }
  }, []);

  // Save filter sets to localStorage
  useEffect(() => {
    localStorage.setItem('propertyHub_savedFilters', JSON.stringify(savedFilterSets));
  }, [savedFilterSets]);

  const updateFilter = useCallback((key: keyof PropertyFilters, value: any) => {
    setFilters({ ...filters, [key]: value });
  }, [filters, setFilters]);

  const toggleArrayItem = useCallback((key: keyof PropertyFilters, item: string) => {
    const currentArray = (filters[key] as string[]) || [];
    const newArray = currentArray.includes(item)
      ? currentArray.filter(i => i !== item)
      : [...currentArray, item];
    updateFilter(key, newArray);
  }, [filters, updateFilter]);

  const clearAllFilters = useCallback(() => {
    const defaultFilters: PropertyFilters = {
      type: [],
      priceRange: [0, 500000],
      location: [],
      bedrooms: [],
      bathrooms: [],
      areaRange: [0, 10000],
      amenities: [],
      availability: []
    };
    setFilters(defaultFilters);
    toast.success('All filters cleared');
  }, [setFilters]);

  const getActiveFilterCount = useCallback(() => {
    const typeArray = Array.isArray(filters.type) ? filters.type : [];
    const locationArray = Array.isArray(filters.location) ? filters.location : [];
    const bedroomsArray = Array.isArray(filters.bedrooms) ? filters.bedrooms : [];
    const bathroomsArray = Array.isArray(filters.bathrooms) ? filters.bathrooms : [];
    const amenitiesArray = Array.isArray(filters.amenities) ? filters.amenities : [];
    const availabilityArray = Array.isArray(filters.availability) ? filters.availability : [];

    return (
      typeArray.length +
      locationArray.length +
      bedroomsArray.length +
      bathroomsArray.length +
      amenitiesArray.length +
      availabilityArray.length +
      (filters.priceRange && (filters.priceRange[0] > 0 || filters.priceRange[1] < 500000) ? 1 : 0) +
      (filters.areaRange && (filters.areaRange[0] > 0 || filters.areaRange[1] < 10000) ? 1 : 0)
    );
  }, [filters]);

  const saveCurrentFilters = useCallback(() => {
    if (saveFilterName.trim()) {
      const newFilterSet: SavedFilterSet = {
        id: Date.now().toString(),
        name: saveFilterName,
        filters,
        createdAt: new Date().toISOString(),
        icon: '⭐'
      };
      setSavedFilterSets(prev => [newFilterSet, ...prev].slice(0, 10));
      setSaveFilterName('');
      setShowSaveDialog(false);
      toast.success(`Filter set "${saveFilterName}" saved!`);
    }
  }, [saveFilterName, filters]);

  const applySavedFilters = useCallback((savedFilter: SavedFilterSet) => {
    setFilters(savedFilter.filters);
    toast.success(`Applied filter set: ${savedFilter.name}`);
  }, [setFilters]);

  const deleteSavedFilter = useCallback((id: string) => {
    setSavedFilterSets(prev => prev.filter(f => f.id !== id));
    toast.success('Filter set deleted');
  }, []);

  const handleLocationSearch = useCallback(async (query: string) => {
    setLocationQuery(query);
    if (onLocationSearch && query.length > 2) {
      try {
        const suggestions = await onLocationSearch(query);
        setLocationSuggestions(suggestions);
        setShowLocationSuggestions(true);
      } catch (error) {
        console.error('Location search error:', error);
      }
    } else {
      setShowLocationSuggestions(false);
    }
  }, [onLocationSearch]);

  const exportFilters = useCallback(() => {
    const dataStr = JSON.stringify(filters, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `property-filters-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Filters exported successfully');
  }, [filters]);

  const importFilters = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedFilters = JSON.parse(e.target?.result as string);
          setFilters(importedFilters);
          toast.success('Filters imported successfully');
        } catch (error) {
          toast.error('Invalid filter file format');
        }
      };
      reader.readAsText(file);
    }
  }, [setFilters]);

  if (compact) {
    return (
      <motion.div
        className="flex items-center gap-2 flex-wrap"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {getActiveFilterCount() > 0 && (
            <Badge variant="secondary" className="ml-1">
              {getActiveFilterCount()}
            </Badge>
          )}
        </Button>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className="flex gap-2 flex-wrap"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Select value={Array.isArray(filters.type) && filters.type.length === 1 ? filters.type[0] : ''} onValueChange={(value) => updateFilter('type', [value])}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.icon} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="text-sm text-muted-foreground px-2 py-1">
                GHS {filters.priceRange?.[0]?.toLocaleString() || '0'} - {filters.priceRange?.[1]?.toLocaleString() || '500,000'}
              </div>

              {getActiveFilterCount() > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-full max-w-7xl mx-auto"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="backdrop-blur-sm bg-card/90 border-2 shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <SlidersHorizontal className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Smart Filters</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {propertyCount} properties found
                  {getActiveFilterCount() > 0 && ` • ${getActiveFilterCount()} filters active`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Saved Filters */}
              {savedFilterSets.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Star className="w-4 h-4 mr-2" />
                      Saved
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Saved Filter Sets</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {savedFilterSets.map((savedFilter) => (
                        <div key={savedFilter.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <span>{savedFilter.icon}</span>
                            <div>
                              <div className="font-medium">{savedFilter.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(savedFilter.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => applySavedFilters(savedFilter)}
                            >
                              Apply
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteSavedFilter(savedFilter.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Import/Export */}
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={exportFilters} title="Export filters">
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" asChild title="Import filters">
                  <label>
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={importFilters}
                    />
                  </label>
                </Button>
              </div>

              {/* Save Current Filters */}
              <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={getActiveFilterCount() === 0}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Filter Set</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Enter a name for this filter set..."
                      value={saveFilterName}
                      onChange={(e) => setSaveFilterName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveCurrentFilters()}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={saveCurrentFilters} disabled={!saveFilterName.trim()}>
                        Save
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Clear All */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearAllFilters}
                disabled={getActiveFilterCount() === 0}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Filter Tabs */}
          <div className="flex gap-2 border-b">
            {(['basic', 'location', 'amenities', 'advanced'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'basic' && (
              <motion.div
                key="basic"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {/* Property Type */}
                <div className="space-y-3">
                  <Label className="font-medium flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    Property Type
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROPERTY_TYPES.map((type) => (
                      <motion.div
                        key={type.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Label
                          className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                            (filters.type as string[])?.includes(type.id)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <Checkbox
                            checked={(filters.type as string[])?.includes(type.id)}
                            onCheckedChange={() => toggleArrayItem('type', type.id)}
                            className="hidden"
                          />
                          <span className="text-lg">{type.icon}</span>
                          <span className="text-sm font-medium">{type.label}</span>
                        </Label>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div className="space-y-3">
                  <Label className="font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Price Range
                  </Label>
                  <div className="space-y-4">
                    <div className="text-center text-sm text-muted-foreground">
                      GHS {filters.priceRange?.[0]?.toLocaleString() || '0'} - GHS {filters.priceRange?.[1]?.toLocaleString() || '500,000'}
                    </div>
                    <Slider
                      value={filters.priceRange || [0, 500000]}
                      onValueChange={(value) => updateFilter('priceRange', value)}
                      max={500000}
                      min={0}
                      step={5000}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>GHS 0</span>
                      <span>GHS 500k+</span>
                    </div>
                  </div>
                </div>

                {/* Area Range */}
                <div className="space-y-3">
                  <Label className="font-medium flex items-center gap-2">
                    <Ruler className="w-4 h-4" />
                    Area (sqft)
                  </Label>
                  <div className="space-y-4">
                    <div className="text-center text-sm text-muted-foreground">
                      {filters.areaRange?.[0]?.toLocaleString() || '0'} - {filters.areaRange?.[1]?.toLocaleString() || '10,000'} sqft
                    </div>
                    <Slider
                      value={filters.areaRange || [0, 10000]}
                      onValueChange={(value) => updateFilter('areaRange', value)}
                      max={10000}
                      min={0}
                      step={100}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0 sqft</span>
                      <span>10k+ sqft</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'location' && (
              <motion.div
                key="location"
                className="space-y-6"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {/* Location Search */}
                <div className="space-y-3">
                  <Label className="font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Search for areas, neighborhoods, or addresses..."
                      value={locationQuery}
                      onChange={(e) => handleLocationSearch(e.target.value)}
                      className="pl-10"
                    />
                    <MapPin className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    
                    {/* Location Suggestions */}
                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <motion.div
                        className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-10"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {locationSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              const locationArray = Array.isArray(filters.location) ? filters.location : [];
                              if (!locationArray.includes(suggestion.name)) {
                                updateFilter('location', [...locationArray, suggestion.name]);
                              }
                              setLocationQuery('');
                              setShowLocationSuggestions(false);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-primary" />
                              <span>{suggestion.name}</span>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Selected Locations */}
                {Array.isArray(filters.location) && filters.location.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Selected Locations:</Label>
                    <div className="flex flex-wrap gap-2">
                      {filters.location.map((location) => (
                        <Badge key={location} variant="secondary" className="flex items-center gap-2">
                          {location}
                          <button
                            onClick={() => toggleArrayItem('location', location)}
                            className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'amenities' && (
              <motion.div
                key="amenities"
                className="space-y-6"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {Object.entries(AMENITIES_CATEGORIES).map(([category, amenities]) => (
                  <Collapsible key={category} defaultOpen={category === 'Basic'}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <span className="font-medium">{category}</span>
                      <ChevronDown className="w-4 h-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {amenities.map((amenity) => (
                          <motion.div
                            key={amenity}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Badge
                              variant={(filters.amenities as string[])?.includes(amenity) ? "default" : "outline"}
                              className="cursor-pointer w-full justify-center py-2"
                              onClick={() => toggleArrayItem('amenities', amenity)}
                            >
                              {amenity}
                              {(filters.amenities as string[])?.includes(amenity) && (
                                <X className="w-3 h-3 ml-2" />
                              )}
                            </Badge>
                          </motion.div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </motion.div>
            )}

            {activeTab === 'advanced' && (
              <motion.div
                key="advanced"
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {/* Bedrooms */}
                <div className="space-y-3">
                  <Label className="font-medium flex items-center gap-2">
                    <Bed className="w-4 h-4" />
                    Bedrooms
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {['1', '2', '3', '4', '5+'].map((bedroom) => (
                      <motion.div
                        key={bedroom}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Badge
                          variant={(filters.bedrooms as string[])?.includes(bedroom) ? "default" : "outline"}
                          className="cursor-pointer px-4 py-2"
                          onClick={() => toggleArrayItem('bedrooms', bedroom)}
                        >
                          {bedroom}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Bathrooms */}
                <div className="space-y-3">
                  <Label className="font-medium flex items-center gap-2">
                    <Bath className="w-4 h-4" />
                    Bathrooms
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {['1', '2', '3', '4+'].map((bathroom) => (
                      <motion.div
                        key={bathroom}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Badge
                          variant={(filters.bathrooms as string[])?.includes(bathroom) ? "default" : "outline"}
                          className="cursor-pointer px-4 py-2"
                          onClick={() => toggleArrayItem('bathrooms', bathroom)}
                        >
                          {bathroom}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Availability */}
                <div className="space-y-3 col-span-full">
                  <Label className="font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Availability
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {AVAILABILITY_OPTIONS.map((option) => (
                      <motion.div
                        key={option.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Badge
                          variant={(filters.availability as string[])?.includes(option.label) ? "default" : "outline"}
                          className="cursor-pointer px-4 py-2"
                          onClick={() => toggleArrayItem('availability', option.label)}
                        >
                          <div className={`w-2 h-2 rounded-full mr-2 bg-${option.color}-500`} />
                          {option.label}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Filters Summary */}
          {getActiveFilterCount() > 0 && (
            <motion.div
              className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">
                    {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} applied
                  </span>
                  <span className="text-muted-foreground ml-2">
                    • {propertyCount} properties found
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  Clear all
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default SmartFilters;