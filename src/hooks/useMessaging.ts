/**
 * useMessaging Hook
 *
 * Custom React hook for messaging system state management
 * Handles conversations, messages, and real-time updates
 *
 * @author PropertyHub Team
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { messageService } from '../services/messagingService';
import type {
  Message,
  Conversation,
  Notification,
} from '../services/messagingService';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface UseMessagingState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  notifications: Notification[];
  typingUsers: Map<string, string>;
  loading: boolean;
  error: Error | null;
  unreadCount: number;
  searchQuery: string;
  searchResults: Message[];
}

export interface UseMessagingReturn extends UseMessagingState {
  // Conversation operations
  createConversation: (
    participants: string[],
    type?: 'direct' | 'group',
    name?: string
  ) => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  getOrCreateDirectConversation: (userId: string) => Promise<void>;
  archiveConversation: (conversationId: string) => Promise<void>;
  toggleMute: (conversationId: boolean) => Promise<void>;

  // Message operations
  sendMessage: (
    content: string,
    type?: string,
    file?: { url: string; name: string; size: number }
  ) => Promise<void>;
  updateMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  markMessageAsRead: (messageId: string) => Promise<void>;

  // Notification operations
  getNotifications: (userId: string) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;

  // Utility operations
  loadConversations: (userId: string) => Promise<void>;
  loadMessages: (conversationId: string, limit?: number, offset?: number) => Promise<void>;
  searchMessages: (query: string) => Promise<void>;
  broadcastTyping: (conversationId: string, userName: string) => Promise<void>;

  // Cleanup
  clearError: () => void;
  unsubscribe: () => void;
}

export const useMessaging = (currentUserId: string): UseMessagingReturn => {
  const [state, setState] = useState<UseMessagingState>({
    conversations: [],
    currentConversation: null,
    messages: [],
    notifications: [],
    typingUsers: new Map(),
    loading: false,
    error: null,
    unreadCount: 0,
    searchQuery: '',
    searchResults: [],
  });

  const subscriptions = useRef<{
    conversation?: RealtimeChannel;
    conversationUpdates?: RealtimeChannel;
  }>({});

  // Load conversations
  const loadConversations = useCallback(async (userId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await messageService.getUserConversations(userId);
      if (error) throw error;

      setState((prev) => ({
        ...prev,
        conversations: data || [],
        loading: false,
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load conversations');
      setState((prev) => ({ ...prev, error, loading: false }));
    }
  }, []);

  // Load messages
  const loadMessages = useCallback(
    async (conversationId: string, limit: number = 50, offset: number = 0) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const { data, error } = await messageService.getConversationMessages(
          conversationId,
          limit,
          offset
        );
        if (error) throw error;

        setState((prev) => ({
          ...prev,
          messages: data || [],
          loading: false,
        }));
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load messages');
        setState((prev) => ({ ...prev, error, loading: false }));
      }
    },
    []
  );

  // Create conversation
  const createConversation = useCallback(
    async (participants: string[], type: 'direct' | 'group' = 'direct', name?: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const { data, error } = await messageService.createConversation(
          participants,
          type,
          name
        );
        if (error) throw error;

        if (data) {
          setState((prev) => ({
            ...prev,
            conversations: [data, ...prev.conversations],
            currentConversation: data,
            loading: false,
          }));
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create conversation');
        setState((prev) => ({ ...prev, error, loading: false }));
      }
    },
    []
  );

  // Select conversation
  const selectConversation = useCallback(async (conversationId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await messageService.getConversation(conversationId);
      if (error) throw error;

      if (data) {
        setState((prev) => ({
          ...prev,
          currentConversation: data,
          loading: false,
        }));

        // Load messages
        await loadMessages(conversationId);

        // Subscribe to new messages
        const channel = messageService.subscribeToConversation(conversationId, (message: Message) => {
          setState((prev) => ({
            ...prev,
            messages: [...prev.messages, message],
          }));
        });

        if (channel) {
          subscriptions.current.conversation = channel;
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to select conversation');
      setState((prev) => ({ ...prev, error, loading: false }));
    }
  }, [loadMessages]);

  // Send message
  const sendMessage = useCallback(
    async (
      content: string,
      type: string = 'text',
      file?: { url: string; name: string; size: number }
    ) => {
      if (!state.currentConversation) {
        setState((prev) => ({
          ...prev,
          error: new Error('No conversation selected'),
        }));
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const { data, error } = await messageService.sendMessage(
          state.currentConversation.id,
          currentUserId,
          content,
          type,
          file
        );

        if (error) throw error;

        if (data) {
          setState((prev) => ({
            ...prev,
            messages: [...prev.messages, data],
            loading: false,
          }));
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to send message');
        setState((prev) => ({ ...prev, error, loading: false }));
      }
    },
    [state.currentConversation, currentUserId]
  );

  // Update message
  const updateMessage = useCallback(async (messageId: string, content: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await messageService.updateMessage(messageId, content);
      if (error) throw error;

      if (data) {
        setState((prev) => ({
          ...prev,
          messages: prev.messages.map((m) => (m.id === messageId ? data : m)),
          loading: false,
        }));
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update message');
      setState((prev) => ({ ...prev, error, loading: false }));
    }
  }, []);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await messageService.deleteMessage(messageId);
      if (error) throw error;

      setState((prev) => ({
        ...prev,
        messages: prev.messages.filter((m) => m.id !== messageId),
        loading: false,
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete message');
      setState((prev) => ({ ...prev, error, loading: false }));
    }
  }, []);

  // Mark message as read
  const markMessageAsRead = useCallback(async (messageId: string) => {
    try {
      const { error } = await messageService.markMessageAsRead(messageId, currentUserId);
      if (error) throw error;

      setState((prev) => ({
        ...prev,
        messages: prev.messages.map((m) =>
          m.id === messageId ? { ...m, status: 'read' } : m
        ),
      }));
    } catch (err) {
      console.error('Failed to mark message as read:', err);
    }
  }, [currentUserId]);

  // Get or create direct conversation
  const getOrCreateDirectConversation = useCallback(
    async (otherUserId: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const { data, error } = await messageService.getOrCreateDirectConversation(
          currentUserId,
          otherUserId
        );
        if (error) throw error;

        if (data) {
          setState((prev) => ({
            ...prev,
            conversations: [data, ...prev.conversations.filter((c) => c.id !== data.id)],
            currentConversation: data,
            loading: false,
          }));

          await loadMessages(data.id);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to get conversation');
        setState((prev) => ({ ...prev, error, loading: false }));
      }
    },
    [currentUserId, loadMessages]
  );

  // Archive conversation
  const archiveConversation = useCallback(async (conversationId: string) => {
    try {
      const { error } = await messageService.archiveConversation(conversationId);
      if (error) throw error;

      setState((prev) => ({
        ...prev,
        conversations: prev.conversations.filter((c) => c.id !== conversationId),
      }));
    } catch (err) {
      console.error('Failed to archive conversation:', err);
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(async (conversationId: boolean) => {
    if (!state.currentConversation) return;

    try {
      const { error } = await messageService.toggleConversationMute(
        state.currentConversation.id,
        conversationId as any
      );
      if (error) throw error;

      setState((prev) => ({
        ...prev,
        currentConversation: prev.currentConversation
          ? { ...prev.currentConversation, muted: conversationId as any }
          : null,
      }));
    } catch (err) {
      console.error('Failed to toggle mute:', err);
    }
  }, [state.currentConversation]);

  // Get notifications
  const getNotifications = useCallback(async (userId: string) => {
    try {
      const { data, error } = await messageService.getUserNotifications(userId);
      if (error) throw error;

      setState((prev) => ({
        ...prev,
        notifications: data || [],
        unreadCount: (data || []).length,
      }));
    } catch (err) {
      console.error('Failed to get notifications:', err);
    }
  }, []);

  // Mark notification as read
  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await messageService.markNotificationAsRead(notificationId);
      if (error) throw error;

      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.filter((n) => n.id !== notificationId),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  // Search messages
  const searchMessages = useCallback(async (query: string) => {
    if (!state.currentConversation) return;

    setState((prev) => ({ ...prev, searchQuery: query }));

    try {
      const { data, error } = await messageService.searchMessages(
        state.currentConversation.id,
        query
      );
      if (error) throw error;

      setState((prev) => ({
        ...prev,
        searchResults: data || [],
      }));
    } catch (err) {
      console.error('Failed to search messages:', err);
    }
  }, [state.currentConversation]);

  // Broadcast typing
  const broadcastTyping = useCallback(
    async (conversationId: string, userName: string) => {
      try {
        await messageService.broadcastTyping(conversationId, currentUserId, userName);
      } catch (err) {
        console.error('Failed to broadcast typing:', err);
      }
    },
    [currentUserId]
  );

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Unsubscribe from all channels
  const unsubscribe = useCallback(() => {
    if (subscriptions.current.conversation) {
      subscriptions.current.conversation.unsubscribe();
    }
    if (subscriptions.current.conversationUpdates) {
      subscriptions.current.conversationUpdates.unsubscribe();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    ...state,
    createConversation,
    selectConversation,
    getOrCreateDirectConversation,
    archiveConversation,
    toggleMute,
    sendMessage,
    updateMessage,
    deleteMessage,
    markMessageAsRead,
    getNotifications,
    markNotificationAsRead,
    loadConversations,
    loadMessages,
    searchMessages,
    broadcastTyping,
    clearError,
    unsubscribe,
  };
};

export default useMessaging;
