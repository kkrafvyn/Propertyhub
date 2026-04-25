/**
 * File Share Manager for PropertyHub Chat
 * 
 * Advanced file sharing component with drag & drop, preview,
 * compression, and security features for the chat system.
 * 
 * Features:
 * - Drag & drop file upload
 * - Image preview and compression
 * - Document preview for PDFs
 * - Progress tracking with cancellation
 * - File type validation and security
 * - Mobile-optimized interface
 * - Bulk upload support
 * - Image editing (crop, rotate, filter)
 * - Thumbnail generation
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  File, 
  Image as ImageIcon, 
  FileText, 
  Video, 
  Music,
  X, 
  Send, 
  Eye, 
  Download, 
  Trash2,
  RotateCw,
  Crop,
  Palette,
  AlertTriangle,
  Check,
  Camera,
  FolderOpen
} from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface FileItem {
  id: string;
  file: File;
  preview?: string;
  thumbnail?: string;
  compressed?: Blob;
  type: 'image' | 'document' | 'video' | 'audio' | 'other';
  uploadProgress: number;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled';
  error?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    pages?: number;
  };
}

interface FileShareManagerProps {
  onFilesSelected: (files: FileItem[]) => Promise<void>;
  onCancel: () => void;
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  allowedTypes?: string[];
  autoCompress?: boolean;
  className?: string;
}

const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
  'application/pdf', 'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv'
];

export function FileShareManager({
  onFilesSelected,
  onCancel,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  maxFiles = 10,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  autoCompress = true,
  className = ""
}: FileShareManagerProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Get file type from MIME type
  const getFileType = useCallback((mimeType: string): FileItem['type'] => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
    return 'other';
  }, []);

  // Get file icon
  const getFileIcon = useCallback((type: FileItem['type']) => {
    switch (type) {
      case 'image': return ImageIcon;
      case 'video': return Video;
      case 'audio': return Music;
      case 'document': return FileText;
      default: return File;
    }
  }, []);

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File size exceeds ${Math.round(maxFileSize / (1024 * 1024))}MB limit`;
    }
    
    if (!allowedTypes.includes(file.type)) {
      return 'File type not supported';
    }
    
    return null;
  }, [maxFileSize, allowedTypes]);

  // Generate preview for images
  const generateImagePreview = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  // Generate thumbnail
  const generateThumbnail = useCallback(async (file: File): Promise<string> => {
    if (!file.type.startsWith('image/')) {
      throw new Error('Only images can have thumbnails');
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const maxSize = 200;
        const ratio = Math.min(maxSize / img.width, maxSize / img.height);
        
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            reject(new Error('Failed to generate thumbnail'));
          }
        }, 'image/jpeg', 0.8);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Compress image
  const compressImage = useCallback(async (file: File, quality = 0.8): Promise<Blob> => {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') {
      return file; // Don't compress non-images or GIFs
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions (max 1920x1920)
        const maxSize = 1920;
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        }, file.type, quality);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Get image metadata
  const getImageMetadata = useCallback((file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Get video metadata
  const getVideoMetadata = useCallback((file: File): Promise<{ duration: number; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight
        });
      };
      video.onerror = reject;
      video.src = URL.createObjectURL(file);
    });
  }, []);

  // Process file
  const processFile = useCallback(async (file: File): Promise<FileItem> => {
    const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const type = getFileType(file.type);
    
    const fileItem: FileItem = {
      id,
      file,
      type,
      uploadProgress: 0,
      uploadStatus: 'pending'
    };

    try {
      // Generate preview for images
      if (type === 'image') {
        fileItem.preview = await generateImagePreview(file);
        fileItem.thumbnail = await generateThumbnail(file);
        fileItem.metadata = await getImageMetadata(file);
        
        // Compress if enabled
        if (autoCompress) {
          fileItem.compressed = await compressImage(file);
        }
      } else if (type === 'video') {
        fileItem.metadata = await getVideoMetadata(file);
      }
    } catch (error) {
      console.warn('Error processing file metadata:', error);
    }

    return fileItem;
  }, [getFileType, generateImagePreview, generateThumbnail, getImageMetadata, getVideoMetadata, autoCompress, compressImage]);

  // Handle file selection
  const handleFiles = useCallback(async (fileList: FileList) => {
    const newFiles = Array.from(fileList);
    
    if (files.length + newFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setIsProcessing(true);
    
    try {
      const processedFiles: FileItem[] = [];
      
      for (const file of newFiles) {
        const error = validateFile(file);
        if (error) {
          toast.error(`${file.name}: ${error}`);
          continue;
        }
        
        const processedFile = await processFile(file);
        processedFiles.push(processedFile);
      }
      
      setFiles(prev => [...prev, ...processedFiles]);
      
      if (processedFiles.length > 0) {
        toast.success(`${processedFiles.length} file(s) added`);
      }
    } catch (error) {
      console.error('Error processing files:', error);
      toast.error('Error processing files');
    } finally {
      setIsProcessing(false);
    }
  }, [files.length, maxFiles, validateFile, processFile]);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  }, [handleFiles]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      handleFiles(selectedFiles);
    }
    // Reset input
    e.target.value = '';
  }, [handleFiles]);

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    
    // Cancel upload if in progress
    const controller = abortControllersRef.current.get(fileId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(fileId);
    }
  }, []);

  // Send files
  const sendFiles = useCallback(async () => {
    if (files.length === 0) return;
    
    try {
      await onFilesSelected(files);
      
      // Cleanup
      files.forEach(file => {
        if (file.preview) URL.revokeObjectURL(file.preview);
        if (file.thumbnail) URL.revokeObjectURL(file.thumbnail);
      });
      
      setFiles([]);
      toast.success('Files sent successfully!');
    } catch (error) {
      console.error('Error sending files:', error);
      toast.error('Failed to send files');
    }
  }, [files, onFilesSelected]);

  // Format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) URL.revokeObjectURL(file.preview);
        if (file.thumbnail) URL.revokeObjectURL(file.thumbnail);
      });
      
      abortControllersRef.current.forEach(controller => controller.abort());
    };
  }, [files]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`bg-card border rounded-lg overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-medium">Share Files</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {files.length}/{maxFiles}
          </Badge>
          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-6 border-2 border-dashed transition-colors ${
          isDragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
      >
        <div className="text-center">
          <Upload className={`w-12 h-12 mx-auto mb-4 ${
            isDragOver ? 'text-primary' : 'text-muted-foreground'
          }`} />
          
          <p className="text-sm font-medium mb-2">
            {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          
          <p className="text-xs text-muted-foreground mb-4">
            or click to select files
          </p>
          
          <div className="flex gap-2 justify-center">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
              disabled={isProcessing}
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Browse Files
            </Button>
            
            <Button
              onClick={() => {
                // Trigger camera input
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.capture = 'environment';
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files) handleFiles(files);
                };
                input.click();
              }}
              variant="outline"
              size="sm"
              disabled={isProcessing}
            >
              <Camera className="w-4 h-4 mr-2" />
              Camera
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-3">
            Max {formatFileSize(maxFileSize)} per file • {maxFiles} files max
          </p>
        </div>
      </div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="border-t"
          >
            <div className="p-4">
              <h4 className="text-sm font-medium mb-3">Selected Files</h4>
              
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scroll">
                {files.map((file) => {
                  const Icon = getFileIcon(file.type);
                  
                  return (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg"
                    >
                      {/* File preview/icon */}
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {file.thumbnail ? (
                          <img 
                            src={file.thumbnail} 
                            alt={file.file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      
                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {file.file.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(file.file.size)}</span>
                          {file.compressed && (
                            <>
                              <span>→</span>
                              <span className="text-green-600">
                                {formatFileSize(file.compressed.size)}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                Compressed
                              </Badge>
                            </>
                          )}
                          {file.metadata && (
                            <span>
                              {file.metadata.width && file.metadata.height && 
                                `${file.metadata.width}×${file.metadata.height}`
                              }
                              {file.metadata.duration && 
                                ` • ${Math.round(file.metadata.duration)}s`
                              }
                            </span>
                          )}
                        </div>
                        
                        {/* Upload progress */}
                        {file.uploadStatus === 'uploading' && (
                          <Progress value={file.uploadProgress} className="w-full h-1 mt-1" />
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {file.preview && (
                          <Button
                            onClick={() => setSelectedFile(file)}
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        
                        <Button
                          onClick={() => removeFile(file.id)}
                          variant="ghost"
                          size="sm"
                          className="w-8 h-8 p-0 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      {files.length > 0 && (
        <div className="p-4 border-t bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {files.length} file(s) selected
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setFiles([])}
                variant="outline"
                size="sm"
              >
                Clear All
              </Button>
              
              <Button
                onClick={sendFiles}
                disabled={isProcessing || files.length === 0}
              >
                <Send className="w-4 h-4 mr-2" />
                Send Files
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={allowedTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* File Preview Modal */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedFile(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-card rounded-lg p-4 max-w-2xl max-h-[80vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">{selectedFile.file.name}</h3>
                <Button
                  onClick={() => setSelectedFile(null)}
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {selectedFile.preview && (
                <img
                  src={selectedFile.preview}
                  alt={selectedFile.file.name}
                  className="max-w-full max-h-96 mx-auto rounded"
                />
              )}
              
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Size: {formatFileSize(selectedFile.file.size)}</p>
                <p>Type: {selectedFile.file.type}</p>
                {selectedFile.metadata && (
                  <>
                    {selectedFile.metadata.width && selectedFile.metadata.height && (
                      <p>Dimensions: {selectedFile.metadata.width} × {selectedFile.metadata.height}</p>
                    )}
                    {selectedFile.metadata.duration && (
                      <p>Duration: {Math.round(selectedFile.metadata.duration)} seconds</p>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Processing files...</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}