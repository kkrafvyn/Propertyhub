/**
 * PropertyHub Mobile - Properties Home Tab
 * 
 * This is the main properties listing screen that serves as the home tab.
 * It displays featured properties, recent listings, and provides quick access
 * to different property categories and filters.
 * 
 * Features:
 * - Horizontal featured properties carousel
 * - Vertical list of all properties
 * - Quick filter chips
 * - Pull-to-refresh functionality
 * - Search integration
 * - Location-based sorting
 * - Infinite scroll pagination
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import {
  Text,
  SearchBar,
  Chip,
  FAB,
  Portal,
  Modal,
  IconButton,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

// Components
import { PropertyCard } from '../../src/components/PropertyCard';
import { ChatPreviewCard } from '../../src/components/ChatPreviewCard';

// Providers and Hooks
import { useAuth } from '../../src/providers/AuthProvider';
import { useOffline } from '../../src/providers/OfflineProvider';
import { useWebSocket } from '../../src/providers/WebSocketProvider';

// Services
import { propertyService } from '../../src/services/PropertyService';
import { locationService } from '../../src/services/LocationService';

// Types
import type { Property, PropertyFilter, Location as LocationType } from '../../src/types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

// Property categories for quick filters
const PROPERTY_CATEGORIES = [
  { key: 'all', label: 'All', icon: 'home' },
  { key: 'house', label: 'Houses', icon: 'home-variant' },
  { key: 'apartment', label: 'Apartments', icon: 'office-building' },
  { key: 'land', label: 'Land', icon: 'map' },
  { key: 'commercial', label: 'Commercial', icon: 'store' },
];

// Price ranges for quick filters
const PRICE_RANGES = [
  { key: 'all', label: 'Any Price', min: 0, max: Infinity },
  { key: 'budget', label: 'Under ₦50M', min: 0, max: 50000000 },
  { key: 'mid', label: '₦50M - ₦100M', min: 50000000, max: 100000000 },
  { key: 'luxury', label: 'Above ₦100M', min: 100000000, max: Infinity },
];

export default function PropertiesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const { connectionStatus } = useWebSocket();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [userLocation, setUserLocation] = useState<LocationType | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Get current filters
  const filters = useMemo<PropertyFilter>(() => ({
    search: searchQuery,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    minPrice: PRICE_RANGES.find(r => r.key === selectedPriceRange)?.min,
    maxPrice: PRICE_RANGES.find(r => r.key === selectedPriceRange)?.max,
    location: userLocation,
    userId: user?.id,
  }), [searchQuery, selectedCategory, selectedPriceRange, userLocation, user?.id]);

  // Fetch featured properties
  const {
    data: featuredProperties,
    isLoading: featuredLoading,
    error: featuredError,
    refetch: refetchFeatured,
  } = useQuery({
    queryKey: ['properties', 'featured', user?.id],
    queryFn: () => propertyService.getFeaturedProperties(user?.id),
    enabled: !!user && isOnline,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Fetch properties with infinite scroll
  const {
    data: propertiesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: propertiesLoading,
    error: propertiesError,
    refetch: refetchProperties,
  } = useInfiniteQuery({
    queryKey: ['properties', 'list', filters],
    queryFn: ({ pageParam = 0 }) => 
      propertyService.getProperties({
        ...filters,
        page: pageParam,
        limit: 10,
      }),
    getNextPageParam: (lastPage, pages) => 
      lastPage.hasMore ? pages.length : undefined,
    enabled: !!user && isOnline,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get user location on mount
  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        const locationData = await locationService.reverseGeocode({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        setUserLocation(locationData);
        console.log('📍 Location obtained:', locationData.city);
      }
    } catch (error) {
      console.log('⚠️ Location permission denied or error:', error);
    }
  };

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      await Promise.all([
        refetchFeatured(),
        refetchProperties(),
      ]);
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchFeatured, refetchProperties]);

  // Handle property selection
  const handlePropertySelect = (property: Property) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/property/${property.id}`);
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Handle price range selection
  const handlePriceRangeSelect = (range: string) => {
    setSelectedPriceRange(range);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Handle map view
  const handleMapView = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/map');
  };

  // Load more properties
  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Flatten properties from all pages
  const allProperties = useMemo(() => {
    return propertiesData?.pages?.flatMap(page => page.properties) || [];
  }, [propertiesData]);

  // Handle offline state
  if (!isOnline) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.offlineText}>📵 You're currently offline</Text>
        <Text style={styles.offlineSubtext}>
          Please check your internet connection to browse properties
        </Text>
      </View>
    );
  }

  // Handle loading state
  if (featuredLoading || propertiesLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text>🏠 Loading properties...</Text>
      </View>
    );
  }

  // Handle error state
  if (featuredError || propertiesError) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>❌ Error loading properties</Text>
        <Text style={styles.errorSubtext}>
          {featuredError?.message || propertiesError?.message}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>
              Good {new Date().getHours() < 12 ? 'morning' : 
                    new Date().getHours() < 18 ? 'afternoon' : 'evening'}
            </Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            {userLocation && (
              <Text style={styles.locationText}>
                📍 {userLocation.city}, {userLocation.state}
              </Text>
            )}
          </View>
          <IconButton
            icon="map"
            size={24}
            onPress={handleMapView}
            style={styles.mapButton}
          />
        </View>

        {/* Search Bar */}
        <SearchBar
          placeholder="Search properties..."
          value={searchQuery}
          onChangeText={handleSearch}
          style={styles.searchBar}
          icon="magnify"
          clearIcon="close"
        />

        {/* Category Filters */}
        <FlatList
          data={PROPERTY_CATEGORIES}
          renderItem={({ item }) => (
            <Chip
              selected={selectedCategory === item.key}
              onPress={() => handleCategorySelect(item.key)}
              style={styles.categoryChip}
              icon={item.icon}
            >
              {item.label}
            </Chip>
          )}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        />
      </View>

      {/* Main Content */}
      <FlatList
        data={allProperties}
        renderItem={({ item }) => (
          <PropertyCard
            property={item}
            onPress={() => handlePropertySelect(item)}
            style={styles.propertyCard}
          />
        )}
        keyExtractor={(item) => item.id}
        numColumns={1}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={() => (
          featuredProperties && featuredProperties.length > 0 ? (
            <View style={styles.featuredSection}>
              <Text style={styles.sectionTitle}>Featured Properties</Text>
              <FlatList
                data={featuredProperties}
                renderItem={({ item }) => (
                  <PropertyCard
                    property={item}
                    onPress={() => handlePropertySelect(item)}
                    style={styles.featuredCard}
                    variant="featured"
                  />
                )}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredContainer}
              />
              <Text style={styles.sectionTitle}>All Properties</Text>
            </View>
          ) : null
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>🏠 No properties found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your filters or search terms
            </Text>
          </View>
        )}
        ListFooterComponent={() => (
          isFetchingNextPage ? (
            <View style={styles.loadingMore}>
              <Text>Loading more properties...</Text>
            </View>
          ) : null
        )}
        contentContainerStyle={styles.listContent}
      />

      {/* Floating Action Button */}
      <Portal>
        <FAB
          icon="filter"
          onPress={() => setShowFilters(true)}
          style={styles.fab}
        />
      </Portal>

      {/* Filters Modal */}
      <Portal>
        <Modal
          visible={showFilters}
          onDismiss={() => setShowFilters(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text style={styles.modalTitle}>Filter Properties</Text>
          
          <Text style={styles.filterSectionTitle}>Price Range</Text>
          {PRICE_RANGES.map((range) => (
            <Chip
              key={range.key}
              selected={selectedPriceRange === range.key}
              onPress={() => handlePriceRangeSelect(range.key)}
              style={styles.priceChip}
            >
              {range.label}
            </Chip>
          ))}
        </Modal>
      </Portal>

      {/* Connection Status */}
      {connectionStatus !== 'connected' && (
        <View style={styles.connectionStatus}>
          <Text style={styles.connectionText}>
            {connectionStatus === 'connecting' && '🔄 Connecting...'}
            {connectionStatus === 'disconnected' && '📵 Disconnected'}
            {connectionStatus === 'error' && '⚠️ Connection error'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 14,
    color: '#666',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  locationText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  mapButton: {
    backgroundColor: '#f0f0f0',
  },
  searchBar: {
    marginBottom: 16,
    backgroundColor: '#f8f8f8',
  },
  categoriesContainer: {
    paddingHorizontal: 0,
  },
  categoryChip: {
    marginRight: 8,
  },
  featuredSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginBottom: 12,
    color: '#333',
  },
  featuredContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  featuredCard: {
    width: CARD_WIDTH * 0.85,
    marginRight: 12,
  },
  listContent: {
    paddingBottom: 100,
  },
  propertyCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  loadingMore: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    backgroundColor: '#007AFF',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  priceChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  connectionStatus: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  connectionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  offlineText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  offlineSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});