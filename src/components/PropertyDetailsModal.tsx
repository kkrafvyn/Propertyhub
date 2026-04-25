/**
 * Property Details Modal Component
 * 
 * Provides detailed property information in a modal interface
 */

import React from 'react';
import { motion } from 'motion/react';
import { X, MapPin, Star, Heart, Share2 } from 'lucide-react';
import { Property } from '../types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface PropertyDetailsModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
}

const PropertyDetailsModal: React.FC<PropertyDetailsModalProps> = ({
  property,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] overflow-auto bg-card rounded-lg shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">{property.title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-6">
          <div className="aspect-video mb-6 rounded-lg overflow-hidden">
            <img
              src={(property as any).images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2'}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{typeof property.location === 'string' ? property.location : property.location.city}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{(property as any).rating || 4.5}</span>
              </div>
            </div>
            
            <p className="text-muted-foreground">{property.description}</p>
            
            <div className="flex flex-wrap gap-2">
              {(property as any).amenities?.map((amenity: string, index: number) => (
                <Badge key={index} variant="secondary">{amenity}</Badge>
              ))}
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t">
              <div>
                <span className="text-3xl font-bold">
                  ₵{((property as any).price || property.pricing?.amount)?.toLocaleString()}
                </span>
                <span className="text-muted-foreground ml-2">/month</span>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" size="sm">
                  <Heart className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button>Contact Host</Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PropertyDetailsModal;