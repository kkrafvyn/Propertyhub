/**
 * Messaging Service
 *
 * Real-time messaging system with WhatsApp integration
 * Handles messages, conversations, and notifications
 *
 * @author PropertyHub Team
 */

import { supabase as supabaseClient } from './supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { backendApiRequest } from './backendApi';

// ============================================================================
// Type Definitions
// ============================================================================

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  sender_avatar?: string;
  content: string;
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  read_by?: string[];
}

export interface Conversation {
  id: string;
  participants: string[];
  participant_names?: string[];
  participant_avatars?: string[];
  type: 'direct' | 'group';
  name?: string;
  description?: string;
  avatar?: string;
  last_message?: Message;
  last_message_at: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
  archived: boolean;
  muted: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'message' | 'mention' | 'reaction' | 'whatsapp';
  title: string;
  description: string;
  data: any;
  read: boolean;
  created_at: string;
}

export interface ReadReceipt {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  user_name: string;
  started_at: string;
}

export interface WhatsAppMessage {
  id: string;
  user_id: string;
  phone_number: string;
  message: string;
  direction: 'inbound' | 'outbound';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  external_id?: string;
  created_at: string;
}

// ============================================================================
// Message Service
// ============================================================================

export const messageService = {
  // ========== Message Operations ==========

  // Send a new message
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    messageType: string = 'text',
    fileData?: { url: string; name: string; size: number }
  ): Promise<{ data: Message | null; error: any }> {
    try {
      try {
        const backendData = await backendApiRequest<Message>('/api/v1/messages/send', {
          method: 'POST',
          body: JSON.stringify({
            conversationId,
            content,
            messageType,
            fileUrl: fileData?.url,
            fileName: fileData?.name,
          }),
        });

        if (backendData) {
          return { data: backendData, error: null };
        }
      } catch {
        // Fallback to direct database write when backend endpoint is unavailable.
      }

      const { data: message, error } = await supabaseClient
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content,
          message_type: messageType,
          file_url: fileData?.url,
          file_name: fileData?.name,
          file_size: fileData?.size,
          status: 'sent',
          is_edited: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Mark conversation as updated
      await supabaseClient
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      // Create notification for all other participants
      await this.notifyConversationParticipants(
        conversationId,
        senderId,
        `New message in conversation`
      );

      return { data: message as Message, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get message by ID
  async getMessage(messageId: string): Promise<{ data: Message | null; error: any }> {
    try {
      const { data, error } = await supabaseClient
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (error) throw error;
      return { data: data as Message, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get messages for conversation
  async getConversationMessages(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ data: Message[] | null; error: any }> {
    try {
      try {
        const backendData = await backendApiRequest<Message[]>(
          `/api/v1/messages/conversation/${encodeURIComponent(conversationId)}/messages?limit=${limit}&offset=${offset}`
        );

        if (Array.isArray(backendData)) {
          return { data: backendData, error: null };
        }
      } catch {
        // Fallback to direct database query when backend endpoint is unavailable.
      }

      const { data, error } = await supabaseClient
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { data: (data || []).reverse() as Message[], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Update message
  async updateMessage(
    messageId: string,
    content: string
  ): Promise<{ data: Message | null; error: any }> {
    try {
      try {
        const backendData = await backendApiRequest<Message>(
          `/api/v1/messages/${encodeURIComponent(messageId)}/edit`,
          {
            method: 'PUT',
            body: JSON.stringify({ content }),
          }
        );

        if (backendData) {
          return { data: backendData, error: null };
        }
      } catch {
        // Fallback to direct database update when backend endpoint is unavailable.
      }

      const { data, error } = await supabaseClient
        .from('messages')
        .update({
          content,
          is_edited: true,
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;
      return { data: data as Message, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Delete message
  async deleteMessage(messageId: string): Promise<{ error: any }> {
    try {
      try {
        await backendApiRequest(`/api/v1/messages/${encodeURIComponent(messageId)}`, {
          method: 'DELETE',
        });
        return { error: null };
      } catch {
        // Fallback to direct database update when backend endpoint is unavailable.
      }

      const { error } = await supabaseClient
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  // Mark message as read
  async markMessageAsRead(
    messageId: string,
    userId: string
  ): Promise<{ error: any }> {
    try {
      try {
        await backendApiRequest(`/api/v1/messages/${encodeURIComponent(messageId)}/read`, {
          method: 'POST',
        });
        return { error: null };
      } catch {
        // Fallback to direct database update when backend endpoint is unavailable.
      }

      // Create read receipt
      const { error: receiptError } = await supabaseClient
        .from('read_receipts')
        .insert({
          message_id: messageId,
          user_id: userId,
          read_at: new Date().toISOString(),
        });

      if (receiptError && receiptError.code !== 'PGRST116') {
        // Ignore if already read
        throw receiptError;
      }

      // Update message status
      const { error: updateError } = await supabaseClient
        .from('messages')
        .update({ status: 'read' })
        .eq('id', messageId);

      if (updateError) throw updateError;

      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  // ========== Conversation Operations ==========

  // Create new conversation
  async createConversation(
    participants: string[],
    type: 'direct' | 'group' = 'direct',
    name?: string
  ): Promise<{ data: Conversation | null; error: any }> {
    try {
      try {
        const backendData = await backendApiRequest<Conversation>('/api/v1/messages/conversations/create', {
          method: 'POST',
          body: JSON.stringify({
            participants,
            type,
            name,
          }),
        });

        if (backendData) {
          return { data: backendData, error: null };
        }
      } catch {
        // Fallback to direct database write when backend endpoint is unavailable.
      }

      const { data: conversation, error } = await supabaseClient
        .from('conversations')
        .insert({
          participants,
          type,
          name: name || (type === 'direct' ? null : `Group Chat - ${new Date().toLocaleDateString()}`),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          archived: false,
          muted: false,
          unread_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return { data: conversation as Conversation, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get conversation by ID
  async getConversation(conversationId: string): Promise<{ data: Conversation | null; error: any }> {
    try {
      const { data, error } = await supabaseClient
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      return { data: data as Conversation, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get user conversations
  async getUserConversations(userId: string): Promise<{ data: Conversation[] | null; error: any }> {
    try {
      try {
        const backendData = await backendApiRequest<Conversation[]>(
          `/api/v1/messages/conversations/${encodeURIComponent(userId)}`
        );

        if (Array.isArray(backendData)) {
          return { data: backendData, error: null };
        }
      } catch {
        // Fallback to direct database query when backend endpoint is unavailable.
      }

      const { data, error } = await supabaseClient
        .from('conversations')
        .select('*')
        .contains('participants', [userId])
        .eq('archived', false)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      return { data: (data || []) as Conversation[], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get or create direct conversation
  async getOrCreateDirectConversation(
    userId1: string,
    userId2: string
  ): Promise<{ data: Conversation | null; error: any }> {
    try {
      // Check if conversation exists
      const participants = [userId1, userId2].sort();
      const { data: existing, error: searchError } = await supabaseClient
        .from('conversations')
        .select('*')
        .eq('type', 'direct')
        .contains('participants', participants)
        .single();

      if (existing) {
        return { data: existing as Conversation, error: null };
      }

      // Create new conversation
      return this.createConversation(participants, 'direct');
    } catch (error) {
      // If no existing, create new
      const participants = [userId1, userId2].sort();
      return this.createConversation(participants, 'direct');
    }
  },

  // Update conversation
  async updateConversation(
    conversationId: string,
    updates: Partial<Conversation>
  ): Promise<{ data: Conversation | null; error: any }> {
    try {
      const { data, error } = await supabaseClient
        .from('conversations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .select()
        .single();

      if (error) throw error;
      return { data: data as Conversation, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Archive conversation
  async archiveConversation(conversationId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabaseClient
        .from('conversations')
        .update({ archived: true })
        .eq('id', conversationId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  // Mute/unmute conversation
  async toggleConversationMute(conversationId: string, muted: boolean): Promise<{ error: any }> {
    try {
      const { error } = await supabaseClient
        .from('conversations')
        .update({ muted })
        .eq('id', conversationId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  // ========== Notification Operations ==========

  // Create notification
  async createNotification(
    userId: string,
    type: string,
    title: string,
    description: string,
    data?: any
  ): Promise<{ error: any }> {
    try {
      const { error } = await supabaseClient
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title,
          description,
          data,
          read: false,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  // Get user notifications
  async getUserNotifications(userId: string): Promise<{ data: Notification[] | null; error: any }> {
    try {
      const { data, error } = await supabaseClient
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return { data: (data || []) as Notification[], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabaseClient
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  // ========== Helper Methods ==========

  // Notify conversation participants
  async notifyConversationParticipants(
    conversationId: string,
    senderId: string,
    message: string
  ): Promise<void> {
    try {
      const { data: conversation } = await this.getConversation(conversationId);
      if (!conversation) return;

      const otherParticipants = conversation.participants.filter((id) => id !== senderId);

      for (const participantId of otherParticipants) {
        await this.createNotification(
          participantId,
          'message',
          'New Message',
          message,
          { conversationId }
        );
      }
    } catch (error) {
      console.error('Failed to notify participants:', error);
    }
  },

  // Subscribe to conversation messages
  subscribeToConversation(
    conversationId: string,
    callback: (message: Message) => void
  ): RealtimeChannel | null {
    try {
      const channel = supabaseClient
        .channel(`conversation:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload: any) => {
            callback(payload.new as Message);
          }
        )
        .subscribe();

      return channel;
    } catch (error) {
      console.error('Failed to subscribe to conversation:', error);
      return null;
    }
  },

  // Subscribe to conversation updates
  subscribeToConversationUpdates(
    conversationId: string,
    callback: (conversation: Conversation) => void
  ): RealtimeChannel | null {
    try {
      const channel = supabaseClient
        .channel(`conversation-updates:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversations',
            filter: `id=eq.${conversationId}`,
          },
          (payload: any) => {
            callback(payload.new as Conversation);
          }
        )
        .subscribe();

      return channel;
    } catch (error) {
      console.error('Failed to subscribe to conversation updates:', error);
      return null;
    }
  },

  // Broadcast typing indicator
  async broadcastTyping(conversationId: string, userId: string, userName: string): Promise<void> {
    try {
      try {
        await backendApiRequest('/api/v1/messages/typing', {
          method: 'POST',
          body: JSON.stringify({
            conversationId,
            isTyping: true,
          }),
        });
        return;
      } catch {
        // Fallback to realtime broadcast when REST typing endpoint is unavailable.
      }

      const channel = supabaseClient.channel(`typing:${conversationId}`);
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId,
          userName,
          conversationId,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      console.error('Failed to broadcast typing:', error);
    }
  },

  // Search messages
  async searchMessages(
    conversationId: string,
    query: string
  ): Promise<{ data: Message[] | null; error: any }> {
    try {
      try {
        const backendData = await backendApiRequest<Message[]>(
          `/api/v1/messages/search?q=${encodeURIComponent(query)}`
        );

        if (Array.isArray(backendData)) {
          const filteredMessages = backendData.filter(
            (message) => message.conversation_id === conversationId
          );
          return { data: filteredMessages, error: null };
        }
      } catch {
        // Fallback to direct database query when backend endpoint is unavailable.
      }

      const { data, error } = await supabaseClient
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: (data || []) as Message[], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // ========== WhatsApp Integration ==========

  // Send WhatsApp message
  async sendWhatsAppMessage(
    userId: string,
    phoneNumber: string,
    message: string
  ): Promise<{ data: WhatsAppMessage | null; error: any }> {
    try {
      // Store message record
      const { data: record, error: recordError } = await supabaseClient
        .from('whatsapp_messages')
        .insert({
          user_id: userId,
          phone_number: phoneNumber,
          message,
          direction: 'outbound',
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (recordError) throw recordError;

      // Send via WhatsApp API (external service call)
      // This would integrate with Twilio, MessageBird, or similar
      try {
        const response = await this.sendViaWhatsAppAPI(phoneNumber, message);
        if (response.success) {
          // Update record with external ID
          await supabaseClient
            .from('whatsapp_messages')
            .update({
              external_id: response.messageId,
              status: 'sent',
            })
            .eq('id', record.id);
        }
      } catch (apiError) {
        console.error('WhatsApp API error:', apiError);
      }

      return { data: record as WhatsAppMessage, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Private: Send via WhatsApp API
  async sendViaWhatsAppAPI(
    phoneNumber: string,
    message: string
  ): Promise<{ success: boolean; messageId: string }> {
    try {
      const result = await backendApiRequest<{ success?: boolean; messageId?: string; id?: string }>(
        '/api/v1/messages/whatsapp/send',
        {
          method: 'POST',
          body: JSON.stringify({
            to: phoneNumber,
            message,
          }),
        }
      );

      return {
        success: Boolean(result?.success ?? true),
        messageId: result?.messageId || result?.id || '',
      };
    } catch (error) {
      console.error('WhatsApp API request failed:', error);
      return { success: false, messageId: '' };
    }
  },

  // Get WhatsApp messages for user
  async getUserWhatsAppMessages(userId: string): Promise<{ data: WhatsAppMessage[] | null; error: any }> {
    try {
      try {
        const backendData = await backendApiRequest<WhatsAppMessage[]>(
          `/api/v1/messages/whatsapp/${encodeURIComponent(userId)}`
        );
        if (Array.isArray(backendData)) {
          return { data: backendData, error: null };
        }
      } catch {
        // Fallback to direct database query when backend endpoint is unavailable.
      }

      const { data, error } = await supabaseClient
        .from('whatsapp_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return { data: (data || []) as WhatsAppMessage[], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

export default messageService;
