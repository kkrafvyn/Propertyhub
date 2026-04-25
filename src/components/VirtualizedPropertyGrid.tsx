import React from 'react';
import { motion } from 'motion/react';
import type { Property } from '../types';
import { PropertyCard } from './PropertyCard';
import { Card, CardContent } from './ui/card';
import { Clock } from 'lucide-react';

interface VirtualizedPropertyGridProps {
  properties?: Property[];
  currentUser?: any;
  onPropertySelect?: (property: Property) => void;
}

export function VirtualizedPropertyGrid({
  properties = [],
  currentUser = null,
  onPropertySelect,
}: VirtualizedPropertyGridProps) {
  if (!properties.length) {
    return (
      <Card className="rounded-[32px] border border-dashed border-border bg-card">
        <CardContent className="px-6 py-12 text-center">
          <Clock className="mx-auto h-10 w-10 text-primary" />
          <h3 className="mt-4 text-xl font-semibold text-foreground">No homes available yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            This grid automatically stacks for smaller screens and keeps roomier columns as space opens up.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
    >
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          currentUser={currentUser}
          onSelect={(selectedProperty) => onPropertySelect?.(selectedProperty)}
          showQuickActions
        />
      ))}
    </motion.div>
  );
}

export default VirtualizedPropertyGrid;
