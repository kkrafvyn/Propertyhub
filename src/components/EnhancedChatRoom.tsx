import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
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
  BellOff,
  X,
  Maximize2,
  Minimize2,
  ArrowLeft
} from 'lucide-react';
import { User, ChatRoom, ChatMessage } from '../types';
import { useChat } from './ChatProvider';
import { useMobile } from '../hooks/useMobile';
import { FileUpload } from './FileUpload';
import { MessageBubble } from './MessageBubble';
import { PushNotificationProvider, usePushNotifications, NotificationSettings } from './PushNotificationService';
import { toast } from "sonner";
import { cn } from './ui/utils';

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

interface EnhancedChatRoomProps {
  currentUser: User;
}

function ChatInterface({ currentUser }: EnhancedChatRoomProps) {
  const {
    rooms,
    activeRoom,
    currentMessages,
    availableUsers,
    loading,
    setActiveRoom,
    sendMessage,
    sendMediaMessage,
    createRoom,
    createDirectMessage
  } = useChat();
  
  const [messageInput, setMessageInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useMobile();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  // Focus input when room changes
  useEffect(() => {
    if (activeRoom && inputRef.current && !isMobile) {
      inputRef.current.focus();
    }
  }, [activeRoom, isMobile]);

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
    
    try {
      await sendMessage(activeRoom, message);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageInput(message); // Restore message on error
      toast.error('Failed to send message');
    }
  };

  const handleFileUpload = async (file: File, fileUrl: string, thumbnailUrl?: string) => {
    if (!activeRoom) return;

    try {
      // Determine file type
      const fileType = file.type;
      let messageType: 'image' | 'video' | 'audio' | 'file' = 'file';
      
      if (fileType.startsWith('image/')) {
        messageType = 'image';
      } else if (fileType.startsWith('video/')) {
        messageType = 'video';
      } else if (fileType.startsWith('audio/')) {
        messageType = 'audio';
      }

      await sendMediaMessage(activeRoom, file, fileUrl, '', thumbnailUrl);
      setShowFileUpload(false);
      toast.success('File sent successfully!');
    } catch (error) {
      console.error('Error sending file:', error);
      toast.error('Failed to send file');
    }
  };

  const handleCreateDirectMessage = async (userId: string) => {
    const user = availableUsers.find(u => u.id === userId);
    if (!user) return;

    await createDirectMessage(userId, user.name);
    setShowNewChatModal(false);
    if (isMobile) {
      setShowSidebar(false);
    }
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
      if (isMobile) {
        setShowSidebar(false);
      }
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

  const getUnreadCount = (room: ChatRoom): number => {
    if (typeof room.unreadCount === 'number') {
      return room.unreadCount;
    }

    return room.unreadCount?.[currentUser.id] || 0;
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

  const handleRoomSelect = (roomId: string) => {
    setActiveRoom(roomId);
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  const handleBackToRooms = () => {
    if (isMobile) {
      setActiveRoom(null);
      setShowSidebar(true);
    }
  };

  return (
    <div className={cn(isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'min-h-[100dvh] bg-background')}>
      <div
        className={cn(
          'mx-auto max-w-[1600px]',
          isFullscreen
            ? 'h-[100dvh] px-3 py-3 sm:px-4 sm:py-4 md:px-6'
            : 'min-h-[100dvh] px-3 pb-28 pt-4 sm:px-4 md:px-6 lg:pb-8'
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'gap-4 md:gap-6',
            isFullscreen
              ? 'h-[calc(100dvh-1.5rem)] sm:h-[calc(100dvh-2rem)]'
              : isMobile
                ? 'min-h-[calc(100dvh-8.5rem)]'
                : 'h-[calc(100dvh-7.5rem)] min-h-[620px]',
            isMobile ? 'flex flex-col' : 'grid grid-cols-1 lg:grid-cols-12 2xl:grid-cols-4'
          )}
        >
          {/* Chat List Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className={`
              ${isMobile 
                ? (showSidebar && !activeRoom ? 'flex-1' : 'hidden')
                : showSidebar 
                  ? 'lg:col-span-3 2xl:col-span-1' 
                  : 'lg:col-span-1 2xl:col-span-1'
              } 
              ${!isMobile && !showSidebar ? 'w-16' : ''}
              transition-all duration-300 ease-in-out
            `}
          >
            <Card className="h-full flex flex-col overflow-hidden rounded-[32px] border border-border bg-card/95 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <CardHeader className={`border-b border-border pb-5 ${!showSidebar && !isMobile ? 'px-2' : ''}`}>
                <div className="flex items-center justify-between">
                  <CardTitle className={`flex items-center gap-3 text-2xl font-semibold tracking-tight ${!showSidebar && !isMobile ? 'hidden' : ''}`}>
                    <div className="theme-avatar-soft flex h-11 w-11 items-center justify-center rounded-2xl">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    Messages
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {!isMobile && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-10 w-10 rounded-full p-0 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        onClick={() => setShowSidebar(!showSidebar)}
                        title={showSidebar ? "Collapse sidebar" : "Expand sidebar"}
                      >
                        <ArrowLeft className={`w-4 h-4 transition-transform ${showSidebar ? 'rotate-0' : 'rotate-180'}`} />
                      </Button>
                    )}
                    {showSidebar && (
                      <>
                        <Popover open={showSettings} onOpenChange={setShowSettings}>
                          <PopoverTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-10 w-10 rounded-full p-0 text-muted-foreground hover:bg-secondary hover:text-foreground">
                              <Settings className="w-4 h-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[min(20rem,calc(100vw-2rem))]">
                            <div className="space-y-4">
                              <h4 className="font-medium">Chat Settings</h4>
                              <NotificationSettings />
                            </div>
                          </PopoverContent>
                        </Popover>
                        <Button
                          size="sm"
                          onClick={() => setShowNewChatModal(true)}
                          className="h-10 w-10 rounded-full p-0 shadow-none"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {showSidebar && (
                  <div className="relative">
                    <Search className="absolute left-4 top-4 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search conversations"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="h-12 rounded-full border border-border bg-secondary pl-11 pr-4 shadow-none focus-visible:ring-[3px] focus-visible:ring-primary/15"
                    />
                  </div>
                )}
              </CardHeader>
              {showSidebar && (
                <CardContent className="flex-1 p-0 min-h-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-2 p-4">
                      {loading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Loading chats...</p>
                        </div>
                      ) : filteredRooms.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="theme-avatar-soft mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full">
                            <MessageCircle className="w-10 h-10 text-primary" />
                          </div>
                          <p className="mb-2 text-base font-medium text-foreground">No conversations yet</p>
                          <p className="mb-5 text-sm text-muted-foreground">Start chatting with a host or support.</p>
                          <Button
                            size="sm"
                            onClick={() => setShowNewChatModal(true)}
                            className="rounded-full px-5"
                          >
                            Start a conversation
                          </Button>
                        </div>
                      ) : (
                        filteredRooms.map((room) => {
                          const isActive = activeRoom === room.id;
                          const chatTitle = getChatTitle(room);
                          const chatAvatar = getChatAvatar(room);
                          const unreadCount = getUnreadCount(room);
                          
                          return (
                            <motion.div
                              key={room.id}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Button
                                variant={isActive ? "secondary" : "ghost"}
                                className={`w-full h-auto justify-start gap-3 rounded-[24px] border p-3.5 shadow-none transition-all ${
                                  isActive
                                    ? 'theme-info-badge border shadow-[0_10px_24px_rgba(15,23,42,0.06)]'
                                    : 'border-transparent bg-transparent hover:bg-secondary'
                                }`}
                                onClick={() => handleRoomSelect(room.id)}
                              >
                                <Avatar className="w-11 h-11 flex-shrink-0 ring-1 ring-black/5">
                                  <AvatarImage src={chatAvatar} alt={chatTitle} />
                                  <AvatarFallback className="theme-avatar-soft">
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
                                    {unreadCount > 0 && (
                                      <Badge variant="default" className="ml-1 flex-shrink-0">
                                        {unreadCount}
                                      </Badge>
                                    )}
                                  </div>
                                  {room.lastMessage && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <p className="text-xs text-muted-foreground truncate flex-1">
                                        {room.lastMessage.senderName === currentUser.name ? 'You: ' : ''}
                                        {room.lastMessage.type === 'image' ? '📷 Image' :
                                         room.lastMessage.type === 'video' ? '🎥 Video' :
                                         room.lastMessage.type === 'audio' ? '🎵 Audio' :
                                         room.lastMessage.type === 'file' ? '📎 File' :
                                         room.lastMessage.content}
                                      </p>
                                      <span className="text-xs text-muted-foreground flex-shrink-0">
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
              )}
            </Card>
          </motion.div>

          {/* Chat Area */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`
              ${isMobile 
                ? (!showSidebar && activeRoom ? 'flex-1' : 'hidden')
                : showSidebar 
                  ? 'lg:col-span-9 2xl:col-span-3' 
                  : 'lg:col-span-11 2xl:col-span-3'
              }
            `}
          >
            {activeRoom && activeRoomData ? (
              <Card className="h-full flex flex-col overflow-hidden rounded-[32px] border border-border bg-card shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
                {/* Chat Header */}
                <CardHeader className="border-b border-border bg-card/90 px-6 pb-5 backdrop-blur flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {isMobile && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleBackToRooms}
                          className="w-10 h-10 rounded-full p-0 flex-shrink-0 hover:bg-secondary"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                      )}
                      <Avatar className="w-11 h-11 flex-shrink-0 ring-1 ring-black/5">
                        <AvatarImage src={getChatAvatar(activeRoomData)} alt={getChatTitle(activeRoomData)} />
                        <AvatarFallback className="theme-avatar-soft">
                          {activeRoomData.type === 'group' ? (
                            <Users className="w-4 h-4" />
                          ) : activeRoomData.type === 'support' ? (
                            <MessageCircle className="w-4 h-4" />
                          ) : (
                            getChatTitle(activeRoomData).charAt(0).toUpperCase()
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium truncate">{getChatTitle(activeRoomData)}</h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {activeRoomData.type === 'group' ? 
                            `${activeRoomData.participants.length} members` :
                            activeRoomData.type === 'support' ?
                            'Support chat' :
                            'Direct message'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button size="sm" variant="ghost" className="hidden h-10 w-10 rounded-full p-0 text-muted-foreground hover:bg-secondary hover:text-foreground sm:flex">
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="hidden h-10 w-10 rounded-full p-0 text-muted-foreground hover:bg-secondary hover:text-foreground sm:flex">
                        <Video className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="w-10 h-10 rounded-full p-0 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="w-10 h-10 rounded-full p-0 text-muted-foreground hover:bg-secondary hover:text-foreground">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 min-h-0 overflow-hidden bg-[linear-gradient(180deg,var(--card)_0%,color-mix(in_srgb,var(--card)_84%,var(--background))_100%)] p-0">
                  <ScrollArea className="h-full">
                    <div className="p-6 space-y-4">
                      {currentMessages.length === 0 ? (
                        <div className="text-center py-14">
                          <div className="theme-avatar-soft mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full">
                            <MessageCircle className="w-10 h-10 text-primary" />
                          </div>
                          <h3 className="mb-2 text-xl font-semibold">Your inbox is ready</h3>
                          <p className="text-muted-foreground">Send a message to start the conversation.</p>
                        </div>
                      ) : (
                        currentMessages.map((message, index) => {
                          const isOwnMessage = message.senderId === currentUser.id;
                          const previousMessage = index > 0 ? currentMessages[index - 1] : null;
                          const showAvatar = !previousMessage || previousMessage.senderId !== message.senderId;
                          const compact = previousMessage && previousMessage.senderId === message.senderId;
                          
                          return (
                            <MessageBubble
                              key={message.id}
                              message={message}
                              isOwnMessage={isOwnMessage}
                              currentUser={currentUser}
                              showAvatar={showAvatar}
                              compact={compact}
                            />
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </CardContent>

                {/* Message Input */}
                <div className="border-t border-border bg-card p-4 flex-shrink-0">
                  {/* File Upload Area */}
                  <AnimatePresence>
                    {showFileUpload && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4"
                      >
                        <FileUpload
                          onFileUpload={handleFileUpload}
                          maxSize={50}
                          maxFiles={1}
                          className="rounded-[28px] border-2 border-dashed border-border bg-secondary/50 p-4"
                        />
                        <div className="flex justify-end mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => setShowFileUpload(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Input Row */}
                  <form onSubmit={handleSendMessage} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowFileUpload(!showFileUpload)}
                      className="h-12 w-12 rounded-full bg-secondary p-0 flex-shrink-0 hover:bg-secondary/80"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Input
                      ref={inputRef}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type a message..."
                      className="h-12 flex-1 rounded-full border border-border bg-secondary px-5 shadow-none focus-visible:ring-[3px] focus-visible:ring-primary/15"
                      disabled={!activeRoom}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-12 w-12 rounded-full bg-secondary p-0 flex-shrink-0 hover:bg-secondary/80"
                    >
                      <Smile className="w-4 h-4" />
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={!messageInput.trim() || !activeRoom}
                      className="h-12 flex-shrink-0 rounded-full px-4 sm:px-5"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center rounded-[32px] border border-border bg-card shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
                <div className="text-center max-w-md mx-auto px-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                  >
                    <div className="theme-avatar-soft mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full">
                      <MessageCircle className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-2">Welcome to your inbox</h3>
                    <p className="text-muted-foreground mb-6 leading-7">
                      Select a conversation or start a new one to begin messaging with hosts and support.
                    </p>
                    <Button onClick={() => setShowNewChatModal(true)} className="rounded-full px-5">
                      <Plus className="w-4 h-4 mr-2" />
                      Start New Chat
                    </Button>
                  </motion.div>
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
              className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--overlay-scrim)] p-4 backdrop-blur-sm"
              onClick={() => setShowNewChatModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-md max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <Card className="h-full rounded-[32px] border border-border bg-card shadow-[0_30px_70px_rgba(15,23,42,0.12)]">
                  <CardHeader className="border-b border-border">
                    <div className="flex items-center justify-between">
                      <CardTitle>Start New Chat</CardTitle>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowNewChatModal(false)}
                        className="w-10 h-10 rounded-full p-0 hover:bg-secondary"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={!showCreateGroup ? "default" : "outline"}
                        className="rounded-full"
                        onClick={() => setShowCreateGroup(false)}
                      >
                        Direct Message
                      </Button>
                      <Button
                        size="sm"
                        variant={showCreateGroup ? "default" : "outline"}
                        className="rounded-full"
                        onClick={() => setShowCreateGroup(true)}
                      >
                        Create Group
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="overflow-hidden">
                    {showCreateGroup ? (
                      <div className="space-y-4">
                        <Input
                          placeholder="Group name"
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          className="h-11 rounded-2xl border border-border bg-secondary"
                        />
                        <div className="min-h-0">
                          <h4 className="font-medium mb-2">Select members</h4>
                          <ScrollArea className="h-48 rounded-2xl border border-border p-2">
                            {filteredUsers.map((user) => (
                              <div
                                key={user.id}
                                className="flex cursor-pointer items-center space-x-2 rounded-2xl p-3 hover:bg-secondary"
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
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">{user.name}</p>
                                  <p className="text-sm text-muted-foreground">{user.role}</p>
                                </div>
                              </div>
                            ))}
                          </ScrollArea>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" className="rounded-full" onClick={() => setShowNewChatModal(false)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={handleCreateGroup}
                            disabled={!groupName.trim() || selectedUsers.length === 0}
                            className="rounded-full"
                          >
                            Create Group
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 min-h-0">
                        <h4 className="font-medium mb-2">Choose a user to message</h4>
                        {availableUsers.length === 0 ? (
                          <div className="text-center py-8">
                            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-sm text-muted-foreground mb-2">
                              {currentUser.role === 'admin' 
                                ? 'No users available to chat with'
                                : 'No chat partners available'
                              }
                            </p>
                            {currentUser.role !== 'admin' && (
                              <p className="text-xs text-muted-foreground">
                                You can only chat with hosts of properties you've booked or admins for support.
                              </p>
                            )}
                          </div>
                        ) : (
                          <ScrollArea className="h-48">
                            {filteredUsers.map((user) => (
                              <Button
                                key={user.id}
                                variant="ghost"
                                className="mb-1 h-auto w-full justify-start rounded-2xl p-3 hover:bg-secondary"
                                onClick={() => handleCreateDirectMessage(user.id)}
                              >
                                <Avatar className="w-8 h-8 mr-3 flex-shrink-0">
                                  <AvatarImage src={user.avatar} alt={user.name} />
                                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="text-left min-w-0 flex-1">
                                  <p className="font-medium truncate">{user.name}</p>
                                  <p className="text-sm text-muted-foreground">{user.role}</p>
                                </div>
                              </Button>
                            ))}
                          </ScrollArea>
                        )}
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

export function EnhancedChatRoom({ currentUser }: EnhancedChatRoomProps) {
  return (
    <PushNotificationProvider currentUser={currentUser}>
      <ChatInterface currentUser={currentUser} />
    </PushNotificationProvider>
  );
}
