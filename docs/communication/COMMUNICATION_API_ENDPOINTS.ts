/**
 * COMMUNICATION SYSTEM - API ENDPOINT SPECIFICATIONS
 * 
 * This file documents all API endpoints for the Communication System (Feature #5).
 * Each endpoint includes request/response schemas, example payloads, and validation rules.
 * 
 * Status: Ready for backend implementation
 * Backend Framework: Express.js | FastAPI | Django
 * Database: Supabase PostgreSQL
 * Authentication: JWT Bearer Token
 * Rate Limiting: 100 requests/minute per user
 * API Version: v1
 */

// ============================================================================
// CONVERSATION ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/messages/conversations/:userId
 * 
 * Retrieve all conversations for a specific user (excluding archived)
 * 
 * @param userId - The user ID to fetch conversations for
 * @param limit - Number of conversations to fetch (default: 50, max: 100)
 * @param offset - Pagination offset (default: 0)
 * @param includeArchived - Include archived conversations (default: false)
 * 
 * @returns {Array<Conversation>} - Array of conversation objects
 * 
 * Example Request:
 * GET /api/v1/messages/conversations/user-123?limit=20&offset=0
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * 
 * Example Response (200 OK):
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "conv-001",
 *       "participants": ["user-123", "user-456"],
 *       "participant_names": ["John Doe", "Jane Smith"],
 *       "participant_avatars": ["https://...", "https://..."],
 *       "type": "direct",
 *       "name": "John Doe",
 *       "description": null,
 *       "avatar": "https://...",
 *       "last_message": {
 *         "id": "msg-789",
 *         "sender_id": "user-456",
 *         "sender_name": "Jane Smith",
 *         "content": "Thanks for the update!",
 *         "message_type": "text",
 *         "status": "read",
 *         "created_at": "2024-01-15T10:30:00Z"
 *       },
 *       "last_message_at": "2024-01-15T10:30:00Z",
 *       "unread_count": 0,
 *       "archived": false,
 *       "muted": false,
 *       "created_at": "2024-01-10T08:00:00Z",
 *       "updated_at": "2024-01-15T10:30:00Z"
 *     }
 *   ],
 *   "pagination": {
 *     "total": 25,
 *     "limit": 20,
 *     "offset": 0,
 *     "hasMore": true
 *   }
 * }
 * 
 * Possible Errors (400, 401, 403, 500)
 */

/**
 * POST /api/v1/messages/conversations/create
 * 
 * Create a new conversation (direct or group)
 * 
 * @body {Object} Conversation data
 * {
 *   "participants": ["user-123", "user-456"],  // Required: array of user IDs
 *   "type": "direct" | "group",                // Required: conversation type
 *   "name": "Project Planning",                // Optional: conversation name
 *   "description": "..."                      // Optional: description
 * }
 * 
 * @returns {Conversation} - Newly created conversation object
 * 
 * Validation Rules:
 * - participants: minimum 2, maximum 100 users
 * - type: must be "direct" (2 participants) or "group" (3+ participants)
 * - name: if provided, 1-255 characters
 * 
 * Example Request:
 * POST /api/v1/messages/conversations/create
 * Authorization: Bearer eyJ...
 * Content-Type: application/json
 * 
 * {
 *   "participants": ["user-123", "user-456"],
 *   "type": "direct"
 * }
 * 
 * Example Response (201 Created):
 * {
 *   "success": true,
 *   "data": {
 *     "id": "conv-002",
 *     "participants": ["user-123", "user-456"],
 *     "participant_names": ["John Doe", "Jane Smith"],
 *     "participant_avatars": ["https://...", "https://..."],
 *     "type": "direct",
 *     "name": "Jane Smith",
 *     "unread_count": 0,
 *     "archived": false,
 *     "muted": false,
 *     "created_at": "2024-01-15T11:00:00Z",
 *     "updated_at": "2024-01-15T11:00:00Z"
 *   },
 *   "message": "Conversation created successfully"
 * }
 */

