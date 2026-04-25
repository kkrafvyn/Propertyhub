/**
 * Performance Optimizer Component
 * 
 * Provides comprehensive performance optimizations including:
 * - Virtual scrolling for large lists
 * - Image lazy loading
 * - Component code splitting
 * - Memory management
 * - Performance monitoring
 * 
 * @author PropertyHub Team
 * @version 1.0.0
 */

import React, { 
  memo, 
  useMemo, 
  useCallback, 
  lazy, 
  Suspense,
  useEffect,
  useRef,
  useState
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../../hooks/useAppContext';
import { Property } from '../../types';
import { LoadingSpinner } from '../LoadingSpinner';
import { PropertyComparison } from '../PropertyComparison';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';

// Lazy load heavy components
const PropertyDetailsModal = lazy(() => import('../PropertyDetailsModal'));
const VirtualizedPropertyGrid = lazy(() =>
  import('../VirtualizedPropertyGrid').then((module) => ({ default: module.VirtualizedPropertyGrid as React.ComponentType<any> }))
);

// Performance monitoring hook
const usePerformanceMonitor = () => {
  const { trackPerformance } = useAppContext();
  const renderStartRef = useRef<number | null>(null);
  
  useEffect(() => {
    renderStartRef.current = performance.now();
    
    return () => {
      if (renderStartRef.current) {
        const renderTime = performance.now() - renderStartRef.current;
        trackPerformance('component-render', renderTime);
      }
    };
  });
  
  const measureAction = useCallback((actionName: string, action: () => void) => {
    const startTime = performance.now();
    action();
    const endTime = performance.now();
    trackPerformance(actionName, endTime - startTime);
  }, [trackPerformance]);
  
  return { measureAction };
};

// Optimized Image Component with lazy loading and WebP support
const OptimizedImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}> = memo(({ src, alt, className, width, height, priority = false }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Generate WebP version if possible
  const webpSrc = useMemo(() => {
    if (src.includes('unsplash.com')) {
      return `${src}&fm=webp&q=80`;
    }
    return src;
  }, [src]);
  
  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) {
      setIsLoaded(true);
      return;
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoaded) {
            setIsLoaded(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, [priority, isLoaded]);
  
  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {!isLoaded && !hasError && (
        <Skeleton className="w-full h-full absolute inset-0" />
      )}
      
      {isLoaded && (
        <picture>
          <source srcSet={webpSrc} type="image/webp" />
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            className={`transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onError={() => setHasError(true)}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
          />
        </picture>
      )}
      
      {hasError && (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <span className="text-muted-foreground">Failed to load image</span>
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// Virtualized list item for property cards
const VirtualPropertyCard: React.FC<{
  property: Property;
  index: number;
  onSelect: (property: Property) => void;
  style?: React.CSSProperties;
}> = memo(({ property, index, onSelect, style }) => {
  const { toggleFavorite, favoriteProperties } = useAppContext();
  const { measureAction } = usePerformanceMonitor();
  
  const isFavorite = favoriteProperties.includes(property.id);
  
  const handleSelect = useCallback(() => {
    measureAction('property-select', () => onSelect(property));
  }, [property, onSelect, measureAction]);
  
  const handleFavoriteToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    measureAction('favorite-toggle', () => toggleFavorite(property.id));
  }, [property.id, toggleFavorite, measureAction]);
  
  return (
    <motion.div
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-2"
    >
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-200"
        onClick={handleSelect}
      >
        <div className="relative aspect-video overflow-hidden rounded-t-lg">
          <OptimizedImage
            src={(property as any).images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3'}
            alt={property.title}
            className="w-full h-full object-cover"
            priority={index < 4} // Prioritize first 4 images
          />
          
          {/* Property badges */}
          <div className="absolute top-2 left-2 flex gap-2">
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
            onClick={handleFavoriteToggle}
            className="absolute top-2 right-2 p-2 bg-background/80 rounded-full hover:bg-background transition-colors"
          >
            <motion.div
              animate={{ scale: isFavorite ? 1.2 : 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <svg
                className={`w-4 h-4 ${isFavorite ? 'text-red-500 fill-current' : 'text-muted-foreground'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </motion.div>
          </button>
        </div>
        
        <CardContent className="p-4">
          <div className="space-y-2">
            <h3 className="font-semibold line-clamp-1">{property.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {typeof property.location === 'string' ? property.location : property.location.city}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {(property as any).bedrooms && (
                  <span className="text-xs">{(property as any).bedrooms} beds</span>
                )}
                {(property as any).bathrooms && (
                  <span className="text-xs">{(property as any).bathrooms} baths</span>
                )}
                <span className="text-xs">{property.features?.area || (property as any).area}m²</span>
              </div>
              
              <div className="text-right">
                <span className="font-bold">
                  ₵{((property as any).price || property.pricing?.amount)?.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground ml-1">/mo</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

VirtualPropertyCard.displayName = 'VirtualPropertyCard';

// Main Performance Optimizer Component
export const PerformanceOptimizer: React.FC<{
  properties: Property[];
  onPropertySelect: (property: Property) => void;
  viewMode?: 'grid' | 'list';
}> = memo(({ properties, onPropertySelect, viewMode = 'grid' }) => {
  const { measureAction } = usePerformanceMonitor();
  const [showComparison, setShowComparison] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<Property[]>([]);
  
  // Memoize filtered and sorted properties
  const optimizedProperties = useMemo(() => {
    return properties.slice(0, 50); // Limit for performance
  }, [properties]);
  
  const handlePropertySelect = useCallback((property: Property) => {
    measureAction('property-details-open', () => onPropertySelect(property));
  }, [onPropertySelect, measureAction]);
  
  const handleComparisonToggle = useCallback(() => {
    setShowComparison(prev => !prev);
  }, []);
  
  // Grid layout with virtualization for large datasets
  if (properties.length > 20) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <VirtualizedPropertyGrid
          properties={optimizedProperties}
          onPropertySelect={handlePropertySelect}
        />
      </Suspense>
    );
  }
  
  // Standard grid for smaller datasets
  return (
    <div className="space-y-6">
      {/* Performance metrics display (dev mode only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-muted-foreground">
          Showing {properties.length} properties • Render optimized
        </div>
      )}
      
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
        {optimizedProperties.map((property, index) => (
          <VirtualPropertyCard
            key={property.id}
            property={property}
            index={index}
            onSelect={handlePropertySelect}
          />
        ))}
      </motion.div>
      
      {/* Lazy-loaded comparison modal */}
      <AnimatePresence>
        {showComparison && (
          <Suspense fallback={<LoadingSpinner />}>
            <PropertyComparison
              properties={selectedForComparison}
              onClose={handleComparisonToggle}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
});

PerformanceOptimizer.displayName = 'PerformanceOptimizer';

// Memory cleanup hook
export const useMemoryCleanup = () => {
  const cleanupRef = useRef<Set<() => void>>(new Set());
  
  const registerCleanup = useCallback((cleanup: () => void) => {
    cleanupRef.current.add(cleanup);
  }, []);
  
  useEffect(() => {
    return () => {
      cleanupRef.current.forEach(cleanup => cleanup());
      cleanupRef.current.clear();
    };
  }, []);
  
  return { registerCleanup };
};

// Simple performance monitoring component
export const PerformanceMonitor: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { trackPerformance } = useAppContext();
  
  useEffect(() => {
    // Simple performance tracking
    if (typeof window !== 'undefined' && 'performance' in window) {
      try {
        const startTime = performance.now();
        
        // Track initial load time
        setTimeout(() => {
          const loadTime = performance.now() - startTime;
          trackPerformance('app-mount', loadTime);
        }, 0);
        
        // Monitor Core Web Vitals if available
        if ('PerformanceObserver' in window) {
          try {
            const observer = new PerformanceObserver((list) => {
              list.getEntries().forEach((entry) => {
                trackPerformance(entry.name, entry.startTime);
              });
            });
            
            observer.observe({ entryTypes: ['measure', 'navigation'] });
            
            return () => {
              try {
                observer.disconnect();
              } catch (error) {
                // Ignore cleanup errors
              }
            };
          } catch (error) {
            console.warn('Performance observer setup failed:', error);
          }
        }
      } catch (error) {
        console.warn('Performance tracking setup failed:', error);
      }
    }
  }, [trackPerformance]);
  
  return <>{children}</>;
};

export default PerformanceOptimizer;
