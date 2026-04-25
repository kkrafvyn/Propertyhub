/**
 * Simple Performance Optimizer
 * 
 * A simplified version that handles property display safely
 */

import React from 'react';
import { Property } from '../types';
import { SafePropertyDisplay } from './SafePropertyDisplay';

interface SimplePerformanceOptimizerProps {
  properties: Property[];
  onPropertySelect: (property: Property) => void;
  viewMode?: 'grid' | 'list';
}

export const SimplePerformanceOptimizer: React.FC<SimplePerformanceOptimizerProps> = ({
  properties,
  onPropertySelect,
  viewMode = 'grid'
}) => {
  // Simple property display without complex optimizations
  return (
    <SafePropertyDisplay 
      properties={properties}
      onPropertySelect={onPropertySelect}
      viewMode={viewMode}
    />
  );
};

export default SimplePerformanceOptimizer;