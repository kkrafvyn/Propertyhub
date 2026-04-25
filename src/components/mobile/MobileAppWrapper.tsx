import React from 'react';
import { Property, User } from '../../types';
import { PropertyCard } from '../PropertyCard';

interface MobilePropertyListProps {
  properties: Property[];
  onPropertySelect: (property: Property) => void;
  onRefresh: () => void;
  loading: boolean;
  currentUser: User | null;
}

export function MobilePropertyList({ 
  properties, 
  onPropertySelect, 
  onRefresh, 
  loading, 
  currentUser 
}: MobilePropertyListProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold">Properties</h1>
        
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading properties...</p>
          </div>
        )}
        
        <div className="space-y-4">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onSelect={onPropertySelect}
            />
          ))}
        </div>
        
        {properties.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No properties available</p>
          </div>
        )}
      </div>
    </div>
  );
}