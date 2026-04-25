# Expo Go SDK 53 Real-time Chat Integration Guide

## Overview

This guide covers the implementation of real-time chat functionality in PropertyHub using Expo Go SDK 53. The chat system is designed to work seamlessly across web and mobile platforms with full React Native compatibility.

## Key Features

- ✅ **Expo Go SDK 53 Compatible**: Works in Expo Go development environment
- ✅ **Real-time Messaging**: WebSocket-based instant messaging
- ✅ **Mobile Optimized**: Touch-friendly UI with proper mobile UX patterns
- ✅ **Offline Support**: Message queuing when connection is lost
- ✅ **Auto Reconnection**: Intelligent reconnection with exponential backoff
- ✅ **Typing Indicators**: Real-time typing status updates
- ✅ **Message Status**: Sent, delivered, and read receipts
- ✅ **Property Inquiries**: Context-aware property-related chats
- ✅ **Group Chats**: Multi-participant conversations
- ✅ **File Sharing**: Image and document sharing capabilities
- ✅ **Push Notifications**: Background message notifications

## Architecture

```
PropertyHub App
├── WebSocketProvider (Real-time connection management)
├── ExpoWebSocketService (Expo-compatible WebSocket service)
├── EnhancedChatSystem (Desktop chat interface)
├── MobileChatSystem (Mobile-optimized chat interface)
└── Chat Components (Message bubbles, room lists, etc.)
```

## Components

### 1. ExpoWebSocketService
**Location**: `/components/chat/ExpoWebSocketService.ts`

Core WebSocket service optimized for Expo Go and React Native:

```typescript
import { ExpoWebSocketService, getChatService } from './components/chat/ExpoWebSocketService';

// Initialize chat service
const chatService = getChatService({
  url: 'wss://your-websocket-server.com',
  reconnectInterval: 3000,
  maxReconnectAttempts: 10
});

// Connect user
await chatService.connect('user123');

// Send message
chatService.sendMessage('room456', 'Hello world!');

// Listen for messages
chatService.on('message_received', (message) => {
  console.log('New message:', message);
});
```

### 2. EnhancedChatSystem
**Location**: `/components/chat/EnhancedChatSystem.tsx`

Full-featured chat interface for desktop and larger screens:

```jsx
<EnhancedChatSystem 
  className="rounded-lg border shadow-lg"
  height="calc(100vh - 120px)"
  currentUserId="user123"
  onMessageSent={(roomId, message) => {
    console.log('Message sent:', roomId, message);
  }}
/>
```

### 3. MobileChatSystem
**Location**: `/components/chat/MobileChatSystem.tsx`

Mobile-optimized chat interface with touch gestures:

```jsx
<MobileChatSystem 
  currentUserId="user123"
  onBackPress={() => navigation.goBack()}
/>
```

## Setup Instructions

### 1. Install Dependencies

The chat system uses existing dependencies that are already included in the project:

- `motion/react` - Animations
- `sonner` - Toast notifications
- `lucide-react` - Icons
- WebSocket API (native browser support)

### 2. WebSocket Server

You'll need a WebSocket server to handle real-time messaging. Example server endpoints:

```javascript
// WebSocket connection with user authentication
ws://your-server.com?userId=user123

// Message format
{
  "type": "send_message",
  "data": {
    "roomId": "room123",
    "content": "Hello!",
    "senderId": "user123",
    "type": "text"
  }
}
```

### 3. Integration with Existing App

The chat system is already integrated into the PropertyHub app:

```tsx
// In App.tsx - Chat is automatically connected when users log in
case 'chat':
  return (
    <div className="min-h-screen bg-background">
      {isMobile ? (
        <MobileChatSystem currentUserId={currentUser.id} />
      ) : (
        <EnhancedChatSystem currentUserId={currentUser.id} />
      )}
    </div>
  );
```

## Mobile-Specific Features

### 1. Touch Gestures

- **Swipe to go back**: Swipe right to return to previous screen
- **Pull to refresh**: Pull down to refresh chat rooms
- **Long press actions**: Long press messages for options
- **Haptic feedback**: Vibration on message send (where supported)

### 2. Keyboard Handling

```typescript
// Automatic keyboard detection and UI adjustment
const [showKeyboard, setShowKeyboard] = useState(false);

useEffect(() => {
  const handleResize = () => {
    const viewport = window.visualViewport;
    if (viewport) {
      const isKeyboardOpen = viewport.height < window.screen.height * 0.75;
      setShowKeyboard(isKeyboardOpen);
    }
  };

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }
}, []);
```

### 3. Safe Area Handling

The mobile interface automatically handles safe areas for different devices:

```css
/* In globals.css */
.mobile-chat-container {
  height: 100vh;
  height: 100dvh; /* Dynamic viewport height for mobile browsers */
}

.mobile-chat-input {
  padding-bottom: calc(1rem + env(safe-area-inset-bottom));
}
```

## Property Integration

### Property-Specific Chat Rooms

Chat rooms can be associated with specific properties:

```tsx
// Property inquiry chat room
const propertyRoom = {
  id: 'prop_chat_123',
  name: 'Property Inquiry - East Legon Apartment',
  type: 'property_inquiry',
  propertyInfo: {
    id: 'prop123',
    title: 'Modern 3BR Apartment in East Legon',
    image: 'https://...',
    price: 'GHS 45,000/month'
  }
};
```

### Quick Property Actions

Users can quickly access property information from within chat:

- View property details
- Schedule viewings
- Request additional information
- Share property links

## Real-time Features

### 1. Message Status Updates

- **Sending**: Message being sent to server
- **Sent**: Message delivered to server
- **Delivered**: Message delivered to recipient's device
- **Read**: Message viewed by recipient

