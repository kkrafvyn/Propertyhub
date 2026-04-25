import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Bell, X, Check, AlertCircle, Info, MessageSquare, Heart, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { toast } from 'sonner';

export type NotificationType = 'message' | 'alert' | 'booking' | 'payment' | 'system' | 'property' | 'review';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: Date;
  expiresAt?: Date;
  icon?: React.ReactNode;
  avatar?: string;
  data?: Record<string, any>;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  soundEnabled: boolean;
  doNotDisturb: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  typePreferences: Record<NotificationType, boolean>;
}

const NOTIFICATIONS_STORAGE_KEY = 'realestate_notifications';
const PREFERENCES_STORAGE_KEY = 'realestate_notification_prefs';

// Default preferences
const DEFAULT_PREFERENCES: NotificationPreferences = {
  email: true,
  push: true,
  inApp: true,
  soundEnabled: true,
  doNotDisturb: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
  },
  typePreferences: {
    message: true,
    alert: true,
    booking: true,
    payment: true,
    system: true,
    property: true,
    review: true,
  },
};

// Notification hook
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load from storage
  useEffect(() => {
    const savedNotifications = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    const savedPreferences = localStorage.getItem(PREFERENCES_STORAGE_KEY);

    if (savedNotifications) {
      const parsed = JSON.parse(savedNotifications);
      setNotifications(parsed);
      setUnreadCount(parsed.filter((n: Notification) => !n.read).length);
    }
    if (savedPreferences) {
      setPreferences(JSON.parse(savedPreferences));
    }
  }, []);

  // Save to storage
  useEffect(() => {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const createNotification = useCallback((
    notification: Omit<Notification, 'id' | 'createdAt' | 'read'>
  ) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}`,
      createdAt: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Play sound if enabled
    if (preferences.soundEnabled && !isInDoNotDisturb(preferences)) {
      playNotificationSound();
    }

    return newNotification;
  }, [preferences]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const updatePreferences = useCallback((updates: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    notifications,
    unreadCount,
    preferences,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    updatePreferences,
  };
};

// Helper functions
const isInDoNotDisturb = (preferences: NotificationPreferences): boolean => {
  if (!preferences.doNotDisturb.enabled) return false;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  return currentTime >= preferences.doNotDisturb.startTime &&
         currentTime <= preferences.doNotDisturb.endTime;
};

const playNotificationSound = () => {
  // Simple beep sound
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.frequency.value = 800;
  oscillator.type = 'sine';

  gain.gain.setValueAtTime(0.3, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
};

const getNotificationIcon = (type: NotificationType) => {
  const iconProps = { className: 'w-5 h-5' };
  
  switch (type) {
    case 'message':
      return <MessageSquare {...iconProps} />;
    case 'alert':
      return <AlertCircle {...iconProps} />;
    case 'booking':
      return <MapPin {...iconProps} />;
    case 'property':
      return <MapPin {...iconProps} />;
    case 'review':
      return <Heart {...iconProps} />;
    default:
      return <Info {...iconProps} />;
  }
};

const getPriorityColor = (priority: NotificationPriority) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-50 border-red-200';
    case 'high':
      return 'bg-orange-50 border-orange-200';
    case 'medium':
      return 'bg-yellow-50 border-yellow-200';
    default:
      return 'bg-blue-50 border-blue-200';
  }
};

// Notification Item Component
const NotificationItem: React.FC<{
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ notification, onMarkAsRead, onDelete }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
          getPriorityColor(notification.priority)
        } ${!notification.read ? 'border-current' : ''}`}
        onClick={() => !notification.read && onMarkAsRead(notification.id)}
      >
        <div className="flex items-start gap-3">
          <div className="text-gray-700 mt-1">
            {notification.icon || getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm text-gray-900">
                {notification.title}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.id);
                }}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-700 mt-1">{notification.message}</p>
            <div className="flex items-center justify-between mt-2 gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {notification.type}
                </Badge>
                {notification.priority !== 'low' && (
                  <Badge variant="outline" className="text-xs">
                    {notification.priority}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {formatTime(notification.createdAt)}
              </span>
            </div>
            {notification.actionUrl && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = notification.actionUrl!;
                }}
              >
                {notification.actionLabel || 'View'}
              </Button>
            )}
          </div>
          {!notification.read && (
            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Notification Center Component
export const NotificationCenter: React.FC<{
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}> = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
}) => {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationType | 'all'>('all');

  const filteredNotifications =
    filter === 'all'
      ? notifications
      : notifications.filter(n => n.type === filter);

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute right-0 top-12 w-96 max-w-[calc(100vw-1rem)] bg-white rounded-lg shadow-lg border border-gray-200 z-50"
        >
          <div className="max-h-96 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="border-b p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold">Notifications</h2>
                {unreadCount > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onMarkAllAsRead}
                  >
                    Mark all as read
                  </Button>
                )}
              </div>

              {/* Filter */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {(['all', 'message', 'alert', 'booking', 'payment'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      filter === type
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'all' ? 'All' : type}
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto space-y-2 p-4">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications</p>
                </div>
              ) : (
                filteredNotifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={onMarkAsRead}
                    onDelete={onDelete}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t p-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearAll}
                  className="w-full"
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Notification Preferences Component
export const NotificationPreferencesPanel: React.FC<{
  preferences: NotificationPreferences;
  onUpdate: (prefs: Partial<NotificationPreferences>) => void;
}> = ({ preferences, onUpdate }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Channels */}
        <div>
          <h3 className="font-semibold mb-3">Notification Channels</h3>
          <div className="space-y-3">
            {[
              { key: 'email', label: 'Email Notifications' },
              { key: 'push', label: 'Push Notifications' },
              { key: 'inApp', label: 'In-App Notifications' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences[key as keyof NotificationPreferences] as boolean}
                  onChange={(e) =>
                    onUpdate({ [key]: e.target.checked })
                  }
                  className="w-4 h-4 rounded"
                />
                <span className="ml-3 text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Sound */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.soundEnabled}
              onChange={(e) => onUpdate({ soundEnabled: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="ml-3 text-sm">Sound Notifications</span>
          </label>
        </div>

        {/* Do Not Disturb */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferences.doNotDisturb.enabled}
              onChange={(e) =>
                onUpdate({
                  doNotDisturb: {
                    ...preferences.doNotDisturb,
                    enabled: e.target.checked,
                  },
                })
              }
              className="w-4 h-4 rounded"
            />
            Do Not Disturb
          </h3>
          {preferences.doNotDisturb.enabled && (
            <div className="space-y-3 ml-8">
              <div>
                <label className="block text-sm mb-1">Start Time</label>
                <input
                  type="time"
                  value={preferences.doNotDisturb.startTime}
                  onChange={(e) =>
                    onUpdate({
                      doNotDisturb: {
                        ...preferences.doNotDisturb,
                        startTime: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">End Time</label>
                <input
                  type="time"
                  value={preferences.doNotDisturb.endTime}
                  onChange={(e) =>
                    onUpdate({
                      doNotDisturb: {
                        ...preferences.doNotDisturb,
                        endTime: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>
          )}
        </div>

        {/* Type Preferences */}
        <div>
          <h3 className="font-semibold mb-3">Notification Types</h3>
          <div className="space-y-2">
            {Object.entries(preferences.typePreferences).map(([type, enabled]) => (
              <label key={type} className="flex items-center">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) =>
                    onUpdate({
                      typePreferences: {
                        ...preferences.typePreferences,
                        [type]: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded"
                />
                <span className="ml-3 text-sm capitalize">{type} Notifications</span>
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const formatTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export default NotificationCenter;
