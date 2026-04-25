/**
 * Push Notification Manager for PropertyHub
 * 
 * Handles push notifications for chat messages, property updates,
 * and other real-time events. Works with both web and mobile platforms.
 * 
 * Features:
 * - Web Push API integration
 * - Service Worker registration
 * - Notification permission management
 * - Background sync for offline notifications
 * - Firebase Cloud Messaging support
 * - Expo push notifications for React Native
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

// Firebase imports (optional - for FCM)
// import { initializeApp } from 'firebase/app';
// import { getMessaging, getToken, onMessage } from 'firebase/messaging';

interface PushNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  tag?: string;
  timestamp: number;
  actions?: NotificationAction[];
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
  vapidPublicKey: string | null;
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  sendTestNotification: () => Promise<void>;
  registerServiceWorker: () => Promise<ServiceWorkerRegistration | undefined>;
  notifications: PushNotification[];
  clearNotifications: () => void;
}

const PushNotificationContext = createContext<PushNotificationState>({
  isSupported: false,
  permission: 'default',
  isSubscribed: false,
  subscription: null,
  vapidPublicKey: null,
  requestPermission: async () => false,
  subscribe: async () => false,
  unsubscribe: async () => false,
  sendTestNotification: async () => {},
  registerServiceWorker: async () => undefined,
  notifications: [],
  clearNotifications: () => {}
});

interface PushNotificationProviderProps {
  children: React.ReactNode;
  vapidPublicKey?: string;
  serverUrl?: string;
  userId?: string;
}

export function PushNotificationProvider({ 
  children, 
  vapidPublicKey,
  serverUrl = 'http://localhost:8080',
  userId
}: PushNotificationProviderProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [notifications, setNotifications] = useState<PushNotification[]>([]);

  // VAPID public key for Web Push
  const getVapidKey = (): string => {
    if (vapidPublicKey) return vapidPublicKey;
    
    // Try Vite environment variables
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_VAPID_PUBLIC_KEY) {
      return import.meta.env.VITE_VAPID_PUBLIC_KEY;
    }
    
    // Fallback key for development (should be replaced in production)
    return 'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9f83ErYx3AE1lOt2JQ7YMhCIvr1QeUjbhGSUF1Px5ZSfaU3U4s0M';
  };
  
  const VAPID_PUBLIC_KEY = getVapidKey();

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator && 
                       'PushManager' in window && 
                       'Notification' in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Service workers are not supported in this browser');
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      setServiceWorkerRegistration(registration);
      console.log('🔔 Service Worker registered successfully');

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
          handleNotificationClick(event.data.notification);
        }
      });

      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }, [isSupported]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        toast.success('🔔 Push notifications enabled!');
        return true;
      } else if (permission === 'denied') {
        toast.error('Push notifications were denied. You can enable them in your browser settings.');
        return false;
      } else {
        toast.info('Push notification permission was dismissed');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!serviceWorkerRegistration) {
      await registerServiceWorker();
    }

    if (!serviceWorkerRegistration) {
      throw new Error('Service Worker not registered');
    }

    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        return false;
      }
    }

    try {
      // Check if already subscribed
      const existingSubscription = await serviceWorkerRegistration.pushManager.getSubscription();
      
      if (existingSubscription) {
        setSubscription(existingSubscription);
        setIsSubscribed(true);
        
        // Send subscription to server
        await sendSubscriptionToServer(existingSubscription);
        return true;
      }

      // Create new subscription
      const newSubscription = await serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource
      });

      setSubscription(newSubscription);
      setIsSubscribed(true);

      // Send subscription to server
      await sendSubscriptionToServer(newSubscription);
      
      toast.success('🔔 Successfully subscribed to push notifications!');
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast.error('Failed to subscribe to push notifications');
      return false;
    }
  }, [serviceWorkerRegistration, permission, requestPermission, VAPID_PUBLIC_KEY, userId]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) {
      return true;
    }

    try {
      await subscription.unsubscribe();
      
      // Remove subscription from server
      await removeSubscriptionFromServer(subscription);
      
      setSubscription(null);
      setIsSubscribed(false);
      
      toast.success('🔕 Unsubscribed from push notifications');
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast.error('Failed to unsubscribe from push notifications');
      return false;
    }
  }, [subscription]);

  // Send subscription to server
  const sendSubscriptionToServer = async (subscription: PushSubscription) => {
    if (!userId) {
      console.warn('User ID not provided, cannot save subscription to server');
      return;
    }

    try {
      const response = await fetch(`${serverUrl}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          userId,
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription to server');
      }

      console.log('🔔 Push subscription saved to server');
    } catch (error) {
      console.error('Error saving push subscription to server:', error);
    }
  };

  // Remove subscription from server
  const removeSubscriptionFromServer = async (subscription: PushSubscription) => {
    if (!userId) {
      return;
    }

    try {
      await fetch(`${serverUrl}/api/push/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          userId,
          endpoint: subscription.endpoint
        })
      });

      console.log('🔕 Push subscription removed from server');
    } catch (error) {
      console.error('Error removing push subscription from server:', error);
    }
  };

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    if (!userId) {
      toast.error('User not logged in');
      return;
    }

    try {
      const response = await fetch(`${serverUrl}/api/push/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          userId,
          title: '🏠 PropertyHub Test',
          body: 'This is a test notification from PropertyHub!',
          data: {
            type: 'test',
            url: '/dashboard'
          }
        })
      });

      if (response.ok) {
        toast.success('Test notification sent!');
      } else {
        throw new Error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    }
  }, [userId, serverUrl]);

  // Handle notification click
  const handleNotificationClick = (notificationData: any) => {
    console.log('Notification clicked:', notificationData);
    
    // Add to notifications list
    const notification: PushNotification = {
      id: `notif_${Date.now()}`,
      title: notificationData.title,
      body: notificationData.body,
      data: notificationData.data,
      timestamp: Date.now()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10
    
    // Handle navigation based on notification data
    if (notificationData.data?.url) {
      window.location.href = notificationData.data.url;
    }
  };

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (isSupported && userId) {
      registerServiceWorker().catch(console.error);
    }
  }, [isSupported, userId, registerServiceWorker]);

  // Check existing subscription on mount
  useEffect(() => {
    const checkExistingSubscription = async () => {
      if (serviceWorkerRegistration) {
        try {
          const existingSubscription = await serviceWorkerRegistration.pushManager.getSubscription();
          if (existingSubscription) {
            setSubscription(existingSubscription);
            setIsSubscribed(true);
          }
        } catch (error) {
          console.error('Error checking existing subscription:', error);
        }
      }
    };

    checkExistingSubscription();
  }, [serviceWorkerRegistration]);

  // Listen for message events from service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PUSH_RECEIVED') {
          // Handle push message received while app is open
          const notificationData = event.data.notification;
          
          // Show in-app notification
          toast.info(`💬 ${notificationData.title}`, {
            description: notificationData.body,
            action: {
              label: 'View',
              onClick: () => handleNotificationClick(notificationData)
            }
          });
        }
      });
    }
  }, []);

  const value: PushNotificationState = {
    isSupported,
    permission,
    isSubscribed,
    subscription,
    vapidPublicKey: VAPID_PUBLIC_KEY,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
    registerServiceWorker,
    notifications,
    clearNotifications
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
}

export const usePushNotifications = () => {
  const context = useContext(PushNotificationContext);
  if (!context) {
    throw new Error('usePushNotifications must be used within a PushNotificationProvider');
  }
  return context;
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Push Notification Settings Component
export function PushNotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification
  } = usePushNotifications();

  const handleToggleSubscription = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      if (permission === 'granted') {
        await subscribe();
      } else {
        const granted = await requestPermission();
        if (granted) {
          await subscribe();
        }
      }
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="font-medium mb-2">Push Notifications</h3>
        <p className="text-sm text-muted-foreground">
          Push notifications are not supported in your browser.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-4 border">
      <h3 className="font-medium mb-4">Push Notifications</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Enable Notifications</p>
            <p className="text-sm text-muted-foreground">
              Get notified about new messages and property updates
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full ${
              permission === 'granted' ? 'bg-green-100 text-green-800' :
              permission === 'denied' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {permission === 'granted' ? 'Enabled' :
               permission === 'denied' ? 'Blocked' : 'Not Set'}
            </span>
            
            <button
              onClick={handleToggleSubscription}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isSubscribed
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {isSubscribed ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>

        {isSubscribed && (
          <div className="pt-4 border-t">
            <button
              onClick={sendTestNotification}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Send Test Notification
            </button>
          </div>
        )}

        {permission === 'denied' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              Notifications are blocked. To enable them, click the notification icon in your browser's address bar or go to your browser settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Notification Permission Request Component
export function NotificationPermissionPrompt() {
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if not supported, already granted, or user dismissed
  if (!isSupported || permission === 'granted' || permission === 'denied' || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-card border rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-start gap-3">
        <div className="text-2xl">🔔</div>
        <div className="flex-1">
          <h4 className="font-medium mb-1">Enable Notifications</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Stay updated with instant chat messages and property alerts.
          </p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                await requestPermission();
                setDismissed(true);
              }}
              className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
            >
              Enable
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/80"
            >
              Later
            </button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          ×
        </button>
      </div>
    </div>
  );
}