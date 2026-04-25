import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, Layers, Maximize2, Minimize2, Filter } from 'lucide-react';
import { Property, User as UserType, PropertyFilters } from '../types';
import { PropertyCard } from './PropertyCard';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { getLocationLabel, getPropertyPrice } from '../utils/location';

interface MapViewProps {
  properties: Property[];
  filters: PropertyFilters;
  currentUser: UserType | null;
  onPropertySelect: (property: Property) => void;
  onBack: () => void;
}

interface MapMarker {
  id: string;
  property: Property;
  lat: number;
  lng: number;
  x: number;
  y: number;
}

// Mock coordinates for different locations
const locationCoordinates: Record<string, { lat: number; lng: number }> = {
  'New York, NY': { lat: 40.7128, lng: -74.0060 },
  'Los Angeles, CA': { lat: 34.0522, lng: -118.2437 },
  'Chicago, IL': { lat: 41.8781, lng: -87.6298 },
  'Miami, FL': { lat: 25.7617, lng: -80.1918 },
  'San Francisco, CA': { lat: 37.7749, lng: -122.4194 },
  'Austin, TX': { lat: 30.2672, lng: -97.7431 },
  'Seattle, WA': { lat: 47.6062, lng: -122.3321 },
  'Denver, CO': { lat: 39.7392, lng: -104.9903 },
  'Boston, MA': { lat: 42.3601, lng: -71.0589 },
  'Atlanta, GA': { lat: 33.7490, lng: -84.3880 },
  'Portland, OR': { lat: 45.5152, lng: -122.6784 },
  'Nashville, TN': { lat: 36.1627, lng: -86.7816 },
  'Phoenix, AZ': { lat: 33.4484, lng: -112.0740 },
  'Las Vegas, NV': { lat: 36.1699, lng: -115.1398 },
  'Orlando, FL': { lat: 28.5383, lng: -81.3792 },
};

