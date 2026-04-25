import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ChatRoom, ChatMessage, User } from '../types';
import { getSupabaseFunctionUrl } from '../services/supabaseProject';
import { toast } from "sonner";

interface ChatContextType {
  rooms: ChatRoom[];
  activeRoom: string | null;
  currentMessages: ChatMessage[];
  availableUsers: User[];
  loading: boolean;
  setActiveRoom: (roomId: string | null) => void;
  sendMessage: (roomId: string, content: string, type?: 'text' | 'image' | 'file' | 'audio' | 'video') => Promise<void>;
  sendMediaMessage: (roomId: string, file: File, fileUrl: string, content?: string, thumbnailUrl?: string) => Promise<void>;
  createRoom: (name: string, type: 'direct' | 'group' | 'support', participants: string[], description?: string) => Promise<ChatRoom | null>;
  markRoomAsRead: (roomId: string, userId: string) => Promise<void>;
  refreshRooms: () => Promise<void>;
  loadMessages: (roomId: string) => Promise<void>;
  createDirectMessage: (otherUserId: string, otherUserName: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

type ChatBackendStatus = 'unknown' | 'available' | 'unavailable';

const USER_STORAGE_KEYS = ['currentUser', 'propertyHubUser'] as const;

const readStoredUser = (): User | null => {
  for (const key of USER_STORAGE_KEYS) {
    const userStr = localStorage.getItem(key);
    if (!userStr) continue;

    try {
      return JSON.parse(userStr) as User;
    } catch (error) {
      console.warn(`Failed to parse stored chat user from ${key}:`, error);
      localStorage.removeItem(key);
    }
  }

  return null;
};

export function ChatProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [backendStatus, setBackendStatus] = useState<ChatBackendStatus>('unknown');
  const [backendWarningShown, setBackendWarningShown] = useState(false);

  const serverUrl = getSupabaseFunctionUrl();

  // Set current user when available (this should be set from the main app)
  const updateCurrentUser = useCallback((user: User | null) => {
    setCurrentUser(user);
  }, []);

  const markBackendUnavailable = useCallback((details?: string) => {
    setBackendStatus('unavailable');

    if (!backendWarningShown) {
      setBackendWarningShown(true);
      toast.warning('Chat backend is unavailable. Chat sync is paused until the server is deployed.');
    }

    if (details) {
      console.warn('Chat backend unavailable:', details);
    }
  }, [backendWarningShown]);

  const ensureBackendAvailable = useCallback(async () => {
    if (backendStatus === 'available') return true;
    if (backendStatus === 'unavailable') return false;

    try {
      const response = await fetch(getSupabaseFunctionUrl('health'));

      if (!response.ok) {
        markBackendUnavailable(`Health check returned ${response.status}`);
        return false;
      }

      setBackendStatus('available');
      return true;
    } catch (error) {
      markBackendUnavailable(error instanceof Error ? error.message : 'Unknown health check failure');
      return false;
    }
  }, [backendStatus, markBackendUnavailable]);

  // Fetch available users for creating chats
  const fetchAvailableUsers = useCallback(async () => {
    const backendReady = await ensureBackendAvailable();
    if (!backendReady) return;

    try {
      // Use the new chat-eligible endpoint that respects booking relationships
      const endpoint = currentUser?.role === 'admin' 
        ? `${serverUrl}/users` // Admins can chat with anyone
        : `${serverUrl}/users/${currentUser?.id}/chat-eligible`; // Others restricted by bookings
        
      const response = await fetch(endpoint);

      if (!response.ok) {
        markBackendUnavailable(`Users request returned ${response.status}`);
        return;
      }

      const result = await response.json();
      if (result.success) {
        setAvailableUsers(result.users);
      } else {
        console.error('Failed to fetch available users:', result.error);
      }
    } catch (error) {
      markBackendUnavailable(error instanceof Error ? error.message : 'Failed to fetch available users');
    }
  }, [ensureBackendAvailable, serverUrl, currentUser, markBackendUnavailable]);

  // Fetch chat rooms for current user
  const refreshRooms = useCallback(async () => {
    if (!currentUser) return;

    const backendReady = await ensureBackendAvailable();
    if (!backendReady) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${serverUrl}/chat/rooms/${currentUser.id}`);

      if (!response.ok) {
        markBackendUnavailable(`Rooms request returned ${response.status}`);
        return;
      }

      const result = await response.json();
      if (result.success) {
        setRooms(result.rooms);
      } else {
        console.error('Failed to fetch rooms:', result.error);
      }
    } catch (error) {
      markBackendUnavailable(error instanceof Error ? error.message : 'Failed to load chat rooms');
    } finally {
      setLoading(false);
    }
  }, [currentUser, ensureBackendAvailable, serverUrl, markBackendUnavailable]);

  // Load messages for a specific room
  const loadMessages = useCallback(async (roomId: string) => {
    const backendReady = await ensureBackendAvailable();
    if (!backendReady) return;

    try {
      const response = await fetch(`${serverUrl}/chat/messages/${roomId}`);

      if (!response.ok) {
        markBackendUnavailable(`Messages request returned ${response.status}`);
        return;
      }

      const result = await response.json();
      if (result.success) {
        setCurrentMessages(result.messages);
      } else {
        console.error('Failed to fetch messages:', result.error);
      }
    } catch (error) {
      markBackendUnavailable(error instanceof Error ? error.message : 'Failed to load messages');
    }
  }, [ensureBackendAvailable, serverUrl, markBackendUnavailable]);

  // Send a message
  const sendMessage = useCallback(async (roomId: string, content: string, type: 'text' | 'image' | 'file' | 'audio' | 'video' = 'text') => {
    if (!currentUser || !content.trim()) return;

    const backendReady = await ensureBackendAvailable();
    if (!backendReady) return;

    try {
      const response = await fetch(`${serverUrl}/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatar,
          content: content.trim(),
          type,
        }),
      });

      if (!response.ok) {
        markBackendUnavailable(`Send message request returned ${response.status}`);
        return;
      }

      const result = await response.json();
      if (result.success) {
        // Add message to current messages if this is the active room
        if (activeRoom === roomId) {
          setCurrentMessages(prev => [...prev, result.message]);
        }
        // Refresh rooms to update last message and unread counts
        await refreshRooms();
      } else {
        toast.error('Failed to send message');
        console.error('Failed to send message:', result.error);
      }
    } catch (error) {
      markBackendUnavailable(error instanceof Error ? error.message : 'Failed to send message');
    }
  }, [currentUser, ensureBackendAvailable, serverUrl, activeRoom, refreshRooms, markBackendUnavailable]);

  // Send media message
  const sendMediaMessage = useCallback(async (roomId: string, file: File, fileUrl: string, content?: string, thumbnailUrl?: string) => {
    if (!currentUser) return;

    const backendReady = await ensureBackendAvailable();
    if (!backendReady) return;

    // Determine message type based on file type
    let messageType: 'image' | 'video' | 'audio' | 'file' = 'file';
    if (file.type.startsWith('image/')) {
      messageType = 'image';
    } else if (file.type.startsWith('video/')) {
      messageType = 'video';
    } else if (file.type.startsWith('audio/')) {
      messageType = 'audio';
    }

    try {
      const response = await fetch(`${serverUrl}/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatar,
          content: content || '',
          type: messageType,
          fileUrl,
          thumbnailUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          // Add duration for audio/video files if available
          ...(messageType === 'audio' || messageType === 'video' ? { duration: 0 } : {})
        }),
      });

      if (!response.ok) {
        markBackendUnavailable(`Media message request returned ${response.status}`);
        return;
      }

      const result = await response.json();
      if (result.success) {
        // Add message to current messages if this is the active room
        if (activeRoom === roomId) {
          setCurrentMessages(prev => [...prev, result.message]);
        }
        // Refresh rooms to update last message and unread counts
        await refreshRooms();
      } else {
        toast.error('Failed to send media message');
        console.error('Failed to send media message:', result.error);
      }
    } catch (error) {
      markBackendUnavailable(error instanceof Error ? error.message : 'Failed to send media message');
    }
  }, [currentUser, ensureBackendAvailable, serverUrl, activeRoom, refreshRooms, markBackendUnavailable]);

  // Create a new chat room
  const createRoom = useCallback(async (
    name: string, 
    type: 'direct' | 'group' | 'support', 
    participants: string[], 
    description?: string
  ): Promise<ChatRoom | null> => {
    if (!currentUser) return null;

    const backendReady = await ensureBackendAvailable();
    if (!backendReady) return null;

    try {
      const response = await fetch(`${serverUrl}/chat/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          type,
          participants: [currentUser.id, ...participants],
          createdBy: currentUser.id,
          description,
        }),
      });

      if (!response.ok) {
        markBackendUnavailable(`Create room request returned ${response.status}`);
        return null;
      }

      const result = await response.json();
      if (result.success) {
        await refreshRooms();
        toast.success('Chat room created successfully');
        return result.room;
      } else {
        toast.error('Failed to create chat room');
        console.error('Failed to create room:', result.error);
        return null;
      }
    } catch (error) {
      markBackendUnavailable(error instanceof Error ? error.message : 'Failed to create chat room');
      return null;
    }
  }, [currentUser, ensureBackendAvailable, serverUrl, refreshRooms, markBackendUnavailable]);

  // Create a direct message room
  const createDirectMessage = useCallback(async (otherUserId: string, otherUserName: string) => {
    if (!currentUser) return;

    // Check if a direct message room already exists
    const existingRoom = rooms.find(room => 
      room.type === 'direct' && 
      room.participants.includes(otherUserId) && 
      room.participants.includes(currentUser.id) &&
      room.participants.length === 2
    );

    if (existingRoom) {
      setActiveRoom(existingRoom.id);
      await loadMessages(existingRoom.id);
      return;
    }

    const room = await createRoom(
      `${currentUser.name} & ${otherUserName}`,
      'direct',
      [otherUserId],
      `Direct message between ${currentUser.name} and ${otherUserName}`
    );

    if (room) {
      setActiveRoom(room.id);
      await loadMessages(room.id);
    }
  }, [currentUser, rooms, createRoom, loadMessages]);

  // Mark room as read
  const markRoomAsRead = useCallback(async (roomId: string, userId: string) => {
    const backendReady = await ensureBackendAvailable();
    if (!backendReady) return;

    try {
      const response = await fetch(`${serverUrl}/chat/rooms/${roomId}/read/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        markBackendUnavailable(`Mark read request returned ${response.status}`);
      }
    } catch (error) {
      markBackendUnavailable(error instanceof Error ? error.message : 'Failed to mark room as read');
    }
  }, [ensureBackendAvailable, serverUrl, markBackendUnavailable]);

  // Handle active room change
  const handleActiveRoomChange = useCallback(async (roomId: string | null) => {
    setActiveRoom(roomId);
    if (roomId) {
      await loadMessages(roomId);
      if (currentUser) {
        await markRoomAsRead(roomId, currentUser.id);
      }
    } else {
      setCurrentMessages([]);
    }
  }, [loadMessages, markRoomAsRead, currentUser]);

  // Set up polling for real-time updates (every 3 seconds)
  useEffect(() => {
    if (!currentUser || backendStatus !== 'available') return;

    const interval = setInterval(() => {
      void refreshRooms();
      if (activeRoom) {
        void loadMessages(activeRoom);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentUser, activeRoom, backendStatus, refreshRooms, loadMessages]);

  // Load initial data when user changes
  useEffect(() => {
    if (currentUser) {
      void (async () => {
        const backendReady = await ensureBackendAvailable();
        if (!backendReady) return;

        await fetchAvailableUsers();
        await refreshRooms();
      })();
    } else {
      setRooms([]);
      setCurrentMessages([]);
      setActiveRoom(null);
    }
  }, [currentUser, ensureBackendAvailable, fetchAvailableUsers, refreshRooms]);

  // Update current user from context (this needs to be called from the main app)
  useEffect(() => {
    const checkForUser = () => {
      const user = readStoredUser();
      if (user && (!currentUser || currentUser.id !== user.id)) {
        setCurrentUser(user);
      }
    };
    
    checkForUser();
    const interval = setInterval(checkForUser, 1000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const value: ChatContextType = {
    rooms,
    activeRoom,
    currentMessages,
    availableUsers,
    loading,
    setActiveRoom: handleActiveRoomChange,
    sendMessage,
    sendMediaMessage,
    createRoom,
    markRoomAsRead,
    refreshRooms,
    loadMessages,
    createDirectMessage,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
