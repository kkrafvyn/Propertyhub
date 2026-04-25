/**
 * PropertyChatIntegration - Enhanced Chat System for Property Communications
 * Integrates chat functionality with property interactions and role-based permissions
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from "sonner";
import { 
  MessageCircle, 
  Users, 
  Building2, 
  Phone, 
  Video, 
  MoreVertical,
  Search,
  Filter,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Paperclip,
  Smile,
  Mic,
  Calendar,
  MapPin,
  Shield,
  Crown,
  Settings,
  Archive,
  Bell,
  BellOff,
  UserPlus,
  Info,
  Ban,
  Flag
} from 'lucide-react';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface User {
  id: string;
  name: string;
  email?: string;
  role: 'user' | 'host' | 'manager' | 'admin';
  avatar?: string;
  verified?: boolean;
  status?: 'online' | 'offline' | 'away';
  lastSeen?: string;
}

interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  currency: string;
  images: string[];
  owner: {
    id: string;
    name: string;
    avatar?: string;
    verified: boolean;
    rating: number;
    responseTime: number;
  };
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'system' | 'property-inquiry';
  status: 'sending' | 'sent' | 'delivered' | 'read';
  attachments?: {
    type: string;
    url: string;
    name: string;
  }[];
  propertyContext?: {
    propertyId: string;
    propertyTitle: string;
    propertyImage?: string;
  };
}

interface ChatRoom {
  id: string;
  type: 'direct' | 'property-inquiry' | 'support' | 'group';
  participants: User[];
  property?: Property;
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  muted: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tags: string[];
  assignedTo?: string; // For manager assignment
}

interface PropertyChatIntegrationProps {
  currentUser: User;
  chatRooms: ChatRoom[];
  onSendMessage: (roomId: string, message: Omit<ChatMessage, 'id' | 'timestamp' | 'status'>) => Promise<void>;
  onCreateRoom: (participants: User[], property?: Property, type?: string) => Promise<ChatRoom>;
  onArchiveRoom: (roomId: string) => Promise<void>;
  onAssignManager: (roomId: string, managerId: string) => Promise<void>;
}

type ChatFilter = 'all' | 'property-inquiries' | 'support' | 'archived' | 'assigned';
type SortBy = 'recent' | 'unread' | 'priority' | 'property';

export const PropertyChatIntegration: React.FC<PropertyChatIntegrationProps> = ({
  currentUser,
  chatRooms,
  onSendMessage,
  onCreateRoom,
  onArchiveRoom,
  onAssignManager
}) => {
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [messageInput, setMessageInput] = useState('');
  const [showRoomDetails, setShowRoomDetails] = useState(false);
  const [showPropertyContactModal, setShowPropertyContactModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Mock messages for demonstration
  const [messages] = useState<ChatMessage[]>([
    {
      id: '1',
      senderId: 'user1',
      senderName: 'Prospective renter',
      content: 'Hi, I\'m interested in your property listing. Is it still available?',
      timestamp: '2024-01-15T10:30:00Z',
      type: 'property-inquiry',
      status: 'read',
      propertyContext: {
        propertyId: 'prop1',
        propertyTitle: 'Beautiful 2BR Apartment in Accra',
        propertyImage: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400'
      }
    },
    {
      id: '2',
      senderId: currentUser.id,
      senderName: currentUser.name,
      content: 'Yes, it\'s still available! Would you like to schedule a viewing?',
      timestamp: '2024-01-15T10:35:00Z',
      type: 'text',
      status: 'read'
    }
  ]);

  // Filter and sort chat rooms
  const filteredRooms = useMemo(() => {
    let filtered = chatRooms;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(room =>
        room.participants.some(p => p.name.toLowerCase().includes(query)) ||
        room.property?.title.toLowerCase().includes(query) ||
        room.lastMessage?.content.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    switch (filter) {
      case 'property-inquiries':
        filtered = filtered.filter(room => room.type === 'property-inquiry');
        break;
      case 'support':
        filtered = filtered.filter(room => room.type === 'support');
        break;
      case 'archived':
        filtered = filtered.filter(room => room.archived);
        break;
      case 'assigned':
        filtered = filtered.filter(room => room.assignedTo === currentUser.id);
        break;
      default:
        filtered = filtered.filter(room => !room.archived);
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'unread':
          return b.unreadCount - a.unreadCount;
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'property':
          return (a.property?.title || '').localeCompare(b.property?.title || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [chatRooms, searchQuery, filter, sortBy, currentUser.id]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalRooms = chatRooms.filter(r => !r.archived).length;
    const unreadRooms = chatRooms.filter(r => !r.archived && r.unreadCount > 0).length;
    const propertyInquiries = chatRooms.filter(r => r.type === 'property-inquiry' && !r.archived).length;
    const assignedToMe = chatRooms.filter(r => r.assignedTo === currentUser.id && !r.archived).length;

    return {
      totalRooms,
      unreadRooms,
      propertyInquiries,
      assignedToMe
    };
  }, [chatRooms, currentUser.id]);

  // Handle message send
  const handleSendMessage = useCallback(async () => {
    if (!selectedRoom || !messageInput.trim()) return;

    try {
      await onSendMessage(selectedRoom.id, {
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        content: messageInput.trim(),
        type: 'text'
      });
      
      setMessageInput('');
      toast.success('Message sent');
    } catch (error) {
      toast.error('Failed to send message');
    }
  }, [selectedRoom, messageInput, currentUser, onSendMessage]);

  // Handle property contact initiation
  const handleContactPropertyOwner = useCallback(async (property: Property) => {
    try {
      const room = await onCreateRoom(
        [currentUser, { ...property.owner, role: 'host' as const }],
        property,
        'property-inquiry'
      );
      
      setSelectedRoom(room);
      setShowPropertyContactModal(false);
      toast.success('Chat started with property owner');
    } catch (error) {
      toast.error('Failed to start chat');
    }
  }, [currentUser, onCreateRoom]);

  // Handle manager assignment
  const handleAssignToManager = useCallback(async (roomId: string, managerId: string) => {
    try {
      await onAssignManager(roomId, managerId);
      toast.success('Chat assigned to manager');
    } catch (error) {
      toast.error('Failed to assign chat');
    }
  }, [onAssignManager]);

  // Get user role permissions
  const canAssignChats = currentUser.role === 'admin' || currentUser.role === 'manager';
  const canViewAllChats = currentUser.role === 'admin';
  const canManageUsers = currentUser.role === 'admin';

  // Render chat room list item
  const renderChatRoomItem = (room: ChatRoom) => {
    const otherParticipant = room.participants.find(p => p.id !== currentUser.id);
    const isAssignedToMe = room.assignedTo === currentUser.id;

    return (
      <div
        key={room.id}
        onClick={() => setSelectedRoom(room)}
        className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
          selectedRoom?.id === room.id ? 'bg-muted border-l-4 border-l-primary' : ''
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="relative">
            <Avatar className="w-12 h-12">
              {otherParticipant?.avatar ? (
                <ImageWithFallback
                  src={otherParticipant.avatar}
                  alt={otherParticipant.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                  {otherParticipant?.name.charAt(0) || 'U'}
                </div>
              )}
            </Avatar>
            {otherParticipant?.status === 'online' && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">
                  {otherParticipant?.name || 'Unknown User'}
                </h3>
                {otherParticipant?.verified && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                {room.type === 'property-inquiry' && (
                  <Badge variant="outline" className="text-xs">
                    <Building2 className="w-3 h-3 mr-1" />
                    Property
                  </Badge>
                )}
                {isAssignedToMe && (
                  <Badge variant="secondary" className="text-xs">
                    <Crown className="w-3 h-3 mr-1" />
                    Assigned
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {room.priority !== 'normal' && (
                  <Badge 
                    variant={room.priority === 'urgent' ? 'destructive' : 'default'}
                    className="text-xs"
                  >
                    {room.priority}
                  </Badge>
                )}
                {room.unreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {room.unreadCount}
                  </Badge>
                )}
              </div>
            </div>

            {room.property && (
              <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{room.property.title}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground truncate">
                {room.lastMessage?.content || 'No messages yet'}
              </p>
              <span className="text-xs text-muted-foreground">
                {room.lastMessage?.timestamp ? 
                  new Date(room.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
                  new Date(room.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render message bubble
  const renderMessage = (message: ChatMessage) => {
    const isOwn = message.senderId === currentUser.id;
    
    return (
      <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
          {!isOwn && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">{message.senderName}</span>
              {message.type === 'property-inquiry' && (
                <Badge variant="outline" className="text-xs">
                  <Building2 className="w-3 h-3 mr-1" />
                  Property Inquiry
                </Badge>
              )}
            </div>
          )}
          
          <div
            className={`rounded-2xl px-4 py-2 ${
              isOwn
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}
          >
            {message.propertyContext && (
              <div className="mb-2 p-2 rounded bg-background/10 border border-background/20">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4" />
                  <span className="font-medium">{message.propertyContext.propertyTitle}</span>
                </div>
              </div>
            )}
            
            <p className="text-sm">{message.content}</p>
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isOwn && (
              <div className="text-xs">
                {message.status === 'read' && '✓✓'}
                {message.status === 'delivered' && '✓'}
                {message.status === 'sent' && '○'}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex">
      {/* Chat List Sidebar */}
      <div className="w-80 border-r bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Messages</h2>
            <Button size="sm" onClick={() => setShowPropertyContactModal(true)}>
              <MessageCircle className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="text-center p-2 bg-muted rounded-lg">
              <p className="text-sm font-medium">{stats.totalRooms}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center p-2 bg-muted rounded-lg">
              <p className="text-sm font-medium">{stats.unreadRooms}</p>
              <p className="text-xs text-muted-foreground">Unread</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Select value={filter} onValueChange={(value) => setFilter(value as ChatFilter)}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chats</SelectItem>
                <SelectItem value="property-inquiries">Property Inquiries</SelectItem>
                {canAssignChats && <SelectItem value="assigned">Assigned to Me</SelectItem>}
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="property">Property</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {filteredRooms.length > 0 ? (
            filteredRooms.map(renderChatRoomItem)
          ) : (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2">No chats found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? 'Try adjusting your search' : 'Start a new conversation'}
              </p>
              <Button size="sm" onClick={() => setShowPropertyContactModal(true)}>
                <MessageCircle className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    {selectedRoom.participants.find(p => p.id !== currentUser.id)?.avatar ? (
                      <ImageWithFallback
                        src={selectedRoom.participants.find(p => p.id !== currentUser.id)!.avatar!}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                        {selectedRoom.participants.find(p => p.id !== currentUser.id)?.name.charAt(0) || 'U'}
                      </div>
                    )}
                  </Avatar>
                  <div>
                    <h3 className="font-medium">
                      {selectedRoom.participants.find(p => p.id !== currentUser.id)?.name || 'Unknown User'}
                    </h3>
                    {selectedRoom.property && (
                      <p className="text-sm text-muted-foreground">
                        About: {selectedRoom.property.title}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowRoomDetails(true)}
                  >
                    <Info className="w-4 h-4" />
                  </Button>
                  
                  {canAssignChats && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Crown className="w-4 h-4 mr-2" />
                          Assign to Manager
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Flag className="w-4 h-4 mr-2" />
                          Set Priority
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Archive className="w-4 h-4 mr-2" />
                          Archive Chat
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Ban className="w-4 h-4 mr-2" />
                          Block User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>

            {/* Property Context Banner */}
            {selectedRoom.property && (
              <div className="p-3 bg-muted/50 border-b">
                <div className="flex items-center gap-3">
                  {selectedRoom.property.images[0] && (
                    <ImageWithFallback
                      src={selectedRoom.property.images[0]}
                      alt={selectedRoom.property.title}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{selectedRoom.property.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {selectedRoom.property.currency} {selectedRoom.property.price.toLocaleString()} • {selectedRoom.property.location}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    View Property
                  </Button>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.map(renderMessage)}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t bg-card">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <div className="flex-1 relative">
                  <Textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type your message..."
                    className="resize-none pr-10"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  >
                    <Smile className="w-4 h-4" />
                  </Button>
                </div>
                <Button variant="outline" size="sm">
                  <Mic className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Select a chat to start messaging</h3>
              <p className="text-muted-foreground">
                Choose a conversation from the sidebar to begin
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Property Contact Modal */}
      <Dialog open={showPropertyContactModal} onOpenChange={setShowPropertyContactModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Property Owner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Start a conversation about a specific property
            </p>
            {/* Property selection would go here */}
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Property selection interface</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Room Details Modal */}
      <Dialog open={showRoomDetails} onOpenChange={setShowRoomDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chat Details</DialogTitle>
          </DialogHeader>
          {selectedRoom && (
            <div className="space-y-4">
              <div className="text-center">
                <Avatar className="w-16 h-16 mx-auto mb-3">
                  {selectedRoom.participants.find(p => p.id !== currentUser.id)?.avatar ? (
                    <ImageWithFallback
                      src={selectedRoom.participants.find(p => p.id !== currentUser.id)!.avatar!}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold text-xl">
                      {selectedRoom.participants.find(p => p.id !== currentUser.id)?.name.charAt(0) || 'U'}
                    </div>
                  )}
                </Avatar>
                <h3 className="font-medium">
                  {selectedRoom.participants.find(p => p.id !== currentUser.id)?.name || 'Unknown User'}
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Notifications</Label>
                  <Switch defaultChecked={!selectedRoom.muted} />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>Archive Chat</Label>
                  <Button variant="outline" size="sm">
                    <Archive className="w-4 h-4" />
                  </Button>
                </div>

                {canAssignChats && (
                  <div className="flex items-center justify-between">
                    <Label>Assign to Manager</Label>
                    <Select>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager1">Manager 1</SelectItem>
                        <SelectItem value="manager2">Manager 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
