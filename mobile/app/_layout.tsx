/**
 * PropertyHub Mobile - Root Layout
 * 
 * This is the root layout component that wraps the entire mobile application.
 * It sets up all necessary providers, navigation structure, and global configurations.
 * 
 * Features:
 * - Theme provider with system theme detection
 * - Authentication provider with secure storage
 * - WebSocket provider for real-time features
 * - Notification provider for push notifications
 * - Offline provider for offline functionality
 * - React Query for data fetching and caching
 * - Error boundary for crash prevention
 * - Safe area context for proper screen handling
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { PaperProvider } from 'react-native-paper';

// Providers
import { AuthProvider } from '../src/providers/AuthProvider';
import { WebSocketProvider } from '../src/providers/WebSocketProvider';
import { NotificationProvider } from '../src/providers/NotificationProvider';
import { OfflineProvider } from '../src/providers/OfflineProvider';

// Theme
import { paperTheme } from '../src/theme/paperTheme';

// Utils
import { initializeApp } from '../src/utils/initialization';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

export default function RootLayout() {
  useEffect(() => {
    async function initialize() {
      try {
        // Initialize the app (load fonts, check permissions, etc.)
        await initializeApp();
        
        console.log('🚀 PropertyHub Mobile initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing PropertyHub Mobile:', error);
      } finally {
        // Hide the splash screen once we're ready
        setTimeout(() => {
          SplashScreen.hideAsync();
        }, 1000);
      }
    }

    initialize();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PaperProvider theme={paperTheme}>
            <AuthProvider>
              <OfflineProvider>
                <NotificationProvider>
                  <WebSocketProvider>
                    <StatusBar style="auto" />
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        animation: 'slide_from_right',
                        gestureEnabled: true,
                      }}
                    >
                      <Stack.Screen 
                        name="index" 
                        options={{ 
                          title: 'PropertyHub',
                          gestureEnabled: false 
                        }} 
                      />
                      <Stack.Screen 
                        name="(auth)" 
                        options={{ 
                          title: 'Authentication',
                          presentation: 'modal',
                          gestureEnabled: false 
                        }} 
                      />
                      <Stack.Screen 
                        name="(tabs)" 
                        options={{ 
                          title: 'PropertyHub',
                          gestureEnabled: false 
                        }} 
                      />
                      <Stack.Screen
                        name="property/[id]"
                        options={{
                          title: 'Property Details',
                          presentation: 'card',
                          headerShown: true,
                          headerTitle: 'Property Details',
                        }}
                      />
                      <Stack.Screen
                        name="chat/[roomId]"
                        options={{
                          title: 'Chat',
                          presentation: 'card',
                          headerShown: true,
                          headerTitle: 'Chat',
                        }}
                      />
                      <Stack.Screen
                        name="profile/settings"
                        options={{
                          title: 'Settings',
                          presentation: 'modal',
                          headerShown: true,
                          headerTitle: 'Settings',
                        }}
                      />
                      <Stack.Screen
                        name="map"
                        options={{
                          title: 'Map View',
                          presentation: 'fullScreenModal',
                          headerShown: true,
                          headerTitle: 'Properties Map',
                        }}
                      />
                    </Stack>
                  </WebSocketProvider>
                </NotificationProvider>
              </OfflineProvider>
            </AuthProvider>
          </PaperProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}