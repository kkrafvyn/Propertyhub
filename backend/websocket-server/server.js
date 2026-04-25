/**
 * PropertyHub Production WebSocket Server
 * 
 * A production-ready WebSocket server for real-time chat functionality
 * Built with Node.js, Express, Socket.io, and Redis for scalability
 * 
 * Features:
 * - Real-time messaging with Socket.io
 * - User authentication and authorization
 * - Rate limiting and spam protection
 * - Message persistence with MongoDB/PostgreSQL
 * - File upload handling with AWS S3/CloudFlare R2
 * - Push notification integration
 * - Voice message processing
 * - End-to-end encryption support
 * - Room-based messaging (property inquiries, group chats)
 * - Typing indicators and presence
 * - Message delivery receipts
 * - Horizontal scaling with Redis adapter
 */

const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const AWS = require('aws-sdk');
const Redis = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const winston = require('winston');
const compression = require('compression');
const { body, validationResult } = require('express-validator');

// Database connections (choose one based on your preference)
const mongoose = require('mongoose'); // MongoDB
// const { Pool } = require('pg'); // PostgreSQL

// Environment configuration
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Logging configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Redis configuration for session storage and Socket.io adapter
const redisClient = Redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD
});

const pubClient = redisClient.duplicate();
const subClient = redisClient.duplicate();

// Socket.io configuration with Redis adapter for horizontal scaling
const io = socketio(server, {
  cors: {
    origin: process.env.CLIENT_URLS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  adapter: createAdapter(pubClient, subClient)
});

// AWS S3 configuration for file storage
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Database configuration
const DB_CONNECTION = process.env.DATABASE_URL || 'mongodb://localhost:27017/propertyhub-chat';

// MongoDB Schema definitions
const messageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  roomId: { type: String, required: true, index: true },
  senderId: { type: String, required: true, index: true },
  senderName: { type: String, required: true },
  content: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['text', 'image', 'file', 'voice', 'system'], 
    default: 'text' 
  },
  encrypted: { type: Boolean, default: false },
  encryptionKeyId: { type: String },
  metadata: {
    fileName: String,
    fileSize: Number,
    mimeType: String,
    duration: Number, // for voice messages
    thumbnailUrl: String,
    fileUrl: String,
    voiceUrl: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  timestamp: { type: Date, default: Date.now, index: true },
  status: { 
    type: String, 
    enum: ['sending', 'sent', 'delivered', 'read'], 
    default: 'sent' 
  },
  deliveredTo: [{ userId: String, timestamp: Date }],
  readBy: [{ userId: String, timestamp: Date }],
  replyTo: { type: String }, // Message ID being replied to
  edited: { type: Boolean, default: false },
  editedAt: Date,
  deleted: { type: Boolean, default: false },
  deletedAt: Date
}, {
  timestamps: true
});

const roomSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['direct', 'group', 'property_inquiry', 'support'], 
    required: true 
  },
  participants: [{ 
    userId: { type: String, required: true },
    role: { type: String, enum: ['member', 'admin', 'owner'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    permissions: {
      canSendMessages: { type: Boolean, default: true },
      canUploadFiles: { type: Boolean, default: true },
      canAddMembers: { type: Boolean, default: false }
    }
  }],
  propertyId: String, // For property inquiry rooms
  lastMessage: {
    content: String,
    timestamp: Date,
    senderId: String
  },
  settings: {
    isEncrypted: { type: Boolean, default: false },
    allowFileSharing: { type: Boolean, default: true },
    allowVoiceMessages: { type: Boolean, default: true },
    maxFileSize: { type: Number, default: 50 * 1024 * 1024 }, // 50MB
    autoDeleteMessages: { type: Boolean, default: false },
    autoDeleteDays: { type: Number, default: 30 }
  },
  createdBy: { type: String, required: true },
  archived: { type: Boolean, default: false }
}, {
  timestamps: true
});

const userPresenceSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  status: { 
    type: String, 
    enum: ['online', 'offline', 'away', 'busy'], 
    default: 'offline' 
  },
  lastSeen: { type: Date, default: Date.now },
  socketId: String,
  currentRooms: [String],
  deviceInfo: {
    platform: String,
    browser: String,
    version: String
  }
}, {
  timestamps: true
});

// Models
const Message = mongoose.model('Message', messageSchema);
const Room = mongoose.model('Room', roomSchema);
const UserPresence = mongoose.model('UserPresence', userPresenceSchema);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"]
    }
  }
}));

app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URLS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 messages per minute
  message: 'Too many messages sent, please slow down.'
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 uploads per 15 minutes
  message: 'Too many file uploads, please try again later.'
});

app.use('/api/', generalLimiter);

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Allow images, documents, and audio files
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Socket.io authentication middleware
const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication token required'));
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return next(new Error('Invalid authentication token'));
    }
    socket.user = user;
    next();
  });
};

// Database connection
mongoose.connect(DB_CONNECTION, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  logger.info('Connected to MongoDB');
}).catch(err => {
  logger.error('MongoDB connection error:', err);
});

