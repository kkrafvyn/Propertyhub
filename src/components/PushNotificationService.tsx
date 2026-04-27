import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Bell,
  BellOff,
  MessageCircle,
  Monitor,
  Smartphone,
  Tablet,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ChatMessage, ChatRoom, User as UserType } from '../types';
import {
  ensurePushPermission,
  getNotificationPermissionState,
  isNativePlatform,
  nativePlatform,
  registerNativePush,
  showLocalNotification,
  unregisterNativePush,
  type NativePushRegistration,
} from '../services/nativeCapabilities';
import { getSupabaseFunctionUrl, publicAnonKey } from '../services/supabaseProject';
import { useAuth } from './auth/AuthProvider';

type StoredPushSubscription = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

type DeviceInfo = {
  id: string;
  name: string;
  type: 'mobile' | 'desktop' | 'tablet';
  subscription?: StoredPushSubscription;
  token?: string;
  platform?: string;
  userAgent: string;
  lastSeen: string;
  isActive: boolean;
};

export type InboxNotification = {
  body: string;
  createdAt: string;
  data: Record<string, unknown>;
  id: string;
  read: boolean;
  title: string;
  type: string;
};

type PushNotificationContextType = {
  isSupported: boolean;
  permission: NotificationPermission;
  isEnabled: boolean;
  isSubscribed: boolean;
  devices: DeviceInfo[];
  notifications: InboxNotification[];
  unreadCount: number;
  loadingNotifications: boolean;
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  showNotification: (title: string, options?: NotificationOptions) => void;
  toggleNotifications: () => void;
  subscribeToMessages: (_userId: string) => void;
  unsubscribeFromMessages: () => void;
  sendTestNotification: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  removeDevice: (deviceId: string) => Promise<void>;
  sendChatNotification: (data: ChatNotificationData) => Promise<void>;
  sendBookingNotification: (data: BookingNotificationData) => Promise<void>;
  sendPropertyNotification: (data: PropertyNotificationData) => Promise<void>;
  sendAdminNotification: (data: AdminNotificationData) => Promise<void>;
  sendSystemAnnouncement: (data: SystemAnnouncementData) => Promise<void>;
  sendHostNotification: (data: HostNotificationData) => Promise<void>;
  sendManagerNotification: (data: ManagerNotificationData) => Promise<void>;
  getNotifications: (options?: GetNotificationOptions) => Promise<any[]>;
  refreshNotificationInbox: () => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
};

type ChatNotificationData = {
  userId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  roomId: string;
  roomName: string;
  roomType: string;
  messageContent: string;
  messageType: string;
};

type BookingNotificationData = {
  userId: string;
  propertyId: string;
  propertyTitle: string;
  bookingId: string;
  notificationType:
    | 'booking_request'
    | 'booking_accepted'
    | 'booking_declined'
    | 'booking_confirmed'
    | 'payment_received'
    | 'payment_reminder'
    | 'checkin_reminder'
    | 'checkout_reminder'
    | 'review_request';
  amount?: number;
  dueDate?: string;
  checkinDate?: string;
  checkoutDate?: string;
};

type PropertyNotificationData = {
  userId: string;
  propertyId: string;
  propertyTitle: string;
  updateType:
    | 'price_change'
    | 'new_booking'
    | 'booking_confirmed'
    | 'booking_cancelled'
    | 'payment_reminder'
    | 'availability_change';
  message?: string;
};

type AdminNotificationData = {
  targetRole?: string;
  userIds?: string[];
  title: string;
  body: string;
  notificationType?: string;
  data?: Record<string, unknown>;
};

type SystemAnnouncementData = {
  title: string;
  body: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  targetRoles?: string[];
  excludeRoles?: string[];
};

type HostNotificationData = {
  hostId: string;
  notificationType:
    | 'new_inquiry'
    | 'booking_request'
    | 'payment_received'
    | 'review_received'
    | 'property_performance'
    | 'calendar_update';
  propertyId?: string;
  propertyTitle?: string;
  guestName?: string;
  amount?: number;
  data?: Record<string, unknown>;
};

type ManagerNotificationData = {
  managerId: string;
  notificationType:
    | 'property_assigned'
    | 'property_removed'
    | 'maintenance_request'
    | 'booking_issue'
    | 'performance_alert';
  propertyId?: string;
  propertyTitle?: string;
  assignedBy?: string;
  data?: Record<string, unknown>;
};

type GetNotificationOptions = {
  limit?: number;
  unreadOnly?: boolean;
  type?: string;
};

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined);

