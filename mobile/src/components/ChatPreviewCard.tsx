/**
 * PropertyHub Mobile - Chat Preview Card Component
 * 
 * A card component for displaying chat conversation previews
 * in the messages list. Shows participant info, last message,
 * unread count, and online status.
 * 
 * Features:
 * - Avatar with online status indicator
 * - Last message preview with type indicators
 * - Unread message count badge
 * - Timestamp formatting
 * - Long press for context actions
 * - Swipe gestures (future)
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import {
  Text,
  Avatar,
  Badge,
  Surface,
  useTheme,
} from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

// Types
import type { ChatRoom } from '../types';
import { useAuth } from '../providers/AuthProvider';

interface ChatPreviewCardProps {
  room: ChatRoom;
  unreadCount?: number;
  isOnline?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
}

export function ChatPreviewCard({
  room,
  unreadCount = 0,
  isOnline = false,
  onPress,
  onLongPress,
  style,
}: ChatPreviewCardProps) {
  const theme = useTheme();
  const { user } = useAuth();

  // Get other participant (for 1-on-1 chats)
  const otherParticipant = room.participants.find(p => p.id !== user?.id);
  
  // Determine display name and avatar
  const displayName = room.type === 'property' && otherParticipant
    ? otherParticipant.name
    : room.name;
    
  const displayAvatar = otherParticipant?.avatar;

  // Handle press
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  // Handle long press
  const handleLongPress = () => {
    if (onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLongPress();
    }
  };

  // Format last message preview
  const formatLastMessage = () => {
    if (!room.lastMessage) return 'No messages yet';
    
    const { content, type, senderId } = room.lastMessage;
    const isOwnMessage = senderId === user?.id;
    const senderPrefix = isOwnMessage ? 'You: ' : '';

    switch (type) {
      case 'image':
        return `${senderPrefix}📷 Photo`;
      case 'voice':
        return `${senderPrefix}🎵 Voice message`;
      case 'file':
        return `${senderPrefix}📎 File`;
      case 'location':
        return `${senderPrefix}📍 Location`;
      case 'system':
        return content;
      default:
        return `${senderPrefix}${content}`;
    }
  };

  // Format timestamp
  const formatTimestamp = () => {
    if (!room.lastMessage?.createdAt) return '';
    
    try {
      return formatDistanceToNow(new Date(room.lastMessage.createdAt), { 
        addSuffix: false 
      });
    } catch (error) {
      return '';
    }
  };

  // Get room type icon
  const getRoomTypeIcon = () => {
    switch (room.type) {
      case 'property':
        return 'home-outline';
      case 'booking':
        return 'calendar-outline';
      case 'support':
        return 'help-circle-outline';
      default:
        return 'chatbubbles-outline';
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={[styles.container, style]}
      android_ripple={{ 
        color: theme.colors.primary + '20',
        borderless: false 
      }}
    >
      <Surface
        style={[
          styles.card,
          {
            backgroundColor: unreadCount > 0 
              ? theme.colors.surfaceVariant 
              : theme.colors.surface,
          }
        ]}
        elevation={0}
      >
        {/* Avatar and Online Status */}
        <View style={styles.avatarContainer}>
          {displayAvatar ? (
            <Avatar.Image 
              source={{ uri: displayAvatar }} 
              size={56}
              style={styles.avatar}
            />
          ) : (
            <Avatar.Icon 
              icon={getRoomTypeIcon()} 
              size={56}
              style={[
                styles.avatar,
                { backgroundColor: theme.colors.primaryContainer }
              ]}
            />
          )}
          
          {/* Online Status Indicator */}
          {room.type === 'property' && isOnline && (
            <View style={[
              styles.onlineIndicator,
              { backgroundColor: theme.colors.surface }
            ]}>
              <View style={[
                styles.onlineDot,
                { backgroundColor: '#4CAF50' }
              ]} />
            </View>
          )}
        </View>

        {/* Chat Content */}
        <View style={styles.contentContainer}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <Text 
              style={[
                styles.displayName,
                {
                  color: theme.colors.onSurface,
                  fontWeight: unreadCount > 0 ? '600' : '400',
                }
              ]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            
            <View style={styles.headerRight}>
              {/* Timestamp */}
              <Text style={[
                styles.timestamp,
                {
                  color: unreadCount > 0 
                    ? theme.colors.primary 
                    : theme.colors.onSurfaceVariant,
                  fontWeight: unreadCount > 0 ? '600' : '400',
                }
              ]}>
                {formatTimestamp()}
              </Text>
              
              {/* Mute indicator */}
              {room.isMuted && (
                <Ionicons 
                  name="volume-mute-outline" 
                  size={16} 
                  color={theme.colors.onSurfaceVariant}
                  style={styles.muteIcon}
                />
              )}
            </View>
          </View>

          {/* Last Message Row */}
          <View style={styles.messageRow}>
            <Text 
              style={[
                styles.lastMessage,
                {
                  color: unreadCount > 0 
                    ? theme.colors.onSurface 
                    : theme.colors.onSurfaceVariant,
                  fontWeight: unreadCount > 0 ? '500' : '400',
                }
              ]}
              numberOfLines={2}
            >
              {formatLastMessage()}
            </Text>
            
            {/* Unread Count Badge */}
            {unreadCount > 0 && (
              <Badge
                style={[
                  styles.unreadBadge,
                  { backgroundColor: theme.colors.error }
                ]}
                size={20}
              >
                {unreadCount > 99 ? '99+' : unreadCount.toString()}
              </Badge>
            )}
          </View>

          {/* Property Info (for property chats) */}
          {room.type === 'property' && room.propertyId && (
            <View style={styles.propertyInfo}>
              <Ionicons 
                name="home-outline" 
                size={14} 
                color={theme.colors.onSurfaceVariant}
              />
              <Text style={[
                styles.propertyText,
                { color: theme.colors.onSurfaceVariant }
              ]}>
                Property inquiry
              </Text>
            </View>
          )}
        </View>

        {/* Message Status Indicator */}
        {room.lastMessage?.senderId === user?.id && (
          <View style={styles.statusContainer}>
            {room.lastMessage.status === 'sent' && (
              <Ionicons 
                name="checkmark-outline" 
                size={16} 
                color={theme.colors.onSurfaceVariant}
              />
            )}
            {room.lastMessage.status === 'delivered' && (
              <Ionicons 
                name="checkmark-done-outline" 
                size={16} 
                color={theme.colors.onSurfaceVariant}
              />
            )}
            {room.lastMessage.status === 'read' && (
              <Ionicons 
                name="checkmark-done-outline" 
                size={16} 
                color={theme.colors.primary}
              />
            )}
            {room.lastMessage.status === 'sending' && (
              <Ionicons 
                name="time-outline" 
                size={16} 
                color={theme.colors.onSurfaceVariant}
              />
            )}
          </View>
        )}
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 1,
  },
  card: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 80,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    // Avatar styles are handled by the component
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 56,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  displayName: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timestamp: {
    fontSize: 12,
  },
  muteIcon: {
    marginLeft: 4,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
    lineHeight: 18,
  },
  unreadBadge: {
    marginLeft: 8,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  propertyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  propertyText: {
    fontSize: 12,
  },
  statusContainer: {
    marginLeft: 8,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
});