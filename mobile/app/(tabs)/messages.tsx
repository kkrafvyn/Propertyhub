/**
 * PropertyHub Mobile - Messages Tab
 * 
 * This screen displays all chat conversations for the user.
 * It shows a list of active chats with preview messages, online status,
 * and unread message counts.
 * 
 * Features:
 * - List of all conversations
 * - Real-time message updates
 * - Unread message indicators
 * - Online status indicators
 * - Search through conversations
 * - Pull-to-refresh
 * - Swipe actions (delete, mute, etc.)
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import {
  Text,
  SearchBar,
  Avatar,
  Badge,
  IconButton,
  Portal,
  Modal,
  List,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

// Components
import { ChatPreviewCard } from '../../src/components/ChatPreviewCard';

// Providers and Hooks
import { useAuth } from '../../src/providers/AuthProvider';
import { useWebSocket } from '../../src/providers/WebSocketProvider';
import { useOffline } from '../../src/providers/OfflineProvider';

// Services
import { chatService } from '../../src/services/ChatService';

// Types
import type { ChatRoom, Message } from '../../src/types';

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const {
    connectionStatus,
    joinRoom,
    leaveRoom,
    sendMessage,
    unreadMessages,
    onlineUsers,
  } = useWebSocket();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [showRoomActions, setShowRoomActions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch chat rooms
  const {
    data: chatRooms = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['chatRooms', user?.id],
    queryFn: () => chatService.getChatRooms(user?.id || ''),
    enabled: !!user && isOnline,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 1000 * 60 * 2, // Consider data stale after 2 minutes
  });

  // Filter rooms based on search query
  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return chatRooms;
    
    const query = searchQuery.toLowerCase();
    return chatRooms.filter((room: ChatRoom) => 
      room.name.toLowerCase().includes(query) ||
      room.participants.some(participant => 
        participant.name.toLowerCase().includes(query)
      ) ||
      room.lastMessage?.content.toLowerCase().includes(query)
    );
  }, [chatRooms, searchQuery]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      await refetch();
    } catch (error) {
      console.error('❌ Error refreshing chat rooms:', error);
      Alert.alert('Error', 'Failed to refresh conversations');
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // Handle room selection
  const handleRoomSelect = (room: ChatRoom) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Join the room for real-time updates
    joinRoom(room.id);
    
    // Navigate to chat screen
    router.push(`/chat/${room.id}`);
  };

  // Handle room long press for actions
  const handleRoomLongPress = (roomId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSelectedRoom(roomId);
    setShowRoomActions(true);
  };

  // Handle mute room
  const handleMuteRoom = async (roomId: string) => {
    try {
      await chatService.muteRoom(roomId, user?.id || '');
      setShowRoomActions(false);
      refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to mute conversation');
    }
  };

  // Handle delete room
  const handleDeleteRoom = async (roomId: string) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.deleteRoom(roomId, user?.id || '');
              setShowRoomActions(false);
              refetch();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete conversation');
            }
          },
        },
      ]
    );
  };

  // Get unread count for a room
  const getUnreadCount = (roomId: string): number => {
    return unreadMessages?.[roomId] || 0;
  };

  // Check if user is online
  const isUserOnline = (userId: string): boolean => {
    return onlineUsers?.includes(userId) || false;
  };

  // Get other participant in the room (for 1-on-1 chats)
  const getOtherParticipant = (room: ChatRoom) => {
    return room.participants.find(p => p.id !== user?.id);
  };

  // Render chat room item
  const renderChatRoom = ({ item: room }: { item: ChatRoom }) => {
    const otherParticipant = getOtherParticipant(room);
    const unreadCount = getUnreadCount(room.id);
    const isOnlineUser = otherParticipant ? isUserOnline(otherParticipant.id) : false;

    return (
      <ChatPreviewCard
        room={room}
        unreadCount={unreadCount}
        isOnline={isOnlineUser}
        onPress={() => handleRoomSelect(room)}
        onLongPress={() => handleRoomLongPress(room.id)}
        style={styles.chatRoomCard}
      />
    );
  };

  // Handle offline state
  if (!isOnline) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.offlineText}>📵 You're currently offline</Text>
        <Text style={styles.offlineSubtext}>
          Messages will sync when you're back online
        </Text>
      </View>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text>💬 Loading conversations...</Text>
      </View>
    );
  }

  // Handle error state
  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>❌ Error loading conversations</Text>
        <Text style={styles.errorSubtext}>
          {error instanceof Error ? error.message : 'Unknown error'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.headerActions}>
            {connectionStatus === 'connected' && (
              <View style={styles.onlineIndicator}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            )}
          </View>
        </View>

        {/* Search Bar */}
        <SearchBar
          placeholder="Search conversations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
          icon="magnify"
          clearIcon="close"
        />
      </View>

      {/* Chat Rooms List */}
      <FlatList
        data={filteredRooms}
        renderItem={renderChatRoom}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>💬 No conversations yet</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery 
                ? 'No conversations match your search'
                : 'Start browsing properties to begin chatting with hosts'}
            </Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />

      {/* Room Actions Modal */}
      <Portal>
        <Modal
          visible={showRoomActions}
          onDismiss={() => setShowRoomActions(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text style={styles.modalTitle}>Conversation Options</Text>
          
          <List.Item
            title="Mute Notifications"
            left={(props) => <List.Icon {...props} icon="volume-off" />}
            onPress={() => selectedRoom && handleMuteRoom(selectedRoom)}
            style={styles.modalOption}
          />
          
          <List.Item
            title="Delete Conversation"
            titleStyle={styles.deleteOption}
            left={(props) => <List.Icon {...props} icon="delete" color="#d32f2f" />}
            onPress={() => selectedRoom && handleDeleteRoom(selectedRoom)}
            style={styles.modalOption}
          />
        </Modal>
      </Portal>

      {/* Connection Status */}
      {connectionStatus !== 'connected' && (
        <View style={styles.connectionStatus}>
          <Text style={styles.connectionText}>
            {connectionStatus === 'connecting' && '🔄 Connecting to chat...'}
            {connectionStatus === 'disconnected' && '📵 Chat disconnected'}
            {connectionStatus === 'error' && '⚠️ Chat connection error'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4caf50',
    marginRight: 4,
  },
  onlineText: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '500',
  },
  searchBar: {
    backgroundColor: '#f8f8f8',
  },
  listContent: {
    paddingBottom: 100,
  },
  chatRoomCard: {
    marginHorizontal: 16,
    marginBottom: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  modalOption: {
    paddingVertical: 8,
  },
  deleteOption: {
    color: '#d32f2f',
  },
  connectionStatus: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  connectionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  offlineText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  offlineSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});