/**
 * GET /api/v1/messages/conversations/:conversationId
 * 
 * Get a specific conversation by ID
 * 
 * @param conversationId - The conversation ID to retrieve
 * 
 * @returns {Conversation} - Conversation object with metadata
 * 
 * Example Request:
 * GET /api/v1/messages/conversations/conv-001
 * Authorization: Bearer eyJ...
 * 
 * Example Response (200 OK):
 * {
 *   "success": true,
 *   "data": {
 *     "id": "conv-001",
 *     "participants": ["user-123", "user-456"],
 *     "type": "direct",
 *     "name": "Jane Smith",
 *     "last_message_at": "2024-01-15T10:30:00Z",
 *     "unread_count": 0,
 *     "archived": false,
 *     "muted": false,
 *     "created_at": "2024-01-10T08:00:00Z",
 *     "updated_at": "2024-01-15T10:30:00Z"
 *   }
 * }
 */

/**
 * PUT /api/v1/messages/conversations/:conversationId
 * 
 * Update conversation metadata (name, description, avatar)
 * 
 * @param conversationId - The conversation to update
 * @body {Object} Update data
 * {
 *   "name": "New Name",          // Optional
 *   "description": "New desc",   // Optional
 *   "avatar": "new-avatar-url"   // Optional
 * }
 * 
 * @returns {Conversation} - Updated conversation object
 * 
 * Example Response (200 OK):
 * {
 *   "success": true,
 *   "data": {
 *     "id": "conv-001",
 *     "name": "New Name",
 *     "description": "New desc",
 *     "avatar": "new-avatar-url",
 *     "updated_at": "2024-01-15T12:00:00Z"
 *   },
 *   "message": "Conversation updated successfully"
 * }
 */

/**
 * POST /api/v1/messages/conversations/:conversationId/archive
 * 
 * Archive a conversation (soft delete)
 * 
 * Example Request:
 * POST /api/v1/messages/conversations/conv-001/archive
 * Authorization: Bearer eyJ...
 * 
 * Example Response (200 OK):
 * {
 *   "success": true,
 *   "message": "Conversation archived successfully",
 *   "data": {
 *     "id": "conv-001",
 *     "archived": true,
 *     "updated_at": "2024-01-15T12:30:00Z"
 *   }
 * }
 */

/**
 * POST /api/v1/messages/conversations/:conversationId/unarchive
 * 
 * Unarchive a conversation
 * 
 * Example Request:
 * POST /api/v1/messages/conversations/conv-001/unarchive
 * 
 * Example Response (200 OK):
 * {
 *   "success": true,
 *   "data": {
 *     "id": "conv-001",
 *     "archived": false,
 *     "updated_at": "2024-01-15T12:35:00Z"
 *   }
 * }
 */

/**
 * POST /api/v1/messages/conversations/:conversationId/mute
 * 
 * Mute or unmute conversation notifications
 * 
 * @body {Object}
 * {
 *   "muted": true | false  // Required
 * }
 * 
 * Example Response (200 OK):
 * {
 *   "success": true,
 *   "data": {
 *     "id": "conv-001",
 *     "muted": true,
 *     "updated_at": "2024-01-15T12:40:00Z"
 *   },
 *   "message": "Conversation notifications muted"
 * }
 */

