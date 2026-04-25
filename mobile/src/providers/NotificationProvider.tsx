/**
 * PropertyHub Mobile - Notification Provider
 * 
 * Manages push notifications, in-app notifications,
 * and notification permissions for the mobile app.
 */

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useAuth } from './AuthProvider';
import { useWebSocket } from './WebSocketProvider';

// Types
interface NotificationData {
  type: 'message' | 'property' | 'booking' | 'system';
  title: string;
  body: string;
  data?: any;
}

interface NotificationContextType {
  notifications: NotificationData[];
  unreadCount: number;
  hasPermission: boolean;
  expoPushToken: string | null;
  requestPermission: () => Promise<boolean>;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  sendLocalNotification: (notification: NotificationData) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { socket, isConnected } = useWebSocket();
  
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    registerForPushNotificationsAsync();

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notification received:', notification);
      
      const notificationData: NotificationData = {
        type: notification.request.content.data?.type || 'system',
        title: notification.request.content.title || 'PropertyHub',
        body: notification.request.content.body || '',
        data: notification.request.content.data,
      };
      
      setNotifications(prev => [notificationData, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    // Listen for notification interactions
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📱 Notification interaction:', response);
      
      const data = response.notification.request.content.data;
      handleNotificationAction(data);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  useEffect(() => {
    // Send push token to server when user is authenticated
    if (user && expoPushToken && socket && isConnected) {
      socket.emit('register_push_token', {
        userId: user.id,
        pushToken: expoPushToken,
        platform: Platform.OS,
      });
    }
  }, [user, expoPushToken, socket, isConnected]);

  useEffect(() => {
    // Listen for real-time notifications via WebSocket
    if (socket && isConnected) {
      socket.on('notification', (notificationData: NotificationData) => {
        console.log('📡 Real-time notification:', notificationData);
        
        // Add to notification list
        setNotifications(prev => [notificationData, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show local notification if app is in background
        if (AppState.currentState !== 'active') {
          sendLocalNotification(notificationData);
        }
      });

      return () => {
        socket.off('notification');
      };
    }
  }, [socket, isConnected]);

  async function registerForPushNotificationsAsync() {
    try {
      if (!Device.isDevice) {
        console.log('📱 Push notifications only work on physical devices');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('📱 Failed to get push token for push notification!');
        setHasPermission(false);
        return;
      }
      
      setHasPermission(true);

      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // Replace with your actual project ID
      });
      
      const token = tokenData.data;
      console.log('📱 Expo push token:', token);
      setExpoPushToken(token);

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'PropertyHub Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6200ea',
        });
      }
    } catch (error) {
      console.error('📱 Error registering for push notifications:', error);
      setHasPermission(false);
    }
  }

  const requestPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('📱 Error requesting notification permission:', error);
      return false;
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  };

  const sendLocalNotification = async (notification: NotificationData) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('📱 Error sending local notification:', error);
    }
  };

  const handleNotificationAction = (data: any) => {
    // Handle notification tap actions
    console.log('📱 Handling notification action:', data);
    
    // You can implement navigation logic here based on notification data
    // For example, navigate to specific screens based on notification type
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    hasPermission,
    expoPushToken,
    requestPermission,
    markAsRead,
    markAllAsRead,
    sendLocalNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}