import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { 
  MessageCircle, 
  Search, 
  Users, 
  Eye, 
  Shield,
  AlertTriangle,
  Filter,
  Calendar,
  User as UserIcon,
  RefreshCw
} from 'lucide-react';
import { User, ChatRoom, ChatMessage } from '../types';
import { MessageBubble } from './MessageBubble';
import { getSupabaseFunctionUrl, publicAnonKey } from '../services/supabaseProject';
import { toast } from "sonner";

interface AdminChatOversightProps {
  currentUser: User;
}

export function AdminChatOversight({ currentUser }: AdminChatOversightProps) {
  const [allRooms, setAllRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'direct' | 'group' | 'support'>('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const serverUrl = getSupabaseFunctionUrl();

  // Fetch all chat rooms for admin oversight
  const fetchAllRooms = useCallback(async () => {
    if (currentUser.role !== 'admin') return;
    
    setLoading(true);
    try {
      const response = await fetch(`${serverUrl}/admin/chat/rooms`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'X-Admin-User-ID': currentUser.id,
        },
      });

      const result = await response.json();
      if (result.success) {
        setAllRooms(result.rooms);
      } else {
        console.error('Failed to fetch admin chat rooms:', result.error);
        toast.error('Failed to load chat rooms');
      }
    } catch (error) {
      console.error('Error fetching admin chat rooms:', error);
      toast.error('Error loading chat rooms');
    } finally {
      setLoading(false);
    }
  }, [serverUrl, currentUser]);

  // Load messages for a specific room
  const loadRoomMessages = useCallback(async (roomId: string) => {
    if (currentUser.role !== 'admin') return;
    
    try {
      const response = await fetch(`${serverUrl}/admin/chat/messages/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'X-Admin-User-ID': currentUser.id,
        },
      });

      const result = await response.json();
      if (result.success) {
        setCurrentMessages(result.messages);
      } else {
        console.error('Failed to fetch room messages:', result.error);
        toast.error('Failed to load messages');
      }
    } catch (error) {
      console.error('Error fetching room messages:', error);
      toast.error('Error loading messages');
    }
  }, [serverUrl, currentUser]);

  // Handle room selection
  const handleRoomSelect = async (room: ChatRoom) => {
    setSelectedRoom(room);
    await loadRoomMessages(room.id);
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllRooms();
    if (selectedRoom) {
      await loadRoomMessages(selectedRoom.id);
    }
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  // Filter rooms based on search and type
  const filteredRooms = allRooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.participants.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || room.type === filterType;
    return matchesSearch && matchesType;
  });

  // Load data on mount
  useEffect(() => {
    fetchAllRooms();
  }, [fetchAllRooms]);

  // Set up auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllRooms();
      if (selectedRoom) {
        loadRoomMessages(selectedRoom.id);
      }
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [fetchAllRooms, loadRoomMessages, selectedRoom]);

  if (currentUser.role !== 'admin') {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Access Denied</h3>
          <p className="text-muted-foreground">
            Only administrators can access chat oversight features.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full"
      >
        {/* Rooms List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-4"
        >
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  Chat Oversight
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="w-8 h-8 p-0"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* Search and Filter */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search rooms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="flex gap-2">
                  {['all', 'direct', 'group', 'support'].map((type) => (
                    <Button
                      key={type}
                      size="sm"
                      variant={filterType === type ? "default" : "outline"}
                      onClick={() => setFilterType(type as any)}
                      className="capitalize"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''}
                </span>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Admin View
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 min-h-0">
              <ScrollArea className="h-full">
                <div className="space-y-1 p-4">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Loading rooms...</p>
                    </div>
                  ) : filteredRooms.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">No rooms found</p>
                    </div>
                  ) : (
                    filteredRooms.map((room) => (
                      <motion.div
                        key={room.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          variant={selectedRoom?.id === room.id ? "secondary" : "ghost"}
                          className="w-full h-auto p-3 flex items-start gap-3 justify-start"
                          onClick={() => handleRoomSelect(room)}
                        >
                          <div className="flex-shrink-0">
                            {room.type === 'group' ? (
                              <Users className="w-10 h-10 p-2 bg-primary/10 text-primary rounded-full" />
                            ) : room.type === 'support' ? (
                              <MessageCircle className="w-10 h-10 p-2 bg-secondary/10 text-secondary rounded-full" />
                            ) : (
                              <UserIcon className="w-10 h-10 p-2 bg-accent/10 text-accent-foreground rounded-full" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center justify-between">
                              <h4 className="truncate font-medium">{room.name}</h4>
                              <Badge 
                                variant="outline" 
                                className="ml-1 flex-shrink-0 text-xs"
                              >
                                {room.type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">
                                {room.participants.length} participant{room.participants.length !== 1 ? 's' : ''}
                              </p>
                              {room.lastMessage && (
                                <span className="text-xs text-muted-foreground">
                                  • {new Date(room.lastMessage.timestamp).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {room.lastMessage && (
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                <strong>{room.lastMessage.senderName}:</strong> {' '}
                                {room.lastMessage.type === 'text' ? room.lastMessage.content : `[${room.lastMessage.type}]`}
                              </p>
                            )}
                          </div>
                        </Button>
                      </motion.div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* Chat Messages */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-8"
        >
          {selectedRoom ? (
            <Card className="h-full flex flex-col">
              {/* Chat Header */}
              <CardHeader className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {selectedRoom.type === 'group' ? (
                        <Users className="w-10 h-10 p-2 bg-primary/10 text-primary rounded-full" />
                      ) : selectedRoom.type === 'support' ? (
                        <MessageCircle className="w-10 h-10 p-2 bg-secondary/10 text-secondary rounded-full" />
                      ) : (
                        <UserIcon className="w-10 h-10 p-2 bg-accent/10 text-accent-foreground rounded-full" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{selectedRoom.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedRoom.participants.length} participants • {selectedRoom.type} chat
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    Monitoring
                  </Badge>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 p-0 min-h-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {currentMessages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No messages in this room yet</p>
                      </div>
                    ) : (
                      currentMessages.map((message, index) => {
                        const isOwnMessage = message.senderId === currentUser.id;
                        const previousMessage = index > 0 ? currentMessages[index - 1] : null;
                        const showAvatar = !previousMessage || previousMessage.senderId !== message.senderId;
                        const compact = previousMessage && previousMessage.senderId === message.senderId;
                        
                        return (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border border-border/50 rounded-lg p-3 bg-muted/20"
                          >
                            <MessageBubble
                              message={message}
                              isOwnMessage={isOwnMessage}
                              currentUser={currentUser}
                              showAvatar={showAvatar}
                              compact={compact}
                            />
                            {/* Admin overlay info */}
                            <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
                              <span>ID: {message.id}</span>
                              <span>{new Date(message.timestamp).toLocaleString()}</span>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </CardContent>

              {/* Admin Notice */}
              <div className="border-t p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    This conversation is being monitored for compliance and safety purposes.
                  </span>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center max-w-md mx-auto px-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6 }}
                >
                  <Eye className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Chat Oversight Dashboard</h3>
                  <p className="text-muted-foreground mb-6">
                    Select a chat room from the left to monitor conversations and ensure platform safety.
                  </p>
                  <Badge variant="outline" className="flex items-center gap-1 w-fit mx-auto">
                    <Shield className="w-3 h-3" />
                    Admin Privileges Required
                  </Badge>
                </motion.div>
              </div>
            </Card>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