// ============================================================================
// MESSAGE ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/messages/conversation/:conversationId/messages
 * 
 * Get all messages in a conversation with pagination
 * 
 * @param conversationId - The conversation to fetch messages from
 * @query limit - Number of messages to fetch (default: 30, max: 100)
 * @query offset - Pagination offset (default: 0)
 * @query order - Sort order: 'asc' | 'desc' (default: 'desc' - newest first)
 * 
 * @returns {Array<Message>} - Array of message objects
 * 
 * Example Request:
 * GET /api/v1/messages/conversation/conv-001/messages?limit=20&offset=0
 * Authorization: Bearer eyJ...
 * 
 * Example Response (200 OK):
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "msg-789",
 *       "conversation_id": "conv-001",
 *       "sender_id": "user-456",
 *       "sender_name": "Jane Smith",
 *       "sender_avatar": "https://...",
 *       "content": "Thanks for the update!",
 *       "message_type": "text",
 *       "file_url": null,
 *       "status": "read",
 *       "is_edited": false,
 *       "edited_at": null,
 *       "created_at": "2024-01-15T10:30:00Z",
 *       "read_by": ["user-123"]
 *     },
 *     {
 *       "id": "msg-788",
 *       "conversation_id": "conv-001",
 *       "sender_id": "user-123",
 *       "sender_name": "John Doe",
 *       "content": "I've updated the document.",
 *       "message_type": "text",
 *       "status": "read",
 *       "created_at": "2024-01-15T10:25:00Z",
 *       "read_by": ["user-456"]
 *     }
 *   ],
 *   "pagination": {
 *     "total": 150,
 *     "limit": 20,
 *     "offset": 0,
 *     "hasMore": true
 *   }
 * }
 */

/**
 * POST /api/v1/messages/send
 * 
 * Send a new message to a conversation
 * 
 * @body {Object} Message data
 * {
 *   "conversation_id": "conv-001",              // Required
 *   "sender_id": "user-123",                    // Required
 *   "content": "Hello!",                        // Required
 *   "message_type": "text" | "image" | ...,    // Required: message type
 *   "file_url": null,                           // Optional: URL if file upload
 *   "file_name": null,                          // Optional: filename
 *   "file_size": null                           // Optional: file size in bytes
 * }
 * 
 * @returns {Message} - Newly created message object
 * 
 * Validation Rules:
 * - conversation_id: must exist and user must be participant
 * - content: required, max 10,000 characters
 * - message_type: must be valid type
 * - For file messages: file_url required
 * 
 * Example Request:
 * POST /api/v1/messages/send
 * Authorization: Bearer eyJ...
 * Content-Type: application/json
 * 
 * {
 *   "conversation_id": "conv-001",
 *   "sender_id": "user-123",
 *   "content": "Hello! How are you?",
 *   "message_type": "text"
 * }
 * 
 * Example Response (201 Created):
 * {
 *   "success": true,
 *   "data": {
 *     "id": "msg-790",
 *     "conversation_id": "conv-001",
 *     "sender_id": "user-123",
 *     "sender_name": "John Doe",
 *     "content": "Hello! How are you?",
 *     "message_type": "text",
 *     "status": "sent",
 *     "created_at": "2024-01-15T13:00:00Z",
 *     "is_edited": false
 *   }
 * }
 * 
 * Error (403 Forbidden):
 * {
 *   "success": false,
 *   "error": "User is not a participant in this conversation"
 * }
 */

/**
 * GET /api/v1/messages/:messageId
 * 
 * Get a specific message by ID
 * 
 * @param messageId - The message ID to retrieve
 * 
 * @returns {Message} - Message object with full details
 * 
 * Example Response (200 OK):
 * {
 *   "success": true,
 *   "data": {
 *     "id": "msg-789",
 *     "conversation_id": "conv-001",
 *     "sender_id": "user-456",
 *     "sender_name": "Jane Smith",
 *     "content": "Thanks for the update!",
 *     "message_type": "text",
 *     "status": "read",
 *     "is_edited": false,
 *     "created_at": "2024-01-15T10:30:00Z",
 *     "read_by": ["user-123", "user-789"]
 *   }
 * }
 */

