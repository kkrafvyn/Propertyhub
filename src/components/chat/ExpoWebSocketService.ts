/**
 * Expo Go SDK 53 Compatible WebSocket Service for Real-time Chat
 * 
 * This service provides real-time chat functionality optimized for React Native
 * and Expo Go environments. It handles connection management, message queuing,
 * and automatic reconnection with proper mobile lifecycle handling.
 * 
 * Key Features:
 * - Expo Go SDK 53 compatibility
 * - Automatic reconnection with exponential backoff
 * - Message queue for offline scenarios
 * - Mobile app state handling (foreground/background)
 * - Typing indicators and presence
 * - Message status updates (sent, delivered, read)
 * - Network change handling
 */

import React from 'react';
import { envConfig } from '../../utils/envConfig';

interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  metadata?: {
    fileName?: string;
    fileUrl?: string;
    imageUrl?: string;
    replyTo?: string;
  };
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'property_inquiry';
  participants: string[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  isTyping?: boolean;
  typingUsers?: string[];
}

interface WebSocketMessage {
  type:
    | 'message'
    | 'typing'
    | 'presence'
    | 'status_update'
    | 'room_update'
    | 'heartbeat'
    | 'join_room'
    | 'leave_room'
    | 'send_message'
    | 'typing_start'
    | 'typing_stop'
    | 'mark_read'
    | 'mark_delivered';
  data: any;
  timestamp?: string;
  messageId?: string;
}

interface ConnectionOptions {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  enableMessageQueue?: boolean;
}

