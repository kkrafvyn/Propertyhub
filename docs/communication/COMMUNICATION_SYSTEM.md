# Communication System - Real-Time Messaging Documentation

## Overview

The PropertyHub Communication System provides real-time messaging capabilities with WhatsApp integration. It enables landlords, tenants, and property managers to communicate effectively about bookings, payments, maintenance, and other property-related matters.

## System Architecture

```
┌──────────────────────────────────────────────────────┐
│      COMMUNICATION & MESSAGING SYSTEM LAYER          │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Messaging   │  │  WhatsApp    │  │ Read       │ │
│  │  Service     │  │  Integration │  │ Receipts   │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───┘ │
│         │                  │                   │      │
│         └──────────────────┼───────────────────┘      │
│                            │                          │
│                   ┌────────▼────────┐                │
│                   │ messageService   │                │
│                   │ (8 modules)      │                │
│                   └────────┬─────────┘                │
│                            │                          │
│              ┌─────────────▼──────────────┐          │
│              │  useMessaging Hook         │          │
│              │  (Complete state mgmt)     │          │
│              └──────────┬─────────┬───────┘          │
│                         │         │                   │
│        ┌────────────────▼┐  ┌─────▼──────────┐      │
│        │ ChatRoom        │  │ ConversationList │      │
│        │ Component       │  │ Component         │      │
│        └────────────────┘  └──────────────────┘      │
│                                                       │
└──────────────────────────────────────────────────────┘
```

## Core Services

### Messaging Service

**Location:** `src/services/messagingService.ts`

#### Modules

##### A. Message Operations
```typescript
// Send, update, delete, and read messages
async sendMessage(conversationId, senderId, content, type, fileData)
async getMessage(messageId)
async getConversationMessages(conversationId, limit, offset)
async updateMessage(messageId, content)
async deleteMessage(messageId)
async markMessageAsRead(messageId, userId)
```

**Message Types:**
- `text` - Plain text messages
- `image` - Image with caption
- `document` - File uploads
- `audio` - Voice messages
- `video` - Video messages

##### B. Conversation Management
```typescript
// Create, retrieve, and manage conversations
async createConversation(participants, type, name)
async getConversation(conversationId)
async getUserConversations(userId)
async getOrCreateDirectConversation(userId1, userId2)
async updateConversation(conversationId, updates)
async archiveConversation(conversationId)
async toggleConversationMute(conversationId, muted)
```

**Conversation Types:**
- `direct` - 1-to-1 messaging
- `group` - Multi-person conversations

##### C. Notification System
```typescript
// In-app notifications for messages
async createNotification(userId, type, title, description, data)
async getUserNotifications(userId)
async markNotificationAsRead(notificationId)
```

##### D. Real-Time Subscriptions
```typescript
// Real-time message and typing updates
subscribeToConversation(conversationId, callback)
subscribeToConversationUpdates(conversationId, callback)
broadcastTyping(conversationId, userId, userName)
```

##### E. Message Search
```typescript
// Full-text search in conversations
async searchMessages(conversationId, query)
```

##### F. WhatsApp Integration
```typescript
// Send messages via WhatsApp
async sendWhatsAppMessage(userId, phoneNumber, message)
async getUserWhatsAppMessages(userId)
```

##### G. Read Receipts
```typescript
// Track message delivery and read status
// Automatically managed via markMessageAsRead
```

##### H. Helper Methods
```typescript
// Utility functions
notifyConversationParticipants()
sendViaWhatsAppAPI()
```

## Custom Hooks

### useMessaging Hook

**Location:** `src/hooks/useMessaging.ts`

