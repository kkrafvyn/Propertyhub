/**
 * PropertyHub Mobile - WebSocket Service
 * 
 * Handles real-time communication with the PropertyHub WebSocket server
 * Features:
 * - Chat messaging
 * - Property updates
 * - User presence
 * - Push notifications
 * - File sharing
 * - Voice messages
 * 
 * @author PropertyHub Mobile Team
 * @version 1.0.0
 */

import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'user' | 'host' | 'manager' | 'admin';
}

interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'image' | 'voice' | 'file';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  encrypted?: boolean;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number; // for voice messages
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'property';
  participants: User[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  propertyId?: string;
}

interface PropertyUpdate {
  id: string;
  type: 'price_change' | 'status_change' | 'new_images' | 'availability';
  propertyId: string;
  data: any;
  timestamp: Date;
}

// Event types
type WebSocketEvents = {
  // Authentication
  'user:authenticate': (data: { token: string; userId: string }) => void;
  'user:authenticated': (data: { success: boolean; user?: User }) => void;
  
  // Chat events
  'chat:join_room': (data: { roomId: string }) => void;
  'chat:leave_room': (data: { roomId: string }) => void;
  'chat:send_message': (data: ChatMessage) => void;
  'chat:message_received': (data: ChatMessage) => void;
  'chat:message_status': (data: { messageId: string; status: string }) => void;
  'chat:typing_start': (data: { roomId: string; userId: string; userName: string }) => void;
  'chat:typing_stop': (data: { roomId: string; userId: string }) => void;
  'chat:user_joined': (data: { roomId: string; user: User }) => void;
  'chat:user_left': (data: { roomId: string; userId: string }) => void;
  
  // Property events
  'property:subscribe': (data: { propertyId: string }) => void;
  'property:unsubscribe': (data: { propertyId: string }) => void;
  'property:update': (data: PropertyUpdate) => void;
  
  // Presence events
  'presence:online': (data: { userId: string }) => void;
  'presence:offline': (data: { userId: string }) => void;
  'presence:status': (data: { userId: string; status: 'online' | 'offline' | 'away' }) => void;
  
  // Notification events
  'notification:send': (data: { title: string; body: string; data?: any }) => void;
  'notification:received': (data: any) => void;
};

/**
 * WebSocket Service Class
 * Manages real-time connections and messaging
 */
class WebSocketService {
  private socket: Socket | null = null;
  private serverUrl: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private eventHandlers: Map<string, Function[]> = new Map();
  private currentUser: User | null = null;

