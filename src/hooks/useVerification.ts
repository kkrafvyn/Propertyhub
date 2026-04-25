/**
 * useVerification Hook
 * 
 * Custom React hook for user verification management
 * Handles ID verification, document upload, and status tracking
 * 
 * @author PropertyHub Team
 */

import { useState, useCallback, useEffect } from 'react';
import {
  verificationRequestService,
  documentVerificationService,
  userVerificationService,
  fraudDetectionService,
  verificationWorkflowService,
} from '../services/verificationService';
import type {
  VerificationRequest,
  VerificationDocument,
  UserVerificationStatus,
  FraudAlert,
} from '../types/verification';

const VERIFICATION_USER_STORAGE_KEYS = ['currentUser', 'propertyHubUser'] as const;

const getActiveUserId = (): string => {
  if (typeof window === 'undefined') return '';

  for (const key of VERIFICATION_USER_STORAGE_KEYS) {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) continue;

    try {
      const parsed = JSON.parse(rawValue);
      if (typeof parsed?.id === 'string' && parsed.id.length > 0) {
        return parsed.id;
      }
    } catch {
      // Ignore malformed cached values.
    }
  }

  return '';
};

export interface UseVerificationState {
  request: VerificationRequest | null;
  documents: VerificationDocument[];
  status: UserVerificationStatus | null;
  fraudAlerts: FraudAlert[];
  fraudAnalysis: any;
  loading: boolean;
  error: Error | null;
  uploadProgress: number;
}

export interface UseVerificationReturn extends UseVerificationState {
  initiateVerification: (verificationType: string) => Promise<void>;
  uploadDocument: (documentData: Partial<VerificationDocument>) => Promise<void>;
  getVerificationStatus: (userId: string) => Promise<void>;
  analyzeFraud: (userId: string) => Promise<void>;
  completeVerification: () => Promise<boolean>;
  rejectDocument: (documentId: string, reason: string) => Promise<void>;
  clearError: () => void;
}

export const useVerification = (): UseVerificationReturn => {
  const [state, setState] = useState<UseVerificationState>({
    request: null,
    documents: [],
    status: null,
    fraudAlerts: [],
    fraudAnalysis: null,
    loading: false,
    error: null,
    uploadProgress: 0,
  });

  const initiateVerification = useCallback(async (verificationType: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const userId = getActiveUserId();
      const result = await verificationWorkflowService.initiateVerification(userId, verificationType);
      if (result.error) throw result.error;

      // Fetch the created request
      const { data: request } = userId
        ? await verificationRequestService.getUserVerificationRequest(userId)
        : { data: null as VerificationRequest | null };

      setState((prev) => ({
        ...prev,
        request:
          request ||
          ({
            id: result.requestId,
            user_id: userId,
            verification_type: verificationType,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as VerificationRequest),
        loading: false,
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Verification initiation failed');
      setState((prev) => ({ ...prev, error, loading: false }));
      throw error;
    }
  }, []);

  const uploadDocument = useCallback(async (documentData: Partial<VerificationDocument>) => {
    setState((prev) => ({ ...prev, loading: true, error: null, uploadProgress: 0 }));
    try {
      const { data, error } = await documentVerificationService.uploadDocument(documentData);
      if (error) throw error;

      setState((prev) => ({
        ...prev,
        documents: [data as VerificationDocument, ...prev.documents],
        uploadProgress: 100,
        loading: false,
      }));

      // Reset progress after 2 seconds
      setTimeout(() => {
        setState((prev) => ({ ...prev, uploadProgress: 0 }));
      }, 2000);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Document upload failed');
      setState((prev) => ({ ...prev, error, loading: false }));
      throw error;
    }
  }, []);

  const getVerificationStatus = useCallback(async (userId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await userVerificationService.getUserVerificationStatus(userId);
      setState((prev) => ({
        ...prev,
        status: result.status,
        loading: false,
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch verification status');
      setState((prev) => ({ ...prev, error, loading: false }));
    }
  }, []);

  const analyzeFraud = useCallback(async (userId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [analysis, alerts] = await Promise.all([
        fraudDetectionService.analyzeFraudPatterns(userId),
        fraudDetectionService.getUserFraudAlerts(userId),
      ]);

      setState((prev) => ({
        ...prev,
        fraudAnalysis: analysis,
        fraudAlerts: alerts.data || [],
        loading: false,
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Fraud analysis failed');
      setState((prev) => ({ ...prev, error, loading: false }));
    }
  }, []);

  const completeVerification = useCallback(async (): Promise<boolean> => {
    if (!state.request) {
      setState((prev) => ({
        ...prev,
        error: new Error('No active verification request'),
      }));
      return false;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await verificationWorkflowService.completeVerificationCheck(state.request.id);

      if (!result.approved) {
        throw new Error(result.message);
      }

      setState((prev) => ({
        ...prev,
        request: { ...prev.request!, status: 'approved' },
        loading: false,
      }));

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Verification completion failed');
      setState((prev) => ({ ...prev, error, loading: false }));
      return false;
    }
  }, [state.request]);

  const rejectDocument = useCallback(async (documentId: string, reason: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await documentVerificationService.rejectDocument(documentId, reason);
      if (error) throw error;

      setState((prev) => ({
        ...prev,
        documents: prev.documents.map((d) => (d.id === documentId ? { ...d, status: 'rejected' } : d)),
        loading: false,
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Document rejection failed');
      setState((prev) => ({ ...prev, error, loading: false }));
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    initiateVerification,
    uploadDocument,
    getVerificationStatus,
    analyzeFraud,
    completeVerification,
    rejectDocument,
    clearError,
  };
};

export default useVerification;
