import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  Maximize2,
  MessageCircle,
  Minimize2,
  MoreVertical,
  Paperclip,
  Phone,
  Plus,
  Search,
  Send,
  Settings,
  Smile,
  Users,
  Video,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ChatMessage, ChatRoom, User } from '../types';
import { useChat } from './ChatProvider';
import { FileUpload } from './FileUpload';
import { MessageBubble } from './MessageBubble';
import { NotificationSettings } from './PushNotificationService';
import { useMobile } from '../hooks/useMobile';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { cn } from './ui/utils';

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

const getMessageTimeLabel = (message?: ChatMessage | null) => {
  const value = message?.timestamp || message?.createdAt;
  if (!value) return '';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  return formatDistanceToNow(parsed);
};

const getMessagePreview = (message: ChatMessage | undefined, currentUserName: string) => {
  if (!message) return 'No messages yet';

  const prefix = message.senderName === currentUserName ? 'You: ' : '';

  if (message.type === 'image') return `${prefix}Image`;
  if (message.type === 'video') return `${prefix}Video`;
  if (message.type === 'audio') return `${prefix}Audio`;
  if (message.type === 'file') return `${prefix}File`;

  return `${prefix}${message.content}`;
};

interface EnhancedChatRoomProps {
  currentUser: User;
  onBack?: () => void;
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
    createDirectMessage,
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  useEffect(() => {
    if (activeRoom && inputRef.current && !isMobile) {
      inputRef.current.focus();
    }
  }, [activeRoom, isMobile]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  const getUnreadCount = (room: ChatRoom): number => {
    if (typeof room.unreadCount === 'number') {
      return room.unreadCount;
    }

    return room.unreadCount?.[currentUser.id] || 0;
  };

  const getChatTitle = (room: ChatRoom) => {
    if (room.type === 'direct') {
      const otherParticipant = availableUsers.find(
        (user) => room.participants.includes(user.id) && user.id !== currentUser.id
      );

      return otherParticipant?.name || 'Direct message';
    }

    return room.name || 'Conversation';
  };

  const getChatAvatar = (room: ChatRoom) => {
    if (room.type === 'direct') {
      const otherParticipant = availableUsers.find(
        (user) => room.participants.includes(user.id) && user.id !== currentUser.id
      );

      return otherParticipant?.avatar || '';
    }

    return room.avatar || '';
  };

  const filteredRooms = useMemo(
    () =>
      rooms.filter((room) =>
        getChatTitle(room).toLowerCase().includes(searchInput.toLowerCase())
      ),
    [rooms, searchInput, availableUsers, currentUser.id]
  );

  const filteredUsers = useMemo(
    () =>
      availableUsers.filter(
        (user) =>
          user.id !== currentUser.id &&
          user.name.toLowerCase().includes(searchInput.toLowerCase())
      ),
    [availableUsers, currentUser.id, searchInput]
  );

  const activeRoomData = useMemo(
    () => rooms.find((room) => room.id === activeRoom) || null,
    [rooms, activeRoom]
  );

  const sidebarCardClass = cn(
    'h-full flex flex-col overflow-hidden',
    isMobile
      ? 'rounded-none border-x-0 border-b-0 border-t-0 bg-background shadow-none'
      : 'rounded-[30px] border border-border bg-card/95 shadow-[0_20px_50px_rgba(15,23,42,0.08)]'
  );

  const chatCardClass = cn(
    'h-full flex flex-col overflow-hidden',
    isMobile
      ? 'rounded-none border-x-0 border-b-0 border-t-0 bg-background shadow-none'
      : 'rounded-[30px] border border-border bg-card shadow-[0_24px_60px_rgba(15,23,42,0.08)]'
  );

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeRoom || !messageInput.trim()) return;

    const nextMessage = messageInput.trim();
    setMessageInput('');

    try {
      await sendMessage(activeRoom, nextMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageInput(nextMessage);
      toast.error('Failed to send message');
    }
  };

