/**
 * Safe Property Display Component
 * 
 * Provides a fallback property display when advanced components fail
 */

import React from 'react';
import { Property } from '../types';

// Direct imports with fallback components
import { motion } from 'motion/react';
import { MapPin, Star, Heart, ChevronRight } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface SafePropertyDisplayProps {
  properties: Property[];
  onPropertySelect: (property: Property) => void;
  viewMode?: 'grid' | 'list';
}

export const SafePropertyDisplay: React.FC<SafePropertyDisplayProps> = ({
  properties,
  onPropertySelect,
  viewMode = 'grid'
}) => {
  if (properties.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">No properties found</div>
      </div>
    );
  }

  return (
    <motion.div 
      className={`grid gap-6 ${
        viewMode === 'grid' 
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
          : 'grid-cols-1'
      }`}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1
          }
        }
      }}
    >
      {properties.map((property, index) => (
        <motion.div
          key={property.id}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
          }}
          whileHover={{ y: -5 }}
          onClick={() => onPropertySelect(property)}
          className="cursor-pointer"
        >
          <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
            {/* Property Image */}
            <div className="relative aspect-video overflow-hidden">
              <img
                src={(property as any).images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3'}
                alt={property.title}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                loading={index < 6 ? 'eager' : 'lazy'}
              />
              
              {/* Property badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                {(property as any).featured && (
                  <Badge className="bg-primary text-primary-foreground">
                    Featured
                  </Badge>
                )}
                <Badge variant="secondary" className="capitalize">
                  {property.type}
                </Badge>
              </div>
              
              {/* Favorite button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle favorite toggle
                }}
                className="absolute top-4 right-4 p-2 bg-background/80 rounded-full hover:bg-background transition-colors"
              >
                <Heart className="h-4 w-4" />
              </button>
            </div>

            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-lg line-clamp-1">{property.title}</h3>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{(property as any).rating || 4.5}</span>
                  </div>
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span className="line-clamp-1">
                    {typeof property.location === 'string' ? property.location : property.location.city}
                  </span>
                </div>
                
                {/* Property details */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4 text-muted-foreground">
                    {(property as any).bedrooms && (
                      <span>{(property as any).bedrooms} beds</span>
                    )}
                    {(property as any).bathrooms && (
                      <span>{(property as any).bathrooms} baths</span>
                    )}
                    <span>{property.features?.area || (property as any).area}m²</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="text-2xl font-bold">
                      ₵{((property as any).price || property.pricing?.amount)?.toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">/month</span>
                  </div>
                  
                  <Button size="sm" className="shadow-lg">
                    View Details
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default SafePropertyDisplay;