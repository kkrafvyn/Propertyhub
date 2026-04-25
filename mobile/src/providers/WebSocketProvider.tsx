/**
 * WebSocket Provider
 * 
 * Manages WebSocket connection to PropertyHub backend for real-time features
 */

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showMessage } from 'react-native-flash-message';

import { useAuth } from './AuthProvider';

interface WebSocketState {
  socket: Socket | null;
  isConnected: boolean;
  reconnecting: boolean;
  connectionError: string | null;
}

interface WebSocketContextType extends WebSocketState {
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

const WEBSOCKET_URL = process.env.EXPO_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001';
const CONNECTION_TIMEOUT = 10000;
const RECONNECT_DELAY = 3000;

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<WebSocketState>({
    socket: null,
    isConnected: false,
    reconnecting: false,
    connectionError: null,
  });

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Connect when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, user]);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground
      if (isAuthenticated && !state.isConnected) {
        connect();
      }
    } else if (nextAppState.match(/inactive|background/)) {
      // App went to background
      // Keep connection alive but reduce activity
    }

    appStateRef.current = nextAppState;
  };

  const connect = async () => {
    if (socketRef.current?.connected || !user) return;

    setState(prev => ({ ...prev, reconnecting: true, connectionError: null }));

    try {
      // Get auth token for WebSocket authentication
      const authToken = await AsyncStorage.getItem('@PropertyHub:auth');
      
      if (!authToken) {
        throw new Error('No authentication token');
      }

      // Create socket connection
      const socket = io(WEBSOCKET_URL, {
        auth: {
          token: authToken,
        },
        timeout: CONNECTION_TIMEOUT,
        transports: ['websocket', 'polling'],
        forceNew: true,
      });

      socketRef.current = socket;

      // Connection event handlers
      socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        setState(prev => ({
          ...prev,
          socket,
          isConnected: true,
          reconnecting: false,
          connectionError: null,
        }));

        // Join user to their rooms
        socket.emit('join_user_rooms', { userId: user.id });
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ WebSocket disconnected:', reason);
        setState(prev => ({
          ...prev,
          isConnected: false,
          connectionError: reason,
        }));

        // Auto-reconnect unless it's an intentional disconnect
        if (reason !== 'io client disconnect' && isAuthenticated) {
          scheduleReconnect();
        }
      });

      socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        setState(prev => ({
          ...prev,
          isConnected: false,
          reconnecting: false,
          connectionError: error.message,
        }));

        scheduleReconnect();
      });

      // Global event handlers
      socket.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        showMessage({
          message: 'Connection error occurred',
          type: 'warning',
        });
      });

      socket.on('user_online', (data) => {
        console.log('👤 User online:', data);
      });

      socket.on('user_offline', (data) => {
        console.log('👤 User offline:', data);
      });

      socket.on('enhanced_push_notification', (notification) => {
        console.log('🔔 Push notification:', notification);
        showMessage({
          message: notification.title,
          description: notification.body,
          type: notification.priority === 'high' ? 'warning' : 'info',
        });
      });

    } catch (error) {
      console.error('❌ WebSocket setup error:', error);
      setState(prev => ({
        ...prev,
        isConnected: false,
        reconnecting: false,
        connectionError: error instanceof Error ? error.message : 'Connection failed',
      }));
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setState({
      socket: null,
      isConnected: false,
      reconnecting: false,
      connectionError: null,
    });
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) return;

    setState(prev => ({ ...prev, reconnecting: true }));

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      if (isAuthenticated && !state.isConnected) {
        console.log('🔄 Attempting to reconnect...');
        connect();
      }
    }, RECONNECT_DELAY);
  };

  const emit = (event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('❌ Cannot emit - socket not connected');
    }
  };

  const on = (event: string, callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event: string, callback?: (data: any) => void) => {
    if (socketRef.current) {
      if (callback) {
        socketRef.current.off(event, callback);
      } else {
        socketRef.current.off(event);
      }
    }
  };

  const value: WebSocketContextType = {
    ...state,
    connect,
    disconnect,
    emit,
    on,
    off,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}