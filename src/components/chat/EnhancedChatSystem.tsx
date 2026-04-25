import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Users, 
  Search, 
  Phone, 
  Video, 
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  ArrowLeft,
  Check,
  CheckCheck,
  Mic,
  Camera,
  Plus,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { useMobile } from '../../hooks/useMobile';

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'file' | 'system';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    imageUrl?: string;
  };
}

interface ChatRoom {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
  type: 'direct' | 'group' | 'property_inquiry';
  participants: string[];
  messages: ChatMessage[];
  typingUsers: string[];
  isTyping?: boolean;
}

interface EnhancedChatSystemProps {
  className?: string;
  height?: string;
  currentUserId?: string;
  onMessageSent?: (roomId: string, message: ChatMessage) => void;
  onRoomChange?: (roomId: string | null) => void;
}

// WebSocket connection manager for real-time chat
class ChatWebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private messageQueue: any[] = [];
  private listeners: { [key: string]: Function[] } = {};

  constructor(private url: string = 'wss://your-websocket-url.com') {
    this.connect();
  }

  connect() {
    try {
      // For Expo Go, use a fallback WebSocket implementation
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('💬 WebSocket connected');
        this.reconnectAttempts = 0;
        
        // Send queued messages
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift();
          this.send(message);
        }

        this.emit('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit('message', data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('💬 WebSocket disconnected');
        this.emit('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('💬 WebSocket error:', error);
        this.emit('error', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`💬 Reconnecting... Attempt ${this.reconnectAttempts}`);
        this.connect();
      }, this.reconnectInterval);
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(data);
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  private emit(event: string, data?: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  getConnectionState() {
    return this.ws?.readyState || WebSocket.CLOSED;
  }
}

// Mock data for initial state
const createMockMessages = (roomId: string): ChatMessage[] => {
  const baseMessages: { [key: string]: ChatMessage[] } = {
    '1': [
      {
        id: 'm1',
        text: "Hi! I'm interested in the apartment you listed in East Legon. Is it still available?",
        senderId: 'user2',
        senderName: 'Guest contact',
        timestamp: new Date(Date.now() - 3600000),
        status: 'read',
        type: 'text'
      },
      {
        id: 'm2',
        text: "Yes, it's still available! I'd be happy to show you around. When would be convenient for you?",
        senderId: 'user1',
        senderName: 'Current User',
        timestamp: new Date(Date.now() - 3580000),
        status: 'read',
        type: 'text'
      },
      {
        id: 'm3',
        text: "How about tomorrow afternoon around 2 PM?",
        senderId: 'user2',
        senderName: 'Guest contact',
        timestamp: new Date(Date.now() - 3400000),
        status: 'read',
        type: 'text'
      },
      {
        id: 'm4',
        text: "Perfect! I'll send you the address and contact details.",
        senderId: 'user1',
        senderName: 'Current User',
        timestamp: new Date(Date.now() - 3300000),
        status: 'delivered',
        type: 'text'
      },
      {
        id: 'm5',
        text: "Thanks for showing me the apartment! It looks great.",
        senderId: 'user2',
        senderName: 'Guest contact',
        timestamp: new Date(Date.now() - 120000),
        status: 'sent',
        type: 'text'
      }
    ],
    '2': [
      {
        id: 'm6',
        text: "New listing available in East Legon - 3 bedroom apartment with modern amenities",
        senderId: 'admin',
        senderName: 'Property Managers',
        timestamp: new Date(Date.now() - 7200000),
        status: 'read',
        type: 'text'
      }
    ],
    '3': [
      {
        id: 'm7',
        text: "Hi, I saw your listing for the house in Tema. When can we schedule a tour?",
        senderId: 'user3',
        senderName: 'Prospective renter',
        timestamp: new Date(Date.now() - 10800000),
        status: 'delivered',
        type: 'text'
      }
    ]
  };
  
  return baseMessages[roomId] || [];
};

const mockChatRooms: ChatRoom[] = [
  {
    id: '1',
    name: 'Guest contact',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
    lastMessage: 'Thanks for showing me the apartment!',
    timestamp: '2 min ago',
    unreadCount: 2,
    isOnline: true,
    type: 'property_inquiry',
    participants: ['user1', 'user2'],
    messages: [],
    typingUsers: []
  },
  {
    id: '2',
    name: 'Property Managers',
    lastMessage: 'New listing available in East Legon',
    timestamp: '1 hour ago',
    unreadCount: 0,
    isOnline: false,
    type: 'group',
    participants: ['user1', 'admin', 'manager1', 'manager2'],
    messages: [],
    typingUsers: []
  },
  {
    id: '3',
    name: 'Prospective renter',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
    lastMessage: 'When can we schedule a tour?',
    timestamp: '3 hours ago',
    unreadCount: 1,
    isOnline: true,
    type: 'direct',
    participants: ['user1', 'user3'],
    messages: [],
    typingUsers: []
  }
];

export function EnhancedChatSystem({ 
  className = "", 
  height = "100vh",
  currentUserId = "user1",
  onMessageSent,
  onRoomChange
}: EnhancedChatSystemProps) {
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [rooms, setRooms] = useState<ChatRoom[]>(mockChatRooms);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const wsManagerRef = useRef<ChatWebSocketManager | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useMobile();

  // Initialize WebSocket connection
  useEffect(() => {
    // In a real Expo Go app, you might use a different WebSocket URL
    // For now, we'll simulate the connection
    setConnectionStatus('connecting');
    
    setTimeout(() => {
      setConnectionStatus('connected');
      toast.success('💬 Chat system connected');
    }, 1000);

    // Initialize rooms with messages
    setRooms(prevRooms => 
      prevRooms.map(room => ({
        ...room,
        messages: createMockMessages(room.id)
      }))
    );

    // Simulate real-time message updates
    const interval = setInterval(() => {
      // Simulate random incoming messages
      if (Math.random() > 0.95) {
        simulateIncomingMessage();
      }
    }, 5000);

    // Monitor online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (wsManagerRef.current) {
        wsManagerRef.current.disconnect();
      }
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [selectedRoom?.messages]);

  // Handle room selection
  const handleRoomSelect = useCallback((room: ChatRoom) => {
    setSelectedRoom(room);
    onRoomChange?.(room.id);
    
    // Mark messages as read
    setRooms(prevRooms => 
      prevRooms.map(r => 
        r.id === room.id 
          ? { ...r, unreadCount: 0 }
          : r
      )
    );
  }, [onRoomChange]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const simulateIncomingMessage = () => {
    if (rooms.length === 0) return;
    
    const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];
    const incomingMessages = [
      "I have a question about the property",
      "Is the apartment still available?",
      "Can we schedule a viewing?",
      "What's the price for this property?",
      "Are utilities included?",
      "Is parking available?"
    ];
    
    const newMessage: ChatMessage = {
      id: `incoming_${Date.now()}`,
      text: incomingMessages[Math.floor(Math.random() * incomingMessages.length)],
      senderId: `user_${Math.random().toString(36).substr(2, 5)}`,
      senderName: randomRoom.name,
      timestamp: new Date(),
      status: 'delivered',
      type: 'text'
    };

    setRooms(prevRooms => 
      prevRooms.map(room => 
        room.id === randomRoom.id
          ? {
              ...room,
              messages: [...room.messages, newMessage],
              lastMessage: newMessage.text,
              timestamp: 'now',
              unreadCount: room.id === selectedRoom?.id ? 0 : room.unreadCount + 1
            }
          : room
      )
    );

    // Update selected room if it matches
    if (selectedRoom?.id === randomRoom.id) {
      setSelectedRoom(prev => prev ? {
        ...prev,
        messages: [...prev.messages, newMessage]
      } : prev);
    }

    if (randomRoom.id !== selectedRoom?.id) {
      toast.info(`💬 New message from ${randomRoom.name}`);
    }
  };

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || !selectedRoom) return;

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      text: messageInput.trim(),
      senderId: currentUserId,
      senderName: 'You',
      timestamp: new Date(),
      status: 'sending',
      type: 'text'
    };

    // Add message to selected room
    setSelectedRoom(prev => prev ? {
      ...prev,
      messages: [...prev.messages, newMessage]
    } : prev);

    // Update rooms list
    setRooms(prevRooms => 
      prevRooms.map(room => 
        room.id === selectedRoom.id
          ? {
              ...room,
              messages: [...room.messages, newMessage],
              lastMessage: newMessage.text,
              timestamp: 'now'
            }
          : room
      )
    );

    setMessageInput('');
    setIsTyping(false);

    // Simulate message status updates
    setTimeout(() => {
      updateMessageStatus(newMessage.id, 'sent');
    }, 500);

    setTimeout(() => {
      updateMessageStatus(newMessage.id, 'delivered');
    }, 1000);

    setTimeout(() => {
      updateMessageStatus(newMessage.id, 'read');
    }, 2000);

    onMessageSent?.(selectedRoom.id, newMessage);
  }, [messageInput, selectedRoom, currentUserId, onMessageSent]);

  const updateMessageStatus = (messageId: string, status: ChatMessage['status']) => {
    setSelectedRoom(prev => prev ? {
      ...prev,
      messages: prev.messages.map(msg =>
        msg.id === messageId ? { ...msg, status } : msg
      )
    } : prev);

    setRooms(prevRooms => 
      prevRooms.map(room => ({
        ...room,
        messages: room.messages.map(msg =>
          msg.id === messageId ? { ...msg, status } : msg
        )
      }))
    );
  };

  const handleInputChange = (value: string) => {
    setMessageInput(value);
    
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 2000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    return timestamp.toLocaleDateString();
  };

  const getMessageStatusIcon = (status: ChatMessage['status']) => {
    switch (status) {
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const totalUnreadCount = rooms.reduce((sum, room) => sum + room.unreadCount, 0);

  return (
    <div className={`flex bg-background transition-all duration-300 ${className}`} style={{ height }}>
      {/* Connection Status Bar */}
      {(!isOnline || connectionStatus !== 'connected') && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-yellow-900 px-4 py-2 text-sm font-medium z-50">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-yellow-800 rounded-full animate-pulse" />
            {!isOnline ? 'You are offline' : 'Connecting to chat...'}
          </div>
        </div>
      )}

      {/* Chat List Sidebar - Hidden on mobile when chat is selected */}
      <div className={`${
        isMobile && selectedRoom ? 'hidden' : 'flex'
      } ${
        isMobile ? 'w-full' : 'w-80'
      } bg-card border-r border-border flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-foreground">Messages</h2>
              {totalUnreadCount > 0 && (
                <Badge className="bg-destructive text-destructive-foreground">
                  {totalUnreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <Button size="sm" variant="ghost">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Chat Rooms List */}
        <div className="flex-1 overflow-y-auto custom-scroll">
          <AnimatePresence>
            {filteredRooms.map((room) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRoomSelect(room)}
                className={`chat-room-item border-b border-border cursor-pointer transition-all duration-200 ${
                  selectedRoom?.id === room.id ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="chat-avatar">
                      <AvatarImage src={room.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {room.name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {room.isOnline && (
                      <div className="online-indicator" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-foreground truncate flex-1">
                        {room.name}
                        {room.type === 'group' && (
                          <Users className="w-3 h-3 inline ml-1 opacity-60" />
                        )}
                      </h3>
                      <div className="flex items-center space-x-2 ml-2">
                        <span className="chat-timestamp">{room.timestamp}</span>
                        {room.unreadCount > 0 && (
                          <div className="unread-badge">
                            {room.unreadCount > 99 ? '99+' : room.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate flex-1">
                        {room.typingUsers.length > 0 ? (
                          <span className="text-primary italic">
                            {room.typingUsers.length === 1 
                              ? `${room.typingUsers[0]} is typing...`
                              : `${room.typingUsers.length} people are typing...`
                            }
                          </span>
                        ) : (
                          room.lastMessage
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredRooms.length === 0 && (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </p>
            </div>
          )}
        </div>
      </div>
      {/* Chat List Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Messages</h2>
            <Button size="sm" variant="ghost">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Chat Rooms List */}
        <div className="flex-1 overflow-y-auto">
          {filteredRooms.map((room) => (
            <motion.div
              key={room.id}
              whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
              onClick={() => setSelectedRoom(room)}
              className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors ${
                selectedRoom?.id === room.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={room.avatar} />
                    <AvatarFallback>{room.name[0]}</AvatarFallback>
                  </Avatar>
                  {room.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {room.name}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">{room.timestamp}</span>
                      {room.unreadCount > 0 && (
                        <Badge className="min-w-5 h-5 text-xs bg-blue-500">
                          {room.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{room.lastMessage}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Chat Content */}
      <div className={`flex-1 flex flex-col ${
        isMobile && !selectedRoom ? 'hidden' : ''
      }`}>
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="chat-header-mobile bg-card border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {isMobile && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedRoom(null)}
                      className="touch-target"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  )}
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={selectedRoom.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {selectedRoom.name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {selectedRoom.isOnline && (
                      <div className="online-indicator online-indicator-small" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">
                      {selectedRoom.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedRoom.isOnline ? (
                        <span className="text-green-600">Online</span>
                      ) : (
                        'Last seen 2 hours ago'
                      )}
                      {selectedRoom.typingUsers.length > 0 && (
                        <span className="text-primary ml-2">typing...</span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Button size="sm" variant="ghost" className="touch-target">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="touch-target">
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="touch-target">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto bg-muted/30 mobile-chat-messages">
              <div className="p-4 space-y-4">
                <AnimatePresence>
                  {selectedRoom.messages.map((message, index) => {
                    const isOwnMessage = message.senderId === currentUserId;
                    const showAvatar = !isOwnMessage && (
                      index === 0 || 
                      selectedRoom.messages[index - 1].senderId !== message.senderId
                    );
                    
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3 }}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${
                          showAvatar && !isOwnMessage ? 'mt-4' : ''
                        }`}
                      >
                        {/* Avatar for other users */}
                        {showAvatar && !isOwnMessage && (
                          <Avatar className="chat-avatar chat-avatar-small mr-2 self-end">
                            <AvatarImage src={selectedRoom.avatar} />
                            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                              {message.senderName[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className={`message-bubble ${
                          isOwnMessage ? 'message-bubble-own' : 'message-bubble-other'
                        } p-3 relative group`}>
                          {/* Sender name for group chats */}
                          {!isOwnMessage && selectedRoom.type === 'group' && showAvatar && (
                            <p className="text-xs font-medium mb-1 opacity-70">
                              {message.senderName}
                            </p>
                          )}
                          
                          {/* Message content */}
                          <div className="space-y-1">
                            <p className="text-sm whitespace-pre-wrap">
                              {message.text}
                            </p>
                            
                            {/* Message metadata */}
                            <div className={`flex items-center gap-1 text-xs opacity-60 ${
                              isOwnMessage ? 'justify-end' : 'justify-start'
                            }`}>
                              <span>{formatTime(message.timestamp)}</span>
                              {isOwnMessage && getMessageStatusIcon(message.status)}
                            </div>
                          </div>
                          
                          {/* Loading indicator for sending messages */}
                          {message.status === 'sending' && (
                            <div className="absolute -right-8 top-1/2 transform -translate-y-1/2">
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />
                            </div>
                          )}
                        </div>
                        
                        {/* Spacer for own messages to align with avatar space */}
                        {isOwnMessage && (
                          <div className="w-8" />
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                
                {/* Typing indicator */}
                {selectedRoom.typingUsers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="typing-indicator"
                  >
                    <Avatar className="chat-avatar chat-avatar-small">
                      <AvatarImage src={selectedRoom.avatar} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                        {selectedRoom.name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {selectedRoom.typingUsers[0]} is typing
                    </span>
                    <div className="typing-dots">
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                    </div>
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message Input */}
            <div className="mobile-chat-input">
              <div className="message-input-container">
                <Button
                  size="sm"
                  variant="ghost"
                  className="touch-target text-muted-foreground"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                
                <div className="flex-1 relative">
                  <input
                    ref={messageInputRef}
                    type="text"
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="message-input"
                    maxLength={1000}
                  />
                  
                  {messageInput.length > 800 && (
                    <div className="absolute -top-6 right-2 text-xs text-muted-foreground">
                      {messageInput.length}/1000
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="touch-target text-muted-foreground"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  
                  {messageInput.trim() ? (
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || connectionStatus !== 'connected'}
                      className="send-button"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="touch-target text-muted-foreground"
                    >
                      <Mic className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* No Chat Selected */
          <div className="flex-1 flex items-center justify-center bg-muted/30">
            <div className="text-center max-w-sm mx-auto p-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              </motion.div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {isMobile ? 'Welcome to Chat' : 'Select a conversation'}
              </h3>
              <p className="text-muted-foreground text-sm">
                {isMobile 
                  ? 'Start a conversation with property owners, agents, or other users'
                  : 'Choose a conversation from the sidebar to start messaging'
                }
              </p>
              
              {totalUnreadCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-6"
                >
                  <Badge className="bg-primary text-primary-foreground">
                    {totalUnreadCount} unread message{totalUnreadCount !== 1 ? 's' : ''}
                  </Badge>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
