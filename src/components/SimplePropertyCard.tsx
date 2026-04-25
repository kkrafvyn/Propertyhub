/**
 * Simple Property Card Component
 * 
 * Simplified version to avoid circular dependencies and complex imports
 */

import React from 'react';
import type { Property, User } from '../types';

interface SimplePropertyCardProps {
  property: Property;
  onSelect: (property: Property) => void;
  currentUser?: User | null;
}

export function SimplePropertyCard({ property, onSelect, currentUser }: SimplePropertyCardProps): JSX.Element {
  return (
    <div 
      className="bg-card rounded-lg border hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
      onClick={() => onSelect(property)}
    >
      {/* Property Image */}
      <div className="aspect-video bg-muted relative">
        {property.images?.[0] && (
          <img
            src={property.images[0]}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        )}
        {property.media?.[0] && (
          <img
            src={property.media[0].url}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            property.status === 'available' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {property.status === 'available' ? 'Available' : property.status}
          </span>
        </div>
      </div>

      {/* Property Details */}
      <div className="p-4">
        {/* Title and Location */}
        <div className="mb-3">
          <h3 className="font-semibold text-lg line-clamp-2 mb-1">{property.title}</h3>
          <p className="text-sm text-muted-foreground flex items-center">
            <span className="mr-1">📍</span>
            {typeof property.location === 'string' ? property.location : property.location?.city || 'Unknown location'}
          </p>
        </div>

        {/* Property Features */}
        <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
          {(property.bedrooms || property.features?.bedrooms) && (
            <div className="flex items-center">
              <span className="mr-1">🛏️</span>
              <span>{property.bedrooms || property.features?.bedrooms}</span>
            </div>
          )}
          {(property.bathrooms || property.features?.bathrooms) && (
            <div className="flex items-center">
              <span className="mr-1">🚿</span>
              <span>{property.bathrooms || property.features?.bathrooms}</span>
            </div>
          )}
          {(property.area || property.features?.area) && (
            <div className="flex items-center">
              <span className="mr-1">📏</span>
              <span>{property.area || property.features?.area}m²</span>
            </div>
          )}
        </div>

        {/* Price and Type */}
        <div className="flex items-center justify-between">
          <div className="font-semibold text-lg">
            {property.pricing?.currency || property.currency || '₦'} {(property.pricing?.amount || property.price || 0).toLocaleString()}
          </div>
          <span className="px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs capitalize">
            {property.type}
          </span>
        </div>

        {/* Rating */}
        {property.rating && (
          <div className="flex items-center mt-2 text-sm">
            <span className="text-yellow-500 mr-1">⭐</span>
            <span>{property.rating}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default SimplePropertyCard;