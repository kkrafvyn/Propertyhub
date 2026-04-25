import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardHeader, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { 
  Send, 
  ArrowLeft, 
  Phone, 
  Video, 
  MoreVertical, 
  Search, 
  Plus, 
  Users, 
  MessageSquare, 
  Paperclip,
  Smile,
  Mic,
  Image as ImageIcon,
  FileText,
  Settings,
  Bell,
  Archive,
  Trash2,
  Menu
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useMobile } from '../../hooks/useMobile';
import { toast } from 'sonner';
import { getSupabaseFunctionUrl } from '../../services/supabaseProject';
import { BottomSheet, TouchGestures } from '../mobile/MobileOptimizations';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'system';
  edited?: boolean;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'support';
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  avatar?: string;
  description?: string;
}

interface MobileChatSystemProps {
  className?: string;
  height?: string;
}

export function MobileChatSystem({ className = '', height = '100vh' }: MobileChatSystemProps) {
  const { user } = useAuth();
  const isMobile = useMobile();
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showRoomsList, setShowRoomsList] = useState(!selectedRoom);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const serverUrl = getSupabaseFunctionUrl();

  // Load chat rooms and available users on mount
  useEffect(() => {
    if (user) {
      loadChatRooms();
      loadAvailableUsers();
      
      // Simulate online users (in real app, use WebSocket)
      const interval = setInterval(() => {
        const randomUsers = availableUsers
          .filter(() => Math.random() > 0.7)
          .map(u => u.id);
        setOnlineUsers(new Set(randomUsers));
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [user, availableUsers.length]);

  // Load messages when room changes
  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.id);
      markRoomAsRead(selectedRoom.id);
      setShowRoomsList(false);
    }
  }, [selectedRoom]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle keyboard appearance on mobile
  useEffect(() => {
    if (!isMobile) return;

    const handleResize = () => {
      const viewport = window.visualViewport;
      if (viewport) {
        const isKeyboardOpen = viewport.height < window.screen.height * 0.75;
        setShowKeyboard(isKeyboardOpen);
        
        if (isKeyboardOpen && chatContainerRef.current) {
          // Scroll to input when keyboard appears
          setTimeout(() => {
            messageInputRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    }
  }, [isMobile]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatRooms = async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `${serverUrl}/chat/rooms/${user.id}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRooms(data.rooms);
        }
      }
    } catch (error) {
      console.error('Failed to load chat rooms:', error);
      // Don't show error toast for network issues in preview environment
    }
  };

  const loadAvailableUsers = async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `${serverUrl}/users/${user.id}/chat-eligible`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailableUsers(data.users);
        }
      }
    } catch (error) {
      console.error('Failed to load available users:', error);
      // Don't show error toast for network issues in preview environment
    }
  };

  const loadMessages = async (roomId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${serverUrl}/chat/messages/${roomId}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessages(data.messages);
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      // Only show error for non-network issues
      if (error instanceof TypeError && error.message.includes('NetworkError')) {
        console.warn('Network error in preview environment - this is expected');
      } else {
        toast.error('Failed to load messages');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom || !user) return;

    const messageData = {
      roomId: selectedRoom.id,
      senderId: user.id,
      senderName: user.name,
      senderAvatar: user.avatar,
      content: newMessage.trim(),
      type: 'text'
    };

    try {
      const response = await fetch(
        `${serverUrl}/chat/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(messageData)
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessages(prev => [...prev, data.message]);
          setNewMessage('');
          loadChatRooms(); // Refresh rooms to update last message
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Only show error for non-network issues
      if (error instanceof TypeError && error.message.includes('NetworkError')) {
        console.warn('Network error in preview environment - this is expected');
      } else {
        toast.error('Failed to send message');
      }
    }
  };

  const markRoomAsRead = async (roomId: string) => {
    if (!user) return;

    try {
      await fetch(
        `${serverUrl}/chat/rooms/${roomId}/read/${user.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.warn('Failed to mark room as read:', error);
    }
  };

  const createDirectMessage = async (targetUserId: string) => {
    if (!user) return;

    const targetUser = availableUsers.find(u => u.id === targetUserId);
    if (!targetUser) return;

    const roomData = {
      name: `${user.name} & ${targetUser.name}`,
      type: 'direct',
      participants: [user.id, targetUserId],
      createdBy: user.id
    };

    try {
      const response = await fetch(
        `${serverUrl}/chat/rooms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(roomData)
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await loadChatRooms();
          setSelectedRoom(data.room);
          setShowCreateRoom(false);
          toast.success(`Started chat with ${targetUser.name}`);
        }
      }
    } catch (error) {
      console.error('Failed to create direct message:', error);
      toast.error('Failed to start chat');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In a real app, you would upload the file to storage and send the URL
    toast.info('File upload functionality would be implemented here');
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = availableUsers.filter(availableUser =>
    availableUser.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    availableUser.id !== user?.id
  );

  // Render chat rooms list for mobile
  const renderChatRoomsList = () => (
    <div className="mobile-chat-container bg-background">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b safe-area-inset">
        <div className="flex items-center justify-between mb-4">
          <h1 className="mobile-headline">Messages</h1>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowCreateRoom(!showCreateRoom)}
              className="chat-touch-target"
            >
              <Plus className="w-5 h-5" />
            </Button>
            <Button size="sm" variant="ghost" className="chat-touch-target">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 message-input"
          />
        </div>
      </div>

      {/* Create Room Panel */}
      <AnimatePresence>
        {showCreateRoom && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b overflow-hidden"
          >
            <div className="p-4">
              <h3 className="font-medium mb-3">Start a conversation</h3>
              <ScrollArea className="max-h-48 custom-scroll">
                {filteredUsers.map(availableUser => (
                  <TouchGestures
                    key={availableUser.id}
                    onDoubleTap={() => createDirectMessage(availableUser.id)}
                  >
                    <div
                      className="chat-room-item cursor-pointer"
                      onClick={() => createDirectMessage(availableUser.id)}
                    >
                      <div className="relative">
                        <Avatar className="chat-avatar">
                          <AvatarImage src={availableUser.avatar} />
                          <AvatarFallback>{availableUser.name[0]}</AvatarFallback>
                        </Avatar>
                        {onlineUsers.has(availableUser.id) && (
                          <div className="online-indicator" />
                        )}
                      </div>
                      <div className="flex-1 ml-3">
                        <div className="font-medium">{availableUser.name}</div>
                        <div className="text-sm text-muted-foreground capitalize">{availableUser.role}</div>
                      </div>
                    </div>
                  </TouchGestures>
                ))}
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rooms List */}
      <ScrollArea className="mobile-chat-messages custom-scroll">
        <div className="p-2">
          {filteredRooms.map(room => (
            <TouchGestures
              key={room.id}
              onDoubleTap={() => setSelectedRoom(room)}
            >
              <motion.div
                className={`chat-room-item ${
                  selectedRoom?.id === room.id ? 'bg-muted' : ''
                }`}
                onClick={() => setSelectedRoom(room)}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative">
                  <Avatar className="chat-avatar">
                    <AvatarImage src={room.avatar} />
                    <AvatarFallback>{room.name[0]}</AvatarFallback>
                  </Avatar>
                  {room.type === 'group' && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <Users className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 ml-3">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium truncate">{room.name}</h4>
                    {room.lastMessage && (
                      <span className="chat-timestamp flex-shrink-0">
                        {formatMessageTime(room.lastMessage.timestamp)}
                      </span>
                    )}
                  </div>
                  
                  {room.lastMessage && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {room.lastMessage.type === 'text' 
                        ? room.lastMessage.content 
                        : `📎 ${room.lastMessage.fileName || 'File'}`
                      }
                    </p>
                  )}
                </div>

                {room.unreadCount > 0 && (
                  <Badge variant="destructive" className="unread-badge flex-shrink-0">
                    {room.unreadCount > 9 ? '9+' : room.unreadCount}
                  </Badge>
                )}
              </motion.div>
            </TouchGestures>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  // Render active chat for mobile
  const renderActiveChat = () => (
    <div className="flex flex-col h-full bg-background" ref={chatContainerRef}>
      {/* Chat Header */}
      <div className="flex-shrink-0 p-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedRoom(null);
                setShowRoomsList(true);
              }}
              className="touch-target"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Avatar className="w-10 h-10">
              <AvatarImage src={selectedRoom?.avatar} />
              <AvatarFallback>{selectedRoom?.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{selectedRoom?.name}</h3>
              <p className="text-sm text-muted-foreground">
                {selectedRoom?.type === 'direct' ? 'Direct message' : 
                 selectedRoom?.type === 'group' ? `${selectedRoom.participants.length} members` :
                 'Support chat'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="touch-target">
              <Phone className="w-5 h-5" />
            </Button>
            <Button size="sm" variant="ghost" className="touch-target">
              <Video className="w-5 h-5" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setShowChatMenu(true)}
              className="touch-target"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className={`flex-1 p-4 ${showKeyboard ? 'pb-2' : ''}`}>
        <div className="space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => {
              const isOwn = message.senderId === user?.id;
              const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.senderId !== message.senderId);
              
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  {!isOwn && (
                    <div className="w-8 flex-shrink-0">
                      {showAvatar && (
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={message.senderAvatar} />
                          <AvatarFallback>{message.senderName[0]}</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}
                  
                  <div className={`max-w-[280px] ${isOwn ? 'order-1' : ''}`}>
                    {!isOwn && showAvatar && (
                      <div className="text-xs text-muted-foreground mb-1 px-1">
                        {message.senderName}
                      </div>
                    )}
                    
                    <div className={`rounded-2xl px-4 py-2 ${
                      isOwn 
                        ? 'bg-primary text-primary-foreground ml-auto' 
                        : 'bg-muted'
                    }`}>
                      {message.type === 'text' && (
                        <p className="text-sm break-words">{message.content}</p>
                      )}
                      
                      {message.type === 'image' && (
                        <div>
                          <img
                            src={message.fileUrl}
                            alt="Shared image"
                            className="max-w-full rounded-lg mb-2"
                          />
                          {message.content && (
                            <p className="text-sm break-words">{message.content}</p>
                          )}
                        </div>
                      )}
                      
                      {message.type === 'file' && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{message.fileName}</p>
                            <p className="text-xs opacity-70">
                              {message.fileSize && `${(message.fileSize / 1024).toFixed(1)} KB`}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className={`flex items-center justify-between mt-1 text-xs opacity-70`}>
                        <span>{formatMessageTime(message.timestamp)}</span>
                        {message.edited && <span>edited</span>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {isLoading && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className={`flex-shrink-0 p-4 border-t bg-background ${showKeyboard ? 'pb-2' : ''}`}>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                className="touch-target"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" className="touch-target">
                <ImageIcon className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" className="touch-target">
                <Smile className="w-4 h-4" />
              </Button>
            </div>
            
            <Input
              ref={messageInputRef}
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="mobile-input resize-none"
            />
          </div>
          
          <Button 
            onClick={sendMessage} 
            disabled={!newMessage.trim()}
            className="touch-target"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Chat Menu Bottom Sheet */}
      <BottomSheet
        isOpen={showChatMenu}
        onClose={() => setShowChatMenu(false)}
        snapPoints={[0.3]}
      >
        <div className="pb-4">
          <h3 className="text-lg font-semibold mb-4">Chat Options</h3>
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start touch-target">
              <Bell className="w-4 h-4 mr-3" />
              Notifications
            </Button>
            <Button variant="ghost" className="w-full justify-start touch-target">
              <Archive className="w-4 h-4 mr-3" />
              Archive Chat
            </Button>
            <Button variant="ghost" className="w-full justify-start text-destructive touch-target">
              <Trash2 className="w-4 h-4 mr-3" />
              Delete Chat
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );

  // Main render logic
  if (!selectedRoom && showRoomsList) {
    return (
      <div className={`${className}`} style={{ height }}>
        {renderChatRoomsList()}
      </div>
    );
  }

  if (selectedRoom) {
    return (
      <div className={`${className}`} style={{ height }}>
        {renderActiveChat()}
      </div>
    );
  }

  // No Chat Selected (fallback)
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ height }}>
      <div className="text-center px-4">
        <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold text-xl mb-2">Welcome to Messages</h3>
        <p className="text-muted-foreground mb-4">
          Connect with property hosts, support team, and other users.
        </p>
        <Button onClick={() => setShowRoomsList(true)} className="touch-target">
          Start Messaging
        </Button>
      </div>
    </div>
  );
}

export default MobileChatSystem;
