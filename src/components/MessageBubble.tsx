import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  CheckCheck, 
  Download, 
  Play, 
  Pause, 
  Volume2, 
  FileText, 
  Image as ImageIcon,
  Video,
  Music,
  Eye,
  ExternalLink
} from 'lucide-react';
import { ChatMessage, User } from '../types';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  currentUser: User;
  showAvatar?: boolean;
  compact?: boolean;
}

function formatMessageTime(timestamp: string) {
  const messageDate = new Date(timestamp);
  const now = new Date();
  const isToday = messageDate.toDateString() === now.toDateString();
  
  if (isToday) {
    return messageDate.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } else {
    return messageDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit' 
    }) + ', ' + messageDate.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}

function formatFileSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds?: number) {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Text Message Component
function TextMessage({ message, isOwnMessage }: { message: ChatMessage; isOwnMessage: boolean }) {
  return (
    <div
      className={`rounded-2xl px-4 py-2 ${
        isOwnMessage ? 'theme-message-sent ml-auto' : 'theme-message-received'
      }`}
    >
      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
    </div>
  );
}

// Image Message Component
function ImageMessage({ message, isOwnMessage }: { message: ChatMessage; isOwnMessage: boolean }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  return (
    <div className={`max-w-xs ${isOwnMessage ? 'ml-auto' : ''}`}>
      <div className={`rounded-2xl overflow-hidden ${
        isOwnMessage
          ? 'border border-primary/10 bg-primary/10 shadow-[0_10px_24px_color-mix(in_srgb,var(--primary)_16%,transparent)]'
          : 'theme-message-received'
      }`}>
        <div className="relative">
          {message.thumbnailUrl || message.fileUrl ? (
            <motion.img
              src={message.thumbnailUrl || message.fileUrl}
              alt={message.fileName || 'Shared image'}
              className="w-full h-auto max-h-64 object-cover cursor-pointer"
              onClick={() => setShowFullImage(true)}
              onLoad={() => setImageLoaded(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: imageLoaded ? 1 : 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            />
          ) : (
            <div className="w-full h-32 bg-muted flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          
          <div className="absolute top-2 right-2">
            <Button
              size="sm"
              variant="secondary"
              className="w-8 h-8 p-0 opacity-80 hover:opacity-100"
              onClick={() => message.fileUrl && window.open(message.fileUrl, '_blank')}
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {(message.content || message.fileName) && (
          <div className="p-3">
            {message.fileName && (
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {message.fileName}
              </p>
            )}
            {message.content && (
              <p className="text-sm">{message.content}</p>
            )}
            {message.fileSize && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatFileSize(message.fileSize)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Full Image Modal */}
      {showFullImage && message.fileUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowFullImage(false)}
        >
          <motion.img
            src={message.fileUrl}
            alt={message.fileName || 'Shared image'}
            className="max-w-full max-h-full object-contain"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
          />
        </motion.div>
      )}
    </div>
  );
}

// Video Message Component
function VideoMessage({ message, isOwnMessage }: { message: ChatMessage; isOwnMessage: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className={`max-w-sm ${isOwnMessage ? 'ml-auto' : ''}`}>
      <div className={`rounded-2xl overflow-hidden ${
        isOwnMessage
          ? 'border border-primary/10 bg-primary/10 shadow-[0_10px_24px_color-mix(in_srgb,var(--primary)_16%,transparent)]'
          : 'theme-message-received'
      }`}>
        <div className="relative">
          {message.fileUrl ? (
            <video
              src={message.fileUrl}
              className="w-full h-auto max-h-64 object-cover"
              controls
              preload="metadata"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="w-full h-32 bg-muted flex items-center justify-center">
              <Video className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          
          {message.thumbnailUrl && !isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                <Play className="w-6 h-6 text-white ml-1" />
              </div>
            </div>
          )}
        </div>
        
        <div className="p-3">
          {message.fileName && (
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {message.fileName}
            </p>
          )}
          {message.content && (
            <p className="text-sm mb-2">{message.content}</p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {message.duration && (
              <span>{formatDuration(message.duration)}</span>
            )}
            {message.fileSize && (
              <span>{formatFileSize(message.fileSize)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Audio Message Component
function AudioMessage({ message, isOwnMessage }: { message: ChatMessage; isOwnMessage: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    setCurrentTime(audio.currentTime);
    setDuration(audio.duration || 0);
  };

  return (
    <div className={`min-w-64 max-w-xs ${isOwnMessage ? 'ml-auto' : ''}`}>
      <div className={`rounded-2xl p-4 ${
        isOwnMessage ? 'theme-message-sent' : 'theme-message-received'
      }`}>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <Music className="w-6 h-6" />
          </div>
          
          <div className="flex-1 min-w-0">
            {message.fileName && (
              <p className="text-sm font-medium truncate mb-1">
                {message.fileName}
              </p>
            )}
            
            {message.fileUrl && (
              <audio
                src={message.fileUrl}
                className="w-full h-8"
                controls
                preload="metadata"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
              >
                Your browser does not support the audio element.
              </audio>
            )}
            
            <div className="flex items-center justify-between text-xs opacity-70 mt-2">
              {message.duration && (
                <span>{formatDuration(message.duration)}</span>
              )}
              {message.fileSize && (
                <span>{formatFileSize(message.fileSize)}</span>
              )}
            </div>
          </div>
        </div>
        
        {message.content && (
          <p className="text-sm mt-3">{message.content}</p>
        )}
      </div>
    </div>
  );
}

// File Message Component
function FileMessage({ message, isOwnMessage }: { message: ChatMessage; isOwnMessage: boolean }) {
  const getFileIcon = () => {
    if (!message.mimeType) return <FileText className="w-6 h-6" />;
    
    if (message.mimeType.startsWith('image/')) return <ImageIcon className="w-6 h-6" />;
    if (message.mimeType.startsWith('video/')) return <Video className="w-6 h-6" />;
    if (message.mimeType.startsWith('audio/')) return <Music className="w-6 h-6" />;
    
    return <FileText className="w-6 h-6" />;
  };

  const handleDownload = () => {
    if (message.fileUrl) {
      const link = document.createElement('a');
      link.href = message.fileUrl;
      link.download = message.fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className={`min-w-64 max-w-xs ${isOwnMessage ? 'ml-auto' : ''}`}>
      <div className={`rounded-2xl p-4 ${
        isOwnMessage ? 'theme-message-sent' : 'theme-message-received'
      }`}>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {getFileIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {message.fileName || 'Unknown file'}
            </p>
            
            <div className="flex items-center justify-between mt-1">
              {message.fileSize && (
                <span className="text-xs opacity-70">
                  {formatFileSize(message.fileSize)}
                </span>
              )}
              
              <Button
                size="sm"
                variant={isOwnMessage ? "secondary" : "outline"}
                onClick={handleDownload}
                className="h-6 px-2 text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </div>
        
        {message.content && (
          <p className="text-sm mt-3">{message.content}</p>
        )}
      </div>
    </div>
  );
}

export function MessageBubble({ 
  message, 
  isOwnMessage, 
  currentUser, 
  showAvatar = true, 
  compact = false 
}: MessageBubbleProps) {
  const renderMessageContent = () => {
    switch (message.type) {
      case 'image':
        return <ImageMessage message={message} isOwnMessage={isOwnMessage} />;
      case 'video':
        return <VideoMessage message={message} isOwnMessage={isOwnMessage} />;
      case 'audio':
        return <AudioMessage message={message} isOwnMessage={isOwnMessage} />;
      case 'file':
        return <FileMessage message={message} isOwnMessage={isOwnMessage} />;
      default:
        return <TextMessage message={message} isOwnMessage={isOwnMessage} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      {!isOwnMessage && showAvatar && !compact && (
        <Avatar className="w-8 h-8 flex-shrink-0 ring-1 ring-black/5">
          <AvatarImage src={message.senderAvatar} alt={message.senderName} />
          <AvatarFallback className="theme-avatar-soft">
            {message.senderName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      
      {/* Spacer for compact messages */}
      {!isOwnMessage && !showAvatar && compact && (
        <div className="w-8 flex-shrink-0" />
      )}

      {/* Message Content */}
      <div className={`flex-1 max-w-[70%] ${isOwnMessage ? 'text-right' : ''}`}>
        {/* Sender name for non-own messages */}
        {!isOwnMessage && showAvatar && !compact && (
          <p className="text-xs text-muted-foreground mb-1">
            {message.senderName}
          </p>
        )}

        {/* Message content */}
        <div className="relative">
          {renderMessageContent()}
          
          {/* Message metadata */}
          <div className={`flex items-center gap-1 mt-1 ${
            isOwnMessage ? 'justify-end' : 'justify-start'
          }`}>
            {message.edited && (
              <Badge variant="secondary" className="text-xs">
                edited
              </Badge>
            )}
            
            <span className="text-xs text-muted-foreground">
              {formatMessageTime(message.timestamp)}
            </span>
            
            {isOwnMessage && (
              <CheckCheck className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
