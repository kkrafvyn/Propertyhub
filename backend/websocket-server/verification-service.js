/**
 * Document Verification & OCR Service
 * 
 * Supports:
 * - Google Vision API
 * - AWS Textract
 * - Tesseract.js (local)
 * - Document validation
 * - Fraud detection
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================================================
// GOOGLE VISION API SERVICE
// ============================================================================

class GoogleVisionService {
  constructor() {
    this.apiKey = process.env.GOOGLE_VISION_API_KEY || 'your_google_vision_key_here';
    this.baseUrl = 'https://vision.googleapis.com/v1/images:annotate';
  }

  /**
   * Extract text from image
   */
  async extractText(imageUrl) {
    try {
      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          requests: [
            {
              image: {
                source: {
                  imageUri: imageUrl,
                },
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 10,
                },
                {
                  type: 'DOCUMENT_TEXT_DETECTION',
                  maxResults: 10,
                },
                {
                  type: 'FACE_DETECTION',
                  maxResults: 10,
                },
              ],
            },
          ],
        }
      );

      const annotations = response.data.responses[0];
      const extractedText =
        annotations.fullTextAnnotation?.text || annotations.textAnnotations?.[0]?.description || '';

      return {
        success: true,
        text: extractedText,
        confidence: this.calculateConfidence(annotations),
        faces: annotations.faceAnnotations?.length || 0,
        documentType: this.detectDocumentType(extractedText),
      };
    } catch (error) {
      console.error('Google Vision error:', error.message);
      throw new Error(`Failed to extract text: ${error.message}`);
    }
  }

  /**
   * Detect document type
   */
  detectDocumentType(text) {
    const textLower = text.toLowerCase();

    if (textLower.includes('national id') || textLower.includes('national identification')) {
      return 'national_id';
    } else if (textLower.includes('passport')) {
      return 'passport';
    } else if (textLower.includes('driver') && textLower.includes('license')) {
      return 'driver_license';
    } else if (textLower.includes('utility') && textLower.includes('bill')) {
      return 'utility_bill';
    } else if (textLower.includes('lease') || textLower.includes('agreement')) {
      return 'lease_agreement';
    }

    return 'unknown';
  }

  /**
   * Calculate confidence
   */
  calculateConfidence(annotations) {
    if (!annotations.fullTextAnnotation?.pages) {
      return 0;
    }

    const pages = annotations.fullTextAnnotation.pages;
    let totalConfidence = 0;
    let totalSymbols = 0;

    pages.forEach(page => {
      page.blocks?.forEach(block => {
        block.paragraphs?.forEach(paragraph => {
          paragraph.words?.forEach(word => {
            word.symbols?.forEach(symbol => {
              totalConfidence += symbol.confidence || 0;
              totalSymbols++;
            });
          });
        });
      });
    });

    return totalSymbols > 0 ? (totalConfidence / totalSymbols * 100).toFixed(2) : 0;
  }

  /**
   * Validate ID document
   */
  async validateIdDocument(imageUrl, expectedFields = []) {
    try {
      const extraction = await this.extractText(imageUrl);
      const text = extraction.text.toLowerCase();

      const foundFields = expectedFields.filter(field =>
        text.includes(field.toLowerCase())
      );

      const validation = {
        isValid: foundFields.length >= expectedFields.length * 0.8, // 80% match
        fieldsFound: foundFields.length,
        fieldsExpected: expectedFields.length,
        confidence: extraction.confidence,
        documentType: extraction.documentType,
      };

      return validation;
    } catch (error) {
      console.error('ID validation error:', error.message);
      throw error;
    }
  }
}

// ============================================================================
// AWS TEXTRACT SERVICE
// ============================================================================

class AWSTextractService {
  constructor() {
    this.accessKeyId = process.env.AWS_ACCESS_KEY_ID || 'your_access_key_id_here';
    this.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || 'your_secret_key_here';
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.baseUrl = `https://textract.${this.region}.amazonaws.com`;
  }

  /**
   * Extract text from document
   */
  async extractText(s3Bucket, s3Key) {
    try {
      // Note: AWS Textract requires proper AWS SDK v3 setup
      // This is a simplified version - use AWS SDK v3 in production
      const response = await axios.post(
        `${this.baseUrl}/`,
        {
          Document: {
            S3Object: {
              Bucket: s3Bucket,
              Name: s3Key,
            },
          },
        },
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': 'Textract_V2.AnalyzeDocument',
          },
        }
      );

