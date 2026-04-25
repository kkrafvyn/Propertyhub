/**
 * PropertyHub Mobile - Entry Point
 * 
 * This is the main entry point of the mobile application.
 * It handles the initial app state and routing logic:
 * - Show splash screen while loading
 * - Check authentication state
 * - Route to appropriate screen (auth or main app)
 * - Handle deep linking and notifications
 */

import { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';

// Providers and Hooks
import { useAuth } from '../src/providers/AuthProvider';
import { useNotifications } from '../src/providers/NotificationProvider';
import { useOffline } from '../src/providers/OfflineProvider';

// Utils
import { checkAppVersion } from '../src/utils/initialization';

const { width, height } = Dimensions.get('window');

// Loading states
type LoadingState = 'initial' | 'checking-auth' | 'checking-version' | 'ready' | 'error';

export default function IndexScreen() {
  const [loadingState, setLoadingState] = useState<LoadingState>('initial');
  const [error, setError] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { requestPermissions } = useNotifications();
  const { isOnline } = useOffline();

  useEffect(() => {
    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    initializeApp();
  }, []);

  useEffect(() => {
    // Handle authentication state changes
    if (!authLoading) {
      if (isAuthenticated && user) {
        // User is authenticated, navigate to main app
        setTimeout(() => {
          router.replace('/(tabs)');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, 1500);
      } else {
        // User not authenticated, show auth options
        setLoadingState('ready');
      }
    }
  }, [isAuthenticated, authLoading, user, router]);

  const initializeApp = async () => {
    try {
      setLoadingState('checking-version');
      
      // Check app version and compatibility
      await checkAppVersion();
      
      setLoadingState('checking-auth');
      
      // Request notification permissions
      await requestPermissions();
      
      console.log('🚀 App initialization complete');
      
      if (!authLoading && !isAuthenticated) {
        setLoadingState('ready');
      }
      
    } catch (err) {
      console.error('❌ Error during app initialization:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setLoadingState('error');
    }
  };

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(auth)');
  };

  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);
    setLoadingState('initial');
    initializeApp();
  };

  const renderLoadingState = () => {
    switch (loadingState) {
      case 'initial':
      case 'checking-version':
      case 'checking-auth':
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>
              {loadingState === 'checking-version' && 'Checking for updates...'}
              {loadingState === 'checking-auth' && 'Verifying credentials...'}
              {loadingState === 'initial' && 'Initializing PropertyHub...'}
            </Text>
          </View>
        );

      case 'error':
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <Button 
              mode="contained" 
              onPress={handleRetry}
              style={styles.retryButton}
            >
              Try Again
            </Button>
            {!isOnline && (
              <Text style={styles.offlineText}>
                📵 You appear to be offline. Please check your connection.
              </Text>
            )}
          </View>
        );

      case 'ready':
        return (
          <Animated.View 
            style={[
              styles.welcomeContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.logoContainer}>
              {/* You can replace this with a Lottie animation or your logo */}
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>🏠</Text>
              </View>
            </View>
            
            <View style={styles.textContainer}>
              <Text style={styles.welcomeTitle}>Welcome to PropertyHub</Text>
              <Text style={styles.welcomeSubtitle}>
                Find your perfect property with our advanced search, real-time chat, and expert guidance.
              </Text>
            </View>

            <View style={styles.featuresContainer}>
              <View style={styles.feature}>
                <Text style={styles.featureIcon}>🔍</Text>
                <Text style={styles.featureText}>Smart Search</Text>
              </View>
              <View style={styles.feature}>
                <Text style={styles.featureIcon}>💬</Text>
                <Text style={styles.featureText}>Live Chat</Text>
              </View>
              <View style={styles.feature}>
                <Text style={styles.featureIcon}>🗺️</Text>
                <Text style={styles.featureText}>Map View</Text>
              </View>
              <View style={styles.feature}>
                <Text style={styles.featureIcon}>📊</Text>
                <Text style={styles.featureText}>Analytics</Text>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={handleGetStarted}
                style={styles.primaryButton}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Get Started
              </Button>
            </View>

            {!isOnline && (
              <View style={styles.offlineNotice}>
                <Text style={styles.offlineNoticeText}>
                  📵 Limited functionality - you're currently offline
                </Text>
              </View>
            )}
          </Animated.View>
        );

      default:
        return null;
    }
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <StatusBar style="light" />
      {renderLoadingState()}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 20,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    gap: 20,
    maxWidth: width - 40,
  },
  errorTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorMessage: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
  },
  retryButton: {
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  offlineText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 10,
  },
  welcomeContainer: {
    alignItems: 'center',
    gap: 30,
    maxWidth: width - 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoText: {
    fontSize: 48,
  },
  textContainer: {
    alignItems: 'center',
    gap: 12,
  },
  welcomeTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  welcomeSubtitle: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 26,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
  },
  feature: {
    alignItems: 'center',
    gap: 8,
    minWidth: (width - 120) / 2,
  },
  featureIcon: {
    fontSize: 32,
  },
  featureText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 30,
  },
  primaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
  },
  buttonContent: {
    height: 50,
  },
  buttonLabel: {
    color: '#667eea',
    fontSize: 18,
    fontWeight: 'bold',
  },
  offlineNotice: {
    marginTop: 20,
    padding: 12,
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
  },
  offlineNoticeText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
});