/**
 * PUT /api/v1/messages/:messageId/edit
 * 
 * Edit an existing message (sender only)
 * 
 * @param messageId - The message to edit
 * @body {Object}
 * {
 *   "content": "Updated message content"  // Required
 * }
 * 
 * @returns {Message} - Updated message object with is_edited = true and edited_at timestamp
 * 
 * Validation Rules:
 * - Only message sender can edit
 * - Cannot edit deleted messages
 * - New content: max 10,000 characters
 * 
 * Example Request:
 * PUT /api/v1/messages/msg-789/edit
 * Authorization: Bearer eyJ...
 * 
 * {
 *   "content": "Thanks for the update! (edited)"
 * }
 * 
 * Example Response (200 OK):
 * {
 *   "success": true,
 *   "data": {
 *     "id": "msg-789",
 *     "content": "Thanks for the update! (edited)",
 *     "is_edited": true,
 *     "edited_at": "2024-01-15T10:35:00Z",
 *     "status": "read"
 *   },
 *   "message": "Message updated successfully"
 * }
 * 
 * Error (403 Forbidden):
 * {
 *   "success": false,
 *   "error": "Only the message sender can edit this message"
 * }
 */

/**
 * DELETE /api/v1/messages/:messageId
 * 
 * Delete a message (sender only)
 * 
 * @param messageId - The message to delete
 * @param hardDelete - Query param: true for permanent deletion, false for soft delete (default: false)
 * 
 * Soft Delete: Message marked as deleted, content replaced with "[deleted]"
 * Hard Delete: Message completely removed from database
 * 
 * Example Request:
 * DELETE /api/v1/messages/msg-789?hardDelete=false
 * Authorization: Bearer eyJ...
 * 
 * Example Response (200 OK):
 * {
 *   "success": true,
 *   "message": "Message deleted successfully",
 *   "data": {
 *     "id": "msg-789",
 *     "deleted_at": "2024-01-15T10:40:00Z"
 *   }
 * }
 * 
 * Error (403 Forbidden):
 * {
 *   "success": false,
 *   "error": "Only the message sender can delete this message"
 * }
 * 
 * Error (404 Not Found):
 * {
 *   "success": false,
 *   "error": "Message not found"
 * }
 */

/**
 * POST /api/v1/messages/:messageId/read
 * 
 * Mark a message as read by user
 * 
 * @param messageId - The message to mark as read
 * @body {Object}
 * {
 *   "user_id": "user-123"  // Required: user marking as read
 * }
 * 
 * @returns {ReadReceipt} - Read receipt object
 * 
 * Example Response (200 OK):
 * {
 *   "success": true,
 *   "data": {
 *     "id": "receipt-001",
 *     "message_id": "msg-789",
 *     "user_id": "user-123",
 *     "read_at": "2024-01-15T10:45:00Z"
 *   },
 *   "message": "Message marked as read"
 * }
 */

/**
 * POST /api/v1/messages/conversation/:conversationId/read-all
 * 
 * Mark all unread messages in conversation as read
 * 
 * @param conversationId - The conversation to mark all as read
 * @body {Object}
 * {
 *   "user_id": "user-123"  // Required
 * }
 * 
 * Example Response (200 OK):
 * {
 *   "success": true,
 *   "data": {
 *     "message_count": 15,
 *     "read_at": "2024-01-15T10:50:00Z"
 *   },
 *   "message": "All messages marked as read"
 * }
 */

/**
 * GET /api/v1/messages/search
 * 
 * Search messages by full-text query
 * 
 * @query conversationId - The conversation to search in (optional, if omitted searches all)
 * @query q - Search query string (required, min 2 characters, max 200)
 * @query limit - Results per page (default: 20, max: 100)
 * @query offset - Pagination offset (default: 0)
 * 
 * @returns {Array<Message>} - Array of matching messages with conversation context
 * 
 * Example Request:
 * GET /api/v1/messages/search?conversationId=conv-001&q=update&limit=10
 * Authorization: Bearer eyJ...
 * 
 * Example Response (200 OK):
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "msg-788",
 *       "conversation_id": "conv-001",
 *       "conversation_name": "Jane Smith",
 *       "sender_id": "user-123",
 *       "sender_name": "John Doe",
 *       "content": "I've updated the document.",
 *       "message_type": "text",
 *       "created_at": "2024-01-15T10:25:00Z"
 *     }
 *   ],
 *   "pagination": {
 *     "total": 5,
 *     "limit": 10,
 *     "offset": 0,
 *     "hasMore": false
 *   },
 *   "query": "update"
 * }
 *
 * Error (400 Bad Request):
 * {
 *   "success": false,
 *   "error": "Search query must be between 2 and 200 characters"
 * }
 */

