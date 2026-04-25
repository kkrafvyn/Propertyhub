/**
 * ConversationList Component
 *
 * Displays list of available conversations with unread counts
 * Allows searching, selecting, and managing conversations
 *
 * @author PropertyHub Team
 */

import React, { useEffect, useState } from 'react';
import { useMessaging } from '../hooks/useMessaging';
import { MessageCircle, Search, Plus, X, Archive, Bell } from 'lucide-react';

export interface ConversationListProps {
  currentUserId: string;
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId?: string;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  currentUserId,
  onSelectConversation,
  selectedConversationId,
}) => {
  const {
    conversations,
    createConversation,
    loadConversations,
    archiveConversation,
    toggleMute,
    unreadCount,
  } = useMessaging(currentUserId);

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState<any[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatParticipant, setNewChatParticipant] = useState('');

  // Load conversations on mount
  useEffect(() => {
    if (currentUserId) {
      loadConversations(currentUserId);
    }
  }, [currentUserId, loadConversations]);

  // Filter conversations based on search
  useEffect(() => {
    const filtered = conversations.filter((conv) => {
      const name = conv.name || conv.participant_names?.join(', ') || 'Unknown';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });
    setFilteredConversations(filtered);
  }, [conversations, searchQuery]);

  // Handle create new conversation
  const handleCreateConversation = async () => {
    if (!newChatParticipant.trim()) return;

    try {
      await createConversation([currentUserId, newChatParticipant], 'direct');
      setNewChatParticipant('');
      setShowNewChat(false);
    } catch (err) {
      console.error('Failed to create conversation:', err);
      alert('Failed to create conversation');
    }
  };

  // Format last message time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    if (diffMinutes < 10080) return `${Math.floor(diffMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  // Format conversation name
  const getConversationName = (conv: any) => {
    if (conv.name) return conv.name;
    if (conv.participant_names) {
      return conv.participant_names
        .filter((name: string) => name !== 'You')
        .join(', ') || 'Direct Message';
    }
    return 'Conversation';
  };

  // Truncate message
  const truncateMessage = (message: string, maxLength: number = 50) => {
    return message.length > maxLength ? `${message.substring(0, maxLength)}...` : message;
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
          <button
            onClick={() => setShowNewChat(!showNewChat)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="New conversation"
          >
            {showNewChat ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>

        {/* New Chat Input */}
        {showNewChat && (
          <div className="flex gap-2 mb-4">
            <input
              value={newChatParticipant}
              onChange={(e) => setNewChatParticipant(e.target.value)}
              placeholder="User ID to chat with"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateConversation();
                }
              }}
            />
            <button
              onClick={handleCreateConversation}
              disabled={!newChatParticipant.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium"
            >
              Start
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <p className="text-xs text-blue-600 font-medium mt-2">
            {unreadCount} unread message{unreadCount > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-center px-4">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={`group relative px-3 py-3 rounded-lg cursor-pointer transition ${
                  selectedConversationId === conv.id
                    ? 'bg-blue-50 border-l-4 border-blue-600'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => onSelectConversation(conv.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {getConversationName(conv).charAt(0)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {getConversationName(conv)}
                      </p>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 truncate mt-1">
                      {conv.last_message?.content
                        ? truncateMessage(conv.last_message.content)
                        : 'No messages yet'}
                    </p>
                  </div>

                  {/* Unread Badge */}
                  {conv.unread_count > 0 && (
                    <div className="flex-shrink-0 ml-2">
                      <div className="flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full">
                        {Math.min(conv.unread_count, 9)}
                      </div>
                    </div>
                  )}

                  {/* Muted Indicator */}
                  {conv.muted && (
                    <Bell className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </div>

                {/* Context Menu */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex gap-1 transition">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute(true);
                    }}
                    className="p-1 hover:bg-gray-200 rounded text-gray-600"
                    title="Mute"
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Archive this conversation?')) {
                        archiveConversation(conv.id);
                      }
                    }}
                    className="p-1 hover:bg-gray-200 rounded text-gray-600"
                    title="Archive"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
