import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { 
  Upload, 
  File, 
  Image as ImageIcon, 
  Video, 
  Music, 
  X, 
  Check,
  AlertCircle,
  Download
} from 'lucide-react';
import { toast } from "sonner";

interface FileUploadProps {
  onFileUpload: (file: File, fileUrl: string, thumbnailUrl?: string) => void;
  accept?: string;
  maxSize?: number; // in MB
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  url?: string;
  thumbnailUrl?: string;
  error?: string;
}

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
const SUPPORTED_AUDIO_TYPES = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];

export function FileUpload({ 
  onFileUpload, 
  accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar',
  maxSize = 50, // 50MB default
  maxFiles = 5,
  disabled = false,
  className = ''
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (file: File) => {
    if (SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      return <ImageIcon className="w-6 h-6 text-blue-500" />;
    } else if (SUPPORTED_VIDEO_TYPES.includes(file.type)) {
      return <Video className="w-6 h-6 text-purple-500" />;
    } else if (SUPPORTED_AUDIO_TYPES.includes(file.type)) {
      return <Music className="w-6 h-6 text-green-500" />;
    }
    return <File className="w-6 h-6 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxSize}MB`;
    }

    // Check if we're at max files
    if (uploadingFiles.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed`;
    }

    return null;
  };

  const generateThumbnail = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        resolve(undefined);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate thumbnail dimensions (max 200x200)
        const maxSize = 200;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(thumbnailUrl);
      };

      img.onerror = () => resolve(undefined);
      img.src = URL.createObjectURL(file);
    });
  };

  const simulateUpload = async (file: File): Promise<{ url: string; thumbnailUrl?: string }> => {
    // Simulate file upload progress
    const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate thumbnail for images
    const thumbnailUrl = await generateThumbnail(file);
    
    // Simulate upload progress
    return new Promise((resolve, reject) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          // Simulate successful upload
          setTimeout(() => {
            const fileUrl = URL.createObjectURL(file);
            resolve({ url: fileUrl, thumbnailUrl });
          }, 500);
        }
        
        setUploadingFiles(prev => 
          prev.map(f => 
            f.file === file ? { ...f, progress } : f
          )
        );
      }, 200);

      // Simulate occasional errors (5% chance)
      if (Math.random() < 0.05) {
        setTimeout(() => {
          clearInterval(interval);
          reject(new Error('Upload failed'));
        }, 2000);
      }
    });
  };

  const handleFiles = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        continue;
      }

      // Add file to uploading list
      const uploadingFile: UploadingFile = {
        file,
        progress: 0,
        status: 'uploading'
      };

      setUploadingFiles(prev => [...prev, uploadingFile]);

      try {
        const { url, thumbnailUrl } = await simulateUpload(file);
        
        setUploadingFiles(prev => 
          prev.map(f => 
            f.file === file 
              ? { ...f, status: 'completed', progress: 100, url, thumbnailUrl }
              : f
          )
        );

        // Call parent callback
        onFileUpload(file, url, thumbnailUrl);
        toast.success(`${file.name} uploaded successfully`);

      } catch (error) {
        setUploadingFiles(prev => 
          prev.map(f => 
            f.file === file 
              ? { ...f, status: 'error', error: 'Upload failed' }
              : f
          )
        );
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  }, [onFileUpload, maxSize, maxFiles, uploadingFiles.length]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [disabled, handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input value
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFiles]);

  const removeFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(f => f.file !== file));
  };

  const retryUpload = async (file: File) => {
    setUploadingFiles(prev => 
      prev.map(f => 
        f.file === file 
          ? { ...f, status: 'uploading', progress: 0, error: undefined }
          : f
      )
    );

    try {
      const { url, thumbnailUrl } = await simulateUpload(file);
      
      setUploadingFiles(prev => 
        prev.map(f => 
          f.file === file 
            ? { ...f, status: 'completed', progress: 100, url, thumbnailUrl }
            : f
        )
      );

      onFileUpload(file, url, thumbnailUrl);
      toast.success(`${file.name} uploaded successfully`);

    } catch (error) {
      setUploadingFiles(prev => 
        prev.map(f => 
          f.file === file 
            ? { ...f, status: 'error', error: 'Upload failed' }
            : f
        )
      );
      toast.error(`Failed to upload ${file.name}`);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <motion.div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
          ${isDragOver && !disabled 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : 'border-border hover:border-primary/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        whileHover={!disabled ? { scale: 1.01 } : {}}
        whileTap={!disabled ? { scale: 0.99 } : {}}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />

        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: isDragOver ? 1.1 : 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        </motion.div>

        <h3 className="text-lg font-medium mb-2">
          {isDragOver ? 'Drop files here' : 'Upload files'}
        </h3>
        <p className="text-muted-foreground mb-4">
          Drag & drop files here, or click to browse
        </p>
        
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <Badge variant="secondary">Images</Badge>
          <Badge variant="secondary">Videos</Badge>
          <Badge variant="secondary">Audio</Badge>
          <Badge variant="secondary">Documents</Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          Max {maxSize}MB per file • Up to {maxFiles} files
        </p>
      </motion.div>

      {/* Upload Progress */}
      <AnimatePresence>
        {uploadingFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {uploadingFiles.map((uploadingFile, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-card border rounded-lg p-4"
              >
                <div className="flex items-center gap-3">
                  {getFileIcon(uploadingFile.file)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium truncate">
                        {uploadingFile.file.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        {uploadingFile.status === 'completed' && (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
                        {uploadingFile.status === 'error' && (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(uploadingFile.file)}
                          className="w-6 h-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                      <span>{formatFileSize(uploadingFile.file.size)}</span>
                      {uploadingFile.status === 'error' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryUpload(uploadingFile.file)}
                          className="h-6 text-xs"
                        >
                          Retry
                        </Button>
                      )}
                    </div>

                    {uploadingFile.status === 'uploading' && (
                      <Progress value={uploadingFile.progress} className="h-2" />
                    )}

                    {uploadingFile.status === 'error' && uploadingFile.error && (
                      <p className="text-sm text-red-500">{uploadingFile.error}</p>
                    )}

                    {uploadingFile.status === 'completed' && uploadingFile.url && (
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(uploadingFile.url, '_blank')}
                          className="h-6 text-xs"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                        {uploadingFile.thumbnailUrl && (
                          <img 
                            src={uploadingFile.thumbnailUrl} 
                            alt="Thumbnail"
                            className="w-8 h-8 rounded object-cover"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}