// ============================================================================
// NOTIFICATION ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/notifications/:userId
 * 
 * Get unread notifications for a user
 * 
 * @param userId - The user to fetch notifications for
 * @query limit - Number of notifications (default: 20, max: 100)
 * @query offset - Pagination offset (default: 0)
 * @query type - Filter by type: 'message' | 'mention' | 'reaction' | 'whatsapp' (optional)
 * 
 * @returns {Array<Notification>} - Array of unread notifications
 * 
 * Example Request:
 * GET /api/v1/notifications/user-123?limit=10
 * Authorization: Bearer eyJ...
 * 
 * Example Response (200 OK):
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "notif-001",
 *       "user_id": "user-123",
 *       "type": "message",
 *       "title": "New message from Jane Smith",
 *       "description": "Thanks for the update!",
 *       "data": {
 *         "conversation_id": "conv-001",
 *         "message_id": "msg-789",
 *         "sender_id": "user-456"
 *       },
 *       "read": false,
 *       "created_at": "2024-01-15T10:30:00Z"
 *     }
 *   ],
 *   "pagination": {
 *     "total": 8,
 *     "unread": 3
 *   }
 * }
 */

/**
 * POST /api/v1/notifications/:notificationId/read
 * 
 * Mark a notification as read
 * 
 * @param notificationId - The notification to mark as read
 * 
 * Example Response (200 OK):
 * {
 *   "success": true,
 *   "data": {
 *     "id": "notif-001",
 *     "read": true,
 *     "read_at": "2024-01-15T10:55:00Z"
 *   }
 * }
 */

/**
 * POST /api/v1/notifications/:userId/read-all
 * 
 * Mark all notifications as read for a user
 * 
 * @param userId - The user to mark all notifications as read for
 * 
 * Example Response (200 OK):
 * {
 *   "success": true,
 *   "data": {
 *     "notification_count": 8,
 *     "read_at": "2024-01-15T11:00:00Z"
 *   },
 *   "message": "All notifications marked as read"
 * }
 */

/**
 * DELETE /api/v1/notifications/:notificationId
 * 
 * Delete a notification
 * 
 * Example Response (200 OK):
 * {
 *   "success": true,
 *   "message": "Notification deleted successfully"
 * }
 */

// ============================================================================
// TYPING INDICATORS & REAL-TIME ENDPOINTS
// ============================================================================

/**
 * WebSocket Connection
 * 
 * URL: wss://api.propertyhub.com/ws/conversations/:conversationId
 * Authentication: Bearer token in query or headers
 * 
 * Events:
 * - message:new - New message received
 * - message:edit - Message edited
 * - message:delete - Message deleted
 * - message:read - Message marked as read
 * - user:typing - User is typing
 * - user:online - User came online
 * - user:offline - User went offline
 * - conversation:update - Conversation metadata changed
 * 
 * Send typing indicator:
 * {
 *   "type": "user:typing",
 *   "user_id": "user-123",
 *   "user_name": "John Doe"
 * }
 * 
 * Receive message event:
 * {
 *   "type": "message:new",
 *   "data": {
 *     "id": "msg-790",
 *     "sender_id": "user-456",
 *     "content": "Hello!",
 *     "created_at": "2024-01-15T13:00:00Z"
 *   }
 * }
 */