export class ExpoWebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectInterval: number;
  private messageQueue: WebSocketMessage[] = [];
  private listeners: Map<string, Function[]> = new Map();
  private isConnected = false;
  private heartbeatTimer: any = null;
  private reconnectTimer: any = null;
  private userId: string | null = null;
  private currentRooms: Set<string> = new Set();
  private typingTimers: Map<string, any> = new Map();

  constructor(options: ConnectionOptions = {}) {
    this.url = options.url || envConfig.WEBSOCKET_URL || '';
    this.reconnectInterval = options.reconnectInterval || 3000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    
    // Handle app state changes for React Native
    this.setupAppStateHandling();
    
    // Handle network state changes
    this.setupNetworkHandling();
  }

  private setupAppStateHandling() {
    // For Expo Go, we can use the browser's visibility API
    // In a real React Native app, you'd use AppState from react-native
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (!this.isConnected && this.userId) {
            this.connect(this.userId);
          }
        } else if (document.visibilityState === 'hidden') {
          // Optionally disconnect when app goes to background
          // this.disconnect();
        }
      });
    }
  }

  private setupNetworkHandling() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('📶 Network reconnected - attempting to reconnect WebSocket');
        if (!this.isConnected && this.userId) {
          this.connect(this.userId);
        }
      });

      window.addEventListener('offline', () => {
        console.log('📶 Network disconnected - WebSocket will queue messages');
        this.isConnected = false;
      });
    }
  }

  async connect(userId: string): Promise<boolean> {
    this.userId = userId;

    if (!this.url) {
      console.warn('Chat WebSocket URL is not configured. Set VITE_WEBSOCKET_URL or VITE_API_URL.');
      return false;
    }
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('💬 WebSocket already connected');
      return true;
    }

    try {
      console.log('💬 Connecting to WebSocket...');
      
      // Add user authentication to WebSocket URL
      const wsUrl = `${this.url}?userId=${encodeURIComponent(userId)}`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('💬 WebSocket connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Start heartbeat to keep connection alive
        this.startHeartbeat();
        
        // Send queued messages
        this.flushMessageQueue();
        
        // Join user's rooms
        this.rejoinRooms();
        
        // Emit connection event
        this.emit('connected', { userId });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleIncomingMessage(message);
        } catch (error) {
          console.error('💬 Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('💬 WebSocket disconnected:', event.code, event.reason);
        this.isConnected = false;
        this.stopHeartbeat();
        
        this.emit('disconnected', { 
          code: event.code, 
          reason: event.reason,
          wasClean: event.wasClean
        });
        
        // Attempt reconnection if not closed intentionally
        if (!event.wasClean) {
          this.scheduleReconnection();
        }
      };

      this.ws.onerror = (error) => {
        console.error('💬 WebSocket error:', error);
        this.emit('error', { error });
      };

      return true;
    } catch (error) {
      console.error('💬 Failed to connect WebSocket:', error);
      this.scheduleReconnection();
      return false;
    }
  }

  private handleIncomingMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'message':
        this.emit('message_received', message.data);
        break;
        
      case 'typing':
        this.emit('typing_update', message.data);
        break;
        
      case 'presence':
        this.emit('presence_update', message.data);
        break;
        
      case 'status_update':
        this.emit('message_status_update', message.data);
        break;
        
      case 'room_update':
        this.emit('room_update', message.data);
        break;
        
      default:
        console.warn('💬 Unknown message type:', message.type);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'heartbeat',
          data: { timestamp: Date.now() }
        });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnection() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(
        this.reconnectInterval * Math.pow(2, this.reconnectAttempts),
        30000 // Max 30 seconds
      );
      
      console.log(`💬 Scheduling reconnection attempt ${this.reconnectAttempts + 1} in ${delay}ms`);
      
      this.reconnectTimer = setTimeout(() => {
        this.reconnectAttempts++;
        if (this.userId) {
          this.connect(this.userId);
        }
      }, delay);
    } else {
      console.error('💬 Max reconnection attempts reached');
      this.emit('max_reconnection_attempts_reached');
    }
  }

  private flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendImmediate(message);
      }
    }
  }

  private rejoinRooms() {
    this.currentRooms.forEach(roomId => {
      this.joinRoom(roomId);
    });
  }

  send(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendImmediate(message);
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push({
        ...message,
        timestamp: new Date().toISOString()
      });
      console.log('💬 Message queued (WebSocket not connected)');
    }
  }

  private sendImmediate(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        ...message,
        timestamp: message.timestamp || new Date().toISOString()
      }));
    }
  }

  // Room Management
  joinRoom(roomId: string) {
    this.currentRooms.add(roomId);
    
    this.send({
      type: 'join_room',
      data: { roomId, userId: this.userId }
    });
  }

  leaveRoom(roomId: string) {
    this.currentRooms.delete(roomId);
    
    this.send({
      type: 'leave_room',
      data: { roomId, userId: this.userId }
    });
  }

  // Message Operations
  sendMessage(roomId: string, content: string, type: 'text' | 'image' | 'file' = 'text', metadata?: any) {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const message: ChatMessage = {
      id: messageId,
      roomId,
      senderId: this.userId!,
      senderName: 'User', // This should come from user data
      content,
      type,
      timestamp: new Date().toISOString(),
      status: 'sending',
      metadata
    };

    this.send({
      type: 'send_message',
      data: message,
      messageId
    });

    return message;
  }

  // Typing Indicators
  sendTypingStart(roomId: string) {
    // Clear existing typing timer
    const existingTimer = this.typingTimers.get(roomId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.send({
      type: 'typing_start',
      data: { roomId, userId: this.userId }
    });

    // Auto-stop typing after 3 seconds
    const timer = setTimeout(() => {
      this.sendTypingStop(roomId);
    }, 3000);
    
    this.typingTimers.set(roomId, timer);
  }

  sendTypingStop(roomId: string) {
    const timer = this.typingTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.typingTimers.delete(roomId);
    }

    this.send({
      type: 'typing_stop',
      data: { roomId, userId: this.userId }
    });
  }

  // Message Status Updates
  markMessageAsRead(messageId: string, roomId: string) {
    this.send({
      type: 'mark_read',
      data: { messageId, roomId, userId: this.userId }
    });
  }

  markMessageAsDelivered(messageId: string, roomId: string) {
    this.send({
      type: 'mark_delivered',
      data: { messageId, roomId, userId: this.userId }
    });
  }

  // Event Management
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback?: Function) {
    if (!this.listeners.has(event)) return;
    
    if (callback) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }
  }

  private emit(event: string, data?: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`💬 Error in event callback for ${event}:`, error);
        }
      });
    }
  }

  // Connection Management
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'User initiated disconnect');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    this.currentRooms.clear();
    
    // Clear typing timers
    this.typingTimers.forEach(timer => clearTimeout(timer));
    this.typingTimers.clear();
  }

  // Status Getters
  getConnectionState(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'error';
    }
  }

  isConnectionHealthy(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  getQueuedMessageCount(): number {
    return this.messageQueue.length;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  getConfiguredUrl(): string {
    return this.url;
  }
}

// Singleton instance for app-wide usage
let chatServiceInstance: ExpoWebSocketService | null = null;

export const getChatService = (options?: ConnectionOptions): ExpoWebSocketService => {
  const requestedUrl = options?.url || envConfig.WEBSOCKET_URL || '';

  if (!chatServiceInstance || (requestedUrl && chatServiceInstance.getConfiguredUrl() !== requestedUrl)) {
    if (chatServiceInstance) {
      chatServiceInstance.disconnect();
    }
    chatServiceInstance = new ExpoWebSocketService(options);
  }
  return chatServiceInstance;
};

export const resetChatService = () => {
  if (chatServiceInstance) {
    chatServiceInstance.disconnect();
    chatServiceInstance = null;
  }
};

// React Hook for easy integration
export const useChatService = (userId?: string) => {
  const [service] = React.useState(() => getChatService());
  const [connectionState, setConnectionState] = React.useState(service.getConnectionState());
  const [queuedMessages, setQueuedMessages] = React.useState(service.getQueuedMessageCount());

  React.useEffect(() => {
    const handleConnectionChange = () => {
      setConnectionState(service.getConnectionState());
      setQueuedMessages(service.getQueuedMessageCount());
    };

    service.on('connected', handleConnectionChange);
    service.on('disconnected', handleConnectionChange);
    service.on('error', handleConnectionChange);

    // Auto-connect if userId is provided
    if (userId && !service.isConnectionHealthy()) {
      service.connect(userId);
    }

    return () => {
      service.off('connected', handleConnectionChange);
      service.off('disconnected', handleConnectionChange);
      service.off('error', handleConnectionChange);
    };
  }, [service, userId]);

  return {
    service,
    connectionState,
    queuedMessages,
    isConnected: connectionState === 'connected'
  };
};
