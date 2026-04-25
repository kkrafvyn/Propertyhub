import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { 
  MessageCircle, 
  Send, 
  Plus, 
  Search, 
  Settings, 
  Phone, 
  Video, 
  MoreVertical,
  Users,
  UserPlus,
  Hash,
  Clock,
  Check,
  CheckCheck,
  Paperclip,
  Image as ImageIcon,
  Smile,
  Bell,
  BellOff
} from 'lucide-react';
import { User } from '../types';
import { useMobile } from '../hooks/useMobile';
import { toast } from "sonner";

// Define chat-specific types
interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'file';
  read: boolean;
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'support';
  participants: string[];
  avatar?: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

// Simple date formatting utility
const formatDistanceToNow = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

const formatTime = (timestamp: string, format: string) => {
  const date = new Date(timestamp);
  if (format === 'HH:mm') {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  if (format === 'MMM dd, HH:mm') {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit' 
    }) + ', ' + date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  return date.toLocaleString();
};

interface ChatRoomProps {
  currentUser: User;
  onBack?: () => void;
}

export function ChatRoom({ currentUser, onBack }: ChatRoomProps) {
  // Mock data for demonstration
  const [rooms] = useState<ChatRoom[]>([
    {
      id: '1',
      name: 'Support Team',
      type: 'support',
      participants: [currentUser.id, 'admin-1'],
      unreadCount: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessage: {
        id: '1',
        senderId: 'admin-1',
        senderName: 'Admin',
        content: 'How can I help you today?',
        timestamp: new Date().toISOString(),
        type: 'text',
        read: false
      }
    },
    {
      id: '2',
      name: 'Property Inquiries',
      type: 'group',
      participants: [currentUser.id, 'host-1', 'host-2'],
      unreadCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessage: {
        id: '2',
        senderId: 'host-1',
        senderName: 'Property host',
        content: 'The property tour is scheduled for tomorrow',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        type: 'text',
        read: true
      }
    }
  ]);

  const [availableUsers] = useState<User[]>([
    {
      id: 'admin-1',
      name: 'Admin Support',
      email: 'admin@propertyhub.com',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&w=100'
    },
    {
      id: 'host-1',
      name: 'Property host',
      email: 'host@propertyhub.com',
      role: 'host',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&w=100'
    },
    {
      id: 'host-2',
      name: 'Listing partner',
      email: 'partner@propertyhub.com',
      role: 'host',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=100'
    }
  ]);

  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      senderId: 'admin-1',
      senderName: 'Admin Support',
      senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&w=100',
      content: 'Hello! Welcome to PropertyHub support. How can I help you today?',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      type: 'text',
      read: true
    },
    {
      id: '2',
      senderId: currentUser.id,
      senderName: currentUser.name,
      content: 'Hi, I have a question about booking a property.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      type: 'text',
      read: true
    },
    {
      id: '3',
      senderId: 'admin-1',
      senderName: 'Admin Support',
      senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&w=100',
      content: 'Sure! I\'d be happy to help you with your booking question. What specifically would you like to know?',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      type: 'text',
      read: true
    }
  ]);

  const [loading] = useState(false);
  
  const [messageInput, setMessageInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useMobile();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  // Focus input when room changes
  useEffect(() => {
    if (activeRoom && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeRoom]);

  // Store current user in localStorage for chat provider
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !messageInput.trim()) return;

    const message = messageInput.trim();
    setMessageInput('');
    
    // Add message to current messages
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      content: message,
      timestamp: new Date().toISOString(),
      type: 'text',
      read: true
    };
    
    setCurrentMessages(prev => [...prev, newMessage]);
    toast.success('Message sent!');
  };

  const sendMessage = async (roomId: string, content: string) => {
    // Simplified mock implementation
    console.log('Sending message to room:', roomId, 'Content:', content);
  };

  const createDirectMessage = async (userId: string, userName: string) => {
    // Simplified mock implementation
    toast.info(`Starting direct message with ${userName}`);
    setShowNewChatModal(false);
  };

  const createRoom = async (name: string, type: string, participants: string[], description: string) => {
    // Simplified mock implementation
    toast.info(`Creating ${type} room: ${name}`);
    return null;
  };

  const handleCreateDirectMessage = async (userId: string) => {
    const user = availableUsers.find(u => u.id === userId);
    if (!user) return;

    await createDirectMessage(userId, user.name);
    setShowNewChatModal(false);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;

    const room = await createRoom(
      groupName.trim(),
      'group',
      selectedUsers,
      `Group chat: ${groupName.trim()}`
    );

    if (room) {
      setActiveRoom(room.id);
      setShowCreateGroup(false);
      setGroupName('');
      setSelectedUsers([]);
      setShowNewChatModal(false);
    }
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchInput.toLowerCase())
  );

  const filteredUsers = availableUsers.filter(user =>
    user.id !== currentUser.id &&
    user.name.toLowerCase().includes(searchInput.toLowerCase())
  );

  const activeRoomData = rooms.find(room => room.id === activeRoom);

  const formatMessageTime = (timestamp: string) => {
    const messageDate = new Date(timestamp);
    const now = new Date();
    const isToday = messageDate.toDateString() === now.toDateString();
    
    if (isToday) {
      return formatTime(timestamp, 'HH:mm');
    } else {
      return formatTime(timestamp, 'MMM dd, HH:mm');
    }
  };

  const getChatTitle = (room: ChatRoom) => {
    if (room.type === 'direct') {
      const otherParticipant = availableUsers.find(user => 
        room.participants.includes(user.id) && user.id !== currentUser.id
      );
      return otherParticipant?.name || 'Direct Message';
    }
    return room.name;
  };

  const getChatAvatar = (room: ChatRoom) => {
    if (room.type === 'direct') {
      const otherParticipant = availableUsers.find(user => 
        room.participants.includes(user.id) && user.id !== currentUser.id
      );
      return otherParticipant?.avatar || '';
    }
    return room.avatar || '';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-8rem)]"
        >
          {/* Chat List Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className={`lg:col-span-1 ${isMobile && activeRoom ? 'hidden' : 'block'}`}
          >
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    Chats
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => setShowNewChatModal(true)}
                    className="w-8 h-8 p-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search chats..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <ScrollArea className="h-full">
                  <div className="space-y-1 p-4">
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Loading chats...</p>
                      </div>
                    ) : filteredRooms.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground mb-2">No chats yet</p>
                        <Button
                          size="sm"
                          onClick={() => setShowNewChatModal(true)}
                          variant="outline"
                        >
                          Start a conversation
                        </Button>
                      </div>
                    ) : (
                      filteredRooms.map((room) => {
                        const isActive = activeRoom === room.id;
                        const chatTitle = getChatTitle(room);
                        const chatAvatar = getChatAvatar(room);
                        
                        return (
                          <motion.div
                            key={room.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Button
                              variant={isActive ? "secondary" : "ghost"}
                              className="w-full h-auto p-3 flex items-start gap-3 justify-start"
                              onClick={() => setActiveRoom(room.id)}
                            >
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={chatAvatar} alt={chatTitle} />
                                <AvatarFallback>
                                  {room.type === 'group' ? (
                                    <Users className="w-4 h-4" />
                                  ) : room.type === 'support' ? (
                                    <MessageCircle className="w-4 h-4" />
                                  ) : (
                                    chatTitle.charAt(0).toUpperCase()
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0 text-left">
                                <div className="flex items-center justify-between">
                                  <h4 className="truncate font-medium">{chatTitle}</h4>
                                  {room.unreadCount > 0 && (
                                    <Badge variant="default" className="ml-1">
                                      {room.unreadCount}
                                    </Badge>
                                  )}
                                </div>
                                {room.lastMessage && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <p className="text-xs text-muted-foreground truncate flex-1">
                                      {room.lastMessage.senderName === currentUser.name ? 'You: ' : ''}
                                      {room.lastMessage.content}
                                    </p>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(room.lastMessage.timestamp))}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </Button>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>

          {/* Chat Area */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`lg:col-span-3 ${isMobile && !activeRoom ? 'hidden' : 'block'}`}
          >
            {activeRoom && activeRoomData ? (
              <Card className="h-full flex flex-col">
                {/* Chat Header */}
                <CardHeader className="border-b pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={getChatAvatar(activeRoomData)} alt={getChatTitle(activeRoomData)} />
                        <AvatarFallback>
                          {activeRoomData.type === 'group' ? (
                            <Users className="w-4 h-4" />
                          ) : activeRoomData.type === 'support' ? (
                            <MessageCircle className="w-4 h-4" />
                          ) : (
                            getChatTitle(activeRoomData).charAt(0).toUpperCase()
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{getChatTitle(activeRoomData)}</h3>
                        <p className="text-sm text-muted-foreground">
                          {activeRoomData.type === 'group' ? 
                            `${activeRoomData.participants.length} members` :
                            activeRoomData.type === 'support' ?
                            'Support chat' :
                            'Direct message'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isMobile && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setActiveRoom(null)}
                        >
                          Back
                        </Button>
                      )}
                      <Button size="sm" variant="ghost">
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Video className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 p-0">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                      {currentMessages.length === 0 ? (
                        <div className="text-center py-8">
                          <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                        </div>
                      ) : (
                        currentMessages.map((message) => {
                          const isOwnMessage = message.senderId === currentUser.id;
                          
                          return (
                            <motion.div
                              key={message.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                            >
                              {!isOwnMessage && (
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={message.senderAvatar} alt={message.senderName} />
                                  <AvatarFallback>
                                    {message.senderName.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div className={`flex-1 max-w-[70%] ${isOwnMessage ? 'text-right' : ''}`}>
                                {!isOwnMessage && (
                                  <p className="text-xs text-muted-foreground mb-1">
                                    {message.senderName}
                                  </p>
                                )}
                                <div
                                  className={`rounded-2xl px-4 py-2 ${
                                    isOwnMessage
                                      ? 'bg-primary text-primary-foreground ml-auto'
                                      : 'bg-muted text-foreground'
                                  }`}
                                >
                                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                  <div className="flex items-center justify-end gap-1 mt-1">
                                    <span className={`text-xs ${isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                      {formatMessageTime(message.timestamp)}
                                    </span>
                                    {isOwnMessage && (
                                      <CheckCheck className={`w-3 h-3 ${isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`} />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </CardContent>

                {/* Message Input */}
                <div className="border-t p-4">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button type="submit" disabled={!messageInput.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Welcome to PropertyHub Chat</h3>
                  <p className="text-muted-foreground mb-6">
                    Select a conversation or start a new one to begin messaging
                  </p>
                  <Button onClick={() => setShowNewChatModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Start New Chat
                  </Button>
                </div>
              </Card>
            )}
          </motion.div>
        </motion.div>

        {/* New Chat Modal */}
        <AnimatePresence>
          {showNewChatModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowNewChatModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Start New Chat</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={!showCreateGroup ? "default" : "outline"}
                        onClick={() => setShowCreateGroup(false)}
                      >
                        Direct Message
                      </Button>
                      <Button
                        size="sm"
                        variant={showCreateGroup ? "default" : "outline"}
                        onClick={() => setShowCreateGroup(true)}
                      >
                        Create Group
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {showCreateGroup ? (
                      <div className="space-y-4">
                        <Input
                          placeholder="Group name"
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                        />
                        <div>
                          <h4 className="font-medium mb-2">Select members</h4>
                          <ScrollArea className="h-48 border rounded-md p-2">
                            {filteredUsers.map((user) => (
                              <div
                                key={user.id}
                                className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                                onClick={() => handleUserToggle(user.id)}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedUsers.includes(user.id)}
                                  onChange={() => handleUserToggle(user.id)}
                                  className="rounded"
                                />
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={user.avatar} alt={user.name} />
                                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{user.name}</p>
                                  <p className="text-sm text-muted-foreground">{user.role}</p>
                                </div>
                              </div>
                            ))}
                          </ScrollArea>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowNewChatModal(false)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={handleCreateGroup}
                            disabled={!groupName.trim() || selectedUsers.length === 0}
                          >
                            Create Group
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <h4 className="font-medium mb-2">Choose a user to message</h4>
                        <ScrollArea className="h-48">
                          {filteredUsers.map((user) => (
                            <Button
                              key={user.id}
                              variant="ghost"
                              className="w-full justify-start h-auto p-3 mb-1"
                              onClick={() => handleCreateDirectMessage(user.id)}
                            >
                              <Avatar className="w-8 h-8 mr-3">
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="text-left">
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{user.role}</p>
                              </div>
                            </Button>
                          ))}
                        </ScrollArea>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowNewChatModal(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