/**
 * POST /api/v1/messages/typing
 * 
 * Broadcast typing indicator (REST alternative to WebSocket)
 * 
 * @body {Object}
 * {
 *   "conversation_id": "conv-001",  // Required
 *   "user_id": "user-123",          // Required
 *   "user_name": "John Doe"         // Required
 * }
 * 
 * Example Response (200 OK):
 * {
 *   "success": true,
 *   "message": "Typing indicator broadcast"
 * }
 */

// ============================================================================
// WHATSAPP INTEGRATION ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/whatsapp/send
 * 
 * Send a message via WhatsApp
 * 
 * @body {Object}
 * {
 *   "user_id": "user-123",                    // Required: user ID
 *   "phone_number": "+233123456789",          // Required: recipient WhatsApp number
 *   "message": "Your booking is confirmed",   // Required: message content
 *   "template": "booking_confirmation"        // Optional: WhatsApp template name
 * }
 * 
 * @returns {WhatsAppMessage} - WhatsApp message object
 * 
 * Validation Rules:
 * - phone_number: must be valid international format
 * - message: max 1000 characters (or template rules)
 * - User must have WhatsApp enabled
 * 
 * Example Request:
 * POST /api/v1/whatsapp/send
 * Authorization: Bearer eyJ...
 * 
 * {
 *   "user_id": "user-123",
 *   "phone_number": "+233123456789",
 *   "message": "Your booking is confirmed!"
 * }
 * 
 * Example Response (201 Created):
 * {
 *   "success": true,
 *   "data": {
 *     "id": "whatsapp-001",
 *     "user_id": "user-123",
 *     "phone_number": "+233123456789",
 *     "message": "Your booking is confirmed!",
 *     "direction": "outbound",
 *     "status": "sent",
 *     "external_id": "wamid.xxx",
 *     "created_at": "2024-01-15T13:05:00Z"
 *   }
 * }
 * 
 * Error (400 Bad Request):
 * {
 *   "success": false,
 *   "error": "Invalid phone number format"
 * }
 */

/**
 * GET /api/v1/whatsapp/messages/:userId
 * 
 * Get WhatsApp message history for a user
 * 
 * @param userId - The user to fetch WhatsApp messages for
 * @query limit - Number of messages (default: 50, max: 200)
 * @query offset - Pagination offset (default: 0)
 * @query direction - Filter: 'inbound' | 'outbound' (optional)
 * 
 * @returns {Array<WhatsAppMessage>} - Array of WhatsApp messages
 * 
 * Example Request:
 * GET /api/v1/whatsapp/messages/user-123?limit=20
 * Authorization: Bearer eyJ...
 * 
 * Example Response (200 OK):
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "whatsapp-001",
 *       "user_id": "user-123",
 *       "phone_number": "+233123456789",
 *       "message": "Your booking is confirmed!",
 *       "direction": "outbound",
 *       "status": "delivered",
 *       "external_id": "wamid.xxx",
 *       "created_at": "2024-01-15T13:05:00Z"
 *     },
 *     {
 *       "id": "whatsapp-002",
 *       "user_id": "user-123",
 *       "phone_number": "+233123456789",
 *       "message": "Thanks! See you soon.",
 *       "direction": "inbound",
 *       "status": "delivered",
 *       "created_at": "2024-01-15T13:10:00Z"
 *     }
 *   ],
 *   "pagination": {
 *     "total": 25,
 *     "limit": 20,
 *     "offset": 0,
 *     "hasMore": true
 *   }
 * }
 */

