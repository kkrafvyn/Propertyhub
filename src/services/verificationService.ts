/**
 * Verification Service Layer
 * 
 * ID Verification, Fraud Detection, User Verification
 * Builds trust through verified badges and document validation
 */

import { supabase } from './supabaseClient';
import { backendApiRequest } from './backendApi';
import type {
  VerificationRequest,
  VerificationDocument,
  VerificationReview,
  UserVerificationStatus,
  FraudAlert,
  VerificationConfiguration,
} from '../types/verification';

/**
 * ============================================
 * VERIFICATION REQUEST SERVICE
 * ============================================
 */

export const verificationRequestService = {
  /**
   * Create verification request
   */
  async createVerificationRequest(
    requestData: Partial<VerificationRequest>
  ): Promise<{ data: VerificationRequest | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .insert({
          ...requestData,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get user's verification request
   */
  async getUserVerificationRequest(userId: string): Promise<{ data: VerificationRequest | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get all requests for review
   */
  async getPendingRequests(limit: number = 50, offset: number = 0): Promise<{
    data: VerificationRequest[] | null;
    count: number | null;
    error: any;
  }> {
    try {
      const { data, error, count } = await supabase
        .from('verification_requests')
        .select('*', { count: 'exact' })
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { data, count, error: null };
    } catch (error) {
      return { data: null, count: null, error };
    }
  },

  /**
   * Update verification request status
   */
  async updateRequestStatus(
    requestId: string,
    status: 'approved' | 'rejected',
    reviewNotes?: string
  ): Promise<{ data: VerificationRequest | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .update({
          status,
          review_notes: reviewNotes,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

/**
 * ============================================
 * DOCUMENT VERIFICATION SERVICE
 * ============================================
 */

export const documentVerificationService = {
  /**
   * Upload verification document
   */
  async uploadDocument(
    documentData: Partial<VerificationDocument>
  ): Promise<{ data: VerificationDocument | null; error: any }> {
    try {
      try {
        const backendData = await backendApiRequest<VerificationDocument>(
          '/api/v1/verification/upload-document',
          {
            method: 'POST',
            body: JSON.stringify({
              verificationId:
                (documentData as any).verification_id ||
                (documentData as any).verification_request_id ||
                (documentData as any).verificationId,
              documentType: (documentData as any).document_type || (documentData as any).documentType,
              documentUrl: (documentData as any).document_url || (documentData as any).documentUrl,
              documentData: (documentData as any).document_data || documentData,
            }),
          }
        );

        if (backendData) {
          return { data: backendData, error: null };
        }
      } catch {
        // Fallback to direct database call when backend endpoint is unavailable.
      }

      const { data, error } = await supabase
        .from('verification_documents')
        .insert({
          ...documentData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get verification documents for request
   */
  async getRequestDocuments(requestId: string): Promise<{ data: VerificationDocument[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('verification_documents')
        .select('*')
        .eq('verification_request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Mark document as verified
   */
  async verifyDocument(documentId: string): Promise<{ data: VerificationDocument | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('verification_documents')
        .update({ status: 'verified' })
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Reject document with reason
   */
  async rejectDocument(documentId: string, reason: string): Promise<{ data: VerificationDocument | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('verification_documents')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

/**
 * ============================================
 * USER VERIFICATION STATUS SERVICE
 * ============================================
 */

export const userVerificationService = {
  /**
   * Get complete verification status for user
   */
  async getUserVerificationStatus(userId: string): Promise<{
    status: UserVerificationStatus;
    verified: boolean;
    badges: string[];
  }> {
    try {
      try {
        const backendData = await backendApiRequest<any>(
          `/api/v1/verification/status/${encodeURIComponent(userId)}`
        );

        const mappedStatus = {
          user_id: backendData?.user_id || userId,
          verification_level: backendData?.verification_level || 'unverified',
          badges: Array.isArray(backendData?.badges) ? backendData.badges : [],
          fraud_status: backendData?.fraud_status || 'clear',
          verified_at: backendData?.verified_at,
          expires_at: backendData?.expires_at,
        } as UserVerificationStatus;

        const mappedBadges = mappedStatus.badges || [];

        return {
          status: mappedStatus,
          verified: Boolean(backendData?.verified || mappedStatus.verification_level === 'verified'),
          badges: mappedBadges,
        };
      } catch {
        // Fallback to direct database composition when backend endpoint is unavailable.
      }

      // Get approved verification requests
      const { data: requests } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved');

      const verificationTypes = requests?.map((r: any) => r.verification_type) || [];
      const badges = [];

      if (verificationTypes.includes('id')) {
        badges.push('id_verified');
      }
      if (verificationTypes.includes('phone')) {
        badges.push('phone_verified');
      }
      if (verificationTypes.includes('email')) {
        badges.push('email_verified');
      }
      if (verificationTypes.includes('address')) {
        badges.push('address_verified');
      }

      // Check fraud alerts
      const { data: alerts } = await supabase
        .from('fraud_alerts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1);

      const fraudStatus = alerts && alerts.length > 0 ? 'flagged' : 'clear';

      const verified = badges.length >= 2 && fraudStatus === 'clear';

      return {
        status: {
          user_id: userId,
          verification_level: badges.length === 0 ? 'unverified' : badges.length >= 2 ? 'verified' : 'partial',
          badges,
          fraud_status: fraudStatus,
          verified_at: requests?.[0]?.verified_at,
          expires_at: requests?.[0]?.expires_at,
        } as UserVerificationStatus,
        verified,
        badges,
      };
    } catch (error) {
      console.error('Verification status error:', error);
      return {
        status: {
          user_id: userId,
          verification_level: 'unverified',
          badges: [],
          fraud_status: 'unknown',
        } as UserVerificationStatus,
        verified: false,
        badges: [],
      };
    }
  },

  /**
   * Grant verification badge to user
   */
  async grantBadge(userId: string, badge: string): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase
        .from('verification_badges')
        .insert({
          user_id: userId,
          badge,
          granted_at: new Date().toISOString(),
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  },

  /**
   * Revoke verification badge
   */
  async revokeBadge(userId: string, badge: string): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase
        .from('verification_badges')
        .delete()
        .eq('user_id', userId)
        .eq('badge', badge);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  },
};

/**
 * ============================================
 * FRAUD DETECTION SERVICE
 * ============================================
 */

export const fraudDetectionService = {
  /**
   * Create fraud alert
   */
  async createFraudAlert(alertData: Partial<FraudAlert>): Promise<{ data: FraudAlert | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('fraud_alerts')
        .insert({
          ...alertData,
          status: 'active',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Notify admins
      await supabase
        .from('notifications')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000', // Admin user
          type: 'fraud_alert',
          title: 'Fraud Alert',
          message: `Fraud alert for user ${alertData.user_id}: ${alertData.reason}`,
          data: { fraud_alert_id: data?.id },
        });

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Check for fraud patterns
   */
  async analyzeFraudPatterns(userId: string): Promise<{
    riskScore: number; // 0-100
    warnings: string[];
    requires_verification: boolean;
  }> {
    try {
      let riskScore = 0;
      const warnings: string[] = [];

      // Check 1: Multiple failed payment attempts
      const { data: failedTransactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'failed')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if ((failedTransactions?.length || 0) > 3) {
        riskScore += 25;
        warnings.push('Multiple failed payment attempts');
      }

      // Check 2: Suspicious location changes
      const { data: recentLogins } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentLogins && recentLogins.length > 1) {
        const locations = recentLogins.map((l: any) => l.location);
        const uniqueLocations = new Set(locations).size;
        if (uniqueLocations > 3) {
          riskScore += 20;
          warnings.push('Multiple location changes detected');
        }
      }

      // Check 3: Account takeover indicators
      const { data: passwordChanges } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('action', 'password_changed')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if ((passwordChanges?.length || 0) > 0) {
        riskScore += 15;
        warnings.push('Recent password change');
      }

      // Check 4: Unverified contact
      const { data: user } = await supabase
        .from('users')
        .select('email_verified, phone_verified')
        .eq('id', userId)
        .single();

      if (user && !user.email_verified) {
        riskScore += 10;
        warnings.push('Unverified email address');
      }

      // Check 5: Existing fraud alerts
      const { data: alerts } = await supabase
        .from('fraud_alerts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active');

      if ((alerts?.length || 0) > 0) {
        riskScore += 30;
        warnings.push('Active fraud alerts on account');
      }

      return {
        riskScore: Math.min(riskScore, 100),
        warnings,
        requires_verification: riskScore > 50,
      };
    } catch (error) {
      console.error('Fraud analysis error:', error);
      return { riskScore: 0, warnings: [], requires_verification: false };
    }
  },

  /**
   * Resolve fraud alert
   */
  async resolveFraudAlert(
    alertId: string,
    resolution: 'verified_genuine' | 'blocked_account' | 'under_investigation'
  ): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase
        .from('fraud_alerts')
        .update({
          status: 'resolved',
          resolution,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  },

  /**
   * Get fraud alerts for user
   */
  async getUserFraudAlerts(userId: string): Promise<{ data: FraudAlert[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('fraud_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

/**
 * ============================================
 * VERIFICATION WORKFLOW SERVICE
 * ============================================
 */

export const verificationWorkflowService = {
  /**
   * Initiate verification process
   */
  async initiateVerification(userId: string, verificationType: string): Promise<{
    requestId: string;
    nextStep: string;
    error?: any;
  }> {
    try {
      const backendVerificationTypeMap: Record<string, string> = {
        id: 'id_verification',
        address: 'address_verification',
        professional: 'professional_verification',
        id_verification: 'id_verification',
        address_verification: 'address_verification',
        professional_verification: 'professional_verification',
      };

      const backendVerificationType =
        backendVerificationTypeMap[verificationType] || 'id_verification';

      try {
        const backendData = await backendApiRequest<any>('/api/v1/verification/start', {
          method: 'POST',
          body: JSON.stringify({
            verificationType: backendVerificationType,
          }),
        });

        return {
          requestId: backendData?.id || backendData?.verification_id || '',
          nextStep: 'submit_documents',
        };
      } catch {
        // Fallback to direct database flow when backend endpoint is unavailable.
      }

      // Check for existing pending request
      const { data: existingRequest } = await verificationRequestService.getUserVerificationRequest(userId);

      if (existingRequest) {
        return {
          requestId: existingRequest.id,
          nextStep: 'submit_documents',
        };
      }

      // Create new request
      const { data: newRequest, error } = await verificationRequestService.createVerificationRequest({
        user_id: userId,
        verification_type: verificationType,
        status: 'pending',
      });

      if (error) throw error;

      return {
        requestId: newRequest?.id || '',
        nextStep: 'submit_documents',
      };
    } catch (error) {
      return {
        requestId: '',
        nextStep: '',
        error,
      };
    }
  },

  /**
   * Complete verification check
   */
  async completeVerificationCheck(requestId: string): Promise<{
    approved: boolean;
    message: string;
    badges?: string[];
  }> {
    try {
      const { data: request } = await supabase
        .from('verification_requests')
        .select('*, documents:verification_documents(*)')
        .eq('id', requestId)
        .single();

      if (!request) {
        return { approved: false, message: 'Request not found' };
      }

      // Check all documents are verified
      const documents = request.documents || [];
      const allVerified = documents.every((d: any) => d.status === 'verified');

      if (!allVerified) {
        return { approved: false, message: 'Some documents require verification' };
      }

      // Approve request
      await verificationRequestService.updateRequestStatus(requestId, 'approved');

      // Grant verification badge
      const badges = [`${request.verification_type}_verified`];
      for (const badge of badges) {
        await userVerificationService.grantBadge(request.user_id, badge);
      }

      return {
        approved: true,
        message: 'Verification approved successfully',
        badges,
      };
    } catch (error) {
      console.error('Verification check error:', error);
      return { approved: false, message: 'Verification check failed' };
    }
  },

  /**
   * Auto-verify based on trusted sources
   */
  async autoVerifyFromTrustedSource(
    userId: string,
    source: string,
    verificationLevel: string
  ): Promise<{ verified: boolean; error?: any }> {
    try {
      const trustedSources = ['bank', 'government_agency', 'partner_platform'];

      if (!trustedSources.includes(source)) {
        throw new Error('Not a trusted source');
      }

      // Create auto-verified request
      const { data: request, error } = await verificationRequestService.createVerificationRequest({
        user_id: userId,
        verification_type: verificationLevel,
        status: 'approved',
        verified_at: new Date().toISOString(),
        source,
      });

      if (error) throw error;

      // Grant badge
      await userVerificationService.grantBadge(userId, `${verificationLevel}_verified`);

      return { verified: true };
    } catch (error) {
      return { verified: false, error };
    }
  },
};

export default {
  requests: verificationRequestService,
  documents: documentVerificationService,
  users: userVerificationService,
  fraud: fraudDetectionService,
  workflow: verificationWorkflowService,
};