// Helper functions
const generateMessageId = () => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateRoomId = () => {
  return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// File processing functions
const processImage = async (buffer, mimetype) => {
  try {
    // Create thumbnail
    const thumbnail = await sharp(buffer)
      .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Compress original image
    const compressed = await sharp(buffer)
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    return { compressed, thumbnail };
  } catch (error) {
    logger.error('Image processing error:', error);
    throw error;
  }
};

const processVoiceMessage = async (buffer, mimetype) => {
  return new Promise((resolve, reject) => {
    try {
      // Convert to MP3 for better compression and compatibility
      const outputBuffer = [];
      
      ffmpeg()
        .input(buffer)
        .audioCodec('libmp3lame')
        .audioBitrate('32k') // Low bitrate for voice messages
        .format('mp3')
        .on('error', reject)
        .on('end', () => {
          resolve(Buffer.concat(outputBuffer));
        })
        .pipe()
        .on('data', chunk => outputBuffer.push(chunk));
    } catch (error) {
      reject(error);
    }
  });
};

// S3 upload function
const uploadToS3 = async (buffer, key, contentType) => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME || 'propertyhub-chat-files',
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'private'
  };

  try {
    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (error) {
    logger.error('S3 upload error:', error);
    throw error;
  }
};

// Generate signed URL for private file access
const generateSignedUrl = async (key, expiresIn = 3600) => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME || 'propertyhub-chat-files',
    Key: key,
    Expires: expiresIn
  };

  try {
    return await s3.getSignedUrlPromise('getObject', params);
  } catch (error) {
    logger.error('Signed URL generation error:', error);
    throw error;
  }
};

// Push notification function
const sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    // Implementation depends on your push notification service
    // Example for Web Push API or Firebase Cloud Messaging
    
    // Store notification for when user comes online
    await redisClient.setex(
      `notification:${userId}:${Date.now()}`,
      3600, // 1 hour expiry
      JSON.stringify({ title, body, data, timestamp: Date.now() })
    );

    logger.info(`Push notification queued for user ${userId}: ${title}`);
  } catch (error) {
    logger.error('Push notification error:', error);
  }
};

// REST API Endpoints

