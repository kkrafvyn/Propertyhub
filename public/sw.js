// PropertyHub Service Worker - Comprehensive Push Notifications
const CACHE_NAME = 'propertyhub-v1.0.3';
const urlsToCache = [
  '/',
  '/offline.html',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    ).catch(() => {
      // If both cache and network fail, show offline page for navigation requests
      if (event.request.destination === 'document') {
        return caches.match('/offline.html');
      }
    })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Push event - handle comprehensive push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  let notificationData;
  
  try {
    notificationData = event.data ? event.data.json() : {};
  } catch (error) {
    console.error('Error parsing push notification data:', error);
    notificationData = {
      title: 'PropertyHub',
      body: 'You have a new notification',
      icon: '/icon-192x192.png'
    };
  }

  const {
    title = 'PropertyHub',
    body = 'You have a new notification',
    icon = '/icon-192x192.png',
    badge = '/icon-192x192.png',
    data = {},
    actions = [],
    tag,
    requireInteraction = false,
    silent = false
  } = notificationData;

  // Customize notification based on type
  let finalTitle = title;
  let finalBody = body;
  let finalIcon = icon;
  let finalActions = [...actions];
  let finalTag = tag || `propertyhub-${Date.now()}`;

  // Handle different notification types
  switch (data.type) {
    case 'chat_message':
      finalIcon = data.senderAvatar || icon;
      finalActions = [
        {
          action: 'reply',
          title: 'Reply',
          icon: '/icon-192x192.png'
        },
        {
          action: 'mark_read',
          title: 'Mark Read',
          icon: '/icon-192x192.png'
        }
      ];
      finalTag = `chat-${data.roomId}`;
      break;

    case 'booking_notification':
      finalActions = [
        {
          action: 'view_booking',
          title: 'View Booking',
          icon: '/icon-192x192.png'
        }
      ];
      finalTag = `booking-${data.bookingId}`;
      break;

    case 'property_update':
      finalActions = [
        {
          action: 'view_property',
          title: 'View Property',
          icon: '/icon-192x192.png'
        }
      ];
      finalTag = `property-${data.propertyId}`;
      break;

    case 'admin_notification':
    case 'system_announcement':
      finalActions = [
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icon-192x192.png'
        }
      ];
      break;

    case 'host_notification':
      finalActions = [
        {
          action: 'respond',
          title: 'Respond',
          icon: '/icon-192x192.png'
        }
      ];
      break;

    case 'manager_notification':
      finalActions = [
        {
          action: 'manage',
          title: 'Manage',
          icon: '/icon-192x192.png'
        }
      ];
      break;

    case 'test':
      finalTitle = '🚀 Test Notification';
      finalBody = 'Push notifications are working perfectly!';
      finalActions = [];
      break;
  }

  const notificationOptions = {
    body: finalBody,
    icon: finalIcon,
    badge: badge,
    data: {
      ...data,
      timestamp: new Date().toISOString(),
      clickUrl: self.location.origin
    },
    actions: finalActions.slice(0, 2), // Chrome supports max 2 actions
    tag: finalTag,
    requireInteraction: requireInteraction,
    silent: silent,
    vibrate: [200, 100, 200], // Vibration pattern for mobile
    renotify: true // Show notification even if one with same tag exists
  };

  event.waitUntil(
    self.registration.showNotification(finalTitle, notificationOptions)
  );
});

