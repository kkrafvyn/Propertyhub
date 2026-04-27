import type { ChatMessage, ChatRoom, User } from '../types';
import { getSupabaseFunctionUrl, publicAnonKey } from './supabaseProject';
import { normalizeUserRole } from '../utils/roleCapabilities';

let remoteChatAvailability: 'unknown' | 'available' | 'unavailable' = 'unknown';

type SendMessageInput = {
  roomId: string;
  currentUser: User;
  content: string;
  type?: 'text' | 'image' | 'file' | 'audio' | 'video';
  fileUrl?: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number;
};

type CreateRoomInput = {
  currentUser: User;
  name: string;
  type: 'direct' | 'group' | 'support';
  participants: string[];
  description?: string;
};

const toTimestamp = () => new Date().toISOString();

const buildMessage = (
  partial: Partial<ChatMessage> &
    Pick<ChatMessage, 'id' | 'roomId' | 'senderId' | 'content' | 'type'>,
): ChatMessage => {
  const timestamp = partial.timestamp || partial.createdAt || toTimestamp();

  return {
    id: partial.id,
    roomId: partial.roomId,
    senderId: partial.senderId,
    senderName: partial.senderName,
    senderAvatar: partial.senderAvatar,
    type: partial.type,
    content: partial.content,
    metadata: partial.metadata,
    fileUrl: partial.fileUrl,
    thumbnailUrl: partial.thumbnailUrl,
    fileName: partial.fileName,
    fileSize: partial.fileSize,
    duration: partial.duration,
    mimeType: partial.mimeType,
    edited: partial.edited ?? false,
    status: partial.status ?? 'delivered',
    createdAt: partial.createdAt || timestamp,
    timestamp,
    updatedAt: partial.updatedAt || timestamp,
    editedAt: partial.editedAt,
    reactions: partial.reactions || [],
    systemType: partial.systemType,
  };
};

const buildRoom = (
  partial: Partial<ChatRoom> & Pick<ChatRoom, 'id' | 'type' | 'participants'>,
): ChatRoom => {
  const timestamp = partial.createdAt || toTimestamp();

  return {
    id: partial.id,
    type: partial.type,
    name: partial.name,
    description: partial.description,
    avatar: partial.avatar,
    participants: partial.participants,
    admins: partial.admins || [],
    settings: partial.settings || {
      allowFileUploads: true,
      allowGuestMessages: true,
    },
    createdAt: timestamp,
    updatedAt: partial.updatedAt || timestamp,
    lastMessageAt: partial.lastMessageAt,
    propertyId: partial.propertyId,
    bookingId: partial.bookingId,
    lastMessage: partial.lastMessage,
    unreadCount: partial.unreadCount || {},
  };
};

const normalizeRemoteMessage = (roomId: string, rawMessage: any): ChatMessage =>
  buildMessage({
    id: rawMessage.id,
    roomId,
    senderId: rawMessage.senderId,
    senderName: rawMessage.senderName,
    senderAvatar: rawMessage.senderAvatar,
    content: rawMessage.content || '',
    type: rawMessage.type || 'text',
    status: rawMessage.status || 'delivered',
    createdAt: rawMessage.createdAt || rawMessage.timestamp || toTimestamp(),
    timestamp: rawMessage.timestamp || rawMessage.createdAt || toTimestamp(),
    fileUrl: rawMessage.fileUrl,
    thumbnailUrl: rawMessage.thumbnailUrl,
    fileName: rawMessage.fileName,
    fileSize: rawMessage.fileSize,
    mimeType: rawMessage.mimeType,
    duration: rawMessage.duration,
    edited: rawMessage.edited,
  });

const normalizeRemoteRoom = (rawRoom: any): ChatRoom =>
  buildRoom({
    id: rawRoom.id,
    type: rawRoom.type || 'direct',
    name: rawRoom.name || 'Conversation',
    description: rawRoom.description,
    participants: Array.isArray(rawRoom.participants) ? rawRoom.participants : [],
    admins: Array.isArray(rawRoom.admins) ? rawRoom.admins : [],
    createdAt: rawRoom.createdAt || toTimestamp(),
    updatedAt: rawRoom.updatedAt || rawRoom.createdAt || toTimestamp(),
    lastMessageAt: rawRoom.lastMessageAt || rawRoom.lastMessage?.timestamp,
    propertyId: rawRoom.propertyId,
    bookingId: rawRoom.bookingId,
    lastMessage: rawRoom.lastMessage
      ? normalizeRemoteMessage(rawRoom.id, rawRoom.lastMessage)
      : undefined,
    unreadCount: rawRoom.unreadCount || {},
  });

const getRemoteHeaders = (adminUser?: User, includeJson = false): HeadersInit => {
  const headers: Record<string, string> = {};

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  if (normalizeUserRole(adminUser) === 'admin' && publicAnonKey) {
    headers.Authorization = `Bearer ${publicAnonKey}`;
    headers['X-Admin-User-ID'] = adminUser.id;
  }

  return headers;
};

const hasRemoteChatConfig = (): boolean => Boolean(getSupabaseFunctionUrl('health'));

const ensureRemoteChatAvailable = async (): Promise<boolean> => {
  if (!hasRemoteChatConfig()) return false;
  if (remoteChatAvailability === 'available') return true;
  if (remoteChatAvailability === 'unavailable') return false;

  try {
    const response = await fetch(getSupabaseFunctionUrl('health'));
    remoteChatAvailability = response.ok ? 'available' : 'unavailable';
  } catch {
    remoteChatAvailability = 'unavailable';
  }

  return remoteChatAvailability === 'available';
};