// Get chat rooms for a user
app.get('/api/rooms/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const rooms = await Room.find({
      'participants.userId': userId,
      archived: false
    }).sort({ updatedAt: -1 });

    // Calculate unread count for each room
    const roomsWithUnreadCount = await Promise.all(
      rooms.map(async (room) => {
        const lastReadMessage = await redisClient.get(`lastRead:${userId}:${room.id}`);
        
        let unreadCount = 0;
        if (lastReadMessage) {
          unreadCount = await Message.countDocuments({
            roomId: room.id,
            timestamp: { $gt: new Date(lastReadMessage) },
            senderId: { $ne: userId }
          });
        } else {
          unreadCount = await Message.countDocuments({
            roomId: room.id,
            senderId: { $ne: userId }
          });
        }

        return {
          ...room.toObject(),
          unreadCount
        };
      })
    );

    res.json({ success: true, rooms: roomsWithUnreadCount });
  } catch (error) {
    logger.error('Get rooms error:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Get messages for a room
app.get('/api/messages/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, before } = req.query;
    
    // Check if user has access to this room
    const room = await Room.findOne({
      id: roomId,
      'participants.userId': req.user.id
    });

    if (!room) {
      return res.status(403).json({ error: 'Access denied to this room' });
    }

    const query = {
      roomId,
      deleted: false
    };

    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    // Generate signed URLs for file messages
    const messagesWithUrls = await Promise.all(
      messages.map(async (message) => {
        const messageObj = message.toObject();
        
        if (message.type !== 'text' && message.metadata?.fileUrl) {
          try {
            const key = message.metadata.fileUrl.split('/').pop();
            messageObj.metadata.signedUrl = await generateSignedUrl(key);
          } catch (error) {
            logger.error('Error generating signed URL:', error);
          }
        }

        return messageObj;
      })
    );

    res.json({ success: true, messages: messagesWithUrls.reverse() });
  } catch (error) {
    logger.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a text message
app.post('/api/messages', authenticateToken, messageLimiter, [
  body('roomId').notEmpty().withMessage('Room ID is required'),
  body('content').notEmpty().trim().withMessage('Message content is required'),
  body('type').optional().isIn(['text', 'system']).withMessage('Invalid message type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { roomId, content, type = 'text', replyTo, encrypted = false } = req.body;

    // Check if user has access to this room
    const room = await Room.findOne({
      id: roomId,
      'participants.userId': req.user.id
    });

    if (!room) {
      return res.status(403).json({ error: 'Access denied to this room' });
    }

    // Check user permissions
    const participant = room.participants.find(p => p.userId === req.user.id);
    if (!participant.permissions.canSendMessages) {
      return res.status(403).json({ error: 'You do not have permission to send messages in this room' });
    }

    const messageId = generateMessageId();
    const message = new Message({
      id: messageId,
      roomId,
      senderId: req.user.id,
      senderName: req.user.name || 'Unknown User',
      content,
      type,
      replyTo,
      encrypted,
      timestamp: new Date()
    });

    await message.save();

    // Update room's last message
    await Room.updateOne(
      { id: roomId },
      {
        $set: {
          'lastMessage.content': content,
          'lastMessage.timestamp': new Date(),
          'lastMessage.senderId': req.user.id
        }
      }
    );

    // Emit message to room participants
    io.to(roomId).emit('message_received', {
      ...message.toObject(),
      timestamp: message.timestamp.toISOString()
    });

    // Send push notifications to offline users
    const offlineParticipants = room.participants.filter(p => p.userId !== req.user.id);
    for (const participant of offlineParticipants) {
      const presence = await UserPresence.findOne({ userId: participant.userId });
      if (!presence || presence.status === 'offline') {
        await sendPushNotification(
          participant.userId,
          `New message from ${req.user.name}`,
          content.length > 50 ? content.substring(0, 47) + '...' : content,
          { roomId, messageId, type: 'chat_message' }
        );
      }
    }

    res.json({ success: true, message: message.toObject() });
  } catch (error) {
    logger.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// File upload endpoint
app.post('/api/upload', authenticateToken, uploadLimiter, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { roomId, messageContent = '' } = req.body;

    // Check if user has access to this room
    const room = await Room.findOne({
      id: roomId,
      'participants.userId': req.user.id
    });

    if (!room) {
      return res.status(403).json({ error: 'Access denied to this room' });
    }

    // Check file upload permissions
    const participant = room.participants.find(p => p.userId === req.user.id);
    if (!participant.permissions.canUploadFiles) {
      return res.status(403).json({ error: 'You do not have permission to upload files in this room' });
    }

    const file = req.file;
    const fileExtension = file.originalname.split('.').pop();
    const timestamp = Date.now();
    const baseKey = `${roomId}/${timestamp}_${req.user.id}`;

    let messageType = 'file';
    let fileUrl, thumbnailUrl;
    const metadata = {
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype
    };

    if (file.mimetype.startsWith('image/')) {
      messageType = 'image';
      
      // Process image
      const { compressed, thumbnail } = await processImage(file.buffer, file.mimetype);
      
      // Upload compressed image and thumbnail
      fileUrl = await uploadToS3(compressed, `${baseKey}.jpg`, 'image/jpeg');
      thumbnailUrl = await uploadToS3(thumbnail, `${baseKey}_thumb.jpg`, 'image/jpeg');
      
      metadata.thumbnailUrl = thumbnailUrl;
    } else if (file.mimetype.startsWith('audio/')) {
      messageType = 'voice';
      
      // Process voice message
      const processedAudio = await processVoiceMessage(file.buffer, file.mimetype);
      
      // Upload processed audio
      fileUrl = await uploadToS3(processedAudio, `${baseKey}.mp3`, 'audio/mpeg');
      
      // You might want to add duration detection here
    } else {
      // Regular file upload
      fileUrl = await uploadToS3(file.buffer, `${baseKey}.${fileExtension}`, file.mimetype);
    }

    metadata.fileUrl = fileUrl;

    // Create message
    const messageId = generateMessageId();
    const message = new Message({
      id: messageId,
      roomId,
      senderId: req.user.id,
      senderName: req.user.name || 'Unknown User',
      content: messageContent || `Shared ${messageType === 'image' ? 'an image' : messageType === 'voice' ? 'a voice message' : 'a file'}`,
      type: messageType,
      metadata,
      timestamp: new Date()
    });

    await message.save();

    // Update room's last message
    await Room.updateOne(
      { id: roomId },
      {
        $set: {
          'lastMessage.content': message.content,
          'lastMessage.timestamp': new Date(),
          'lastMessage.senderId': req.user.id
        }
      }
    );

    // Generate signed URL for immediate access
    const signedFileUrl = await generateSignedUrl(fileUrl.split('/').pop());
    const responseMessage = {
      ...message.toObject(),
      metadata: {
        ...metadata,
        signedUrl: signedFileUrl
      }
    };

    // Emit message to room participants
    io.to(roomId).emit('message_received', responseMessage);

    // Send push notifications
    const offlineParticipants = room.participants.filter(p => p.userId !== req.user.id);
    for (const participant of offlineParticipants) {
      const presence = await UserPresence.findOne({ userId: participant.userId });
      if (!presence || presence.status === 'offline') {
        await sendPushNotification(
          participant.userId,
          `New ${messageType} from ${req.user.name}`,
          message.content,
          { roomId, messageId, type: 'chat_file' }
        );
      }
    }

    res.json({ success: true, message: responseMessage });
  } catch (error) {
    logger.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Create a new room
app.post('/api/rooms', authenticateToken, [
  body('name').notEmpty().trim().withMessage('Room name is required'),
  body('type').isIn(['direct', 'group', 'property_inquiry', 'support']).withMessage('Invalid room type'),
  body('participants').isArray().withMessage('Participants must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, type, participants, propertyId } = req.body;

    // For direct messages, check if room already exists
    if (type === 'direct' && participants.length === 1) {
      const existingRoom = await Room.findOne({
        type: 'direct',
        $and: [
          { 'participants.userId': req.user.id },
          { 'participants.userId': participants[0] }
        ]
      });

      if (existingRoom) {
        return res.json({ success: true, room: existingRoom, existing: true });
      }
    }

    const roomId = generateRoomId();
    
    // Prepare participants array
    const roomParticipants = [
      {
        userId: req.user.id,
        role: 'owner',
        permissions: {
          canSendMessages: true,
          canUploadFiles: true,
          canAddMembers: true
        }
      },
      ...participants.map(userId => ({
        userId,
        role: 'member',
        permissions: {
          canSendMessages: true,
          canUploadFiles: true,
          canAddMembers: false
        }
      }))
    ];

    const room = new Room({
      id: roomId,
      name,
      type,
      participants: roomParticipants,
      propertyId,
      createdBy: req.user.id
    });

    await room.save();

    // Add all participants to the room
    const participantIds = roomParticipants.map(p => p.userId);
    for (const userId of participantIds) {
      const presence = await UserPresence.findOne({ userId });
      if (presence && presence.socketId) {
        io.to(presence.socketId).emit('room_created', room.toObject());
      }
    }

    res.json({ success: true, room: room.toObject() });
  } catch (error) {
    logger.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Mark message as read
app.put('/api/messages/:messageId/read', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findOne({ id: messageId });
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user has access to this room
    const room = await Room.findOne({
      id: message.roomId,
      'participants.userId': userId
    });

    if (!room) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update message read status
    await Message.updateOne(
      { id: messageId },
      {
        $addToSet: {
          readBy: {
            userId,
            timestamp: new Date()
          }
        }
      }
    );

    // Update last read timestamp for user in this room
    await redisClient.set(`lastRead:${userId}:${message.roomId}`, new Date().toISOString());

    // Emit read receipt to message sender
    const senderPresence = await UserPresence.findOne({ userId: message.senderId });
    if (senderPresence && senderPresence.socketId) {
      io.to(senderPresence.socketId).emit('message_read', {
        messageId,
        readBy: userId,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// Get pending notifications
app.get('/api/notifications/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const keys = await redisClient.keys(`notification:${userId}:*`);
    const notifications = [];

    for (const key of keys) {
      const notification = await redisClient.get(key);
      if (notification) {
        notifications.push(JSON.parse(notification));
        await redisClient.del(key); // Remove after retrieving
      }
    }

    res.json({ success: true, notifications });
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Socket.io connection handling
io.use(authenticateSocket);

io.on('connection', async (socket) => {
  const user = socket.user;
  logger.info(`User ${user.id} connected via socket ${socket.id}`);

  try {
    // Update user presence
    await UserPresence.findOneAndUpdate(
      { userId: user.id },
      {
        userId: user.id,
        status: 'online',
        lastSeen: new Date(),
        socketId: socket.id,
        deviceInfo: {
          platform: socket.handshake.headers['user-agent'] || 'unknown',
          browser: socket.handshake.headers['sec-ch-ua'] || 'unknown',
          version: socket.handshake.headers['sec-ch-ua-version'] || 'unknown'
        }
      },
      { upsert: true }
    );

    // Join user to their rooms
    const userRooms = await Room.find({
      'participants.userId': user.id,
      archived: false
    });

    for (const room of userRooms) {
      socket.join(room.id);
      logger.debug(`User ${user.id} joined room ${room.id}`);
    }

    // Send pending notifications
    const notificationKeys = await redisClient.keys(`notification:${user.id}:*`);
    for (const key of notificationKeys) {
      const notification = await redisClient.get(key);
      if (notification) {
        socket.emit('notification_received', JSON.parse(notification));
        await redisClient.del(key);
      }
    }

    // Handle typing indicators
    socket.on('typing_start', async ({ roomId }) => {
      try {
        const room = await Room.findOne({
          id: roomId,
          'participants.userId': user.id
        });

        if (room) {
          socket.to(roomId).emit('user_typing', {
            userId: user.id,
            userName: user.name,
            roomId
          });
          
          // Set typing timeout
          const typingKey = `typing:${user.id}:${roomId}`;
          await redisClient.setex(typingKey, 10, 'typing'); // 10 seconds timeout
        }
      } catch (error) {
        logger.error('Typing start error:', error);
      }
    });

    socket.on('typing_stop', async ({ roomId }) => {
      try {
        socket.to(roomId).emit('user_stopped_typing', {
          userId: user.id,
          roomId
        });
        
        await redisClient.del(`typing:${user.id}:${roomId}`);
      } catch (error) {
        logger.error('Typing stop error:', error);
      }
    });

    // Handle joining/leaving rooms
    socket.on('join_room', async ({ roomId }) => {
      try {
        const room = await Room.findOne({
          id: roomId,
          'participants.userId': user.id
        });

        if (room) {
          socket.join(roomId);
          
          // Update user's current rooms
          await UserPresence.updateOne(
            { userId: user.id },
            { $addToSet: { currentRooms: roomId } }
          );

          // Notify other participants
          socket.to(roomId).emit('user_joined_room', {
            userId: user.id,
            userName: user.name,
            roomId
          });

          logger.debug(`User ${user.id} joined room ${roomId}`);
        }
      } catch (error) {
        logger.error('Join room error:', error);
      }
    });

    socket.on('leave_room', async ({ roomId }) => {
      try {
        socket.leave(roomId);
        
        // Update user's current rooms
        await UserPresence.updateOne(
          { userId: user.id },
          { $pull: { currentRooms: roomId } }
        );

        // Notify other participants
        socket.to(roomId).emit('user_left_room', {
          userId: user.id,
          userName: user.name,
          roomId
        });

        logger.debug(`User ${user.id} left room ${roomId}`);
      } catch (error) {
        logger.error('Leave room error:', error);
      }
    });

    // Handle real-time message sending
    socket.on('send_message', async ({ roomId, content, type = 'text', replyTo, encrypted = false }) => {
      try {
        // Rate limiting check
        const rateLimitKey = `message_rate:${user.id}`;
        const currentCount = await redisClient.get(rateLimitKey);
        
        if (currentCount && parseInt(currentCount) >= 30) {
          socket.emit('rate_limit_exceeded', {
            message: 'Too many messages sent. Please slow down.',
            retryAfter: 60
          });
          return;
        }

        // Check room access
        const room = await Room.findOne({
          id: roomId,
          'participants.userId': user.id
        });

        if (!room) {
          socket.emit('error', { message: 'Access denied to this room' });
          return;
        }

        // Check permissions
        const participant = room.participants.find(p => p.userId === user.id);
        if (!participant.permissions.canSendMessages) {
          socket.emit('error', { message: 'You do not have permission to send messages' });
          return;
        }

        // Create and save message
        const messageId = generateMessageId();
        const message = new Message({
          id: messageId,
          roomId,
          senderId: user.id,
          senderName: user.name || 'Unknown User',
          content,
          type,
          replyTo,
          encrypted,
          timestamp: new Date()
        });

        await message.save();

        // Update room's last message
        await Room.updateOne(
          { id: roomId },
          {
            $set: {
              'lastMessage.content': content,
              'lastMessage.timestamp': new Date(),
              'lastMessage.senderId': user.id
            }
          }
        );

        // Emit to room participants
        io.to(roomId).emit('message_received', {
          ...message.toObject(),
          timestamp: message.timestamp.toISOString()
        });

        // Update rate limiting
        await redisClient.setex(rateLimitKey, 60, (parseInt(currentCount) || 0) + 1);

        // Send push notifications to offline users
        const offlineParticipants = room.participants.filter(p => p.userId !== user.id);
        for (const participant of offlineParticipants) {
          const presence = await UserPresence.findOne({ userId: participant.userId });
          if (!presence || presence.status === 'offline') {
            await sendPushNotification(
              participant.userId,
              `New message from ${user.name}`,
              content.length > 50 ? content.substring(0, 47) + '...' : content,
              { roomId, messageId, type: 'chat_message' }
            );
          }
        }

        // Emit delivery confirmation to sender
        socket.emit('message_sent', {
          messageId,
          timestamp: message.timestamp.toISOString(),
          status: 'sent'
        });

      } catch (error) {
        logger.error('Real-time send message error:', error);
        socket.emit('message_error', {
          error: 'Failed to send message',
          temporary: true
        });
      }
    });

    // Handle message reactions
    socket.on('add_reaction', async ({ messageId, emoji }) => {
      try {
        const message = await Message.findOne({ id: messageId });
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Check room access
        const room = await Room.findOne({
          id: message.roomId,
          'participants.userId': user.id
        });

        if (!room) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Add or update reaction
        await Message.updateOne(
          { id: messageId },
          {
            $pull: { 'reactions': { userId: user.id } }, // Remove existing reaction from this user
          }
        );

        await Message.updateOne(
          { id: messageId },
          {
            $addToSet: {
              'reactions': {
                emoji,
                userId: user.id,
                userName: user.name,
                timestamp: new Date()
              }
            }
          }
        );

        // Emit to room participants
        io.to(message.roomId).emit('reaction_added', {
          messageId,
          emoji,
          userId: user.id,
          userName: user.name,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        logger.error('Add reaction error:', error);
        socket.emit('error', { message: 'Failed to add reaction' });
      }
    });

    // Handle message editing
    socket.on('edit_message', async ({ messageId, newContent }) => {
      try {
        const message = await Message.findOne({ 
          id: messageId, 
          senderId: user.id,
          deleted: false
        });

        if (!message) {
          socket.emit('error', { message: 'Message not found or access denied' });
          return;
        }

        // Check if message is too old to edit (5 minutes limit)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (message.timestamp < fiveMinutesAgo) {
          socket.emit('error', { message: 'Message is too old to edit' });
          return;
        }

        // Update message
        await Message.updateOne(
          { id: messageId },
          {
            $set: {
              content: newContent,
              edited: true,
              editedAt: new Date()
            }
          }
        );

        // Emit to room participants
        io.to(message.roomId).emit('message_edited', {
          messageId,
          newContent,
          editedAt: new Date().toISOString(),
          editedBy: user.id
        });

      } catch (error) {
        logger.error('Edit message error:', error);
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    // Handle message deletion
    socket.on('delete_message', async ({ messageId }) => {
      try {
        const message = await Message.findOne({ 
          id: messageId, 
          senderId: user.id,
          deleted: false
        });

        if (!message) {
          socket.emit('error', { message: 'Message not found or access denied' });
          return;
        }

        // Soft delete message
        await Message.updateOne(
          { id: messageId },
          {
            $set: {
              deleted: true,
              deletedAt: new Date(),
              content: 'This message was deleted'
            }
          }
        );

        // Emit to room participants
        io.to(message.roomId).emit('message_deleted', {
          messageId,
          deletedAt: new Date().toISOString(),
          deletedBy: user.id
        });

      } catch (error) {
        logger.error('Delete message error:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Handle presence updates
    socket.on('update_presence', async ({ status }) => {
      try {
        const validStatuses = ['online', 'away', 'busy'];
        if (!validStatuses.includes(status)) {
          return;
        }

        await UserPresence.updateOne(
          { userId: user.id },
          { $set: { status, lastSeen: new Date() } }
        );

        // Notify contacts about presence change
        const userRooms = await Room.find({
          'participants.userId': user.id,
          type: 'direct'
        });

        for (const room of userRooms) {
          socket.to(room.id).emit('presence_updated', {
            userId: user.id,
            status,
            timestamp: new Date().toISOString()
          });
        }

      } catch (error) {
        logger.error('Update presence error:', error);
      }
    });

    // Handle property inquiry room creation
    socket.on('create_property_inquiry', async ({ propertyId, hostId, message }) => {
      try {
        // Check if room already exists for this property
        let room = await Room.findOne({
          type: 'property_inquiry',
          propertyId,
          $and: [
            { 'participants.userId': user.id },
            { 'participants.userId': hostId }
          ]
        });

        if (!room) {
          // Create new room
          const roomId = generateRoomId();
          room = new Room({
            id: roomId,
            name: `Property Inquiry - ${propertyId}`,
            type: 'property_inquiry',
            participants: [
              {
                userId: user.id,
                role: 'member',
                permissions: {
                  canSendMessages: true,
                  canUploadFiles: true,
                  canAddMembers: false
                }
              },
              {
                userId: hostId,
                role: 'owner',
                permissions: {
                  canSendMessages: true,
                  canUploadFiles: true,
                  canAddMembers: true
                }
              }
            ],
            propertyId,
            createdBy: user.id
          });

          await room.save();

          // Join both users to the room
          socket.join(roomId);
          
          const hostPresence = await UserPresence.findOne({ userId: hostId });
          if (hostPresence && hostPresence.socketId) {
            io.to(hostPresence.socketId).socketsJoin(roomId);
            io.to(hostPresence.socketId).emit('room_created', room.toObject());
          }
        } else {
          // Join existing room
          socket.join(room.id);
        }

        // Send initial message if provided
        if (message && message.trim()) {
          const messageId = generateMessageId();
          const initialMessage = new Message({
            id: messageId,
            roomId: room.id,
            senderId: user.id,
            senderName: user.name || 'Unknown User',
            content: message,
            type: 'text',
            timestamp: new Date()
          });

          await initialMessage.save();

          // Update room's last message
          await Room.updateOne(
            { id: room.id },
            {
              $set: {
                'lastMessage.content': message,
                'lastMessage.timestamp': new Date(),
                'lastMessage.senderId': user.id
              }
            }
          );

          // Emit to room participants
          io.to(room.id).emit('message_received', {
            ...initialMessage.toObject(),
            timestamp: initialMessage.timestamp.toISOString()
          });

          // Send push notification to host
          const hostPresence = await UserPresence.findOne({ userId: hostId });
          if (!hostPresence || hostPresence.status === 'offline') {
            await sendPushNotification(
              hostId,
              `Property inquiry from ${user.name}`,
              message,
              { roomId: room.id, propertyId, type: 'property_inquiry' }
            );
          }
        }

        socket.emit('property_inquiry_created', {
          room: room.toObject(),
          message: message ? 'Message sent successfully' : 'Room created successfully'
        });

      } catch (error) {
        logger.error('Create property inquiry error:', error);
        socket.emit('error', { message: 'Failed to create property inquiry' });
      }
    });

    // Handle voice call signaling
    socket.on('voice_call_offer', async ({ roomId, offer, targetUserId }) => {
      try {
        const room = await Room.findOne({
          id: roomId,
          'participants.userId': user.id
        });

        if (!room) {
          socket.emit('error', { message: 'Access denied to this room' });
          return;
        }

        const targetPresence = await UserPresence.findOne({ userId: targetUserId });
        if (targetPresence && targetPresence.socketId) {
          io.to(targetPresence.socketId).emit('voice_call_offer', {
            fromUserId: user.id,
            fromUserName: user.name,
            roomId,
            offer
          });
        }

      } catch (error) {
        logger.error('Voice call offer error:', error);
        socket.emit('error', { message: 'Failed to send voice call offer' });
      }
    });

    socket.on('voice_call_answer', async ({ roomId, answer, targetUserId }) => {
      try {
        const targetPresence = await UserPresence.findOne({ userId: targetUserId });
        if (targetPresence && targetPresence.socketId) {
          io.to(targetPresence.socketId).emit('voice_call_answer', {
            fromUserId: user.id,
            roomId,
            answer
          });
        }
      } catch (error) {
        logger.error('Voice call answer error:', error);
      }
    });

    socket.on('voice_call_ice_candidate', async ({ roomId, candidate, targetUserId }) => {
      try {
        const targetPresence = await UserPresence.findOne({ userId: targetUserId });
        if (targetPresence && targetPresence.socketId) {
          io.to(targetPresence.socketId).emit('voice_call_ice_candidate', {
            fromUserId: user.id,
            roomId,
            candidate
          });
        }
      } catch (error) {
        logger.error('Voice call ICE candidate error:', error);
      }
    });

    socket.on('voice_call_end', async ({ roomId, targetUserId }) => {
      try {
        const targetPresence = await UserPresence.findOne({ userId: targetUserId });
        if (targetPresence && targetPresence.socketId) {
          io.to(targetPresence.socketId).emit('voice_call_ended', {
            fromUserId: user.id,
            roomId
          });
        }
      } catch (error) {
        logger.error('Voice call end error:', error);
      }
    });

    // Handle screen sharing
    socket.on('screen_share_offer', async ({ roomId, offer, targetUserId }) => {
      try {
        const room = await Room.findOne({
          id: roomId,
          'participants.userId': user.id
        });

        if (!room) {
          socket.emit('error', { message: 'Access denied to this room' });
          return;
        }

        const targetPresence = await UserPresence.findOne({ userId: targetUserId });
        if (targetPresence && targetPresence.socketId) {
          io.to(targetPresence.socketId).emit('screen_share_offer', {
            fromUserId: user.id,
            fromUserName: user.name,
            roomId,
            offer
          });
        }

      } catch (error) {
        logger.error('Screen share offer error:', error);
        socket.emit('error', { message: 'Failed to send screen share offer' });
      }
    });

    // Handle location sharing
    socket.on('share_location', async ({ roomId, coordinates, address }) => {
      try {
        const room = await Room.findOne({
          id: roomId,
          'participants.userId': user.id
        });

        if (!room) {
          socket.emit('error', { message: 'Access denied to this room' });
          return;
        }

        // Create location message
        const messageId = generateMessageId();
        const message = new Message({
          id: messageId,
          roomId,
          senderId: user.id,
          senderName: user.name || 'Unknown User',
          content: address || 'Shared location',
          type: 'location',
          metadata: {
            coordinates: {
              lat: coordinates.latitude,
              lng: coordinates.longitude
            }
          },
          timestamp: new Date()
        });

        await message.save();

        // Update room's last message
        await Room.updateOne(
          { id: roomId },
          {
            $set: {
              'lastMessage.content': message.content,
              'lastMessage.timestamp': new Date(),
              'lastMessage.senderId': user.id
            }
          }
        );

        // Emit to room participants
        io.to(roomId).emit('message_received', {
          ...message.toObject(),
          timestamp: message.timestamp.toISOString()
        });

      } catch (error) {
        logger.error('Share location error:', error);
        socket.emit('error', { message: 'Failed to share location' });
      }
    });

    // Handle live location sharing (start/stop)
    socket.on('start_live_location', async ({ roomId, duration = 3600000 }) => { // Default 1 hour
      try {
        const room = await Room.findOne({
          id: roomId,
          'participants.userId': user.id
        });

        if (!room) {
          socket.emit('error', { message: 'Access denied to this room' });
          return;
        }

        const sessionKey = `live_location:${user.id}:${roomId}`;
        await redisClient.setex(sessionKey, duration / 1000, JSON.stringify({
          userId: user.id,
          userName: user.name,
          roomId,
          startTime: Date.now()
        }));

        // Notify room participants
        socket.to(roomId).emit('live_location_started', {
          userId: user.id,
          userName: user.name,
          duration
        });

        socket.emit('live_location_session_started', { sessionId: sessionKey, duration });

      } catch (error) {
        logger.error('Start live location error:', error);
        socket.emit('error', { message: 'Failed to start live location sharing' });
      }
    });

    socket.on('update_live_location', async ({ roomId, coordinates }) => {
      try {
        const sessionKey = `live_location:${user.id}:${roomId}`;
        const session = await redisClient.get(sessionKey);
        
        if (session) {
          // Broadcast location update to room participants
          socket.to(roomId).emit('live_location_update', {
            userId: user.id,
            coordinates,
            timestamp: Date.now()
          });
        }

      } catch (error) {
        logger.error('Update live location error:', error);
      }
    });

    socket.on('stop_live_location', async ({ roomId }) => {
      try {
        const sessionKey = `live_location:${user.id}:${roomId}`;
        await redisClient.del(sessionKey);

        // Notify room participants
        socket.to(roomId).emit('live_location_stopped', {
          userId: user.id
        });

        socket.emit('live_location_session_stopped');

      } catch (error) {
        logger.error('Stop live location error:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async (reason) => {
      logger.info(`User ${user.id} disconnected: ${reason}`);

      try {
        // Update user presence to offline
        await UserPresence.updateOne(
          { userId: user.id },
          {
            $set: {
              status: 'offline',
              lastSeen: new Date(),
              socketId: null,
              currentRooms: []
            }
          }
        );

        // Clear any active typing indicators
        const typingKeys = await redisClient.keys(`typing:${user.id}:*`);
        for (const key of typingKeys) {
          await redisClient.del(key);
          const roomId = key.split(':')[2];
          socket.to(roomId).emit('user_stopped_typing', {
            userId: user.id,
            roomId
          });
        }

        // Clear any live location sessions
        const locationKeys = await redisClient.keys(`live_location:${user.id}:*`);
        for (const key of locationKeys) {
          await redisClient.del(key);
          const roomId = key.split(':')[2];
          socket.to(roomId).emit('live_location_stopped', {
            userId: user.id
          });
        }

        // Notify contacts about going offline
        const userRooms = await Room.find({
          'participants.userId': user.id,
          type: 'direct'
        });

        for (const room of userRooms) {
          socket.to(room.id).emit('presence_updated', {
            userId: user.id,
            status: 'offline',
            timestamp: new Date().toISOString()
          });
        }

      } catch (error) {
        logger.error('Disconnect cleanup error:', error);
      }
    });

  } catch (error) {
    logger.error('Socket connection error:', error);
    socket.emit('connection_error', { message: 'Failed to establish connection' });
    socket.disconnect(true);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  logger.info(`PropertyHub WebSocket Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Database: ${DB_CONNECTION}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Close database connections
  try {
    await mongoose.disconnect();
    await redisClient.quit();
    await pubClient.quit();
    await subClient.quit();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', error);
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  try {
    await mongoose.disconnect();
    await redisClient.quit();
    await pubClient.quit();
    await subClient.quit();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', error);
  }
  
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = { app, server, io };

io.on('connection', async (socket) => {
  try {
    const user = socket.user;
    logger.info(`User ${user.id} connected with socket ${socket.id}`);

    // Update user presence
    await UserPresence.findOneAndUpdate(
      { userId: user.id },
      {
        userId: user.id,
        status: 'online',
        lastSeen: new Date(),
        socketId: socket.id,
        deviceInfo: {
          platform: socket.handshake.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop',
          browser: socket.handshake.headers['user-agent']
        }
      },
      { upsert: true, new: true }
    );

    // Join user's rooms
    const userRooms = await Room.find({
      'participants.userId': user.id,
      archived: false
    });

    const roomIds = userRooms.map(room => room.id);
    socket.join(roomIds);

    // Update user's current rooms in presence
    await UserPresence.updateOne(
      { userId: user.id },
      { $set: { currentRooms: roomIds } }
    );

    // Notify other users about online status
    socket.broadcast.emit('user_online', {
      userId: user.id,
      status: 'online',
      timestamp: new Date().toISOString()
    });

    // Handle joining a specific room
    socket.on('join_room', async (data) => {
      try {
        const { roomId } = data;
        
        // Verify user has access to this room
        const room = await Room.findOne({
          id: roomId,
          'participants.userId': user.id
        });

        if (room) {
          socket.join(roomId);
          
          // Update presence with current room
          await UserPresence.updateOne(
            { userId: user.id },
            { $addToSet: { currentRooms: roomId } }
          );

          socket.emit('room_joined', { roomId, success: true });
          logger.info(`User ${user.id} joined room ${roomId}`);
        } else {
          socket.emit('room_joined', { roomId, success: false, error: 'Access denied' });
        }
      } catch (error) {
        logger.error('Join room error:', error);
        socket.emit('room_joined', { roomId: data.roomId, success: false, error: 'Server error' });
      }
    });

    // Handle leaving a room
    socket.on('leave_room', async (data) => {
      try {
        const { roomId } = data;
        socket.leave(roomId);
        
        // Update presence
        await UserPresence.updateOne(
          { userId: user.id },
          { $pull: { currentRooms: roomId } }
        );

        socket.emit('room_left', { roomId, success: true });
        logger.info(`User ${user.id} left room ${roomId}`);
      } catch (error) {
        logger.error('Leave room error:', error);
      }
    });

    // Handle typing indicators
    socket.on('typing_start', async (data) => {
      try {
        const { roomId } = data;
        
        // Verify user has access to this room
        const room = await Room.findOne({
          id: roomId,
          'participants.userId': user.id
        });

        if (room) {
          socket.to(roomId).emit('typing_update', {
            roomId,
            userId: user.id,
            userName: user.name,
            isTyping: true,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        logger.error('Typing start error:', error);
      }
    });

    socket.on('typing_stop', async (data) => {
      try {
        const { roomId } = data;
        
        socket.to(roomId).emit('typing_update', {
          roomId,
          userId: user.id,
          userName: user.name,
          isTyping: false,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Typing stop error:', error);
      }
    });

    // Handle message delivery acknowledgment
    socket.on('message_delivered', async (data) => {
      try {
        const { messageId } = data;
        
        await Message.updateOne(
          { id: messageId },
          {
            $addToSet: {
              deliveredTo: {
                userId: user.id,
                timestamp: new Date()
              }
            }
          }
        );

        // Notify sender about delivery
        const message = await Message.findOne({ id: messageId });
        if (message) {
          const senderPresence = await UserPresence.findOne({ userId: message.senderId });
          if (senderPresence && senderPresence.socketId) {
            io.to(senderPresence.socketId).emit('message_delivered', {
              messageId,
              deliveredTo: user.id,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        logger.error('Message delivered error:', error);
      }
    });

    // Handle heartbeat to maintain connection
    socket.on('heartbeat', async () => {
      await UserPresence.updateOne(
        { userId: user.id },
        { $set: { lastSeen: new Date() } }
      );
      
      socket.emit('heartbeat_ack', { timestamp: Date.now() });
    });

    // Handle disconnect
    socket.on('disconnect', async (reason) => {
      try {
        logger.info(`User ${user.id} disconnected: ${reason}`);

        // Update user presence to offline
        await UserPresence.updateOne(
          { userId: user.id },
          {
            $set: {
              status: 'offline',
              lastSeen: new Date()
            },
            $unset: {
              socketId: 1,
              currentRooms: 1
            }
          }
        );

        // Notify other users about offline status
        socket.broadcast.emit('user_offline', {
          userId: user.id,
          status: 'offline',
          lastSeen: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Disconnect handling error:', error);
      }
    });

  } catch (error) {
    logger.error('Socket connection error:', error);
    socket.disconnect(true);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Express error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  logger.info(`🚀 PropertyHub WebSocket Server running on port ${PORT}`);
  logger.info(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 CORS origins: ${process.env.CLIENT_URLS || 'http://localhost:3000,http://localhost:5173'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    await mongoose.connection.close();
    await redisClient.quit();
    await pubClient.quit();
    await subClient.quit();
  } catch (error) {
    logger.error('Error during shutdown:', error);
  }
  
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = { app, server, io };