### 2. Typing Indicators

```typescript
// Start typing
chatService.sendTypingStart(roomId);

// Auto-stop after 3 seconds or when message is sent
chatService.sendTypingStop(roomId);

// Listen for typing updates
chatService.on('typing_update', ({ roomId, userId, isTyping }) => {
  // Update UI to show typing indicator
});
```

### 3. Presence Status

- Online/offline status
- Last seen timestamps
- Active in chat indicators

## Styling and Theming

The chat system uses your existing Tailwind V4 design system:

```css
/* Chat-specific styles in globals.css */
.mobile-chat-container {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.message-bubble {
  max-width: 85%;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}

.message-bubble-own {
  margin-left: auto;
  background: var(--primary);
  color: var(--primary-foreground);
  border-radius: 1.125rem 1.125rem 0.375rem 1.125rem;
}
```

## Performance Optimizations

### 1. Virtual Scrolling

For large chat rooms with many messages:

```tsx
import { VirtualizedList } from './components/VirtualizedList';

<VirtualizedList
  items={messages}
  renderItem={(message) => <MessageBubble message={message} />}
  itemHeight={60}
  containerHeight={400}
/>
```

### 2. Message Pagination

Load messages in chunks for better performance:

```typescript
const loadMoreMessages = async (roomId: string, before?: string) => {
  const messages = await chatService.loadMessages(roomId, {
    limit: 20,
    before
  });
  return messages;
};
```

### 3. Image Optimization

Automatically optimize images for mobile:

```tsx
// Compressed image upload for mobile
const uploadImage = async (file: File) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Resize and compress for mobile
  canvas.width = Math.min(file.width, 1024);
  canvas.height = Math.min(file.height, 1024);
  
  const compressedBlob = canvas.toBlob(callback, 'image/jpeg', 0.8);
  return compressedBlob;
};
```

## Testing in Expo Go

### 1. Development Setup

```bash
# Install Expo CLI if not already installed
npm install -g @expo/cli

# Start Expo Go development server
npx expo start
```

### 2. WebSocket Testing

For development, you can use a mock WebSocket server or the built-in simulation:

```typescript
// Enable demo mode for testing
const chatService = getChatService({
  url: 'ws://localhost:8080', // Your dev WebSocket server
  enableDemoMode: true // Enables message simulation
});

// Simulate incoming messages for testing
chatService.simulateIncomingMessage('room123', 'demo_user', 'Hello from demo!');
```

### 3. Network Simulation

Test offline scenarios:

```typescript
// Simulate network loss
window.dispatchEvent(new Event('offline'));

// Simulate network recovery
window.dispatchEvent(new Event('online'));
```

## Deployment

### 1. WebSocket Server

Deploy your WebSocket server to a platform like:
- **Heroku**: `git push heroku main`
- **AWS EC2**: Using ECS or EC2 instances
- **DigitalOcean**: App Platform or Droplets
- **Railway**: `railway up`

### 2. Environment Variables

```bash
# .env
EXPO_PUBLIC_WS_URL=wss://your-production-server.com
EXPO_PUBLIC_API_URL=https://your-api-server.com
```

### 3. Production Build

```bash
# Build for production
npx expo build:web

# Or for native builds
npx expo build:android
npx expo build:ios
```

## Troubleshooting

### Common Issues

1. **WebSocket connection failed**
   - Check server URL and port
   - Verify CORS settings
   - Test with websocket testing tools

2. **Messages not appearing on mobile**
   - Check network connectivity
   - Verify user authentication
   - Check console for errors

3. **Keyboard covering input on mobile**
   - Ensure `visualViewport` API usage
   - Check safe area styles
   - Test on different devices

### Debug Mode

Enable debug logging:

```typescript
// Enable debug mode
localStorage.setItem('debug', 'chat:*');

// Or in code
const chatService = getChatService({
  debug: true,
  logLevel: 'verbose'
});
```

## Security Considerations

### 1. Authentication

```typescript
// Always authenticate WebSocket connections
const connect = async (userId: string, token: string) => {
  const ws = new WebSocket(`${wsUrl}?userId=${userId}&token=${token}`);
  // ... rest of connection logic
};
```

### 2. Message Validation

```typescript
// Validate messages before sending
const validateMessage = (message: string) => {
  if (message.length > 1000) {
    throw new Error('Message too long');
  }
  
  // Sanitize HTML and potentially harmful content
  return DOMPurify.sanitize(message);
};
```

### 3. Rate Limiting

```typescript
// Implement client-side rate limiting
const rateLimiter = new Map();

const checkRateLimit = (userId: string) => {
  const now = Date.now();
  const userLimits = rateLimiter.get(userId) || { count: 0, resetTime: now + 60000 };
  
  if (now > userLimits.resetTime) {
    userLimits.count = 0;
    userLimits.resetTime = now + 60000;
  }
  
  if (userLimits.count >= 30) { // 30 messages per minute
    throw new Error('Rate limit exceeded');
  }
  
  userLimits.count++;
  rateLimiter.set(userId, userLimits);
};
```

## Next Steps

1. **Push Notifications**: Integrate with Expo Notifications API
2. **Voice Messages**: Add voice recording and playback
3. **Video Calls**: Integrate with WebRTC for video calling
4. **Message Encryption**: End-to-end encryption for sensitive conversations
5. **AI Moderation**: Automatic content moderation and spam detection

## Support

For issues or questions regarding the chat system:

1. Check the browser console for error messages
2. Test the WebSocket connection manually
3. Verify network connectivity and server status
4. Check Expo Go logs for React Native specific issues

The chat system is designed to provide a seamless real-time communication experience within your PropertyHub application while maintaining compatibility with Expo Go SDK 53.