export const loadChatUsers = async (currentUser: User): Promise<User[]> => {
  if (!(await ensureRemoteChatAvailable())) return [];

  const eligibleEndpoint =
    normalizeUserRole(currentUser) === 'admin'
      ? getSupabaseFunctionUrl('users')
      : getSupabaseFunctionUrl(`users/${currentUser.id}/chat-eligible`);

  try {
    const response = await fetch(eligibleEndpoint, {
      headers: getRemoteHeaders(
        normalizeUserRole(currentUser) === 'admin' ? currentUser : undefined,
      ),
    });

    if (response.ok) {
      const result = await response.json();
      return (result.users || []).map((user: User) => user);
    }
  } catch {
    // Fall through to generic users request below.
  }

  try {
    const response = await fetch(getSupabaseFunctionUrl('users'));
    if (!response.ok) return [];

    const result = await response.json();
    return (result.users || []).map((user: User) => user);
  } catch {
    return [];
  }
};

export const loadUserRooms = async (currentUser: User): Promise<ChatRoom[]> => {
  if (!(await ensureRemoteChatAvailable())) return [];

  try {
    const response = await fetch(getSupabaseFunctionUrl(`chat/rooms/${currentUser.id}`));
    if (!response.ok) return [];

    const result = await response.json();
    return (result.rooms || []).map((room: any) => normalizeRemoteRoom(room));
  } catch {
    return [];
  }
};

export const loadRoomMessages = async (roomId: string): Promise<ChatMessage[]> => {
  if (!(await ensureRemoteChatAvailable())) return [];

  try {
    const response = await fetch(getSupabaseFunctionUrl(`chat/messages/${roomId}`));
    if (!response.ok) return [];

    const result = await response.json();
    return (result.messages || []).map((message: any) =>
      normalizeRemoteMessage(roomId, message),
    );
  } catch {
    return [];
  }
};

export const createChatRoom = async ({
  currentUser,
  name,
  type,
  participants,
  description,
}: CreateRoomInput): Promise<ChatRoom | null> => {
  if (!(await ensureRemoteChatAvailable())) return null;

  const payload = {
    name,
    type,
    participants: [currentUser.id, ...participants],
    createdBy: currentUser.id,
    description,
  };

  try {
    const response = await fetch(getSupabaseFunctionUrl('chat/rooms'), {
      method: 'POST',
      headers: getRemoteHeaders(undefined, true),
      body: JSON.stringify(payload),
    });

    if (!response.ok) return null;

    const result = await response.json();
    return result.room ? normalizeRemoteRoom(result.room) : null;
  } catch {
    return null;
  }
};

export const sendChatMessage = async ({
  roomId,
  currentUser,
  content,
  type = 'text',
  fileUrl,
  thumbnailUrl,
  fileName,
  fileSize,
  mimeType,
  duration,
}: SendMessageInput): Promise<ChatMessage | null> => {
  if (!(await ensureRemoteChatAvailable())) return null;

  const trimmedContent = content.trim();
  if (!trimmedContent && !fileUrl) return null;

  const payload = {
    roomId,
    senderId: currentUser.id,
    senderName: currentUser.name,
    senderAvatar: currentUser.avatar,
    content: trimmedContent,
    type,
    fileUrl,
    thumbnailUrl,
    fileName,
    fileSize,
    mimeType,
    duration,
  };

  try {
    const response = await fetch(getSupabaseFunctionUrl('chat/messages'), {
      method: 'POST',
      headers: getRemoteHeaders(undefined, true),
      body: JSON.stringify(payload),
    });

    if (!response.ok) return null;

    const result = await response.json();
    return result.message ? normalizeRemoteMessage(roomId, result.message) : null;
  } catch {
    return null;
  }
};

export const markRoomRead = async (roomId: string, userId: string): Promise<void> => {
  if (!(await ensureRemoteChatAvailable())) return;

  try {
    await fetch(getSupabaseFunctionUrl(`chat/rooms/${roomId}/read/${userId}`), {
      method: 'PUT',
      headers: getRemoteHeaders(undefined, true),
    });
  } catch {
    // Keep read marking best-effort.
  }
};

export const loadAdminRooms = async (currentUser: User): Promise<ChatRoom[]> => {
  if (!(await ensureRemoteChatAvailable())) return [];

  try {
    const response = await fetch(getSupabaseFunctionUrl('admin/chat/rooms'), {
      headers: getRemoteHeaders(currentUser),
    });

    if (!response.ok) return [];

    const result = await response.json();
    return (result.rooms || []).map((room: any) => normalizeRemoteRoom(room));
  } catch {
    return [];
  }
};

export const loadAdminRoomMessages = async (
  currentUser: User,
  roomId: string,
): Promise<ChatMessage[]> => {
  if (!(await ensureRemoteChatAvailable())) return [];

  try {
    const response = await fetch(getSupabaseFunctionUrl(`admin/chat/messages/${roomId}`), {
      headers: getRemoteHeaders(currentUser),
    });

    if (!response.ok) return [];

    const result = await response.json();
    return (result.messages || []).map((message: any) =>
      normalizeRemoteMessage(roomId, message),
    );
  } catch {
    return [];
  }
};