// Notification click event - handle comprehensive actions
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);

  const { notification, action } = event;
  const { data } = notification;

  event.notification.close();

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      let client = clients.find(c => c.url === self.location.origin && c.focused);
      
      if (!client) {
        client = clients.find(c => c.url === self.location.origin);
      }

      // Handle different actions
      switch (action) {
        case 'reply':
          if (data.roomId) {
            const chatUrl = `${self.location.origin}?action=chat&room=${data.roomId}`;
            if (client) {
              client.focus();
              client.postMessage({
                type: 'NAVIGATE_TO_CHAT',
                roomId: data.roomId
              });
            } else {
              await self.clients.openWindow(chatUrl);
            }
          }
          break;

        case 'mark_read':
          if (data.roomId) {
            // Send message to mark as read
            if (client) {
              client.postMessage({
                type: 'MARK_CHAT_READ',
                roomId: data.roomId
              });
            }
          }
          break;

        case 'view_booking':
          if (data.bookingId) {
            const bookingUrl = `${self.location.origin}?action=dashboard&tab=bookings&booking=${data.bookingId}`;
            if (client) {
              client.focus();
              client.postMessage({
                type: 'NAVIGATE_TO_BOOKING',
                bookingId: data.bookingId
              });
            } else {
              await self.clients.openWindow(bookingUrl);
            }
          }
          break;

        case 'view_property':
          if (data.propertyId) {
            const propertyUrl = `${self.location.origin}?action=search&property=${data.propertyId}`;
            if (client) {
              client.focus();
              client.postMessage({
                type: 'NAVIGATE_TO_PROPERTY',
                propertyId: data.propertyId
              });
            } else {
              await self.clients.openWindow(propertyUrl);
            }
          }
          break;

        case 'make_payment':
          if (data.bookingId) {
            const paymentUrl = `${self.location.origin}?action=payment&booking=${data.bookingId}`;
            if (client) {
              client.focus();
              client.postMessage({
                type: 'NAVIGATE_TO_PAYMENT',
                bookingId: data.bookingId
              });
            } else {
              await self.clients.openWindow(paymentUrl);
            }
          }
          break;

        case 'respond':
        case 'manage':
          if (client) {
            client.focus();
            client.postMessage({
              type: 'HANDLE_NOTIFICATION_ACTION',
              action: action,
              data: data
            });
          } else {
            await self.clients.openWindow(self.location.origin);
          }
          break;

        case 'dismiss':
          // Just close the notification (already done above)
          break;

        default:
          // Default action - just open the app
          if (client) {
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              action: action || 'default',
              data: data
            });
          } else {
            let targetUrl = data.clickUrl || self.location.origin;
            
            // Add context parameters based on notification type
            if (data.type === 'chat_message' && data.roomId) {
              targetUrl += `?action=chat&room=${data.roomId}`;
            } else if (data.type === 'booking_notification' && data.bookingId) {
              targetUrl += `?action=dashboard&tab=bookings&booking=${data.bookingId}`;
            } else if (data.type === 'property_update' && data.propertyId) {
              targetUrl += `?action=search&property=${data.propertyId}`;
            }
            
            await self.clients.openWindow(targetUrl);
          }
      }
    })()
  );
});

// Background sync event - for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'background-messages') {
    event.waitUntil(syncMessages());
  } else if (event.tag === 'background-notifications') {
    event.waitUntil(syncNotifications());
  }
});

// Helper function to sync messages when back online
async function syncMessages() {
  try {
    // Get pending messages from IndexedDB
    const pendingMessages = await getPendingMessages();
    
    for (const message of pendingMessages) {
      try {
        await fetch('/api/messages/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(message)
        });
        
        // Remove from pending messages
        await removePendingMessage(message.id);
      } catch (error) {
        console.error('Failed to sync message:', error);
      }
    }
  } catch (error) {
    console.error('Error syncing messages:', error);
  }
}

// Helper function to sync notifications when back online
async function syncNotifications() {
  try {
    // Fetch latest notifications
    const response = await fetch('/api/notifications');
    const notifications = await response.json();
    
    // Store in IndexedDB for offline access
    await storeNotifications(notifications);
  } catch (error) {
    console.error('Error syncing notifications:', error);
  }
}

// IndexedDB helper functions (simplified)
async function getPendingMessages() {
  // This would interact with IndexedDB to get pending messages
  return [];
}

async function removePendingMessage(messageId) {
  // This would remove a message from IndexedDB
  console.log('Removing pending message:', messageId);
}

async function storeNotifications(notifications) {
  // This would store notifications in IndexedDB
  console.log('Storing notifications:', notifications.length);
}

// Push subscription change event
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed:', event);

  event.waitUntil(
    (async () => {
      try {
        const newSubscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: await getVapidKey()
        });

        // Update subscription on server
        await fetch('/api/push/update-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            oldEndpoint: event.oldSubscription?.endpoint,
            newSubscription: newSubscription
          })
        });
      } catch (error) {
        console.error('Error handling subscription change:', error);
      }
    })()
  );
});

// Helper function to get VAPID key
async function getVapidKey() {
  try {
    const response = await fetch('/api/push/vapid-key');
    const data = await response.json();
    return urlBase64ToUint8Array(data.publicKey);
  } catch (error) {
    console.error('Error getting VAPID key:', error);
    return null;
  }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Message event - handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('Service worker received message:', event.data);

  const { type, data } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
    
    case 'CLEAR_CACHE':
      caches.delete(CACHE_NAME).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
    
    case 'UPDATE_BADGE_COUNT':
      if (self.navigator.setAppBadge) {
        self.navigator.setAppBadge(data.count || 0);
      }
      break;
    
    case 'CLEAR_BADGE':
      if (self.navigator.clearAppBadge) {
        self.navigator.clearAppBadge();
      }
      break;
    
    default:
      console.log('Unknown message type:', type);
  }
});

// Error event - global error handler
self.addEventListener('error', (event) => {
  console.error('Service worker error:', event);
});

// Unhandled rejection event
self.addEventListener('unhandledrejection', (event) => {
  console.error('Service worker unhandled rejection:', event);
  event.preventDefault();
});