  const handleFileUpload = async (file: File, fileUrl: string, thumbnailUrl?: string) => {
    if (!activeRoom) return;

    try {
      await sendMediaMessage(activeRoom, file, fileUrl, '', thumbnailUrl);
      setShowFileUpload(false);
      toast.success('File sent successfully');
    } catch (error) {
      console.error('Error sending file:', error);
      toast.error('Failed to send file');
    }
  };

  const handleCreateDirectMessage = async (userId: string) => {
    const user = availableUsers.find((item) => item.id === userId);
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

    if (!room) return;

    setActiveRoom(room.id);
    setShowCreateGroup(false);
    setGroupName('');
    setSelectedUsers([]);
    setShowNewChatModal(false);

    if (isMobile) {
      setShowSidebar(false);
    }
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers((previous) =>
      previous.includes(userId)
        ? previous.filter((id) => id !== userId)
        : [...previous, userId]
    );
  };

  const handleRoomSelect = (roomId: string) => {
    setActiveRoom(roomId);
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  const handleBackToRooms = () => {
    setActiveRoom(null);
    setShowSidebar(true);
  };

  const showRoomList = !isMobile || showSidebar || !activeRoom;
  const showConversation = !isMobile || (!showSidebar && Boolean(activeRoomData));

  return (
    <div className={cn(isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'bg-background')}>
      <div
        className={cn(
          'mx-auto w-full max-w-[1600px]',
          isFullscreen
            ? 'h-[100dvh] px-0 py-0 sm:px-4 sm:py-4 md:px-6'
            : isMobile
              ? 'h-[calc(100dvh-5rem)] px-0 py-0'
              : 'px-4 pb-6 pt-4 md:px-6'
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'grid gap-4',
            !isMobile && 'lg:grid-cols-[360px_minmax(0,1fr)]',
            isFullscreen
              ? 'h-full'
              : isMobile
                ? 'h-full'
                : 'min-h-[620px] h-[calc(100dvh-7.25rem)]'
          )}
        >
          {showRoomList ? (
            <motion.section
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(isMobile ? 'h-full' : 'min-h-0')}
            >
              <Card className={sidebarCardClass}>
                <CardHeader className={cn('border-b border-border', isMobile ? 'px-4 pb-4 pt-4' : 'px-5 pb-5 pt-5')}>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className={cn('flex items-center gap-3 font-semibold tracking-tight', isMobile ? 'text-xl' : 'text-2xl')}>
                      <div className="theme-avatar-soft flex h-11 w-11 items-center justify-center rounded-2xl">
                        <MessageCircle className="h-5 w-5" />
                      </div>
                      Messages
                    </CardTitle>

                    <div className="flex items-center gap-2">
                      <Popover open={showSettings} onOpenChange={setShowSettings}>
                        <PopoverTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-10 w-10 rounded-full p-0 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[min(20rem,calc(100vw-2rem))]">
                          <div className="space-y-4">
                            <h4 className="font-medium">Chat settings</h4>
                            <NotificationSettings />
                          </div>
                        </PopoverContent>
                      </Popover>

                      <Button
                        size="sm"
                        onClick={() => setShowNewChatModal(true)}
                        className="h-10 w-10 rounded-full p-0 shadow-none"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="relative mt-4">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search conversations"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      className="h-11 rounded-full border border-border bg-secondary pl-11 pr-4 shadow-none focus-visible:ring-[3px] focus-visible:ring-primary/15 sm:h-12"
                    />
                  </div>
                </CardHeader>

                <CardContent className="min-h-0 flex-1 p-0">
                  <ScrollArea className="h-full">
                    <div className={cn('space-y-2', isMobile ? 'p-3' : 'p-4')}>
                      {loading ? (
                        <div className="py-10 text-center">
                          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          <p className="text-sm text-muted-foreground">Loading chats...</p>
                        </div>
                      ) : filteredRooms.length === 0 ? (
                        <div className="py-14 text-center">
                          <div className="theme-avatar-soft mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full">
                            <MessageCircle className="h-10 w-10 text-primary" />
                          </div>
                          <p className="mb-2 text-base font-medium text-foreground">No conversations yet</p>
                          <p className="mb-5 text-sm text-muted-foreground">
                            Start chatting with a host or support.
                          </p>
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
                              whileHover={{ scale: isMobile ? 1 : 1.01 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              <Button
                                variant={isActive ? 'secondary' : 'ghost'}
                                onClick={() => handleRoomSelect(room.id)}
                                className={cn(
                                  'h-auto w-full justify-start gap-3 rounded-[24px] border shadow-none transition-all',
                                  isMobile ? 'p-3' : 'p-3.5',
                                  isActive
                                    ? 'theme-info-badge border shadow-[0_10px_24px_rgba(15,23,42,0.06)]'
                                    : 'border-transparent bg-transparent hover:bg-secondary'
                                )}
                              >
                                <Avatar className="h-11 w-11 flex-shrink-0 ring-1 ring-black/5">
                                  <AvatarImage src={chatAvatar} alt={chatTitle} />
                                  <AvatarFallback className="theme-avatar-soft">
                                    {room.type === 'group' ? (
                                      <Users className="h-4 w-4" />
                                    ) : room.type === 'support' ? (
                                      <MessageCircle className="h-4 w-4" />
                                    ) : (
                                      chatTitle.charAt(0).toUpperCase()
                                    )}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="min-w-0 flex-1 text-left">
                                  <div className="flex items-center justify-between gap-2">
                                    <h4 className="truncate font-medium">{chatTitle}</h4>
                                    {unreadCount > 0 ? (
                                      <Badge variant="default" className="ml-1 flex-shrink-0">
                                        {unreadCount}
                                      </Badge>
                                    ) : null}
                                  </div>

                                  <div className="mt-1 flex items-center gap-2">
                                    <p className="flex-1 truncate text-xs text-muted-foreground">
                                      {getMessagePreview(room.lastMessage, currentUser.name)}
                                    </p>
                                    {room.lastMessage ? (
                                      <span className="flex-shrink-0 text-xs text-muted-foreground">
                                        {getMessageTimeLabel(room.lastMessage)}
                                      </span>
                                    ) : null}
                                  </div>
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
            </motion.section>
          ) : null}

          {showConversation ? (
            <motion.section
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(isMobile ? 'h-full' : 'min-h-0')}
            >
              {activeRoomData ? (
                <Card className={chatCardClass}>
                  <CardHeader
                    className={cn(
                      'border-b border-border bg-card/90 backdrop-blur',
                      isMobile ? 'px-4 pb-4 pt-4' : 'px-6 pb-5 pt-5'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {isMobile ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleBackToRooms}
                            className="h-10 w-10 rounded-full p-0 hover:bg-secondary"
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </Button>
                        ) : null}

                        <Avatar className="h-11 w-11 flex-shrink-0 ring-1 ring-black/5">
                          <AvatarImage
                            src={getChatAvatar(activeRoomData)}
                            alt={getChatTitle(activeRoomData)}
                          />
                          <AvatarFallback className="theme-avatar-soft">
                            {activeRoomData.type === 'group' ? (
                              <Users className="h-4 w-4" />
                            ) : activeRoomData.type === 'support' ? (
                              <MessageCircle className="h-4 w-4" />
                            ) : (
                              getChatTitle(activeRoomData).charAt(0).toUpperCase()
                            )}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-medium">{getChatTitle(activeRoomData)}</h3>
                          <p className="truncate text-sm text-muted-foreground">
                            {activeRoomData.type === 'group'
                              ? `${activeRoomData.participants.length} members`
                              : activeRoomData.type === 'support'
                                ? 'Support chat'
                                : 'Direct message'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="hidden h-10 w-10 rounded-full p-0 text-muted-foreground hover:bg-secondary hover:text-foreground sm:flex"
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="hidden h-10 w-10 rounded-full p-0 text-muted-foreground hover:bg-secondary hover:text-foreground sm:flex"
                        >
                          <Video className="h-4 w-4" />
                        </Button>
                        {!isMobile ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsFullscreen((value) => !value)}
                            className="h-10 w-10 rounded-full p-0 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            {isFullscreen ? (
                              <Minimize2 className="h-4 w-4" />
                            ) : (
                              <Maximize2 className="h-4 w-4" />
                            )}
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-10 w-10 rounded-full p-0 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent
                    className={cn(
                      'min-h-0 flex-1 overflow-hidden p-0',
                      isMobile
                        ? 'bg-background'
                        : 'bg-[linear-gradient(180deg,var(--card)_0%,color-mix(in_srgb,var(--card)_84%,var(--background))_100%)]'
                    )}
                  >
                    <ScrollArea className="h-full">
                      <div className={cn('space-y-4', isMobile ? 'p-4' : 'p-6')}>
                        {currentMessages.length === 0 ? (
                          <div className="py-14 text-center">
                            <div className="theme-avatar-soft mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full">
                              <MessageCircle className="h-10 w-10 text-primary" />
                            </div>
                            <h3 className="mb-2 text-xl font-semibold">Your inbox is ready</h3>
                            <p className="text-muted-foreground">
                              Send a message to start the conversation.
                            </p>
                          </div>
                        ) : (
                          currentMessages.map((message, index) => {
                            const previousMessage = index > 0 ? currentMessages[index - 1] : null;

                            return (
                              <MessageBubble
                                key={message.id}
                                message={message}
                                isOwnMessage={message.senderId === currentUser.id}
                                currentUser={currentUser}
                                showAvatar={!previousMessage || previousMessage.senderId !== message.senderId}
                                compact={Boolean(previousMessage && previousMessage.senderId === message.senderId)}
                              />
                            );
                          })
                        )}

                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                  </CardContent>

                  <div
                    className={cn(
                      'border-t border-border flex-shrink-0',
                      isMobile
                        ? 'bg-background px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3'
                        : 'bg-card p-4'
                    )}
                  >
                    <AnimatePresence>
                      {showFileUpload ? (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-3"
                        >
                          <FileUpload
                            onFileUpload={handleFileUpload}
                            maxSize={50}
                            maxFiles={1}
                            className="rounded-[24px] border-2 border-dashed border-border bg-secondary/50 p-4"
                          />
                          <div className="mt-2 flex justify-end">
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
                      ) : null}
                    </AnimatePresence>

                    <form
                      onSubmit={handleSendMessage}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
                    >
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowFileUpload((value) => !value)}
                        className="h-12 w-12 rounded-full bg-secondary p-0 hover:bg-secondary/80"
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>

                      <Input
                        ref={inputRef}
                        value={messageInput}
                        onChange={(event) => setMessageInput(event.target.value)}
                        placeholder="Type a message..."
                        className="h-12 rounded-full border border-border bg-secondary px-5 shadow-none focus-visible:ring-[3px] focus-visible:ring-primary/15"
                        disabled={!activeRoom}
                      />

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="hidden h-12 w-12 rounded-full bg-secondary p-0 hover:bg-secondary/80 sm:flex"
                      >
                        <Smile className="h-4 w-4" />
                      </Button>

                      <Button
                        type="submit"
                        disabled={!messageInput.trim() || !activeRoom}
                        className="h-12 w-12 rounded-full p-0 sm:w-auto sm:px-5"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </Card>
              ) : (
                <Card className={cn(chatCardClass, 'items-center justify-center')}>
                  <div className="mx-auto max-w-md px-6 text-center">
                    <div className="theme-avatar-soft mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full">
                      <MessageCircle className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="mb-2 text-2xl font-semibold">Welcome to your inbox</h3>
                    <p className="mb-6 leading-7 text-muted-foreground">
                      Select a conversation or start a new one to begin messaging with hosts and support.
                    </p>
                    <Button
                      onClick={() => setShowNewChatModal(true)}
                      className="rounded-full px-5"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Start new chat
                    </Button>
                  </div>
                </Card>
              )}
            </motion.section>
          ) : null}
        </motion.div>

        <AnimatePresence>
          {showNewChatModal ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--overlay-scrim)] p-4 backdrop-blur-sm"
              onClick={() => setShowNewChatModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="max-h-[90vh] w-full max-w-md overflow-hidden"
                onClick={(event) => event.stopPropagation()}
              >
                <Card className="h-full rounded-[30px] border border-border bg-card shadow-[0_30px_70px_rgba(15,23,42,0.12)]">
                  <CardHeader className="border-b border-border">
                    <div className="flex items-center justify-between">
                      <CardTitle>Start new chat</CardTitle>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowNewChatModal(false)}
                        className="h-10 w-10 rounded-full p-0 hover:bg-secondary"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={!showCreateGroup ? 'default' : 'outline'}
                        className="rounded-full"
                        onClick={() => setShowCreateGroup(false)}
                      >
                        Direct message
                      </Button>
                      <Button
                        size="sm"
                        variant={showCreateGroup ? 'default' : 'outline'}
                        className="rounded-full"
                        onClick={() => setShowCreateGroup(true)}
                      >
                        Create group
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="overflow-hidden">
                    {showCreateGroup ? (
                      <div className="space-y-4">
                        <Input
                          placeholder="Group name"
                          value={groupName}
                          onChange={(event) => setGroupName(event.target.value)}
                          className="h-11 rounded-2xl border border-border bg-secondary"
                        />

                        <div className="min-h-0">
                          <h4 className="mb-2 font-medium">Select members</h4>
                          <ScrollArea className="h-48 rounded-2xl border border-border p-2">
                            {filteredUsers.map((user) => (
                              <div
                                key={user.id}
                                className="flex cursor-pointer items-center gap-3 rounded-2xl p-3 hover:bg-secondary"
                                onClick={() => handleUserToggle(user.id)}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedUsers.includes(user.id)}
                                  onChange={() => handleUserToggle(user.id)}
                                  className="rounded"
                                />
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={user.avatar} alt={user.name} />
                                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-medium">{user.name}</p>
                                  <p className="text-sm text-muted-foreground">{user.role}</p>
                                </div>
                              </div>
                            ))}
                          </ScrollArea>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            className="rounded-full"
                            onClick={() => setShowNewChatModal(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleCreateGroup}
                            disabled={!groupName.trim() || selectedUsers.length === 0}
                            className="rounded-full"
                          >
                            Create group
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="min-h-0 space-y-2">
                        <h4 className="mb-2 font-medium">Choose a user to message</h4>

                        {availableUsers.length === 0 ? (
                          <div className="py-8 text-center">
                            <MessageCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground">
                              {currentUser.role === 'admin'
                                ? 'No users available to chat with'
                                : 'No chat partners available'}
                            </p>
                            {currentUser.role !== 'admin' ? (
                              <p className="text-xs text-muted-foreground">
                                You can only chat with hosts of properties you&apos;ve booked or admins for support.
                              </p>
                            ) : null}
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
                                <Avatar className="mr-3 h-8 w-8 flex-shrink-0">
                                  <AvatarImage src={user.avatar} alt={user.name} />
                                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1 text-left">
                                  <p className="truncate font-medium">{user.name}</p>
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
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function EnhancedChatRoom({ currentUser, onBack }: EnhancedChatRoomProps) {
  return <ChatInterface currentUser={currentUser} onBack={onBack} />;
}

export default EnhancedChatRoom;
