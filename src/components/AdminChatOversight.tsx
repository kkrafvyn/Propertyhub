import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import {
  AlertTriangle,
  Eye,
  MessageCircle,
  RefreshCw,
  Search,
  Shield,
  User as UserIcon,
  Users,
} from 'lucide-react';
import type { ChatMessage, ChatRoom, User } from '../types';
import { MessageBubble } from './MessageBubble';
import { toast } from 'sonner';
import { loadAdminRoomMessages, loadAdminRooms } from '../services/chatDataService';
import { normalizeUserRole } from '../utils/roleCapabilities';

interface AdminChatOversightProps {
  currentUser: User;
}

const ROOM_TYPES: Array<'all' | 'direct' | 'group' | 'support'> = [
  'all',
  'direct',
  'group',
  'support',
];

const getRoomName = (room: ChatRoom) => room.name || 'Conversation';

export function AdminChatOversight({ currentUser }: AdminChatOversightProps) {
  const [allRooms, setAllRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'direct' | 'group' | 'support'>('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isAdmin = normalizeUserRole(currentUser) === 'admin';

  const fetchAllRooms = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const rooms = await loadAdminRooms(currentUser);
      setAllRooms(rooms);

      if (selectedRoom && !rooms.some((room) => room.id === selectedRoom.id)) {
        setSelectedRoom(null);
        setCurrentMessages([]);
      }
    } catch (error) {
      console.error('Error fetching admin chat rooms:', error);
      toast.error('Error loading chat rooms');
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin, selectedRoom]);

  const fetchRoomMessages = useCallback(async (roomId: string) => {
    if (!isAdmin) return;

    try {
      const messages = await loadAdminRoomMessages(currentUser, roomId);
      setCurrentMessages(messages);
    } catch (error) {
      console.error('Error fetching room messages:', error);
      toast.error('Error loading messages');
    }
  }, [currentUser, isAdmin]);

  const handleRoomSelect = async (room: ChatRoom) => {
    setSelectedRoom(room);
    await fetchRoomMessages(room.id);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllRooms();
    if (selectedRoom) {
      await fetchRoomMessages(selectedRoom.id);
    }
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const filteredRooms = allRooms.filter((room) => {
    const roomName = getRoomName(room);
    const matchesSearch =
      roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.participants.some((participantId) =>
        participantId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchesType = filterType === 'all' || room.type === filterType;

    return matchesSearch && matchesType;
  });

  useEffect(() => {
    void fetchAllRooms();
  }, [fetchAllRooms]);

  useEffect(() => {
    const interval = setInterval(() => {
      void fetchAllRooms();
      if (selectedRoom) {
        void fetchRoomMessages(selectedRoom.id);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchAllRooms, fetchRoomMessages, selectedRoom]);

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Shield className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">Access Denied</h3>
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
        className="grid h-full grid-cols-1 gap-6 lg:grid-cols-12"
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-4"
        >
          <Card className="flex h-full flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Chat Oversight
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search rooms..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="flex gap-2">
                  {ROOM_TYPES.map((type) => (
                    <Button
                      key={type}
                      size="sm"
                      variant={filterType === type ? 'default' : 'outline'}
                      onClick={() => setFilterType(type)}
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
                  <Shield className="h-3 w-3" />
                  Admin View
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="min-h-0 flex-1 p-0">
              <ScrollArea className="h-full">
                <div className="space-y-1 p-4">
                  {loading ? (
                    <div className="py-8 text-center">
                      <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <p className="text-sm text-muted-foreground">Loading rooms...</p>
                    </div>
                  ) : filteredRooms.length === 0 ? (
                    <div className="py-8 text-center">
                      <MessageCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
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
                          variant={selectedRoom?.id === room.id ? 'secondary' : 'ghost'}
                          className="h-auto w-full justify-start gap-3 p-3"
                          onClick={() => handleRoomSelect(room)}
                        >
                          <div className="flex-shrink-0">
                            {room.type === 'group' ? (
                              <Users className="h-10 w-10 rounded-full bg-primary/10 p-2 text-primary" />
                            ) : room.type === 'support' ? (
                              <MessageCircle className="h-10 w-10 rounded-full bg-secondary/10 p-2 text-secondary" />
                            ) : (
                              <UserIcon className="h-10 w-10 rounded-full bg-accent/10 p-2 text-accent-foreground" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1 text-left">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="truncate font-medium">{getRoomName(room)}</h4>
                              <Badge variant="outline" className="ml-1 flex-shrink-0 text-xs">
                                {room.type}
                              </Badge>
                            </div>

                            <div className="mt-1 flex items-center gap-2">
                              <p className="text-xs text-muted-foreground">
                                {room.participants.length} participant
                                {room.participants.length !== 1 ? 's' : ''}
                              </p>
                              {room.lastMessage && room.lastMessage.timestamp && (
                                <span className="text-xs text-muted-foreground">
                                  - {new Date(room.lastMessage.timestamp).toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            {room.lastMessage && (
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                <strong>{room.lastMessage.senderName || 'Unknown'}:</strong>{' '}
                                {room.lastMessage.type === 'text'
                                  ? room.lastMessage.content
                                  : `[${room.lastMessage.type}]`}
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

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-8"
        >
          {selectedRoom ? (
            <Card className="flex h-full flex-col">
              <CardHeader className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {selectedRoom.type === 'group' ? (
                        <Users className="h-10 w-10 rounded-full bg-primary/10 p-2 text-primary" />
                      ) : selectedRoom.type === 'support' ? (
                        <MessageCircle className="h-10 w-10 rounded-full bg-secondary/10 p-2 text-secondary" />
                      ) : (
                        <UserIcon className="h-10 w-10 rounded-full bg-accent/10 p-2 text-accent-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{getRoomName(selectedRoom)}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedRoom.participants.length} participants - {selectedRoom.type} chat
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Monitoring
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="min-h-0 flex-1 p-0">
                <ScrollArea className="h-full">
                  <div className="space-y-4 p-4">
                    {currentMessages.length === 0 ? (
                      <div className="py-8 text-center">
                        <MessageCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">No messages in this room yet</p>
                      </div>
                    ) : (
                      currentMessages.map((message, index) => {
                        const isOwnMessage = message.senderId === currentUser.id;
                        const previousMessage = index > 0 ? currentMessages[index - 1] : null;
                        const showAvatar =
                          !previousMessage || previousMessage.senderId !== message.senderId;
                        const compact =
                          !!previousMessage && previousMessage.senderId === message.senderId;

                        return (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="rounded-lg border border-border/50 bg-muted/20 p-3"
                          >
                            <MessageBubble
                              message={message}
                              isOwnMessage={isOwnMessage}
                              currentUser={currentUser}
                              showAvatar={showAvatar}
                              compact={compact}
                            />
                            <div className="mt-2 flex items-center justify-between border-t border-border/30 pt-2 text-xs text-muted-foreground">
                              <span>ID: {message.id}</span>
                              <span>
                                {new Date(message.timestamp || message.createdAt).toLocaleString()}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </CardContent>

              <div className="border-t p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    This conversation is visible for moderation, compliance, and support review.
                  </span>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="flex h-full items-center justify-center">
              <div className="mx-auto max-w-md px-4 text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6 }}
                >
                  <Eye className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-medium">Chat Oversight Dashboard</h3>
                  <p className="mb-6 text-muted-foreground">
                    Select a room from the left to review conversations across the platform.
                  </p>
                  <Badge variant="outline" className="mx-auto flex w-fit items-center gap-1">
                    <Shield className="h-3 w-3" />
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