```typescript
export interface UseMessagingReturn {
  // State
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  notifications: Notification[];
  typingUsers: Map<string, string>;
  loading: boolean;
  error: Error | null;
  unreadCount: number;
  searchQuery: string;
  searchResults: Message[];

  // Conversation operations
  createConversation: (participants, type?, name?) => Promise<void>;
  selectConversation: (conversationId) => Promise<void>;
  getOrCreateDirectConversation: (userId) => Promise<void>;
  archiveConversation: (conversationId) => Promise<void>;
  toggleMute: (muted) => Promise<void>;

  // Message operations
  sendMessage: (content, type?, file?) => Promise<void>;
  updateMessage: (messageId, content) => Promise<void>;
  deleteMessage: (messageId) => Promise<void>;
  markMessageAsRead: (messageId) => Promise<void>;

  // Notification operations
  getNotifications: (userId) => Promise<void>;
  markNotificationAsRead: (notificationId) => Promise<void>;

  // Utility operations
  loadConversations: (userId) => Promise<void>;
  loadMessages: (conversationId, limit?, offset?) => Promise<void>;
  searchMessages: (query) => Promise<void>;
  broadcastTyping: (conversationId, userName) => Promise<void>;

  // Cleanup
  clearError: () => void;
  unsubscribe: () => void;
}
```

**Usage:**
```typescript
const {
  conversations,
  currentConversation,
  messages,
  sendMessage,
  selectConversation,
  loadConversations,
} = useMessaging(currentUserId);

// Load conversations on mount
useEffect(() => {
  loadConversations(currentUserId);
}, [currentUserId]);

// Select conversation to view
const handleSelectConversation = async (convId) => {
  await selectConversation(convId);
};

// Send message
const handleSendMessage = async (text) => {
  await sendMessage(text, 'text');
};
```

## UI Components

### 1. ChatRoom Component

**Location:** `src/components/ChatRoom.tsx`

**Props:**
```typescript
interface ChatRoomProps {
  conversationId: string;
  currentUserId: string;
  onArchive?: () => void;
  onClose?: () => void;
}
```

**Features:**
- Message display with timestamps
- Real-time message updates
- Edit messages (sender only)
- Delete messages (sender only)
- Message status indicators (sent, delivered, read)
- Typing indicators
- Date separators
- File upload support
- Read receipts
- Message search

**Usage:**
```typescript
<ChatRoom
  conversationId={selectedConvId}
  currentUserId={userId}
  onArchive={handleArchive}
  onClose={handleClose}
/>
```

### 2. ConversationList Component

**Location:** `src/components/ConversationList.tsx`

**Props:**
```typescript
interface ConversationListProps {
  currentUserId: string;
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId?: string;
}
```

**Features:**
- List all conversations
- Search conversations
- Create new direct messages
- Unread message count badges
- Last message preview
- Mute/unmute conversations
- Archive conversations
- Time-based sorting (Recent first)
- Typing indicators

**Usage:**
```typescript
<ConversationList
  currentUserId={userId}
  onSelectConversation={handleSelectConversation}
  selectedConversationId={selectedId}
/>
```

### 3. Messaging Hub (Combined)

**Full messaging interface combining ChatRoom and ConversationList:**
```typescript
export const MessagingHub = ({ userId }) => {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  return (
    <div className="flex h-screen">
      <div className="w-64">
        <ConversationList
          currentUserId={userId}
          onSelectConversation={setSelectedConvId}
          selectedConversationId={selectedConvId}
        />
      </div>
      <div className="flex-1">
        {selectedConvId && (
          <ChatRoom
            conversationId={selectedConvId}
            currentUserId={userId}
          />
        )}
      </div>
    </div>
  );
};
```

## Type Definitions

```typescript
// Message
interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  sender_avatar?: string;
  content: string;
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  read_by?: string[];
}

// Conversation
interface Conversation {
  id: string;
  participants: string[];
  participant_names?: string[];
  participant_avatars?: string[];
  type: 'direct' | 'group';
  name?: string;
  description?: string;
  avatar?: string;
  last_message?: Message;
  last_message_at: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
  archived: boolean;
  muted: boolean;
}

// Notification
interface Notification {
  id: string;
  user_id: string;
  type: 'message' | 'mention' | 'reaction' | 'whatsapp';
  title: string;
  description: string;
  data: any;
  read: boolean;
  created_at: string;
}

// Read Receipt
interface ReadReceipt {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

// Typing Indicator
interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  user_name: string;
  started_at: string;
}

// WhatsApp Message
interface WhatsAppMessage {
  id: string;
  user_id: string;
  phone_number: string;
  message: string;
  direction: 'inbound' | 'outbound';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  external_id?: string;
  created_at: string;
}
```

