/**
 * DocumentUploadPanel Component
 * 
 * Dedicated component for document upload with image preview,
 * OCR processing, and validation
 * 
 * @author PropertyHub Team
 */

import React, { useState, useRef } from 'react';
import { Camera, Loader, CheckCircle2, AlertCircle, X } from 'lucide-react';

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
      [key: string]: any;
    };
  }) => void;
  loading?: boolean;
  error?: string | null;
  onError?: (error: string) => void;
}

export const DocumentUploadPanel: React.FC<DocumentUploadPanelProps> = ({
  documentType,
  onDocumentCapture,
  loading = false,
  error = null,
  onError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [useCamera, setUseCamera] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  // Get document type label
  const getDocTypeLabel = () => {
    const labels: { [key: string]: string } = {
      national_id: 'National ID',
      passport: 'Passport',
      driver_license: "Driver's License",
    };
    return labels[documentType] || documentType;
  };

  // Handle file selection from gallery
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      onError?.('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onError?.('File size must be less than 5MB');
      return;
    }

    processFile(file);
  };

  // Handle camera capture
  const handleCameraStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setUseCamera(true);
      }
    } catch (err) {
      onError?.('Failed to access camera');
    }
  };

  const handleCameraCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `document-${Date.now()}.jpg`, {
              type: 'image/jpeg',
            });
            processFile(file);
            stopCamera();
          }
        }, 'image/jpeg');
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setUseCamera(false);
  };

  // Process file (validation + preview + OCR)
  const processFile = async (file: File) => {
    setSelectedFile(file);
    setProcessing(true);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Simulate OCR processing
    try {
      // In real implementation, this would call backend OCR service
      const mockData = await simulateOCR(documentType);
      setExtractedData(mockData);
    } catch (err) {
      onError?.('Failed to extract document data');
    } finally {
      setProcessing(false);
    }
  };

  // Simulate OCR data extraction
  const simulateOCR = async (docType: string): Promise<any> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockData: { [key: string]: any } = {
          national_id: {
            number: 'GH-123456789-0',
            name: 'Scanned name',
            dateOfBirth: '1990-05-15',
            gender: 'Male',
            issueDate: '2020-01-10',
            expiryDate: '2025-01-10',
          },
          passport: {
            number: 'A00123456',
            name: 'Scanned name',
            dateOfBirth: '1990-05-15',
            nationality: 'Ghana',
            gender: 'M',
            issueDate: '2019-03-20',
            expiryDate: '2029-03-20',
          },
          driver_license: {
            number: 'DL-2020-GH-00123',
            name: 'Scanned name',
            dateOfBirth: '1990-05-15',
            licenseClass: 'A',
            issueDate: '2020-06-15',
            expiryDate: '2025-06-15',
          },
        };

        resolve(mockData[docType] || {});
      }, 1500);
    });
  };

  // Handle document confirmation
  const handleConfirmDocument = () => {
    if (!selectedFile || !preview) {
      onError?.('Please select a document');
      return;
    }

    onDocumentCapture({
      file: selectedFile,
      preview,
      data: extractedData || {},
    });

    // Reset form
    setSelectedFile(null);
    setPreview(null);
    setExtractedData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setExtractedData(null);
    setUseCamera(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-lg mx-auto">
      {/* Header */}
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        Upload {getDocTypeLabel()}
      </h3>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Preview Section */}
      {preview ? (
        <div className="mb-6">
          {/* Image Preview */}
          <div className="relative mb-4 rounded-lg overflow-hidden bg-gray-100">
            <img src={preview} alt="Document preview" className="w-full h-auto" />
          </div>

          {/* Processing State */}
          {processing ? (
            <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
              <Loader className="w-5 h-5 text-blue-600 animate-spin mr-2" />
              <p className="text-blue-700">Extracting document data...</p>
            </div>
          ) : null}

          {/* Extracted Data Display */}
          {extractedData && !processing && (
            <div className="mb-4 space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Extracted Information
              </h4>
              <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                {Object.entries(extractedData).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center">
                    <label className="text-sm text-gray-600 font-medium">
                      {key
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, (str) => str.toUpperCase())}
                      :
                    </label>
                    <input
                      type="text"
                      value={(value as any) || ''}
                      onChange={(e) => {
                        setExtractedData({
                          ...extractedData,
                          [key]: e.target.value,
                        });
                      }}
                      className="flex-1 ml-2 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              <X className="w-4 h-4 inline mr-2" />
              Retake
            </button>
            <button
              onClick={handleConfirmDocument}
              disabled={processing || loading}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition font-medium"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 inline mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 inline mr-2" />
                  Confirm & Upload
                </>
              )}
            </button>
          </div>
        </div>
      ) : useCamera ? (
        // Camera View
        <div className="mb-6 space-y-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg bg-black"
          />
          <div className="flex gap-3">
            <button
              onClick={stopCamera}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCameraCapture}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Capture
            </button>
          </div>
        </div>
      ) : (
        // Upload Options
        <div className="space-y-3 mb-6">
          {/* Gallery Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition flex items-center justify-center gap-2 text-gray-700 font-medium disabled:opacity-50"
          >
            <Camera className="w-5 h-5" />
            Choose from Gallery
          </button>

          {/* Camera Option */}
          <button
            onClick={handleCameraStart}
            disabled={loading}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition flex items-center justify-center gap-2 text-gray-700 font-medium disabled:opacity-50"
          >
            <Camera className="w-5 h-5" />
            Take Photo with Camera
          </button>
        </div>
      )}

      {/* Guidelines */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="text-sm font-semibold text-blue-900 mb-2">Document Requirements:</p>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>✓ Clear, well-lit image</li>
          <li>✓ All four corners visible</li>
          <li>✓ No glare or reflection</li>
          <li>✓ Document not expired</li>
          <li>✓ JPG or PNG format, max 5MB</li>
        </ul>
      </div>

      {/* Hidden Canvas for camera capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default DocumentUploadPanel;