export function MapView({ properties, filters, currentUser, onPropertySelect, onBack }: MapViewProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 39.8283, lng: -98.5795 }); // Center of USA
  const [zoom, setZoom] = useState(4);
  const [searchLocation, setSearchLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  // Convert properties to map markers
  const markers: MapMarker[] = properties.map(property => {
    const locationLabel = getLocationLabel(property.location);
    const coords = locationCoordinates[locationLabel] || { lat: 0, lng: 0 };
    // Add small random offset to prevent exact overlaps
    const lat = coords.lat + (Math.random() - 0.5) * 0.01;
    const lng = coords.lng + (Math.random() - 0.5) * 0.01;
    
    // Convert lat/lng to screen coordinates (simplified projection)
    const x = ((lng + 180) / 360) * 100;
    const y = ((90 - lat) / 180) * 100;
    
    return {
      id: property.id,
      property,
      lat,
      lng,
      x,
      y,
    };
  });

  const handleMarkerClick = (property: Property) => {
    setSelectedProperty(property);
  };

  const handleLocationSearch = () => {
    const coords = locationCoordinates[searchLocation];
    if (coords) {
      setMapCenter(coords);
      setZoom(10);
    }
  };

  const centerOnUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setZoom(12);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  return (
    <div className={`fixed inset-0 z-50 bg-background ${isFullscreen ? 'z-[60]' : ''}`}>
      {/* Header */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={onBack}>
              ← Back to Grid
            </Button>
            <h1 className="text-xl font-semibold">Map View</h1>
            <Badge variant="secondary">{properties.length} properties</Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 bg-card rounded-lg p-2">
              <Input
                placeholder="Search location..."
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="w-48"
                onKeyDown={(e) => e.key === 'Enter' && handleLocationSearch()}
              />
              <Button size="sm" onClick={handleLocationSearch}>
                <MapPin className="w-4 h-4" />
              </Button>
            </div>
            
            <Button variant="outline" size="sm" onClick={centerOnUserLocation}>
              <Navigation className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Map Container */}
      <div className="relative w-full h-full pt-20">
        <motion.div
          ref={mapRef}
          className="relative w-full h-full bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-800 dark:to-gray-900 overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Mock Map Background */}
          <div className="absolute inset-0 opacity-20">
            <div className="w-full h-full bg-gradient-to-br from-blue-200 via-green-100 to-yellow-100">
              {/* Grid lines to simulate map */}
              <svg className="w-full h-full">
                <defs>
                  <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
          </div>

          {/* Property Markers */}
          <AnimatePresence>
            {markers.map((marker, index) => (
              <motion.div
                key={marker.id}
                className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 z-20"
                style={{
                  left: `${marker.x}%`,
                  top: `${marker.y}%`,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.2, zIndex: 30 }}
                onClick={() => handleMarkerClick(marker.property)}
              >
                {/* Marker */}
                <motion.div
                  className={`relative ${
                    selectedProperty?.id === marker.property.id
                      ? 'text-primary'
                      : 'text-secondary'
                  }`}
                  whileHover={{ y: -2 }}
                >
                  <MapPin className="w-8 h-8 drop-shadow-lg" fill="currentColor" />
                  
                  {/* Price Badge */}
                  <motion.div
                    className="absolute -top-2 -right-2 bg-background/90 backdrop-blur-sm border border-border rounded-full px-2 py-1 text-xs font-medium shadow-lg"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    ₦{getPropertyPrice(marker.property).toLocaleString()}
                  </motion.div>
                  
                  {/* Pulse Effect */}
                  <motion.div
                    className="absolute top-1/2 left-1/2 w-8 h-8 -mt-4 -ml-4 rounded-full bg-primary/20"
                    animate={{
                      scale: [1, 2, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: index * 0.2,
                    }}
                  />
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Map Controls */}
          <div className="absolute top-4 right-4 flex flex-col space-y-2 z-30">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(zoom + 1, 18))}
              className="bg-background/80 backdrop-blur-sm"
            >
              +
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(zoom - 1, 1))}
              className="bg-background/80 backdrop-blur-sm"
            >
              -
            </Button>
          </div>

          {/* Legend */}
          <motion.div
            className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm border border-border rounded-lg p-3 z-30"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-primary" fill="currentColor" />
                <span>Available Properties</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-gradient-to-r from-blue-500 to-green-500"></div>
                <span>Price Range</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Property Details Sidebar */}
      <AnimatePresence>
        {selectedProperty && (
          <motion.div
            className="absolute top-20 right-4 bottom-4 w-96 bg-background/95 backdrop-blur-lg border border-border rounded-xl shadow-2xl z-40 overflow-hidden"
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold">Property Details</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProperty(null)}
                >
                  ×
                </Button>
              </div>
              
              {/* Property Card */}
              <div className="flex-1 p-4 overflow-y-auto">
                <PropertyCard
                  property={selectedProperty}
                  onSelect={() => onPropertySelect(selectedProperty)}
                  currentUser={currentUser}
                />
                
                <div className="mt-4 space-y-3">
                  <Button
                    className="w-full"
                    onClick={() => onPropertySelect(selectedProperty)}
                  >
                    View Full Details
                  </Button>
                  
                  <div className="text-sm text-muted-foreground space-y-2">
                    <div className="flex justify-between">
                      <span>Distance from center:</span>
                      <span>{Math.floor(Math.random() * 5 + 1)} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Travel time:</span>
                      <span>{Math.floor(Math.random() * 15 + 5)} mins</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cluster Info */}
      <motion.div
        className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm border border-border rounded-lg p-3 z-30"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2 }}
      >
        <div className="text-sm space-y-1">
          <div className="font-medium">Map Statistics</div>
          <div className="text-muted-foreground">
            {properties.length} properties displayed
          </div>
          <div className="text-muted-foreground">
            Zoom level: {zoom}
          </div>
        </div>
      </motion.div>
    </div>
  );
}