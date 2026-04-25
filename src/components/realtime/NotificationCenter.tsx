import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Check, X, MessageSquare, Home, DollarSign, Settings, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { useAuth } from '../auth/AuthProvider';
import { useWebSocket } from './WebSocketProvider';
import { toast } from "sonner";
import { projectId, publicAnonKey } from '../../services/supabaseProject';

interface Notification {
  id: string;
  type: 'message' | 'booking' | 'payment' | 'property' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  metadata?: any;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

export function NotificationCenter({ isOpen, onClose, onNotificationClick }: NotificationCenterProps) {
  const { user } = useAuth();
  const { isConnected, subscribe } = useWebSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all');

  // Load notifications from server
  const loadNotifications = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8669f8c6/chat/notifications/${user.id}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Transform chat notifications into notification format
          const transformedNotifications: Notification[] = data.notifications.map((item: any, index: number) => ({
            id: `notif_${index}`,
            type: 'message' as const,
            title: `New message from ${item.message?.senderName || 'Unknown'}`,
            message: item.message?.content?.substring(0, 100) || 'New message received',
            timestamp: item.timestamp,
            read: false,
            priority: 'medium' as const,
            metadata: {
              roomId: item.room?.id,
              messageId: item.message?.id
            }
          }));

          // Add some mock system notifications for demonstration
          const systemNotifications: Notification[] = [
            {
              id: 'system_1',
              type: 'property',
              title: 'New Property Match',
              message: 'We found 3 new properties matching your search criteria in East Legon.',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
              read: false,
              priority: 'medium',
              actionUrl: '/search?location=East+Legon'
            },
            {
              id: 'system_2',
              type: 'booking',
              title: 'Booking Confirmed',
              message: 'Your booking for Modern 3-Bedroom Apartment has been confirmed.',
              timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
              read: true,
              priority: 'high',
              actionUrl: '/dashboard?tab=bookings'
            },
            {
              id: 'system_3',
              type: 'payment',
              title: 'Payment Successful',
              message: 'Your payment of GHS 250,000 has been processed successfully.',
              timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
              read: true,
              priority: 'medium',
              actionUrl: '/dashboard?tab=payments'
            }
          ];

          const allNotifications = [...transformedNotifications, ...systemNotifications]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          setNotifications(allNotifications);
        }
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Subscribe to real-time notifications
  useEffect(() => {
    const unsubscribe = subscribe('notification.new', (data) => {
      const newNotification: Notification = {
        id: `notif_${Date.now()}`,
        type: 'message',
        title: `New message from ${data.message?.senderName || 'Unknown'}`,
        message: data.message?.content?.substring(0, 100) || 'New message received',
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'medium',
        metadata: {
          roomId: data.room?.id,
          messageId: data.message?.id
        }
      };

      setNotifications(prev => [newNotification, ...prev]);
    });

    return unsubscribe;
  }, [subscribe]);

  // Load notifications when component mounts or user changes
  useEffect(() => {
    if (user && isOpen) {
      loadNotifications();
    }
  }, [user, isOpen, loadNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  }, []);

  const handleNotificationClick = useCallback((notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (onNotificationClick) {
      onNotificationClick(notification);
    } else if (notification.actionUrl) {
      // In a real app, you would use proper routing
      console.log('Navigate to:', notification.actionUrl);
    }
    
    onClose();
  }, [markAsRead, onNotificationClick, onClose]);

  const filteredNotifications = notifications.filter(notif => {
    switch (filter) {
      case 'unread':
        return !notif.read;
      case 'important':
        return notif.priority === 'high';
      default:
        return true;
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-4 h-4" />;
      case 'property':
        return <Home className="w-4 h-4" />;
      case 'payment':
        return <DollarSign className="w-4 h-4" />;
      case 'booking':
        return <Bell className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (type: Notification['type'], priority: Notification['priority']) => {
    if (priority === 'high') return 'text-red-500';
    
    switch (type) {
      case 'message':
        return 'text-blue-500';
      case 'property':
        return 'text-green-500';
      case 'payment':
        return 'text-yellow-500';
      case 'booking':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-0 right-0 h-full w-96 bg-background border-l shadow-2xl z-50 flex flex-col"
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-muted-foreground">
                {isConnected ? 'Real-time updates active' : 'Offline mode'}
              </span>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2 mt-4">
              <Button 
                variant={filter === 'all' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button 
                variant={filter === 'unread' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('unread')}
              >
                Unread ({unreadCount})
              </Button>
              <Button 
                variant={filter === 'important' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('important')}
              >
                Important
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
                <Check className="w-3 h-3 mr-1" />
                Mark All Read
              </Button>
              <Button variant="outline" size="sm" onClick={loadNotifications} disabled={loading}>
                Refresh
              </Button>
            </div>
          </CardHeader>

          <Separator />

          <ScrollArea className="flex-1">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {filter === 'unread' ? 'No unread notifications' : 
                   filter === 'important' ? 'No important notifications' : 
                   'No notifications'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredNotifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 hover:bg-muted/50 cursor-pointer border-l-2 ${
                        !notification.read ? 'border-l-primary bg-muted/20' : 'border-l-transparent'
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 ${getNotificationColor(notification.type, notification.priority)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'}`}>
                              {notification.title}
                            </h4>
                            <div className="flex items-center gap-1">
                              {notification.priority === 'high' && (
                                <Badge variant="destructive" className="text-xs px-1">
                                  !
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {formatTime(notification.timestamp)}
                            </span>
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NotificationCenter;
