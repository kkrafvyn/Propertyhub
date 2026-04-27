import React, { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  Camera,
  Check,
  Download,
  File,
  Image as ImageIcon,
  Music,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  captureImageFile,
  isNativePlatform,
  openExternalUrl,
} from '../services/nativeCapabilities';
import { uploadMediaFile } from '../services/mediaUploadService';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';

interface FileUploadProps {
  onFileUpload: (file: File, fileUrl: string, thumbnailUrl?: string) => void;
  accept?: string;
  maxSize?: number;
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
const SUPPORTED_AUDIO_TYPES = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/mpeg'];

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const unitBase = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(unitBase));
  return `${parseFloat((bytes / unitBase ** unitIndex).toFixed(2))} ${sizes[unitIndex]}`;
};

const getFileIcon = (file: File) => {
  if (SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    return <ImageIcon className="w-6 h-6 text-blue-500" />;
  }

  if (SUPPORTED_VIDEO_TYPES.includes(file.type)) {
    return <Video className="w-6 h-6 text-purple-500" />;
  }

  if (SUPPORTED_AUDIO_TYPES.includes(file.type)) {
    return <Music className="w-6 h-6 text-green-500" />;
  }

  return <File className="w-6 h-6 text-gray-500" />;
};

const generateThumbnail = (file: File): Promise<string | undefined> =>
  new Promise((resolve) => {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      resolve(undefined);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const image = new Image();

    image.onload = () => {
      const maxDimension = 200;
      let { width, height } = image;

      if (width > height && width > maxDimension) {
        height = (height * maxDimension) / width;
        width = maxDimension;
      } else if (height >= width && height > maxDimension) {
        width = (width * maxDimension) / height;
        height = maxDimension;
      }

      canvas.width = width;
      canvas.height = height;
      context?.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(previewUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };

    image.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      resolve(undefined);
    };

    image.src = previewUrl;
  });