  constructor(serverUrl: string = 'ws://localhost:3001') {
    this.serverUrl = serverUrl;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(user: User): Promise<void> {
    if (this.socket?.connected) {
      console.log('✅ WebSocket already connected');
      return;
    }

    try {
      console.log('🔌 Connecting to WebSocket server:', this.serverUrl);
      
      this.currentUser = user;
      
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
        auth: {
          userId: user.id,
          token: await this.getAuthToken(),
        },
      });

      this.setupEventHandlers();
      
      return new Promise((resolve, reject) => {
        this.socket!.on('connect', () => {
          console.log('✅ WebSocket connected successfully');
          this.reconnectAttempts = 0;
          this.authenticate();
          resolve();
        });

        this.socket!.on('connect_error', (error) => {
          console.error('❌ WebSocket connection error:', error);
          this.handleReconnection();
          reject(error);
        });
      });
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting WebSocket');
      this.socket.disconnect();
      this.socket = null;
      this.currentUser = null;
      this.eventHandlers.clear();
    }
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected, don't reconnect automatically
        return;
      }
      this.handleReconnection();
    });

    // Authentication events
    this.socket.on('user:authenticated', (data) => {
      console.log('✅ User authenticated:', data);
      this.emit('authenticated', data);
    });

    // Chat events
    this.socket.on('chat:message_received', (message: ChatMessage) => {
      console.log('💬 Message received:', message);
      this.handleIncomingMessage(message);
      this.emit('message_received', message);
    });

    this.socket.on('chat:typing_start', (data) => {
      this.emit('typing_start', data);
    });

    this.socket.on('chat:typing_stop', (data) => {
      this.emit('typing_stop', data);
    });

    this.socket.on('chat:message_status', (data) => {
      this.emit('message_status', data);
    });

    // Property events
    this.socket.on('property:update', (update: PropertyUpdate) => {
      console.log('🏠 Property update:', update);
      this.emit('property_update', update);
    });

    // Presence events
    this.socket.on('presence:status', (data) => {
      this.emit('presence_status', data);
    });

    // Notification events
    this.socket.on('notification:received', (data) => {
      this.handlePushNotification(data);
      this.emit('notification_received', data);
    });
  }

  /**
   * Authenticate user with server
   */
  private async authenticate(): Promise<void> {
    if (!this.socket || !this.currentUser) return;

    const token = await this.getAuthToken();
    
    this.socket.emit('user:authenticate', {
      token,
      userId: this.currentUser.id,
    });
  }

  /**
   * Handle reconnection attempts
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit('connection_failed', { reason: 'max_attempts_reached' });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.currentUser) {
        this.connect(this.currentUser).catch(console.error);
      }
    }, delay);
  }

  /**
   * Handle incoming chat messages
   */
  private async handleIncomingMessage(message: ChatMessage): Promise<void> {
    // Store message locally
    await this.storeMessageLocally(message);
    
    // Show notification if app is in background
    if (message.senderId !== this.currentUser?.id) {
      await this.showChatNotification(message);
    }
  }

  /**
   * Handle push notifications
   */
  private async handlePushNotification(data: any): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: data.title,
        body: data.body,
        data: data.data || {},
      },
      trigger: null, // Show immediately
    });
  }

  /**
   * Show chat notification
   */
  private async showChatNotification(message: ChatMessage): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `New message from ${message.senderName}`,
        body: message.type === 'text' ? message.content : `Sent a ${message.type}`,
        data: {
          type: 'chat',
          chatRoomId: message.chatRoomId,
          messageId: message.id,
        },
      },
      trigger: null,
    });
  }

  /**
   * Store message locally for offline access
   */
  private async storeMessageLocally(message: ChatMessage): Promise<void> {
    try {
      const key = `chat_messages_${message.chatRoomId}`;
      const stored = await AsyncStorage.getItem(key);
      const messages = stored ? JSON.parse(stored) : [];
      
      // Add new message if not already stored
      const existingIndex = messages.findIndex((m: ChatMessage) => m.id === message.id);
      if (existingIndex === -1) {
        messages.push(message);
        // Keep only last 100 messages per room
        if (messages.length > 100) {
          messages.splice(0, messages.length - 100);
        }
        await AsyncStorage.setItem(key, JSON.stringify(messages));
      }
    } catch (error) {
      console.error('Error storing message locally:', error);
    }
  }

  /**
   * Get authentication token
   */
  private async getAuthToken(): Promise<string> {
    try {
      return await AsyncStorage.getItem('auth_token') || '';
    } catch {
      return '';
    }
  }

  // Public methods

  /**
   * Send a chat message
   */
  sendMessage(message: Omit<ChatMessage, 'id' | 'timestamp' | 'status'>): void {
    if (!this.socket?.connected) {
      console.error('❌ Cannot send message: WebSocket not connected');
      return;
    }

    const fullMessage: ChatMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: new Date(),
      status: 'sent',
    };

    this.socket.emit('chat:send_message', fullMessage);
    console.log('💬 Message sent:', fullMessage);
  }

  /**
   * Join a chat room
   */
  joinChatRoom(roomId: string): void {
    if (!this.socket?.connected) {
      console.error('❌ Cannot join room: WebSocket not connected');
      return;
    }

    this.socket.emit('chat:join_room', { roomId });
    console.log('🏠 Joined chat room:', roomId);
  }

  /**
   * Leave a chat room
   */
  leaveChatRoom(roomId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('chat:leave_room', { roomId });
    console.log('🚪 Left chat room:', roomId);
  }

  /**
   * Start typing indicator
   */
  startTyping(roomId: string): void {
    if (!this.socket?.connected || !this.currentUser) return;

    this.socket.emit('chat:typing_start', {
      roomId,
      userId: this.currentUser.id,
      userName: this.currentUser.name,
    });
  }

  /**
   * Stop typing indicator
   */
  stopTyping(roomId: string): void {
    if (!this.socket?.connected || !this.currentUser) return;

    this.socket.emit('chat:typing_stop', {
      roomId,
      userId: this.currentUser.id,
    });
  }

  /**
   * Subscribe to property updates
   */
  subscribeToProperty(propertyId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('property:subscribe', { propertyId });
    console.log('🏠 Subscribed to property updates:', propertyId);
  }

  /**
   * Unsubscribe from property updates
   */
  unsubscribeFromProperty(propertyId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('property:unsubscribe', { propertyId });
    console.log('🏠 Unsubscribed from property updates:', propertyId);
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    return 'connecting';
  }

  /**
   * Register event handler
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Unregister event handler
   */
  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to registered handlers
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get stored messages for a room
   */
  async getStoredMessages(roomId: string): Promise<ChatMessage[]> {
    try {
      const key = `chat_messages_${roomId}`;
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting stored messages:', error);
      return [];
    }
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
export default webSocketService;

// Export types
export type {
  User,
  ChatMessage,
  ChatRoom,
  PropertyUpdate,
  WebSocketEvents,
};