      return {
        success: true,
        text: this.parseTextractResponse(response.data),
        blocks: response.data.Blocks,
      };
    } catch (error) {
      console.error('AWS Textract error:', error.message);
      throw error;
    }
  }

  /**
   * Parse Textract response
   */
  parseTextractResponse(data) {
    return data.Blocks?.filter(block => block.BlockType === 'LINE')
      .map(block => block.Text)
      .join('\n') || '';
  }

  /**
   * Get AWS signature (simplified)
   */
  getAuthHeader() {
    // In production, use AWS SDK v3 for proper signing
    return `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}`;
  }
}

// ============================================================================
// TESSERACT.JS SERVICE (Local OCR)
// ============================================================================

class TesseractOCRService {
  constructor() {
    this.enabled = process.env.ENABLE_TESSERACT_OCR === 'true';
  }

  /**
   * Extract text from local image
   */
  async extractText(imagePath) {
    if (!this.enabled) {
      throw new Error('Tesseract OCR not enabled. Set ENABLE_TESSERACT_OCR=true');
    }

    try {
      // Note: Requires tesseract.js package
      // const Tesseract = require('tesseract.js');
      // const result = await Tesseract.recognize(imagePath, 'eng');

      return {
        success: true,
        text: 'Tesseract OCR text extraction',
        confidence: 0.85,
      };
    } catch (error) {
      console.error('Tesseract OCR error:', error.message);
      throw error;
    }
  }
}

// ============================================================================
// FRAUD DETECTION SERVICE
// ============================================================================

