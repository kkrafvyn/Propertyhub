/**
 * PropertyHub Mobile - Tabs Layout
 * 
 * This component defines the main tab navigation structure for the authenticated app.
 * It includes all the main sections: Properties, Search, Messages, Profile, and More.
 * 
 * Features:
 * - Bottom tab navigation with icons
 * - Badge indicators for unread messages
 * - Dynamic tab bar styling
 * - Haptic feedback on tab press
 * - Responsive design for different screen sizes
 */

import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Dimensions, Platform } from 'react-native';
import { useTheme } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

// Providers and Hooks
import { useAuth } from '../../src/providers/AuthProvider';
import { useNotifications } from '../../src/providers/NotificationProvider';
import { useWebSocket } from '../../src/providers/WebSocketProvider';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Tab configuration
type TabConfig = {
  name: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  badge?: boolean;
};

const tabsConfig: TabConfig[] = [
  {
    name: 'index',
    title: 'Properties',
    icon: 'home-outline',
    iconFocused: 'home',
  },
  {
    name: 'search',
    title: 'Search',
    icon: 'search-outline',
    iconFocused: 'search',
  },
  {
    name: 'messages',
    title: 'Messages',
    icon: 'chatbubbles-outline',
    iconFocused: 'chatbubbles',
    badge: true,
  },
  {
    name: 'favorites',
    title: 'Favorites',
    icon: 'heart-outline',
    iconFocused: 'heart',
  },
  {
    name: 'profile',
    title: 'Profile',
    icon: 'person-outline',
    iconFocused: 'person',
  },
];

export default function TabLayout() {
  const theme = useTheme();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { unreadMessages } = useWebSocket();
  const [activeTab, setActiveTab] = useState('index');

  // Calculate total unread messages count
  const totalUnreadMessages = unreadMessages || 0;

  const handleTabPress = (tabName: string) => {
    setActiveTab(tabName);
    
    // Haptic feedback on tab change
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          elevation: 8,
          shadowColor: theme.colors.shadow,
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: isTablet ? 14 : 12,
          fontWeight: '600',
        },
        headerShown: false,
        tabBarHideOnKeyboard: Platform.OS === 'android',
      }}
    >
      {tabsConfig.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => {
              const iconSize = isTablet ? size + 2 : size;
              return (
                <Ionicons
                  name={focused ? tab.iconFocused : tab.icon}
                  size={iconSize}
                  color={color}
                />
              );
            },
            tabBarBadge: 
              tab.badge && tab.name === 'messages' && totalUnreadMessages > 0
                ? totalUnreadMessages > 99 ? '99+' : totalUnreadMessages.toString()
                : undefined,
            tabBarBadgeStyle: {
              backgroundColor: theme.colors.error,
              color: theme.colors.onError,
              fontSize: 10,
              fontWeight: 'bold',
              minWidth: 18,
              height: 18,
            },
          }}
          listeners={{
            tabPress: () => handleTabPress(tab.name),
          }}
        />
      ))}
    </Tabs>
  );
}