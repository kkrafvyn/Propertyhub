/**
 * React Native WebSocket Manager
 * 
 * WebSocket connection manager for React Native with automatic reconnection,
 * message queuing, and mobile-specific optimizations
 * 
 * @author PropertyHub Team
 * @version 1.0.0
 */

import { getConfig, ERROR_CODES } from './config';
import { MobileStorage, MobileAnalytics } from './mobileBackendUtils';

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp?: number;
  id?: string;
}

export interface WebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  messageQueueSize?: number;
  autoReconnect?: boolean;
}

export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  reconnectAttempts: number;
  lastError?: string;
  lastConnected?: Date;
  lastDisconnected?: Date;
}

export type WebSocketEventType = 
  | 'connect' 
  | 'disconnect' 
  | 'error' 
  | 'message' 
  | 'reconnect' 
  | 'reconnect_failed';

export type WebSocketEventHandler = (data?: any) => void;

/**
 * WebSocket Manager for React Native
 * Handles connection lifecycle, message queuing, and mobile optimizations
 */
export class ReactNativeWebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private options: Required<WebSocketOptions>;
  private eventListeners: Map<WebSocketEventType, Set<WebSocketEventHandler>>;
  private messageQueue: WebSocketMessage[];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionStatus: ConnectionStatus;
  private authToken: string | null = null;
  private isBackgrounded = false;
  private lastActivity = Date.now();

  constructor(options: WebSocketOptions = {}) {
    const config = getConfig();
    this.url = config.wsUrl;
    
    this.options = {
      reconnectInterval: options.reconnectInterval || 5000,
      maxReconnectAttempts: options.maxReconnectAttempts || 10,
      heartbeatInterval: options.heartbeatInterval || 30000,
      messageQueueSize: options.messageQueueSize || 100,
      autoReconnect: options.autoReconnect !== false,
    };

    this.eventListeners = new Map();
    this.messageQueue = [];
    this.connectionStatus = {
      connected: false,
      connecting: false,
      reconnectAttempts: 0,
    };

    this.setupAppStateHandling();
    this.setupNetworkHandling();
  }

  /**
   * Setup app state handling for mobile optimization
   */
  private setupAppStateHandling(): void {
    // For React Native, use AppState
    // For web, use visibility API
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.handleAppBackground();
        } else {
          this.handleAppForeground();
        }
      });
    }

    // Handle page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.disconnect();
      });
    }
  }

  /**
   * Setup network state handling
   */
  private setupNetworkHandling(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🌐 Network connection restored');
        if (this.options.autoReconnect && !this.connectionStatus.connected) {
          this.connect();
        }
      });

      window.addEventListener('offline', () => {
        console.log('📵 Network connection lost');
        if (this.ws) {
          this.ws.close();
        }
      });
    }
  }

  /**
   * Handle app going to background
   */
  private handleAppBackground(): void {
    console.log('📱 App backgrounded - optimizing WebSocket');
    this.isBackgrounded = true;
    
    // Reduce heartbeat frequency in background
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.startHeartbeat(this.options.heartbeatInterval * 3); // 3x slower
    }

    // Track analytics
    MobileAnalytics.trackEvent('app_backgrounded', {
      websocket_connected: this.connectionStatus.connected,
    });
  }

  /**
   * Handle app coming to foreground
   */
  private handleAppForeground(): void {
    console.log('📱 App foregrounded - resuming WebSocket');
    this.isBackgrounded = false;
    
    // Resume normal heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.startHeartbeat(this.options.heartbeatInterval);
    }

    // Reconnect if needed
    if (!this.connectionStatus.connected && this.options.autoReconnect) {
      this.connect();
    }

    // Track analytics
    MobileAnalytics.trackEvent('app_foregrounded', {
      websocket_connected: this.connectionStatus.connected,
    });
  }

  /**
   * Connect to WebSocket server
   */
  public async connect(authToken?: string): Promise<void> {
    if (this.connectionStatus.connecting || this.connectionStatus.connected) {
      console.log('⚠️ WebSocket already connected or connecting');
      return;
    }

    // Load auth token from storage if not provided
    if (!authToken) {
      authToken = await MobileStorage.getItem('@PropertyHub:authToken');
    }
    this.authToken = authToken;

    console.log('🔌 Connecting to WebSocket:', this.url);
    this.connectionStatus.connecting = true;

    try {
      // Create WebSocket connection with auth token
      const wsUrl = authToken ? `${this.url}?token=${authToken}` : this.url;
      this.ws = new WebSocket(wsUrl);

      this.setupWebSocketEventHandlers();
      
      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.connectionStatus.connecting) {
          console.error('❌ WebSocket connection timeout');
          this.handleConnectionError(new Error('Connection timeout'));
        }
      }, 10000);

      // Clear timeout on successful connection
      this.once('connect', () => {
        clearTimeout(connectionTimeout);
      });

    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('✅ WebSocket connected');
      this.connectionStatus.connected = true;
      this.connectionStatus.connecting = false;
      this.connectionStatus.reconnectAttempts = 0;
      this.connectionStatus.lastConnected = new Date();
      this.connectionStatus.lastError = undefined;

      // Start heartbeat
      this.startHeartbeat();

      // Process queued messages
      this.processMessageQueue();

      // Emit connect event
      this.emit('connect');

      // Track connection
      MobileAnalytics.trackEvent('websocket_connected', {
        reconnect_attempts: this.connectionStatus.reconnectAttempts,
      });
    };

    this.ws.onclose = (event) => {
      console.log('🔌 WebSocket disconnected:', event.code, event.reason);
      this.handleDisconnect(event.code, event.reason);
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      this.handleConnectionError(new Error('WebSocket error'));
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
      this.lastActivity = Date.now();
    };
  }

  /**
   * Handle WebSocket disconnect
   */
  private handleDisconnect(code: number, reason: string): void {
    this.connectionStatus.connected = false;
    this.connectionStatus.connecting = false;
    this.connectionStatus.lastDisconnected = new Date();
    this.connectionStatus.lastError = `${code}: ${reason}`;

    // Stop heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Emit disconnect event
    this.emit('disconnect', { code, reason });

    // Schedule reconnect if auto-reconnect is enabled
    if (this.options.autoReconnect && code !== 1000) { // 1000 = normal closure
      this.scheduleReconnect();
    }

    // Track disconnection
    MobileAnalytics.trackEvent('websocket_disconnected', {
      code,
      reason,
      was_expected: code === 1000,
    });
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(error: Error): void {
    this.connectionStatus.connected = false;
    this.connectionStatus.connecting = false;
    this.connectionStatus.lastError = error.message;

    // Emit error event
    this.emit('error', error);

    // Schedule reconnect if auto-reconnect is enabled
    if (this.options.autoReconnect) {
      this.scheduleReconnect();
    }

    // Track error
    MobileAnalytics.trackEvent('websocket_error', {
      error_message: error.message,
      reconnect_attempts: this.connectionStatus.reconnectAttempts,
    });
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.connectionStatus.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error('❌ Max reconnect attempts reached');
      this.emit('reconnect_failed');
      return;
    }

    this.connectionStatus.reconnectAttempts++;
    
    // Exponential backoff with jitter
    const backoffTime = Math.min(
      this.options.reconnectInterval * Math.pow(2, this.connectionStatus.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );
    const jitteredTime = backoffTime + (Math.random() * 1000);

    console.log(
      `🔄 Scheduling reconnect attempt ${this.connectionStatus.reconnectAttempts}/${this.options.maxReconnectAttempts} in ${Math.round(jitteredTime)}ms`
    );

    this.reconnectTimer = setTimeout(() => {
      if (!this.connectionStatus.connected && !this.connectionStatus.connecting) {
        console.log(`🔄 Reconnect attempt ${this.connectionStatus.reconnectAttempts}`);
        this.emit('reconnect');
        this.connect(this.authToken || undefined);
      }
    }, jitteredTime);
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(interval?: number): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    const heartbeatInterval = interval || this.options.heartbeatInterval;
    
    this.heartbeatTimer = setInterval(() => {
      if (this.connectionStatus.connected && this.ws) {
        // Check if connection is stale
        const timeSinceLastActivity = Date.now() - this.lastActivity;
        if (timeSinceLastActivity > heartbeatInterval * 2) {
          console.warn('⚠️ Connection appears stale, sending ping');
        }

        this.send({
          type: 'ping',
          payload: { timestamp: Date.now() },
        });
      }
    }, heartbeatInterval);
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      
      // Handle pong response
      if (message.type === 'pong') {
        // Connection is alive, no action needed
        return;
      }

      // Emit message event
      this.emit('message', message);

      // Track message analytics
      MobileAnalytics.trackEvent('websocket_message_received', {
        message_type: message.type,
        has_payload: !!message.payload,
      });

    } catch (error) {
      console.error('❌ Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Send message through WebSocket
   */
  public send(message: WebSocketMessage): boolean {
    if (!message.id) {
      message.id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    if (!message.timestamp) {
      message.timestamp = Date.now();
    }

    if (this.connectionStatus.connected && this.ws) {
      try {
        this.ws.send(JSON.stringify(message));
        
        // Track sent message
        MobileAnalytics.trackEvent('websocket_message_sent', {
          message_type: message.type,
          has_payload: !!message.payload,
        });
        
        return true;
      } catch (error) {
        console.error('❌ Failed to send WebSocket message:', error);
        this.queueMessage(message);
        return false;
      }
    } else {
      // Queue message if not connected
      this.queueMessage(message);
      return false;
    }
  }

  /**
   * Queue message for later sending
   */
  private queueMessage(message: WebSocketMessage): void {
    // Remove oldest messages if queue is full
    while (this.messageQueue.length >= this.options.messageQueueSize) {
      this.messageQueue.shift();
    }

    this.messageQueue.push(message);
    console.log(`📝 Message queued (${this.messageQueue.length}/${this.options.messageQueueSize})`);
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    console.log(`📤 Processing ${this.messageQueue.length} queued messages`);
    
    const messages = [...this.messageQueue];
    this.messageQueue = [];

    messages.forEach(message => {
      if (!this.send(message)) {
        // If send fails, re-queue the message
        this.queueMessage(message);
      }
    });
  }

  /**
   * Disconnect WebSocket
   */
  public disconnect(): void {
    console.log('🔌 Disconnecting WebSocket');
    
    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Close WebSocket connection
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.connectionStatus.connected = false;
    this.connectionStatus.connecting = false;
  }

  /**
   * Add event listener
   */
  public on(event: WebSocketEventType, handler: WebSocketEventHandler): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);
  }

  /**
   * Add one-time event listener
   */
  public once(event: WebSocketEventType, handler: WebSocketEventHandler): void {
    const onceHandler = (data?: any) => {
      handler(data);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  /**
   * Remove event listener
   */
  public off(event: WebSocketEventType, handler: WebSocketEventHandler): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: WebSocketEventType, data?: any): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`❌ WebSocket event handler error (${event}):`, error);
        }
      });
    }
  }

  /**
   * Get connection status
   */
  public getStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Get queued message count
   */
  public getQueuedMessageCount(): number {
    return this.messageQueue.length;
  }

  /**
   * Clear message queue
   */
  public clearMessageQueue(): void {
    this.messageQueue = [];
    console.log('🧹 Message queue cleared');
  }

  /**
   * Update auth token
   */
  public updateAuthToken(token: string): void {
    this.authToken = token;
    
    // Reconnect with new token if currently connected
    if (this.connectionStatus.connected) {
      this.disconnect();
      setTimeout(() => this.connect(token), 100);
    }
  }

  /**
   * Check if WebSocket is connected
   */
  public isConnected(): boolean {
    return this.connectionStatus.connected;
  }
}

// Export singleton instance
export const webSocketManager = new ReactNativeWebSocketManager();
export default webSocketManager;