/**
 * POST /api/v1/whatsapp/webhook
 * 
 * Webhook for receiving WhatsApp messages (Twillio/MessageBird callback)
 * 
 * @body {Object} Webhook payload from WhatsApp provider
 * {
 *   "messages": [{
 *     "from": "+233123456789",
 *     "id": "wamid.xxx",
 *     "timestamp": "1234567890",
 *     "text": { "body": "Thanks! See you soon." },
 *     "type": "text"
 *   }],
 *   "contacts": [{
 *     "profile": { "name": "Jane Smith" },
 *     "wa_id": "233123456789"
 *   }]
 * }
 * 
 * Processing:
 * 1. Validate webhook signature
 * 2. Find user by phone number
 * 3. Create WhatsAppMessage record
 * 4. Create Notification for user
 * 5. Link to conversation if applicable
 * 
 * Example Response (200 OK):
 * {
 *   "success": true,
 *   "message": "Webhook processed"
 * }
 */

// ============================================================================
// COMMON ERROR RESPONSES
// ============================================================================

/**
 * Error Response Format:
 * 
 * 400 Bad Request:
 * {
 *   "success": false,
 *   "error": "Validation error message",
 *   "details": { "field": "error message" }
 * }
 * 
 * 401 Unauthorized:
 * {
 *   "success": false,
 *   "error": "Missing or invalid authorization token"
 * }
 * 
 * 403 Forbidden:
 * {
 *   "success": false,
 *   "error": "You do not have permission to access this resource"
 * }
 * 
 * 404 Not Found:
 * {
 *   "success": false,
 *   "error": "Resource not found"
 * }
 * 
 * 429 Too Many Requests:
 * {
 *   "success": false,
 *   "error": "Rate limit exceeded",
 *   "retryAfter": 60
 * }
 * 
 * 500 Internal Server Error:
 * {
 *   "success": false,
 *   "error": "Internal server error",
 *   "requestId": "req-abc123"
 * }
 */

// ============================================================================
// IMPLEMENTATION NOTES
// ============================================================================

/**
 * Authentication:
 * - All endpoints require JWT token in Authorization header
 * - Token format: Bearer <jwt_token>
 * - Token expiration: 24 hours
 * - Refresh tokens: /api/v1/auth/refresh
 * 
 * Pagination:
 * - All list endpoints support limit/offset pagination
 * - Default limit: 20-30 items
 * - Maximum limit: 100 items
 * - Include hasMore or total in pagination object
 * 
 * Rate Limiting:
 * - Global: 1000 requests/hour per IP
 * - Per-user: 100 requests/minute per authenticated user
 * - Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
 * 
 * Real-Time Updates:
 * - Implement WebSocket for real-time message delivery
 * - Alternatively: Server-Sent Events (SSE)
 * - Fallback: Short polling with timestamps
 * 
 * File Uploads:
 * - Use multipart/form-data for file uploads
 * - Max file size: 50MB per file
 * - Supported types: jpg, png, pdf, doc, xls, zip, etc.
 * - Files stored in Supabase Storage or AWS S3
 * 
 * Background Jobs:
 * - Bulk operations use background jobs
 * - Return job_id immediately, status at /api/v1/jobs/:jobId
 * - Webhooks fire when job completes
 * 
 * Caching:
 * - Use ETags for GET requests
 * - Cache conversation list (5 min TTL)
 * - Cache message history (10 min TTL)
 * - Invalidate on new messages
 * 
 * Database Queries:
 * - Use connection pooling
 * - Implement query timeouts (30 seconds)
 * - Add database indexes on foreign keys
 * - Denormalize frequently accessed data
 * 
 * Testing:
 * - Unit tests for all services
 * - Integration tests for API endpoints
 * - Load testing: 1000 concurrent connections
 * - Test real-time message delivery
 * - Test webhook handling
 */

export const COMMUNICATION_API_ENDPOINTS = {
  version: '1.0.0',
  status: 'pending_implementation',
  total_endpoints: 25,
  endpoints: {
    conversations: 8,
    messages: 9,
    notifications: 4,
    typing: 1,
    whatsapp: 3,
  },
  authentication: 'JWT Bearer Token',
  base_url: 'https://api.propertyhub.com/api/v1',
  websocket_url: 'wss://api.propertyhub.com/ws',
};
