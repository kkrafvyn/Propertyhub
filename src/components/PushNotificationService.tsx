import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from "sonner";
import { Bell, BellOff, MessageCircle, Users, User, Smartphone, Monitor, Tablet } from 'lucide-react';
import { User as UserType, ChatMessage, ChatRoom } from '../types';
import { projectId, publicAnonKey } from '../services/supabaseProject';
import { useAuth } from './auth/AuthProvider';

interface StoredPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface DeviceInfo {
  id: string;
  name: string;
  type: 'mobile' | 'desktop' | 'tablet';
  subscription: StoredPushSubscription;
  userAgent: string;
  lastSeen: string;
  isActive: boolean;
}

interface PushNotificationContextType {
  isSupported: boolean;
  permission: NotificationPermission;
  isEnabled: boolean;
  isSubscribed: boolean;
  devices: DeviceInfo[];
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  showNotification: (title: string, options?: NotificationOptions) => void;
  toggleNotifications: () => void;
  subscribeToMessages: (userId: string) => void;
  unsubscribeFromMessages: () => void;
  sendTestNotification: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  removeDevice: (deviceId: string) => Promise<void>;
  // New comprehensive notification methods
  sendChatNotification: (data: ChatNotificationData) => Promise<void>;
  sendBookingNotification: (data: BookingNotificationData) => Promise<void>;
  sendPropertyNotification: (data: PropertyNotificationData) => Promise<void>;
  sendAdminNotification: (data: AdminNotificationData) => Promise<void>;
  sendSystemAnnouncement: (data: SystemAnnouncementData) => Promise<void>;
  sendHostNotification: (data: HostNotificationData) => Promise<void>;
  sendManagerNotification: (data: ManagerNotificationData) => Promise<void>;
  getNotifications: (options?: GetNotificationOptions) => Promise<any[]>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
}

interface ChatNotificationData {
  userId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  roomId: string;
  roomName: string;
  roomType: string;
  messageContent: string;
  messageType: string;
}

interface BookingNotificationData {
  userId: string;
  hostId?: string;
  propertyId: string;
  propertyTitle: string;
  bookingId: string;
  notificationType: 'booking_request' | 'booking_accepted' | 'booking_declined' | 'booking_confirmed' | 'payment_received' | 'payment_reminder' | 'checkin_reminder' | 'checkout_reminder' | 'review_request';
  amount?: number;
  dueDate?: string;
  checkinDate?: string;
  checkoutDate?: string;
}

interface PropertyNotificationData {
  userId: string;
  propertyId: string;
  propertyTitle: string;
  updateType: 'price_change' | 'new_booking' | 'booking_confirmed' | 'booking_cancelled' | 'payment_reminder' | 'availability_change';
  message?: string;
}

interface AdminNotificationData {
  targetRole?: string;
  userIds?: string[];
  title: string;
  body: string;
  notificationType?: string;
  data?: any;
}

interface SystemAnnouncementData {
  title: string;
  body: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  targetRoles?: string[];
  excludeRoles?: string[];
}

interface HostNotificationData {
  hostId: string;
  notificationType: 'new_inquiry' | 'booking_request' | 'payment_received' | 'review_received' | 'property_performance' | 'calendar_update';
  propertyId?: string;
  propertyTitle?: string;
  guestName?: string;
  amount?: number;
  data?: any;
}

interface ManagerNotificationData {
  managerId: string;
  notificationType: 'property_assigned' | 'property_removed' | 'maintenance_request' | 'booking_issue' | 'performance_alert';
  propertyId?: string;
  propertyTitle?: string;
  assignedBy?: string;
  data?: any;
}

interface GetNotificationOptions {
  limit?: number;
  unreadOnly?: boolean;
  type?: string;
}

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined);

interface PushNotificationProviderProps {
  children: ReactNode;
  currentUser?: UserType | null;
}

