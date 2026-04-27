import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  FileImage,
  Loader,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { captureImageFile, isNativePlatform } from '../services/nativeCapabilities';
import { uploadMediaFile } from '../services/mediaUploadService';

export interface DocumentUploadPanelProps {
  documentType: string;
  onDocumentCapture: (data: {
    file: File;
    preview: string;
    data: {
      name?: string;
      number?: string;
      expiryDate?: string;
      dateOfBirth?: string;
      documentUrl?: string;
      mimeType?: string;
      size?: number;
      documentType?: string;
      [key: string]: any;
    };
  }) => void;
  loading?: boolean;
  error?: string | null;
  onError?: (error: string) => void;
}

const maxFileSize = 5 * 1024 * 1024;

const documentLabels: Record<string, string> = {
  national_id: 'National ID',
  passport: 'Passport',
  driver_license: "Driver's License",
};

const readPreview = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = () => reject(new Error('Unable to preview this document.'));
    reader.readAsDataURL(file);
  });

export const DocumentUploadPanel: React.FC<DocumentUploadPanelProps> = ({
  documentType,
  onDocumentCapture,
  loading = false,
  error = null,
  onError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const label = documentLabels[documentType] || documentType;

  const reset = () => {
    setPreview(null);
    setSelectedFile(null);
    setUploadedUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      onError?.('Please select an image file.');
      return false;
    }

    if (file.size > maxFileSize) {
      onError?.('File size must be less than 5MB.');
      return false;
    }

    return true;
  };

  const prepareFile = async (file: File) => {
    if (!validateFile(file)) {
      return;
    }

    try {
      const nextPreview = await readPreview(file);
      setSelectedFile(file);
      setPreview(nextPreview);
      setUploadedUrl(null);
    } catch (previewError) {
      onError?.(
        previewError instanceof Error
          ? previewError.message
          : 'Unable to preview this document.',
      );
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await prepareFile(file);
  };

  const handleNativeCapture = async (source: 'camera' | 'photos') => {
    try {
      const capturedFile = await captureImageFile(source, {
        quality: 92,
        allowEditing: false,
      });
      await prepareFile(capturedFile);
    } catch (captureError) {
      if (captureError instanceof Error && /cancel/i.test(captureError.message)) {
        return;
      }

      onError?.('Unable to access the camera right now.');
    }
  };

  const handleConfirmDocument = async () => {
    if (!selectedFile || !preview) {
      onError?.('Please select a document.');
      return;
    }

    setUploading(true);

    try {
      const uploadedAsset = await uploadMediaFile(selectedFile, {
        extraFields: {
          documentType,
        },
      });

      setUploadedUrl(uploadedAsset.url);

      onDocumentCapture({
        file: selectedFile,
        preview,
        data: {
          documentType,
          documentUrl: uploadedAsset.url,
          mimeType: uploadedAsset.mimeType || selectedFile.type,
          size: uploadedAsset.size || selectedFile.size,
        },
      });

      toast.success(`${label} uploaded successfully.`);
      reset();
    } catch (uploadError) {
      onError?.(
        uploadError instanceof Error ? uploadError.message : 'Unable to upload document.',
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg rounded-lg bg-white p-6 shadow-md">
      <h3 className="mb-4 text-xl font-bold text-gray-900">Upload {label}</h3>

      {error ? (
        <div className="mb-4 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : null}

      {preview ? (
        <div className="mb-6 space-y-4">
          <div className="overflow-hidden rounded-lg bg-gray-100">
            <img src={preview} alt="Document preview" className="w-full h-auto" />
          </div>

          <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
            <p className="font-medium text-gray-900">{selectedFile?.name}</p>
            <p>{selectedFile ? `${Math.round(selectedFile.size / 1024)} KB` : ''}</p>
            {uploadedUrl ? (
              <p className="mt-2 break-all text-xs text-gray-500">{uploadedUrl}</p>
            ) : (
              <p className="mt-2 text-xs text-gray-500">
                We upload the document when you confirm it.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <RefreshCw className="mr-2 inline h-4 w-4" />
              Retake
            </button>
            <button
              type="button"
              onClick={() => {
                void handleConfirmDocument();
              }}
              disabled={uploading || loading}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700 disabled:bg-gray-400"
            >
              {uploading || loading ? (
                <>
                  <Loader className="mr-2 inline h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 inline h-4 w-4" />
                  Confirm & Upload
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 font-medium text-gray-700 transition hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
          >
            <Upload className="h-5 w-5" />
            Choose from Gallery
          </button>

          {isNativePlatform() ? (
            <>
              <button
                type="button"
                onClick={() => {
                  void handleNativeCapture('camera');
                }}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 font-medium text-gray-700 transition hover:border-green-500 hover:bg-green-50 disabled:opacity-50"
              >
                <Camera className="h-5 w-5" />
                Take Photo with Camera
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleNativeCapture('photos');
                }}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 font-medium text-gray-700 transition hover:border-purple-500 hover:bg-purple-50 disabled:opacity-50"
              >
                <FileImage className="h-5 w-5" />
                Pick from Photo Library
              </button>
            </>
          ) : null}
        </div>
      )}

      <div className="rounded-lg bg-blue-50 p-4">
        <p className="mb-2 text-sm font-semibold text-blue-900">Document Requirements</p>
        <ul className="space-y-1 text-xs text-blue-800">
          <li>• Clear, well-lit image</li>
          <li>• All four corners visible</li>
          <li>• No glare or heavy reflection</li>
          <li>• JPG or PNG format, max 5MB</li>
          <li>• Upload happens only after confirmation</li>
        </ul>
      </div>
    </div>
  );
};

export default DocumentUploadPanel;