## Database Schema

```sql
-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  participants TEXT[] NOT NULL,
  participant_names TEXT[],
  participant_avatars TEXT[],
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255),
  description TEXT,
  avatar TEXT,
  unread_count INTEGER DEFAULT 0,
  archived BOOLEAN DEFAULT FALSE,
  muted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_name VARCHAR(255),
  sender_avatar TEXT,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',
  file_url TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,
  status VARCHAR(50) DEFAULT 'sent',
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_by UUID[]
);

-- Read Receipts
CREATE TABLE read_receipts (
  id UUID PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id, user_id)
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- WhatsApp Messages
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  direction VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  external_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_conversations_participants ON conversations USING GIN (participants);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_read_receipts_message ON read_receipts(message_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);
CREATE INDEX idx_whatsapp_user ON whatsapp_messages(user_id);
```

## API Endpoints

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/api/messages/conversations/:userId` | GET | List conversations | Pending |
| `/api/messages/conversation/:conversationId/messages` | GET | Get messages | Pending |
| `/api/messages/send` | POST | Send message | Pending |
| `/api/messages/:messageId/edit` | PUT | Edit message | Pending |
| `/api/messages/:messageId/delete` | DELETE | Delete message | Pending |
| `/api/messages/:messageId/read` | POST | Mark as read | Pending |
| `/api/messages/conversations/create` | POST | Create conversation | Pending |
| `/api/messages/conversations/:conversationId/archive` | POST | Archive conversation | Pending |
| `/api/messages/conversations/:conversationId/mute` | POST | Mute conversation | Pending |
| `/api/messages/search` | GET | Search messages | Pending |
| `/api/whatsapp/send` | POST | Send WhatsApp message | Pending |
| `/api/whatsapp/webhook` | POST | WhatsApp webhook | Pending |
| `/api/notifications/:userId` | GET | Get notifications | Pending |

## Key Features

### Real-Time Messaging
- Instant message delivery
- Typing indicators
- Read receipts
- Online/offline status
- Message timestamps

### Message Features
- Text messages
- File attachments
- Image sharing
- Edit/delete capability
- Search functionality
- Message reactions (future)

### Conversation Management
- Direct messaging
- Group conversations
- Archive/unarchive
- Mute/unmute notifications
- Conversation search
- Participant management

### WhatsApp Integration
- Send messages via WhatsApp
- Receive WhatsApp messages
- Link WhatsApp to property bookings
- Notification forwarding
- Message bridging (optional)

### Notifications
- In-app notifications
- Message previews
- Unread count
- Notification dismissal
- Sound/vibration alerts

### Accessibility
- Real-time updates
- Timestamp information
- Message status indicators
- Read indicators
- Typing indicators

## Security Features

### Data Protection
- End-to-end encryption (future)
- Message encryption at rest
- Secure file transfers
- Access control per conversation

### Privacy
- Conversation-scoped access
- Message visibility controls
- Participant privacy
- Report/block functionality (future)

### Compliance
- GDPR-compliant message retention
- Data export capability
- Right to be forgotten
- Message archival

## Performance Optimization

### Caching
- Conversation list caching
- Message pagination
- Lazy loading
- Real-time sync optimization

### Database
- Indexed message queries
- Conversation indexing
- Efficient pagination
- Connection pooling

## Implementation Roadmap

### Phase 1: Foundation (Complete)
- ✅ Service layer implementation
- ✅ Hook implementation
- ✅ UI components (ChatRoom, ConversationList)
- ✅ Real-time subscriptions

### Phase 2: Backend (Pending)
- API endpoints implementation
- Database setup
- Real-time server (Socket.io, WebSocket)
- WhatsApp API integration

### Phase 3: Advanced Features (Future)
- Voice messages
- Video calling
- Group notifications
- Message encryption
- File storage optimization
- Message reactions
- Forwarding
- Scheduled messages

---

**Status:** Frontend Complete (90%), Backend Pending  
**Created:** 2024-01-15  
**Feature #:** 5 of 5 (Last major feature)  
**Lines of Code:** 1,500+ (frontend)