export function PushNotificationProvider({ children, currentUser: providedUser }: PushNotificationProviderProps) {
  const { user: authenticatedUser } = useAuth();
  const currentUser = providedUser ?? authenticatedUser;
  const [isSupported] = useState(() => 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window);
  const [permission, setPermission] = useState<NotificationPermission>(
    isSupported ? Notification.permission : 'denied'
  );
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [lastMessageIds, setLastMessageIds] = useState<Set<string>>(new Set());
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Initialize service worker and check subscription status
  useEffect(() => {
    if (isSupported && currentUser) {
      initializeServiceWorker();
    }
  }, [isSupported, currentUser]);

  // Check notification permission on mount
  useEffect(() => {
    if (isSupported) {
      const savedPreference = localStorage.getItem('notifications-enabled');
      setIsEnabled(savedPreference === 'true' && permission === 'granted');
    }
  }, [isSupported, permission]);

  const initializeServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      setServiceWorkerRegistration(registration);
      
      // Check if already subscribed
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        setIsSubscribed(true);
        await registerDevice(subscription);
      }
      
      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      
      // Refresh devices list
      await refreshDevices();
    } catch (error) {
      console.error('Error initializing service worker:', error);
    }
  };

  const handleServiceWorkerMessage = (event: MessageEvent) => {
    if (event.data.type === 'NOTIFICATION_CLICK') {
      // Handle notification click actions
      const { action, data } = event.data;
      
      switch (action) {
        case 'reply':
          // Navigate to chat room for reply
          if (data.roomId) {
            window.focus();
            // Trigger navigation to chat with specific room
            window.dispatchEvent(new CustomEvent('navigate-to-chat', { detail: { roomId: data.roomId } }));
          }
          break;
        case 'view_property':
          // Navigate to property details
          if (data.propertyId) {
            window.focus();
            window.dispatchEvent(new CustomEvent('navigate-to-property', { detail: { propertyId: data.propertyId } }));
          }
          break;
        case 'mark_read':
          // Mark messages as read
          if (data.roomId && currentUser) {
            markRoomAsRead(data.roomId, currentUser.id);
          }
          break;
        default:
          // Default action - just focus window
          window.focus();
          break;
      }
    }
  };

  const getDeviceInfo = (): Omit<DeviceInfo, 'id' | 'subscription' | 'lastSeen' | 'isActive'> => {
    const userAgent = navigator.userAgent;
    let deviceType: 'mobile' | 'desktop' | 'tablet' = 'desktop';
    let deviceName = 'Unknown Device';

    // Detect device type
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      if (/iPad/i.test(userAgent)) {
        deviceType = 'tablet';
        deviceName = 'iPad';
      } else if (/iPhone/i.test(userAgent)) {
        deviceType = 'mobile';
        deviceName = 'iPhone';
      } else if (/Android/i.test(userAgent)) {
        deviceType = /Mobile/i.test(userAgent) ? 'mobile' : 'tablet';
        deviceName = deviceType === 'mobile' ? 'Android Phone' : 'Android Tablet';
      } else {
        deviceType = 'mobile';
        deviceName = 'Mobile Device';
      }
    } else {
      // Desktop browsers
      if (/Chrome/i.test(userAgent)) {
        deviceName = 'Chrome Browser';
      } else if (/Firefox/i.test(userAgent)) {
        deviceName = 'Firefox Browser';
      } else if (/Safari/i.test(userAgent)) {
        deviceName = 'Safari Browser';
      } else if (/Edge/i.test(userAgent)) {
        deviceName = 'Edge Browser';
      } else {
        deviceName = 'Desktop Browser';
      }
    }

    return {
      name: deviceName,
      type: deviceType,
      userAgent
    };
  };

  const registerDevice = async (subscription: globalThis.PushSubscription) => {
    if (!currentUser) return;

    try {
      const deviceInfo = getDeviceInfo();
      const serializedSubscription = subscription.toJSON() as StoredPushSubscription;
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8669f8c6/push/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          userId: currentUser.id,
          subscription: {
            endpoint: serializedSubscription.endpoint,
            keys: {
              p256dh: serializedSubscription.keys?.p256dh || '',
              auth: serializedSubscription.keys?.auth || ''
            }
          },
          ...deviceInfo
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error registering device:', error);
    }
  };

  const refreshDevices = async () => {
    if (!currentUser) return;

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8669f8c6/push/devices/${currentUser.id}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setDevices(result.devices);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const removeDevice = async (deviceId: string) => {
    if (!currentUser) return;

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8669f8c6/push/devices/${deviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        await refreshDevices();
        toast.success('Device removed successfully');
      }
    } catch (error) {
      console.error('Error removing device:', error);
      toast.error('Failed to remove device');
    }
  };

  const markRoomAsRead = async (roomId: string, userId: string) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8669f8c6/chat/rooms/${roomId}/read/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const result = await response.json();
      if (!result.success) {
        console.error('Failed to mark room as read:', result.error);
      }
    } catch (error) {
      console.error('Error marking room as read:', error);
    }
  };

  // Request permission
  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return false;
    }

    if (permission === 'granted') {
      setIsEnabled(true);
      localStorage.setItem('notifications-enabled', 'true');
      return true;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        setIsEnabled(true);
        localStorage.setItem('notifications-enabled', 'true');
        toast.success('Notifications enabled!');
        return true;
      } else {
        toast.error('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
  };

  // Subscribe to push notifications
  const subscribe = async (): Promise<boolean> => {
    if (!serviceWorkerRegistration || !currentUser) {
      toast.error('Service worker not ready or user not logged in');
      return false;
    }

    try {
      // Request permission first
      const hasPermission = await requestPermission();
      if (!hasPermission) return false;

      // Get VAPID public key from server
      const vapidResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8669f8c6/push/vapid-key`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      const vapidResult = await vapidResponse.json();
      if (!vapidResult.success) {
        throw new Error('Failed to get VAPID key');
      }

      // Subscribe to push notifications
      const subscription = await serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidResult.publicKey)
      });

      // Register device with server
      await registerDevice(subscription);
      
      setIsSubscribed(true);
      toast.success('Successfully subscribed to push notifications');
      
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast.error('Failed to subscribe to push notifications');
      return false;
    }
  };

  // Unsubscribe from push notifications
  const unsubscribe = async (): Promise<boolean> => {
    if (!serviceWorkerRegistration) return false;

    try {
      const subscription = await serviceWorkerRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove device from server
        if (currentUser) {
          const deviceInfo = getDeviceInfo();
          const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8669f8c6/push/devices/unsubscribe`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              userId: currentUser.id,
              endpoint: subscription.endpoint
            }),
          });
        }
      }
      
      setIsSubscribed(false);
      toast.info('Unsubscribed from push notifications');
      
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast.error('Failed to unsubscribe');
      return false;
    }
  };

  // Helper function to convert VAPID key
  const urlBase64ToUint8Array = (base64String: string) => {
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
  };

  // Show notification
  const showNotification = (title: string, options?: NotificationOptions) => {
    if (!isSupported || !isEnabled || permission !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'propertyhub-notification',
        requireInteraction: false,
        silent: false,
        ...options,
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Handle click - focus window
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

    } catch (error) {
      console.error('Error showing notification:', error);
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    if (!currentUser) return;

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8669f8c6/push/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          userId: currentUser.id,
          title: 'Test Notification',
          body: 'This is a test push notification from PropertyHub!',
          icon: '/icon-192x192.png',
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Test notification sent to all your devices');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    }
  };

  // Toggle notifications
  const toggleNotifications = async () => {
    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return;
    }

    if (!isEnabled) {
      // Enable notifications
      const subscribed = await subscribe();
      if (subscribed) {
        setIsEnabled(true);
        localStorage.setItem('notifications-enabled', 'true');
      }
    } else {
      // Disable notifications
      const unsubscribed = await unsubscribe();
      if (unsubscribed) {
        setIsEnabled(false);
        localStorage.setItem('notifications-enabled', 'false');
      }
    }
  };

  // Subscribe to message notifications
  const subscribeToMessages = (userId: string) => {
    // This would typically connect to a WebSocket or polling service
    // For now, we'll use localStorage events to simulate cross-tab notifications
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === `chat-new-message-${userId}` && event.newValue) {
        try {
          const messageData = JSON.parse(event.newValue);
          const { message, room } = messageData;
          
          // Don't show notification for own messages
          if (message.senderId === userId) return;
          
          // Don't show duplicate notifications
          if (lastMessageIds.has(message.id)) return;
          
          setLastMessageIds(prev => new Set([...prev, message.id]));
          
          // Show notification
          const title = room.type === 'direct' 
            ? `${message.senderName}`
            : `${message.senderName} in ${room.name}`;
          
          let body = message.content;
          let icon = MessageCircle;
          
          if (message.type === 'image') {
            body = '📷 Sent an image';
          } else if (message.type === 'file') {
            body = `📎 Sent a file: ${message.fileName || 'file'}`;
          } else if (message.type === 'audio') {
            body = '🎵 Sent an audio message';
          } else if (message.type === 'video') {
            body = '🎥 Sent a video';
          }

          showNotification(title, {
            body,
            icon: message.senderAvatar || '/icon-192x192.png',
            tag: `message-${message.id}`,
            data: {
              roomId: room.id,
              messageId: message.id,
              senderId: message.senderId
            },
            actions: [
              {
                action: 'reply',
                title: 'Reply',
                icon: '/icon-192x192.png'
              },
              {
                action: 'mark_read',
                title: 'Mark as Read',
                icon: '/icon-192x192.png'
              }
            ]
          } as any);

          // Also show toast if window is focused
          if (document.hasFocus()) {
            toast.info(`New message from ${message.senderName}`, {
              description: body,
              duration: 3000,
            });
          }

        } catch (error) {
          console.error('Error parsing message notification:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  };

  const unsubscribeFromMessages = () => {
    // Clean up any subscriptions
    setLastMessageIds(new Set());
  };

  // Subscribe to messages when user is available
  useEffect(() => {
    if (currentUser && isEnabled) {
      const cleanup = subscribeToMessages(currentUser.id);
      return cleanup;
    }
  }, [currentUser, isEnabled]);

  // New comprehensive notification methods

  // Send chat notification
  const sendChatNotification = async (data: ChatNotificationData) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8669f8c6/push/chat-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
      
      console.log('Chat notification sent successfully:', result);
    } catch (error) {
      console.error('Error sending chat notification:', error);
      toast.error('Failed to send chat notification');
    }
  };

  // Send booking notification
  const sendBookingNotification = async (data: BookingNotificationData) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8669f8c6/push/booking-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
      
      console.log('Booking notification sent successfully:', result);
      toast.success('Booking notification sent');
    } catch (error) {
      console.error('Error sending booking notification:', error);
      toast.error('Failed to send booking notification');
    }
  };

  // Send property notification
  const sendPropertyNotification = async (data: PropertyNotificationData) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8669f8c6/push/property-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
      
      console.log('Property notification sent successfully:', result);
      toast.success('Property notification sent');
    } catch (error) {
      console.error('Error sending property notification:', error);
      toast.error('Failed to send property notification');
    }
  };

  // Send admin notification
  const sendAdminNotification = async (data: AdminNotificationData) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8669f8c6/push/admin-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
      
      console.log('Admin notification sent successfully:', result);
      toast.success(`Admin notification sent to ${result.sent} users`);
    } catch (error) {
      console.error('Error sending admin notification:', error);
      toast.error('Failed to send admin notification');
    }
  };

  // Send system announcement
  const sendSystemAnnouncement = async (data: SystemAnnouncementData) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8669f8c6/push/system-announcement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
      
      console.log('System announcement sent successfully:', result);
      toast.success(`System announcement sent to ${result.sent} users`);
    } catch (error) {
      console.error('Error sending system announcement:', error);
      toast.error('Failed to send system announcement');
    }
  };

  // Send host notification
  const sendHostNotification = async (data: HostNotificationData) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8669f8c6/push/host-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
      
      console.log('Host notification sent successfully:', result);
      toast.success('Host notification sent');
    } catch (error) {
      console.error('Error sending host notification:', error);
      toast.error('Failed to send host notification');
    }
  };

  // Send manager notification
  const sendManagerNotification = async (data: ManagerNotificationData) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8669f8c6/push/manager-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
      
      console.log('Manager notification sent successfully:', result);
      toast.success('Manager notification sent');
    } catch (error) {
      console.error('Error sending manager notification:', error);
      toast.error('Failed to send manager notification');
    }
  };

  // Get notifications for the current user
  const getNotifications = async (options?: GetNotificationOptions) => {
    if (!currentUser) return [];

    try {
      const queryParams = new URLSearchParams();
      if (options?.limit) queryParams.append('limit', options.limit.toString());
      if (options?.unreadOnly) queryParams.append('unread', 'true');
      if (options?.type) queryParams.append('type', options.type);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8669f8c6/notifications/${currentUser.id}?${queryParams}`, 
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }

      return result.notifications || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId: string) => {
    if (!currentUser) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8669f8c6/notifications/${currentUser.id}/${notificationId}/read`, 
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    if (!currentUser) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8669f8c6/notifications/${currentUser.id}/read-all`, 
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
      
      toast.success(`Marked ${result.updated} notifications as read`);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    if (!currentUser) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8669f8c6/notifications/${currentUser.id}/${notificationId}`, 
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
      
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const value: PushNotificationContextType = {
    isSupported,
    permission,
    isEnabled,
    isSubscribed,
    devices,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
    toggleNotifications,
    subscribeToMessages,
    unsubscribeFromMessages,
    sendTestNotification,
    refreshDevices,
    removeDevice,
    // New comprehensive notification methods
    sendChatNotification,
    sendBookingNotification,
    sendPropertyNotification,
    sendAdminNotification,
    sendSystemAnnouncement,
    sendHostNotification,
    sendManagerNotification,
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotifications() {
  const context = useContext(PushNotificationContext);
  if (context === undefined) {
    throw new Error('usePushNotifications must be used within a PushNotificationProvider');
  }
  return context;
}

// Enhanced notification settings component with device management
export function NotificationSettings() {
  const { 
    isSupported, 
    permission, 
    isEnabled, 
    isSubscribed, 
    devices, 
    toggleNotifications, 
    sendTestNotification, 
    refreshDevices, 
    removeDevice 
  } = usePushNotifications();

  useEffect(() => {
    refreshDevices();
  }, []);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  if (!isSupported) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
          <BellOff className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="font-medium">Push notifications not supported</p>
            <p className="text-sm text-muted-foreground">
              Your browser doesn't support push notifications
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main toggle */}
      <div className="flex items-center justify-between p-4 bg-card border rounded-lg">
        <div className="flex items-center gap-3">
          {isEnabled ? (
            <Bell className="w-5 h-5 text-primary" />
          ) : (
            <BellOff className="w-5 h-5 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium">Push Notifications</p>
            <p className="text-sm text-muted-foreground">
              Get notified across all your devices
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isEnabled && (
            <button
              onClick={sendTestNotification}
              className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
            >
              Test
            </button>
          )}
          <button
            onClick={toggleNotifications}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${isEnabled ? 'bg-primary' : 'bg-muted-foreground'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${isEnabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
      </div>

      {/* Device management */}
      {isEnabled && (
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Connected Devices</h3>
            <button
              onClick={refreshDevices}
              className="text-sm text-primary hover:underline"
            >
              Refresh
            </button>
          </div>
          
          {devices.length > 0 ? (
            <div className="space-y-3">
              {devices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(device.type)}
                    <div>
                      <p className="font-medium text-sm">{device.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Last seen: {new Date(device.lastSeen).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {device.isActive && (
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    )}
                    <button
                      onClick={() => removeDevice(device.id)}
                      className="text-xs text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No devices connected. Enable notifications to register this device.
            </p>
          )}
        </div>
      )}

      {/* Notification status */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-medium mb-2">Status</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Browser support:</span>
            <span className={isSupported ? 'text-green-600' : 'text-red-600'}>
              {isSupported ? 'Supported' : 'Not supported'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Permission:</span>
            <span className={permission === 'granted' ? 'text-green-600' : 'text-orange-600'}>
              {permission.charAt(0).toUpperCase() + permission.slice(1)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Subscription:</span>
            <span className={isSubscribed ? 'text-green-600' : 'text-orange-600'}>
              {isSubscribed ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
