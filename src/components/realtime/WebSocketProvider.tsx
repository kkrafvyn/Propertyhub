import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ExpoWebSocketService, getChatService } from '../chat/ExpoWebSocketService';
import { envConfig } from '../../utils/envConfig';

interface WebSocketProviderState {
  isConnected: boolean;
  send: (data: any) => void;
  sendMessage: (data: any) => void;
  lastMessage: any;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  chatService: ExpoWebSocketService | null;
  connectChat: (userId: string) => Promise<boolean>;
  disconnectChat: () => void;
  subscribe: (event: string, callback: (data: any) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketProviderState>({
  isConnected: false,
  send: () => {},
  sendMessage: () => {},
  lastMessage: null,
  connectionStatus: 'disconnected',
  chatService: null,
  connectChat: async () => false,
  disconnectChat: () => {},
  subscribe: () => () => {},
});

interface WebSocketProviderProps {
  children: React.ReactNode;
  url?: string;
}

export function WebSocketProvider({ children, url }: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const [chatService, setChatService] = useState<ExpoWebSocketService | null>(null);
  const resolvedUrl = url || envConfig.WEBSOCKET_URL;

  const connect = () => {
    try {
      if (!resolvedUrl) return;

      setConnectionStatus('connecting');
      ws.current = new WebSocket(resolvedUrl);

      ws.current.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        console.log('WebSocket connected');
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch {
          setLastMessage(event.data);
        }
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        console.log('WebSocket disconnected');

        reconnectTimeout.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.current.onerror = (error) => {
        setConnectionStatus('error');
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      setConnectionStatus('error');
      console.error('Failed to create WebSocket connection:', error);
    }
  };

  useEffect(() => {
    if (resolvedUrl) {
      connect();
    }

    const service = getChatService({
      url: resolvedUrl,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
    });

    setChatService(service);

    const handleChatConnected = () => {
      console.log('Chat service connected');
      toast.success('Chat connected');
    };

    const handleChatDisconnected = () => {
      console.log('Chat service disconnected');
      toast.info('Chat disconnected');
    };

    const handleChatError = (error: unknown) => {
      console.error('Chat service error:', error);
      toast.error('Chat connection error');
    };

    const handleMaxReconnectAttempts = () => {
      console.error('Chat service max reconnection attempts reached');
      toast.error('Unable to connect to chat. Please refresh.');
    };

    service.on('connected', handleChatConnected);
    service.on('disconnected', handleChatDisconnected);
    service.on('error', handleChatError);
    service.on('max_reconnection_attempts_reached', handleMaxReconnectAttempts);

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }

      service.off('connected', handleChatConnected);
      service.off('disconnected', handleChatDisconnected);
      service.off('error', handleChatError);
      service.off('max_reconnection_attempts_reached', handleMaxReconnectAttempts);
    };
  }, [resolvedUrl]);

  const send = (data: any) => {
    try {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(data));
      } else {
        console.warn('WebSocket is not connected');
      }
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
    }
  };

  const connectChat = async (userId: string): Promise<boolean> => {
    if (!chatService) return false;

    try {
      const success = await chatService.connect(userId);
      if (success) {
        toast.success('Chat connected successfully');
      } else {
        toast.error('Failed to connect chat');
      }
      return success;
    } catch (error) {
      console.error('Failed to connect chat:', error);
      toast.error('Chat connection error');
      return false;
    }
  };

  const disconnectChat = () => {
    if (chatService) {
      chatService.disconnect();
      toast.info('Chat disconnected');
    }
  };

  const subscribe = (event: string, callback: (data: any) => void) => {
    if (chatService) {
      chatService.on(event, callback);
      return () => {
        chatService.off(event, callback);
      };
    }
    return () => {};
  };

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        send,
        sendMessage: send,
        lastMessage,
        connectionStatus,
        chatService,
        connectChat,
        disconnectChat,
        subscribe,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
