import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ChatRoom, ChatMessage, User } from '../types';
import { toast } from "sonner";
import {
  createChatRoom,
  loadChatUsers,
  loadRoomMessages,
  loadUserRooms,
  markRoomRead,
  sendChatMessage,
} from '../services/chatDataService';

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

  // Fetch available users for creating chats
  const fetchAvailableUsers = useCallback(async () => {
    if (!currentUser) {
      setAvailableUsers([]);
      return;
    }

    try {
      const users = await loadChatUsers(currentUser);
      setAvailableUsers(users);
    } catch (error) {
      console.error('Failed to fetch available users:', error);
      setAvailableUsers([]);
    }
  }, [currentUser]);

  // Fetch chat rooms for current user
  const refreshRooms = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const nextRooms = await loadUserRooms(currentUser);
      setRooms(nextRooms);
    } catch (error) {
      console.error('Failed to load chat rooms:', error);
      toast.error('Failed to load chat rooms');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Load messages for a specific room
  const loadMessages = useCallback(async (roomId: string) => {
    try {
      const messages = await loadRoomMessages(roomId);
      setCurrentMessages(messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(async (roomId: string, content: string, type: 'text' | 'image' | 'file' | 'audio' | 'video' = 'text') => {
    if (!currentUser || !content.trim()) return;

    try {
      const message = await sendChatMessage({
        roomId,
        currentUser,
        content: content.trim(),
        type,
      });

      if (!message) {
        toast.error('Unable to send message');
        return;
      }

      if (activeRoom === roomId) {
        setCurrentMessages(prev => [...prev, message]);
      }

      await refreshRooms();
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      throw error;
    }
  }, [currentUser, activeRoom, refreshRooms]);

  // Send media message
  const sendMediaMessage = useCallback(async (roomId: string, file: File, fileUrl: string, content?: string, thumbnailUrl?: string) => {
    if (!currentUser) return;

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
      const message = await sendChatMessage({
        roomId,
        currentUser,
        content: content || '',
        type: messageType,
        fileUrl,
        thumbnailUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        ...(messageType === 'audio' || messageType === 'video' ? { duration: 0 } : {}),
      });

      if (!message) {
        toast.error('Unable to send media message');
        return;
      }

      if (activeRoom === roomId) {
        setCurrentMessages(prev => [...prev, message]);
      }

      await refreshRooms();
    } catch (error) {
      console.error('Failed to send media message:', error);
      toast.error('Failed to send media message');
      throw error;
    }
  }, [currentUser, activeRoom, refreshRooms]);

  // Create a new chat room
  const createRoom = useCallback(async (
    name: string, 
    type: 'direct' | 'group' | 'support', 
    participants: string[], 
    description?: string
  ): Promise<ChatRoom | null> => {
    if (!currentUser) return null;

    try {
      const room = await createChatRoom({
        currentUser,
        name,
        type,
        participants,
        description,
      });

      if (!room) {
        toast.error('Failed to create chat room');
        return null;
      }

      await refreshRooms();
      toast.success('Chat room created successfully');
      return room;
    } catch (error) {
      console.error('Failed to create chat room:', error);
      toast.error('Failed to create chat room');
      return null;
    }
  }, [currentUser, refreshRooms]);

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
    try {
      await markRoomRead(roomId, userId);
      setRooms((previousRooms) =>
        previousRooms.map((room) => {
          if (room.id !== roomId) return room;
          if (typeof room.unreadCount === 'number') {
            return {
              ...room,
              unreadCount: 0,
            };
          }

          return {
            ...room,
            unreadCount: {
              ...(room.unreadCount || {}),
              [userId]: 0,
            },
          };
        })
      );
    } catch (error) {
      console.error('Failed to mark room as read:', error);
    }
  }, []);

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
    if (!currentUser) return;

    const interval = setInterval(() => {
      void refreshRooms();
      if (activeRoom) {
        void loadMessages(activeRoom);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentUser, activeRoom, refreshRooms, loadMessages]);

  // Load initial data when user changes
  useEffect(() => {
    if (currentUser) {
      void (async () => {
        await fetchAvailableUsers();
        await refreshRooms();
      })();
    } else {
      setRooms([]);
      setCurrentMessages([]);
      setActiveRoom(null);
      setAvailableUsers([]);
    }
  }, [currentUser, fetchAvailableUsers, refreshRooms]);

  // Update current user from context (this needs to be called from the main app)
  useEffect(() => {
    const checkForUser = () => {
      const user = readStoredUser();
      if (user && (!currentUser || currentUser.id !== user.id)) {
        setCurrentUser(user);
      } else if (!user && currentUser) {
        setCurrentUser(null);
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
