/**
 * VerificationDashboard Component
 * 
 * Complete user verification interface with document upload,
 * status tracking, and fraud analysis display
 * 
 * @author PropertyHub Team
 */

import React, { useState } from 'react';
import { useVerification } from '../hooks/useVerification';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Upload,
  FileText,
  Shield,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

export interface VerificationDashboardProps {
  userId?: string;
  onVerificationComplete?: () => void;
}

export const VerificationDashboard: React.FC<VerificationDashboardProps> = ({
  userId = '',
  onVerificationComplete,
}) => {
  const {
    request,
    documents,
    status,
    fraudAlerts,
    fraudAnalysis,
    loading,
    error,
    uploadProgress,
    initiateVerification,
    uploadDocument,
    getVerificationStatus,
    analyzeFraud,
    completeVerification,
    rejectDocument,
    clearError,
  } = useVerification();

  const [selectedDocType, setSelectedDocType] = useState<string>('national_id');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentNotes, setDocumentNotes] = useState<string>('');
  const [showFraudAnalysis, setShowFraudAnalysis] = useState(false);

  // Handle verification initiation
  const handleStartVerification = async () => {
    try {
      await initiateVerification(selectedDocType);
    } catch (err) {
      console.error('Failed to start verification:', err);
    }
  };

  // Handle document upload with file validation
  const handleUploadDocument = async () => {
    if (!selectedFile) {
      alert('Please select a file');
      return;
    }

    if (!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('application/pdf')) {
      alert('Only image or PDF files are allowed');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      // 10MB limit
      alert('File size must be less than 10MB');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        await uploadDocument({
          request_id: request?.id,
          document_type: selectedDocType,
          file_name: selectedFile.name,
          file_type: selectedFile.type,
          file_content: content,
          file_size: selectedFile.size,
          notes: documentNotes || undefined,
        });
        setSelectedFile(null);
        setDocumentNotes('');
      };
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      console.error('Failed to upload document:', err);
    }
  };

  // Handle verification completion with fraud check
  const handleCompleteVerification = async () => {
    try {
      if (userId) {
        await analyzeFraud(userId);
      }
      const success = await completeVerification();
      if (success && onVerificationComplete) {
        onVerificationComplete();
      }
    } catch (err) {
      console.error('Failed to complete verification:', err);
    }
  };

  // Get status badge color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Risk score color
  const getRiskColor = (score?: number) => {
    if (!score) return 'text-gray-600';
    if (score < 30) return 'text-green-600';
    if (score < 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b pb-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Identity Verification</h1>
        </div>
        <p className="text-gray-600">
          Complete your identity verification to unlock premium features and build trust on PropertyHub
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 flex items-gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-800 font-medium">{error.message}</p>
          </div>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-800 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Verification Status Card */}
      {status && (
        <div className={`mb-6 p-4 rounded-lg border-l-4 ${getStatusColor(status.verification_status)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg">
                {status.verification_status === 'approved' && 'Verification Approved ✓'}
                {status.verification_status === 'rejected' && 'Verification Rejected'}
                {status.verification_status === 'pending' && 'Verification Pending'}
              </p>
              <p className="text-sm opacity-75 mt-1">
                Last updated: {new Date(status.last_verified_at || Date.now()).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              {status.verification_status === 'approved' && (
                <CheckCircle className="w-8 h-8 text-green-600" />
              )}
              {status.verification_status === 'rejected' && (
                <XCircle className="w-8 h-8 text-red-600" />
              )}
              {status.verification_status === 'pending' && (
                <Clock className="w-8 h-8 text-yellow-600" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Document Upload */}
        <div className="space-y-6">
          {/* Document Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Document Type
            </label>
            <div className="space-y-2">
              {['national_id', 'passport', 'driver_license'].map((type) => (
                <label key={type} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-blue-50">
                  <input
                    type="radio"
                    name="docType"
                    value={type}
                    checked={selectedDocType === type}
                    onChange={(e) => setSelectedDocType(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="ml-3 text-gray-700">
                    {type === 'national_id' && 'National ID'}
                    {type === 'passport' && 'Passport'}
                    {type === 'driver_license' && "Driver's License"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Start Verification Button */}
          {!request && (
            <button
              onClick={handleStartVerification}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition"
            >
              {loading ? 'Initializing...' : 'Start Verification'}
            </button>
          )}

          {/* File Upload */}
          {request && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Upload Document
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer block">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 10MB</p>
                  </label>
                </div>

                {/* Upload Progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Notes */}
                <textarea
                  value={documentNotes}
                  onChange={(e) => setDocumentNotes(e.target.value)}
                  placeholder="Add any notes about this document (optional)"
                  className="w-full mt-3 p-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={3}
                />

                {/* Upload Button */}
                <button
                  onClick={handleUploadDocument}
                  disabled={!selectedFile || loading}
                  className="w-full mt-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
                >
                  {loading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>

              {/* Complete Verification Button */}
              <button
                onClick={handleCompleteVerification}
                disabled={loading || documents.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition"
              >
                {loading ? 'Processing...' : 'Complete Verification'}
              </button>
            </>
          )}
        </div>

        {/* Right Column - Documents & Alerts */}
        <div className="space-y-6">
          {/* Uploaded Documents */}
          {documents.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents ({documents.length})
              </h3>
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-4 border rounded-lg ${
                      doc.status === 'approved'
                        ? 'bg-green-50 border-green-200'
                        : doc.status === 'rejected'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{doc.file_name}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(doc.status)}`}
                      >
                        {doc.status?.toUpperCase()}
                      </span>
                    </div>
                    {doc.rejection_reason && (
                      <p className="text-xs text-red-600 mt-2">Reason: {doc.rejection_reason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fraud Alerts */}
          {fraudAlerts.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Fraud Alerts
              </h3>
              <div className="space-y-2">
                {fraudAlerts.map((alert) => (
                  <div key={alert.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800">{alert.alert_type}</p>
                    <p className="text-xs text-red-600 mt-1">{alert.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fraud Analysis */}
          {fraudAnalysis && (
            <div>
              <button
                onClick={() => setShowFraudAnalysis(!showFraudAnalysis)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg hover:bg-blue-50 transition"
              >
                <span className="font-semibold text-gray-900">Fraud Analysis Results</span>
                <span className={`text-2xl font-bold ${getRiskColor(fraudAnalysis.fraudRiskScore)}`}>
                  {fraudAnalysis.fraudRiskScore}%
                </span>
              </button>

              {showFraudAnalysis && (
                <div className="mt-3 p-4 bg-gray-50 border rounded-lg space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Risk Assessment</p>
                    <p
                      className={`text-lg font-bold mt-1 ${getRiskColor(fraudAnalysis.fraudRiskScore)}`}
                    >
                      {fraudAnalysis.fraudRiskScore < 30
                        ? 'Low Risk'
                        : fraudAnalysis.fraudRiskScore < 70
                          ? 'Medium Risk'
                          : 'High Risk'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Factors</p>
                    <ul className="text-sm text-gray-600 mt-2 space-y-1">
                      {fraudAnalysis.suspiciousPatterns?.map((pattern: string, idx: number) => (
                        <li key={idx}>• {pattern}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No Alerts Message */}
          {fraudAlerts.length === 0 && fraudAnalysis?.fraudRiskScore! < 30 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">No fraud alerts detected</p>
                <p className="text-sm text-green-700 mt-1">Your verification appears to be clean</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guidelines */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">Verification Guidelines</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ Document should be clear and legible</li>
          <li>✓ Ensure your face is visible in the photo</li>
          <li>✓ Document must not be expired</li>
          <li>✓ All four corners of the document must be visible</li>
          <li>✓ No reflection or glare on the document</li>
        </ul>
      </div>
    </div>
  );
};

export default VerificationDashboard;