export function FileUpload({
  onFileUpload,
  accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar',
  maxSize = 50,
  maxFiles = 5,
  disabled = false,
  className = '',
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      const maxSizeBytes = maxSize * 1024 * 1024;

      if (file.size > maxSizeBytes) {
        return `File size must be less than ${maxSize}MB`;
      }

      if (uploadingFiles.length >= maxFiles) {
        return `Maximum ${maxFiles} files allowed`;
      }

      return null;
    },
    [maxFiles, maxSize, uploadingFiles.length]
  );

  const updateUploadState = useCallback((file: File, updates: Partial<UploadingFile>) => {
    setUploadingFiles((previous) =>
      previous.map((entry) => (entry.file === file ? { ...entry, ...updates } : entry))
    );
  }, []);

  const performUpload = useCallback(
    async (file: File) => {
      const thumbnailUrl = await generateThumbnail(file);
      const progressInterval = window.setInterval(() => {
        setUploadingFiles((previous) =>
          previous.map((entry) => {
            if (entry.file !== file || entry.status !== 'uploading') {
              return entry;
            }

            return {
              ...entry,
              progress: Math.min(entry.progress + 14, 85),
            };
          })
        );
      }, 180);

      try {
        const uploadedAsset = await uploadMediaFile(file);
        window.clearInterval(progressInterval);

        updateUploadState(file, {
          status: 'completed',
          progress: 100,
          url: uploadedAsset.url,
          thumbnailUrl: thumbnailUrl || uploadedAsset.thumbnailUrl,
        });

        onFileUpload(file, uploadedAsset.url, thumbnailUrl || uploadedAsset.thumbnailUrl);
        toast.success(`${file.name} uploaded successfully`);
      } catch (error) {
        window.clearInterval(progressInterval);
        const message = error instanceof Error ? error.message : 'Upload failed';

        updateUploadState(file, {
          status: 'error',
          error: message,
        });

        toast.error(`Failed to upload ${file.name}`);
      }
    },
    [onFileUpload, updateUploadState]
  );

  const enqueueFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const validationError = validateFile(file);

        if (validationError) {
          toast.error(validationError);
          continue;
        }

        setUploadingFiles((previous) => [
          ...previous,
          {
            file,
            progress: 8,
            status: 'uploading',
          },
        ]);

        await performUpload(file);
      }
    },
    [performUpload, validateFile]
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const selectedFiles = Array.from(files);
      if (selectedFiles.length === 0) {
        return;
      }

      await enqueueFiles(selectedFiles);
    },
    [enqueueFiles]
  );

  const handleNativeCapture = useCallback(
    async (source: 'camera' | 'photos') => {
      try {
        const capturedFile = await captureImageFile(source, {
          quality: 88,
          allowEditing: false,
        });

        await enqueueFiles([capturedFile]);
      } catch (error) {
        if (error instanceof Error && /cancel/i.test(error.message)) {
          return;
        }

        toast.error('Unable to access the camera right now.');
      }
    },
    [enqueueFiles]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);

      if (disabled) {
        return;
      }

      void handleFiles(event.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const handleFileInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        void handleFiles(files);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFiles]
  );

  const removeFile = useCallback((file: File) => {
    setUploadingFiles((previous) => previous.filter((entry) => entry.file !== file));
  }, []);

  const retryUpload = useCallback(
    async (file: File) => {
      updateUploadState(file, {
        status: 'uploading',
        progress: 8,
        error: undefined,
      });

      await performUpload(file);
    },
    [performUpload, updateUploadState]
  );

  const nativeDevice = isNativePlatform();

  return (
    <div className={`space-y-4 ${className}`}>
      <motion.div
        className={`
          relative rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300
          ${
            isDragOver && !disabled
              ? 'border-primary bg-primary/5 scale-[1.02]'
              : 'border-border hover:border-primary/50'
          }
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
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
          animate={{ scale: isDragOver ? 1.08 : 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        </motion.div>

        <h3 className="mb-2 text-lg font-medium">
          {isDragOver ? 'Drop files here' : 'Upload files'}
        </h3>
        <p className="mb-4 text-muted-foreground">
          Drag and drop files here, or tap to browse your device
        </p>

        <div className="mb-4 flex flex-wrap justify-center gap-2">
          <Badge variant="secondary">Images</Badge>
          <Badge variant="secondary">Videos</Badge>
          <Badge variant="secondary">Audio</Badge>
          <Badge variant="secondary">Documents</Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          Max {maxSize}MB per file • Up to {maxFiles} files
        </p>
      </motion.div>

      {nativeDevice ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={disabled}
            onClick={() => {
              void handleNativeCapture('camera');
            }}
          >
            <Camera className="mr-2 h-4 w-4" />
            Take Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={disabled}
            onClick={() => {
              void handleNativeCapture('photos');
            }}
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            Photo Library
          </Button>
        </div>
      ) : null}

      <AnimatePresence>
        {uploadingFiles.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {uploadingFiles.map((uploadingFile) => (
              <motion.div
                key={`${uploadingFile.file.name}-${uploadingFile.file.size}-${uploadingFile.file.lastModified}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="rounded-lg border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  {getFileIcon(uploadingFile.file)}

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <h4 className="truncate font-medium">{uploadingFile.file.name}</h4>
                      <div className="flex items-center gap-2">
                        {uploadingFile.status === 'completed' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : null}
                        {uploadingFile.status === 'error' ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(uploadingFile.file)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
                      <span>{formatFileSize(uploadingFile.file.size)}</span>
                      {uploadingFile.status === 'error' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            void retryUpload(uploadingFile.file);
                          }}
                          className="h-6 text-xs"
                        >
                          Retry
                        </Button>
                      ) : null}
                    </div>

                    {uploadingFile.status === 'uploading' ? (
                      <Progress value={uploadingFile.progress} className="h-2" />
                    ) : null}

                    {uploadingFile.status === 'error' && uploadingFile.error ? (
                      <p className="text-sm text-red-500">{uploadingFile.error}</p>
                    ) : null}

                    {uploadingFile.status === 'completed' && uploadingFile.url ? (
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            void openExternalUrl(uploadingFile.url!);
                          }}
                          className="h-6 text-xs"
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Preview
                        </Button>
                        {uploadingFile.thumbnailUrl ? (
                          <img
                            src={uploadingFile.thumbnailUrl}
                            alt="Thumbnail"
                            className="h-8 w-8 rounded object-cover"
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