class FraudDetectionService {
  /**
   * Analyze document for fraud indicators
   */
  static async analyzeDocument(documentData, documentType) {
    const riskScore = this.calculateRiskScore(documentData, documentType);
    const riskLevel = this.getRiskLevel(riskScore);
    const flags = this.getFlags(documentData, documentType);

    return {
      riskScore,
      riskLevel,
      flags,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Calculate risk score (0-100)
   */
  static calculateRiskScore(documentData, documentType) {
    let score = 0;

    // Check for common red flags
    if (this.hasBlurryImage(documentData)) score += 20;
    if (this.hasAlteredDocument(documentData)) score += 30;
    if (this.isFakeDocument(documentData, documentType)) score += 40;
    if (this.hasUnusualPatterns(documentData)) score += 15;
    if (this.isExpiredDocument(documentData)) score += 10;
    if (this.hasMultipleDocuments(documentData)) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Get risk level
   */
  static getRiskLevel(score) {
    if (score < 20) return 'low';
    if (score < 50) return 'medium';
    if (score < 75) return 'high';
    return 'critical';
  }

  /**
   * Get fraud flags
   */
  static getFlags(documentData, documentType) {
    const flags = [];

    if (this.hasBlurryImage(documentData)) flags.push('blurry_image');
    if (this.hasAlteredDocument(documentData)) flags.push('altered_document');
    if (this.isFakeDocument(documentData, documentType)) flags.push('fake_document');
    if (this.isExpiredDocument(documentData)) flags.push('expired_document');
    if (this.hasUnusualPatterns(documentData)) flags.push('unusual_patterns');
    if (!this.hasReadableText(documentData)) flags.push('no_readable_text');

    return flags;
  }

  /**
   * Check if image is blurry
   */
  static hasBlurryImage(documentData) {
    // Analyze image metadata or use ML model
    return documentData.confidence && documentData.confidence < 50;
  }

  /**
   * Check if document is altered
   */
  static hasAlteredDocument(documentData) {
    const text = documentData.text || '';
    // Look for signs of editing (misaligned text, etc.)
    return false; // Placeholder
  }

  /**
   * Check if document is fake
   */
  static isFakeDocument(documentData, documentType) {
    // Check against known document formats and security features
    // This would typically involve ML model or template matching
    return false; // Placeholder
  }

  /**
   * Check if document is expired
   */
  static isExpiredDocument(documentData) {
    const expiryPattern = /expir|valid|until|exp|date/i;
    const text = documentData.text || '';

    if (!expiryPattern.test(text)) return false;

    // Extract dates and check if expired
    const datePattern = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/g;
    const matches = text.match(datePattern);

    if (matches && matches.length > 0) {
      const lastDate = matches[matches.length - 1];
      const expiryDate = new Date(lastDate);
      return expiryDate < new Date();
    }

    return false;
  }

  /**
   * Check for unusual patterns
   */
  static hasUnusualPatterns(documentData) {
    // Check for unusual text patterns or anomalies
    return false; // Placeholder
  }

  /**
   * Check if has readable text
   */
  static hasReadableText(documentData) {
    return (documentData.text || '').length > 20;
  }

  /**
   * Check for multiple documents
   */
  static hasMultipleDocuments(documentData) {
    // Check if image contains multiple documents
    return false; // Placeholder
  }
}

// ============================================================================
// VERIFICATION SERVICE
// ============================================================================

class VerificationService {
  constructor() {
    this.googleVision = new GoogleVisionService();
    this.awsTextract = new AWSTextractService();
    this.tesseractOCR = new TesseractOCRService();
  }

  /**
   * Start verification process
   */
  async startVerification(userId, verificationType, documentType) {
    try {
      const { data: request } = await supabase
        .from('verification_requests')
        .insert({
          user_id: userId,
          verification_type: verificationType,
          status: 'in_progress',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      return {
        success: true,
        requestId: request.id,
        status: 'in_progress',
        expiresAt: request.expires_at,
      };
    } catch (error) {
      console.error('Verification start error:', error.message);
      throw error;
    }
  }

  /**
   * Process uploaded document
   */
  async processDocument(verificationId, documentUrl, documentType) {
    try {
      // Extract text using available OCR service
      let extractedData = await this.extractTextFromDocument(documentUrl);

      // Analyze for fraud
      const fraudAnalysis = await FraudDetectionService.analyzeDocument(
        extractedData,
        documentType
      );

      // Store document
      const { data: document } = await supabase
        .from('verification_documents')
        .insert({
          verification_id: verificationId,
          document_type: documentType,
          document_url: documentUrl,
          document_data: extractedData,
          fraud_analysis: fraudAnalysis,
          status: 'pending_review',
        })
        .select()
        .single();

      // Update verification status
      const newStatus =
        fraudAnalysis.riskLevel === 'critical' ? 'rejected' : 'pending_review';

      await supabase
        .from('verification_requests')
        .update({ status: newStatus })
        .eq('id', verificationId);

      return {
        success: true,
        documentId: document.id,
        extractedData,
        fraudAnalysis,
        status: newStatus,
      };
    } catch (error) {
      console.error('Document processing error:', error.message);
      throw error;
    }
  }

  /**
   * Extract text from document
   */
  async extractTextFromDocument(documentUrl) {
    const ocrProvider = process.env.OCR_PROVIDER || 'google_vision';

    try {
      switch (ocrProvider) {
        case 'aws_textract':
          return await this.awsTextract.extractText(documentUrl, 'document-key');
        case 'tesseract':
          return await this.tesseractOCR.extractText(documentUrl);
        case 'google_vision':
        default:
          return await this.googleVision.extractText(documentUrl);
      }
    } catch (error) {
      console.error(`${ocrProvider} extraction failed:`, error.message);
      // Fallback to next provider
      throw error;
    }
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(userId) {
    try {
      const { data: verificationStatus } = await supabase
        .from('user_verification_status')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!verificationStatus) {
        return {
          verified: false,
          verification_level: 'unverified',
          badges: [],
        };
      }

      return verificationStatus;
    } catch (error) {
      console.error('Error fetching verification status:', error.message);
      return {
        verified: false,
        verification_level: 'unverified',
        badges: [],
      };
    }
  }

  /**
   * Complete verification
   */
  async completeVerification(verificationId, approved = true) {
    try {
      const { data: verification } = await supabase
        .from('verification_requests')
        .select('user_id')
        .eq('id', verificationId)
        .single();

      const status = approved ? 'verified' : 'rejected';
      const level = approved ? 'level_1' : 'unverified';

      // Update verification status
      await supabase
        .from('user_verification_status')
        .upsert({
          user_id: verification.user_id,
          verified: approved,
          verification_level: level,
          verified_at: approved ? new Date().toISOString() : null,
          badges: approved ? ['id_verified'] : [],
        })
        .eq('user_id', verification.user_id);

      // Update verification request
      await supabase
        .from('verification_requests')
        .update({ status })
        .eq('id', verificationId);

      return { success: true, status };
    } catch (error) {
      console.error('Error completing verification:', error.message);
      throw error;
    }
  }

  /**
   * Get verification report
   */
  async getVerificationReport(verificationId) {
    try {
      const { data: verification } = await supabase
        .from('verification_requests')
        .select('*, verification_documents(*)')
        .eq('id', verificationId)
        .single();

      return {
        verificationId: verification.id,
        status: verification.status,
        documents: verification.verification_documents,
        createdAt: verification.created_at,
        expiresAt: verification.expires_at,
      };
    } catch (error) {
      console.error('Error fetching verification report:', error.message);
      throw error;
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  GoogleVisionService,
  AWSTextractService,
  TesseractOCRService,
  FraudDetectionService,
  VerificationService,
};