interface PushNotificationProviderProps {
  children: ReactNode;
  currentUser?: UserType | null;
}

const pushStorageKey = 'propertyhub.notifications.enabled';

const getDeviceInfo = (): Pick<DeviceInfo, 'name' | 'type' | 'userAgent'> => {
  const userAgent = navigator.userAgent;

  if (isNativePlatform()) {
    return {
      name: nativePlatform() === 'ios' ? 'iPhone App' : 'Android App',
      type: 'mobile',
      userAgent,
    };
  }

  if (/iPad/i.test(userAgent)) {
    return { name: 'iPad Browser', type: 'tablet', userAgent };
  }

  if (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent)) {
    return { name: 'Android Tablet', type: 'tablet', userAgent };
  }

  if (/Android|iPhone|iPod|Mobile/i.test(userAgent)) {
    return { name: 'Mobile Browser', type: 'mobile', userAgent };
  }

  return { name: 'Desktop Browser', type: 'desktop', userAgent };
};

const permissionToNotificationPermission = (value: string): NotificationPermission => {
  if (value === 'granted' || value === 'denied') {
    return value;
  }

  return 'default';
};

const buildHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${publicAnonKey}`,
});

const createNotificationId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `notification_${Date.now()}`;

const normalizeNotification = (value: Record<string, any>): InboxNotification => ({
  body:
    typeof value.body === 'string'
      ? value.body
      : typeof value.message === 'string'
        ? value.message
        : '',
  createdAt:
    typeof value.createdAt === 'string'
      ? value.createdAt
      : typeof value.created_at === 'string'
        ? value.created_at
        : new Date().toISOString(),
  data:
    value.data && typeof value.data === 'object'
      ? value.data
      : value.metadata && typeof value.metadata === 'object'
        ? value.metadata
        : {},
  id: typeof value.id === 'string' ? value.id : createNotificationId(),
  read: Boolean(value.read),
  title:
    typeof value.title === 'string' && value.title.trim()
      ? value.title
      : 'PropertyHub',
  type:
    typeof value.type === 'string' && value.type.trim()
      ? value.type
      : 'system',
});

const pushApi = async <T = any>(
  path: string,
  options: RequestInit = {},
  defaultError = 'Notification request failed.',
): Promise<T> => {
  const response = await fetch(getSupabaseFunctionUrl(path), {
    ...options,
    headers: {
      ...buildHeaders(),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || payload?.message || defaultError);
  }

  return (payload.data ?? payload) as T;
};

export function PushNotificationProvider({
  children,
  currentUser: providedUser,
}: PushNotificationProviderProps) {
  const { user: authenticatedUser } = useAuth();
  const currentUser = providedUser ?? authenticatedUser;

  const isSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    if (isNativePlatform()) return true;
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  }, []);

  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const nativeRegistrationRef = useRef<NativePushRegistration | null>(null);
  const currentDeviceIdRef = useRef<string | null>(null);
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const upsertNotification = useCallback((value: Record<string, any>) => {
    const nextNotification = normalizeNotification(value);

    setNotifications((previous) => {
      const withoutDuplicate = previous.filter((notification) => notification.id !== nextNotification.id);
      return [nextNotification, ...withoutDuplicate].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      );
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPermissionState = async () => {
      if (!isSupported) {
        setPermission('denied');
        return;
      }

      const nextPermission = permissionToNotificationPermission(
        await getNotificationPermissionState(),
      );

      if (!cancelled) {
        setPermission(nextPermission);
      }
    };

    void loadPermissionState();

    const savedPreference = localStorage.getItem(pushStorageKey) === 'true';
    if (!cancelled) {
      setIsEnabled(savedPreference);
    }

    return () => {
      cancelled = true;
    };
  }, [isSupported]);

  const refreshDevices = useCallback(async () => {
    if (!currentUser) {
      setDevices([]);
      return;
    }

    try {
      const result = await pushApi<{ success: boolean; devices: DeviceInfo[] }>(
        `push/devices/${currentUser.id}`,
        { method: 'GET' },
        'Unable to load registered devices.',
      );

      setDevices(result.devices || []);
      setIsSubscribed((result.devices || []).length > 0 || Boolean(currentDeviceIdRef.current));
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      void refreshDevices();
    }
  }, [currentUser, refreshDevices]);

  const refreshNotificationInbox = useCallback(async () => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    try {
      setLoadingNotifications(true);
      const result = await pushApi<{ success: boolean; notifications: Record<string, any>[] }>(
        `notifications/${currentUser.id}?limit=50`,
        { method: 'GET' },
        'Unable to load notifications.',
      );

      setNotifications((result.notifications || []).map(normalizeNotification));
    } catch (error) {
      console.error('Error fetching notification inbox:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      void refreshNotificationInbox();
    } else {
      setNotifications([]);
    }
  }, [currentUser, refreshNotificationInbox]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast.error('Notifications are not supported on this device.');
      return false;
    }

    try {
      const granted = await ensurePushPermission();
      const nextPermission = permissionToNotificationPermission(
        await getNotificationPermissionState(),
      );
      setPermission(nextPermission);

      if (granted) {
        toast.success('Notifications enabled.');
      } else {
        toast.error('Notification permission was denied.');
      }

      return granted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Unable to request notification permission.');
      return false;
    }
  }, [isSupported]);

  const registerDevice = useCallback(
    async (payload: {
      subscription?: StoredPushSubscription;
      token?: string;
      platform?: string;
    }) => {
      if (!currentUser) {
        throw new Error('You need to be logged in to register this device.');
      }

      const result = await pushApi<{ success: boolean; device: DeviceInfo }>(
        'push/devices',
        {
          method: 'POST',
          body: JSON.stringify({
            userId: currentUser.id,
            ...payload,
            ...getDeviceInfo(),
          }),
        },
        'Unable to register this device for notifications.',
      );

      currentDeviceIdRef.current = result.device.id;
      return result.device;
    },
    [currentUser],
  );

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!currentUser) {
      toast.error('Please log in before enabling notifications.');
      return false;
    }

    const allowed = await requestPermission();
    if (!allowed) {
      return false;
    }

    try {
      if (isNativePlatform()) {
        if (!nativeRegistrationRef.current) {
          nativeRegistrationRef.current = await registerNativePush({
            onNotification: (notification) => {
              upsertNotification({
                body: notification.body,
                data: notification.data || {},
                id:
                  typeof notification.id === 'string' || typeof notification.id === 'number'
                    ? String(notification.id)
                    : createNotificationId(),
                read: false,
                title: notification.title,
                type:
                  typeof notification.data?.type === 'string'
                    ? notification.data.type
                    : 'system',
              });
              void showLocalNotification({
                title: notification.title,
                body: notification.body,
                data: notification.data || {},
              });
            },
            onAction: (action) => {
              const detail = action.notification.data || {};

              if (detail.roomId) {
                window.dispatchEvent(
                  new CustomEvent('navigate-to-chat', {
                    detail: { roomId: String(detail.roomId) },
                  }),
                );
              }

              if (detail.propertyId) {
                window.dispatchEvent(
                  new CustomEvent('navigate-to-property', {
                    detail: { propertyId: String(detail.propertyId) },
                  }),
                );
              }
            },
          });
        }

        await registerDevice({
          token: nativeRegistrationRef.current.token,
          platform: nativeRegistrationRef.current.platform,
        });
      } else {
        const registration =
          (await navigator.serviceWorker.getRegistration()) ||
          (await navigator.serviceWorker.register('/sw.js'));
        const readyRegistration = await navigator.serviceWorker.ready;

        const vapidResult = await pushApi<{ success: boolean; publicKey: string }>(
          'push/vapid-key',
          { method: 'GET' },
          'Unable to load the web push public key.',
        );

        const existingSubscription = await readyRegistration.pushManager.getSubscription();
        const subscription =
          existingSubscription ||
          (await readyRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: (() => {
              const padding = '='.repeat((4 - (vapidResult.publicKey.length % 4)) % 4);
              const base64 = (vapidResult.publicKey + padding)
                .replace(/-/g, '+')
                .replace(/_/g, '/');
              const rawData = window.atob(base64);
              return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
            })(),
          }));

        await registerDevice({
          subscription: subscription.toJSON() as StoredPushSubscription,
        });
      }

      localStorage.setItem(pushStorageKey, 'true');
      setIsEnabled(true);
      setIsSubscribed(true);
      await refreshDevices();
      await refreshNotificationInbox();
      return true;
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      toast.error(error instanceof Error ? error.message : 'Unable to enable notifications.');
      return false;
    }
  }, [
    currentUser,
    refreshDevices,
    refreshNotificationInbox,
    registerDevice,
    requestPermission,
    upsertNotification,
  ]);

  const removeDevice = useCallback(
    async (deviceId: string) => {
      try {
        await pushApi(
          `push/devices/${deviceId}`,
          { method: 'DELETE' },
          'Unable to remove this device.',
        );

        if (currentDeviceIdRef.current === deviceId) {
          currentDeviceIdRef.current = null;
          setIsSubscribed(false);
        }

        await refreshDevices();
        toast.success('Device removed.');
      } catch (error) {
        console.error('Error removing device:', error);
        toast.error(error instanceof Error ? error.message : 'Unable to remove device.');
      }
    },
    [refreshDevices],
  );

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      if (isNativePlatform()) {
        if (nativeRegistrationRef.current) {
          await nativeRegistrationRef.current.dispose();
          nativeRegistrationRef.current = null;
        }
        await unregisterNativePush();
      } else if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await pushApi(
            'push/devices/unsubscribe',
            {
              method: 'POST',
              body: JSON.stringify({
                userId: currentUser?.id,
                endpoint: subscription.endpoint,
              }),
            },
            'Unable to unsubscribe this browser.',
          );
        }
      }

      if (currentDeviceIdRef.current) {
        await removeDevice(currentDeviceIdRef.current);
      }

      localStorage.setItem(pushStorageKey, 'false');
      setIsEnabled(false);
      setIsSubscribed(false);
      currentDeviceIdRef.current = null;
      return true;
    } catch (error) {
      console.error('Error unsubscribing from notifications:', error);
      toast.error(error instanceof Error ? error.message : 'Unable to disable notifications.');
      return false;
    }
  }, [currentUser?.id, removeDevice]);

  const showNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isEnabled || permission !== 'granted') {
        return;
      }

      upsertNotification({
        body: options?.body || '',
        data: (options?.data as Record<string, unknown>) || {},
        read: false,
        title,
        type:
          typeof (options?.data as Record<string, unknown> | undefined)?.type === 'string'
            ? String((options?.data as Record<string, unknown>).type)
            : 'system',
      });

      if (isNativePlatform()) {
        void showLocalNotification({
          title,
          body: options?.body || '',
          data: (options?.data as Record<string, unknown>) || {},
        });
        return;
      }

      try {
        const notification = new Notification(title, {
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          ...options,
        });

        window.setTimeout(() => notification.close(), 5000);
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    },
    [isEnabled, permission, upsertNotification],
  );

  const sendTestNotification = useCallback(async () => {
    if (!currentUser) return;

    try {
      const result = await pushApi<Record<string, any>>(
        'push/test',
        {
          method: 'POST',
          body: JSON.stringify({
            userId: currentUser.id,
            title: 'PropertyHub test notification',
            body: 'Your device is ready for booking, chat, and property alerts.',
            data: {
              type: 'test',
            },
          }),
        },
        'Unable to send a test notification.',
      );

      upsertNotification(result);
      toast.success('Test notification sent.');
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error(error instanceof Error ? error.message : 'Unable to send test notification.');
    }
  }, [currentUser, upsertNotification]);

  const toggleNotifications = useCallback(async () => {
    if (isEnabled) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  }, [isEnabled, subscribe, unsubscribe]);

  const subscribeToMessages = useCallback((_userId: string) => {}, []);
  const unsubscribeFromMessages = useCallback(() => {}, []);

  const postGenericNotification = useCallback(
    async (
      recipientUserId: string,
      title: string,
      body: string,
      data: Record<string, unknown> = {},
    ) => {
      await pushApi(
        'push/test',
        {
          method: 'POST',
          body: JSON.stringify({
            userId: recipientUserId,
            title,
            body,
            data,
          }),
        },
        'Unable to queue this notification.',
      );
    },
    [],
  );

  const sendChatNotification = useCallback(
    async (data: ChatNotificationData) => {
      await postGenericNotification(
        data.userId,
        data.roomType === 'direct' ? data.senderName : `${data.senderName} in ${data.roomName}`,
        data.messageContent,
        {
          roomId: data.roomId,
          senderId: data.senderId,
          messageType: data.messageType,
        },
      );
    },
    [postGenericNotification],
  );

  const sendBookingNotification = useCallback(
    async (data: BookingNotificationData) => {
      await postGenericNotification(
        data.userId,
        `Booking update for ${data.propertyTitle}`,
        data.notificationType.replace(/_/g, ' '),
        data,
      );
    },
    [postGenericNotification],
  );

  const sendPropertyNotification = useCallback(
    async (data: PropertyNotificationData) => {
      await postGenericNotification(
        data.userId,
        `Property update for ${data.propertyTitle}`,
        data.message || data.updateType.replace(/_/g, ' '),
        data,
      );
    },
    [postGenericNotification],
  );

  const sendAdminNotification = useCallback(
    async (data: AdminNotificationData) => {
      if (data.userIds?.length) {
        await Promise.all(
          data.userIds.map((userId) =>
            postGenericNotification(userId, data.title, data.body, data.data || {}),
          ),
        );
      }
    },
    [postGenericNotification],
  );

  const sendSystemAnnouncement = useCallback(async (_data: SystemAnnouncementData) => {}, []);
  const sendHostNotification = useCallback(async (_data: HostNotificationData) => {}, []);
  const sendManagerNotification = useCallback(async (_data: ManagerNotificationData) => {}, []);

  const getNotifications = useCallback(
    async (options?: GetNotificationOptions) => {
      if (!currentUser) return [];

      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', String(options.limit));
      if (options?.unreadOnly) params.set('unread', 'true');
      if (options?.type) params.set('type', options.type);

      const result = await pushApi<{ success: boolean; notifications: any[] }>(
        `notifications/${currentUser.id}${params.toString() ? `?${params.toString()}` : ''}`,
        { method: 'GET' },
        'Unable to load notifications.',
      );

      return result.notifications || [];
    },
    [currentUser],
  );

  const markNotificationAsRead = useCallback(
    async (notificationId: string) => {
      if (!currentUser) return;

      await pushApi(
        `notifications/${currentUser.id}/${notificationId}/read`,
        { method: 'PUT' },
        'Unable to mark notification as read.',
      );

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification,
        ),
      );
    },
    [currentUser],
  );

  const markAllNotificationsAsRead = useCallback(async () => {
    if (!currentUser) return;

    await pushApi(
      `notifications/${currentUser.id}/read-all`,
      { method: 'PUT' },
      'Unable to mark notifications as read.',
    );

    setNotifications((previous) =>
      previous.map((notification) => ({ ...notification, read: true })),
    );
  }, [currentUser]);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!currentUser) return;

      await pushApi(
        `notifications/${currentUser.id}/${notificationId}`,
        { method: 'DELETE' },
        'Unable to delete notification.',
      );

      setNotifications((previous) =>
        previous.filter((notification) => notification.id !== notificationId),
      );
    },
    [currentUser],
  );

  const value: PushNotificationContextType = {
    isSupported,
    permission,
    isEnabled,
    isSubscribed,
    devices,
    notifications,
    unreadCount,
    loadingNotifications,
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
    sendChatNotification,
    sendBookingNotification,
    sendPropertyNotification,
    sendAdminNotification,
    sendSystemAnnouncement,
    sendHostNotification,
    sendManagerNotification,
    getNotifications,
    refreshNotificationInbox,
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
    removeDevice,
  } = usePushNotifications();

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  const getDeviceIcon = (type: DeviceInfo['type']) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  if (!isSupported) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
          <BellOff className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">Notifications not supported</p>
            <p className="text-sm text-muted-foreground">
              This environment does not expose push notifications.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3">
          {isEnabled ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium">Push Notifications</p>
            <p className="text-sm text-muted-foreground">
              Receive chat, booking, and property alerts on this device
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEnabled ? (
            <button
              type="button"
              onClick={() => {
                void sendTestNotification();
              }}
              className="rounded-md bg-secondary px-3 py-1 text-xs text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              Test
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              void toggleNotifications();
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isEnabled ? 'bg-primary' : 'bg-muted-foreground'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {isEnabled ? (
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium">Connected Devices</h3>
            <button
              type="button"
              onClick={() => {
                void refreshDevices();
              }}
              className="text-sm text-primary hover:underline"
            >
              Refresh
            </button>
          </div>

          {devices.length > 0 ? (
            <div className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(device.type)}
                    <div>
                      <p className="text-sm font-medium">{device.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Last seen: {new Date(device.lastSeen).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {device.isActive ? (
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        void removeDevice(device.id);
                      }}
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
              No devices registered yet. Enable notifications to register this device.
            </p>
          )}
        </div>
      ) : null}

      <div className="rounded-lg bg-muted/30 p-4">
        <h4 className="mb-2 font-medium">Status</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Permission</span>
            <span className={permission === 'granted' ? 'text-green-600' : 'text-orange-600'}>
              {permission.charAt(0).toUpperCase() + permission.slice(1)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Subscription</span>
            <span className={isSubscribed ? 'text-green-600' : 'text-orange-600'}>
              {isSubscribed ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
