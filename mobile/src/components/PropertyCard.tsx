/**
 * PropertyHub Mobile - Property Card Component
 * 
 * A reusable card component for displaying property information
 * in lists, grids, and carousels. Supports different variants
 * and interactive features.
 * 
 * Features:
 * - Multiple display variants (standard, featured, compact)
 * - Image carousel with lazy loading
 * - Favorite toggle with animation
 * - Price formatting and currency support
 * - Touch-friendly interactions
 * - Accessibility features
 */

import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  ViewStyle,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  IconButton,
  Surface,
  useTheme,
} from 'react-native-paper';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Types
import type { Property } from '../types';

// Utils
import { formatPrice, formatArea, formatDistance } from '../utils/formatting';
import { useAuth } from '../providers/AuthProvider';

const { width: screenWidth } = Dimensions.get('window');

interface PropertyCardProps {
  property: Property;
  onPress: () => void;
  onFavoritePress?: (property: Property, isFavorite: boolean) => void;
  variant?: 'standard' | 'featured' | 'compact';
  showDistance?: boolean;
  userLocation?: { latitude: number; longitude: number };
  style?: ViewStyle;
  width?: number;
}

export function PropertyCard({
  property,
  onPress,
  onFavoritePress,
  variant = 'standard',
  showDistance = false,
  userLocation,
  style,
  width,
}: PropertyCardProps) {
  const theme = useTheme();
  const { user } = useAuth();
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false); // TODO: Get from user favorites
  const [imageLoadError, setImageLoadError] = useState<Set<number>>(new Set());
  
  const scrollViewRef = useRef<ScrollView>(null);

  // Calculate card dimensions based on variant and screen size
  const cardWidth = width || (
    variant === 'featured' ? screenWidth * 0.85 :
    variant === 'compact' ? screenWidth * 0.45 :
    screenWidth - 32
  );

  const imageHeight = variant === 'compact' ? cardWidth * 0.75 : cardWidth * 0.6;

  // Handle favorite toggle
  const handleFavoritePress = () => {
    if (!user) return;
    
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);
    
    // Haptic feedback
    Haptics.impactAsync(
      newFavoriteState 
        ? Haptics.ImpactFeedbackStyle.Medium 
        : Haptics.ImpactFeedbackStyle.Light
    );

    onFavoritePress?.(property, newFavoriteState);
  };

  // Handle card press
  const handleCardPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  // Handle image scroll
  const handleImageScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / cardWidth);
    setCurrentImageIndex(Math.max(0, Math.min(index, property.images.length - 1)));
  };

  // Handle image load error
  const handleImageError = (index: number) => {
    setImageLoadError(prev => new Set(prev.add(index)));
  };

  // Calculate distance if user location is provided
  const distance = userLocation && property.location ? 
    formatDistance(
      userLocation.latitude,
      userLocation.longitude,
      property.location.latitude,
      property.location.longitude
    ) : null;

  // Render image carousel
  const renderImageCarousel = () => (
    <View style={[styles.imageContainer, { height: imageHeight }]}>
      {property.images.length > 0 ? (
        <>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleImageScroll}
            scrollEventThrottle={16}
            style={styles.imageScroll}
          >
            {property.images.map((image, index) => (
              <View key={index} style={[styles.imageWrapper, { width: cardWidth }]}>
                {!imageLoadError.has(index) ? (
                  <Image
                    source={{ uri: image }}
                    style={styles.image}
                    contentFit="cover"
                    transition={300}
                    onError={() => handleImageError(index)}
                    placeholder="https://via.placeholder.com/400x300/e0e0e0/999999?text=Loading..."
                  />
                ) : (
                  <View style={[styles.image, styles.imagePlaceholder]}>
                    <Ionicons 
                      name="image-outline" 
                      size={40} 
                      color={theme.colors.onSurfaceVariant} 
                    />
                    <Text style={styles.imagePlaceholderText}>Image unavailable</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Image indicators */}
          {property.images.length > 1 && (
            <View style={styles.imageIndicators}>
              {property.images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.imageIndicator,
                    {
                      backgroundColor: index === currentImageIndex 
                        ? 'rgba(255, 255, 255, 0.9)'
                        : 'rgba(255, 255, 255, 0.4)',
                    }
                  ]}
                />
              ))}
            </View>
          )}

          {/* Image overlay gradient */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)']}
            style={styles.imageOverlay}
          />
        </>
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons 
            name="home-outline" 
            size={40} 
            color={theme.colors.onSurfaceVariant} 
          />
          <Text style={styles.imagePlaceholderText}>No image available</Text>
        </View>
      )}

      {/* Favorite button */}
      {user && onFavoritePress && (
        <IconButton
          icon={isFavorite ? 'heart' : 'heart-outline'}
          iconColor={isFavorite ? theme.colors.error : 'white'}
          size={24}
          onPress={handleFavoritePress}
          style={styles.favoriteButton}
        />
      )}

      {/* Featured badge */}
      {property.isFeatured && (
        <Chip
          icon="star"
          style={styles.featuredBadge}
          textStyle={styles.featuredBadgeText}
          compact
        >
          Featured
        </Chip>
      )}

      {/* Property type badge */}
      <Chip
        style={styles.typeBadge}
        textStyle={styles.typeBadgeText}
        compact
      >
        {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
      </Chip>
    </View>
  );

  // Render property details
  const renderPropertyDetails = () => (
    <View style={styles.detailsContainer}>
      {/* Price and listing type */}
      <View style={styles.priceContainer}>
        <Text style={styles.price}>
          {formatPrice(property.price, property.currency)}
        </Text>
        <Text style={styles.listingType}>
          for {property.listingType}
        </Text>
      </View>

      {/* Title */}
      <Text 
        style={styles.title}
        numberOfLines={variant === 'compact' ? 1 : 2}
      >
        {property.title}
      </Text>

      {/* Location and distance */}
      <View style={styles.locationContainer}>
        <Ionicons 
          name="location-outline" 
          size={16} 
          color={theme.colors.onSurfaceVariant} 
        />
        <Text 
          style={styles.location}
          numberOfLines={1}
        >
          {property.location.city}, {property.location.state}
        </Text>
        {showDistance && distance && (
          <Text style={styles.distance}>• {distance}</Text>
        )}
      </View>

      {/* Property specs (only for non-compact variants) */}
      {variant !== 'compact' && (
        <View style={styles.specsContainer}>
          {property.bedrooms && (
            <View style={styles.spec}>
              <Ionicons 
                name="bed-outline" 
                size={16} 
                color={theme.colors.onSurfaceVariant} 
              />
              <Text style={styles.specText}>{property.bedrooms} bed</Text>
            </View>
          )}
          {property.bathrooms && (
            <View style={styles.spec}>
              <Ionicons 
                name="water-outline" 
                size={16} 
                color={theme.colors.onSurfaceVariant} 
              />
              <Text style={styles.specText}>{property.bathrooms} bath</Text>
            </View>
          )}
          <View style={styles.spec}>
            <Ionicons 
              name="resize-outline" 
              size={16} 
              color={theme.colors.onSurfaceVariant} 
            />
            <Text style={styles.specText}>
              {formatArea(property.area, property.areaUnit)}
            </Text>
          </View>
        </View>
      )}

      {/* Host info (only for featured variant) */}
      {variant === 'featured' && (
        <View style={styles.hostContainer}>
          <View style={styles.hostInfo}>
            <Text style={styles.hostName}>Hosted by {property.hostName}</Text>
            {property.hostRating && (
              <View style={styles.ratingContainer}>
                <Ionicons 
                  name="star" 
                  size={14} 
                  color="#FFD700" 
                />
                <Text style={styles.rating}>{property.hostRating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={handleCardPress}
      style={[
        styles.container,
        { width: cardWidth },
        style
      ]}
      android_ripple={{ 
        color: theme.colors.primary + '20',
        borderless: false 
      }}
    >
      <Surface
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
          }
        ]}
        elevation={variant === 'featured' ? 4 : 2}
      >
        {renderImageCarousel()}
        {renderPropertyDetails()}
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  imageScroll: {
    flex: 1,
  },
  imageWrapper: {
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  imageIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FFD700',
  },
  featuredBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  typeBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  typeBadgeText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '500',
  },
  detailsContainer: {
    padding: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  listingType: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    lineHeight: 22,
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  distance: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  specsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  spec: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specText: {
    fontSize: 14,
    color: '#666',
  },
  hostContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  hostInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hostName: {
    fontSize: 14,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});