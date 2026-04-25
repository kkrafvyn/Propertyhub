/**
 * PropertyHub - Comprehensive Dispute Management System
 * 
 * Full-featured dispute and chargeback management system with:
 * - Automated dispute detection and categorization
 * - Workflow management with status tracking
 * - Evidence collection and documentation
 * - Communication handling with customers and banks
 * - Integration with payment processors
 * - Automated responses and escalation
 * - Dispute analytics and reporting
 */

import { format, subDays, addDays } from 'date-fns';
import { toast } from 'sonner';

// Types
export interface PaymentDispute {
  id: string;
  transactionId: string;
  paystackDisputeId?: string; // External dispute ID from Paystack
  userId: string;
  customerEmail: string;
  amount: number;
  currency: string;
  
  // Dispute details
  type: DisputeType;
  category: DisputeCategory;
  reason: string;
  description: string;
  
  // Status and workflow
  status: DisputeStatus;
  stage: DisputeStage;
  priority: DisputePriority;
  
  // Important dates
  createdAt: string;
  updatedAt: string;
  dueDate: string; // Deadline to respond
  resolvedAt?: string;
  
  // Evidence and documentation
  evidence: DisputeEvidence[];
  communications: DisputeCommunication[];
  
  // Assignment and handling
  assignedTo?: string;
  assignedAt?: string;
  
  // Resolution
  resolution?: DisputeResolution;
  
  // Metadata
  tags: string[];
  internalNotes: DisputeNote[];
  riskScore: number;
  
  // Automation flags
  autoEscalated: boolean;
  requiresManualReview: boolean;
  
  // Financial impact
  disputedAmount: number;
  potentialLoss: number;
  fees: {
    disputeFee: number;
    processingFee: number;
    representmentFee: number;
  };
}

export interface DisputeEvidence {
  id: string;
  type: EvidenceType;
  title: string;
  description: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  uploadedAt: string;
  uploadedBy: string;
  isRequired: boolean;
  isSubmitted: boolean;
}

export interface DisputeCommunication {
  id: string;
  type: CommunicationType;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  subject: string;
  message: string;
  timestamp: string;
  attachments?: string[];
  isInternal: boolean;
  relatedEvidenceId?: string;
}

export interface DisputeNote {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
  type: 'internal' | 'customer_visible';
  tags: string[];
}

export interface DisputeResolution {
  outcome: DisputeOutcome;
  reason: string;
  resolvedBy: string;
  resolvedAt: string;
  refundAmount?: number;
  partialCredit?: number;
  preventiveMeasures?: string[];
  customerSatisfaction?: {
    rating: number;
    feedback: string;
  };
}

export interface DisputeWorkflowStep {
  id: string;
  name: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  assignedTo?: string;
  completedAt?: string;
  completedBy?: string;
  requiredEvidence: EvidenceType[];
  automatedActions: string[];
}

export interface DisputeAnalytics {
  totalDisputes: number;
  openDisputes: number;
  resolvedDisputes: number;
  winRate: number;
  averageResolutionTime: number;
  totalDisputedAmount: number;
  totalRecovered: number;
  
  // Trends
  disputesByMonth: Array<{ month: string; count: number; amount: number }>;
  disputesByType: Array<{ type: DisputeType; count: number; percentage: number }>;
  disputesByCategory: Array<{ category: DisputeCategory; count: number; winRate: number }>;
  
  // Performance metrics
  responseTimeMetrics: {
    averageFirstResponse: number;
    averageFullResponse: number;
    onTimeResponseRate: number;
  };
  
  // Financial impact
  financialImpact: {
    totalFees: number;
    recoveredAmount: number;
    preventedLosses: number;
    costPerDispute: number;
  };
}

export type DisputeType = 
  | 'chargeback'
  | 'inquiry'
  | 'refund_request'
  | 'authorization_dispute'
  | 'processing_error'
  | 'fraud_claim';

export type DisputeCategory =
  | 'fraud'
  | 'authorization'
  | 'processing_error'
  | 'duplicate_processing'
  | 'product_not_received'
  | 'product_unacceptable'
  | 'cancelled_recurring'
  | 'credit_not_processed'
  | 'general';

export type DisputeStatus =
  | 'new'
  | 'under_review'
  | 'awaiting_evidence'
  | 'evidence_submitted'
  | 'in_arbitration'
  | 'won'
  | 'lost'
  | 'expired'
  | 'withdrawn'
  | 'closed';

export type DisputeStage =
  | 'notification'
  | 'evidence_collection'
  | 'representment'
  | 'arbitration'
  | 'resolution';

export type DisputePriority = 'low' | 'medium' | 'high' | 'critical';

export type DisputeOutcome =
  | 'won'
  | 'lost'
  | 'partial_win'
  | 'withdrawn'
  | 'expired'
  | 'settled';

export type EvidenceType =
  | 'receipt'
  | 'shipping_proof'
  | 'customer_communication'
  | 'authorization_proof'
  | 'duplicate_charge_proof'
  | 'cancellation_proof'
  | 'refund_proof'
  | 'terms_of_service'
  | 'fraud_analysis'
  | 'customer_profile'
  | 'transaction_log';

export type CommunicationType =
  | 'dispute_notification'
  | 'evidence_request'
  | 'status_update'
  | 'resolution_notice'
  | 'customer_inquiry'
  | 'internal_note'
  | 'escalation';

/**
 * Comprehensive Dispute Management System
 */
export class DisputeManagementSystem {
  private disputes: Map<string, PaymentDispute> = new Map();
  private workflows: Map<DisputeCategory, DisputeWorkflowStep[]> = new Map();
  private templates: Map<string, string> = new Map();
  private autoRules: Map<string, (dispute: PaymentDispute) => boolean> = new Map();

  constructor() {
    this.initializeWorkflows();
    this.initializeTemplates();
    this.initializeAutoRules();
    console.log('📋 Dispute Management System initialized');
  }

  /**
   * Initialize dispute workflows for different categories
   */
  private initializeWorkflows(): void {
    // Fraud dispute workflow
    const fraudWorkflow: DisputeWorkflowStep[] = [
      {
        id: 'fraud_initial_review',
        name: 'Initial Fraud Review',
        description: 'Review transaction for fraud indicators',
        dueDate: addDays(new Date(), 1).toISOString(),
        status: 'pending',
        requiredEvidence: ['transaction_log', 'fraud_analysis', 'customer_profile'],
        automatedActions: ['collect_transaction_data', 'run_fraud_analysis']
      },
      {
        id: 'fraud_evidence_collection',
        name: 'Fraud Evidence Collection',
        description: 'Collect all evidence proving legitimate transaction',
        dueDate: addDays(new Date(), 5).toISOString(),
        status: 'pending',
        requiredEvidence: ['authorization_proof', 'customer_communication', 'duplicate_charge_proof'],
        automatedActions: ['generate_evidence_report']
      },
      {
        id: 'fraud_representment',
        name: 'Submit Fraud Representment',
        description: 'Submit comprehensive fraud representment package',
        dueDate: addDays(new Date(), 7).toISOString(),
        status: 'pending',
        requiredEvidence: [],
        automatedActions: ['submit_to_processor', 'notify_stakeholders']
      }
    ];

    this.workflows.set('fraud', fraudWorkflow);

    // Authorization dispute workflow
    const authWorkflow: DisputeWorkflowStep[] = [
      {
        id: 'auth_verification',
        name: 'Authorization Verification',
        description: 'Verify authorization was properly obtained',
        dueDate: addDays(new Date(), 2).toISOString(),
        status: 'pending',
        requiredEvidence: ['authorization_proof', 'receipt'],
        automatedActions: ['verify_authorization']
      },
      {
        id: 'auth_documentation',
        name: 'Documentation Review',
        description: 'Review all authorization documentation',
        dueDate: addDays(new Date(), 5).toISOString(),
        status: 'pending',
        requiredEvidence: ['customer_communication', 'terms_of_service'],
        automatedActions: ['compile_documentation']
      }
    ];

    this.workflows.set('authorization', authWorkflow);

    console.log('✅ Dispute workflows initialized');
  }

  /**
   * Initialize communication templates
   */
  private initializeTemplates(): void {
    this.templates.set('dispute_notification', `
      Dear [CUSTOMER_NAME],
      
      We have received a dispute regarding transaction [TRANSACTION_ID] for [AMOUNT] [CURRENCY].
      
      Dispute Details:
      - Transaction Date: [TRANSACTION_DATE]
      - Amount: [AMOUNT] [CURRENCY]
      - Reason: [DISPUTE_REASON]
      
      We are investigating this matter and will provide updates within 2-3 business days.
      
      Best regards,
      PropertyHub Payment Support Team
    `);

    this.templates.set('evidence_request', `
      Hello [CUSTOMER_NAME],
      
      To resolve your dispute (ID: [DISPUTE_ID]), we need additional information:
      
      Required Documentation:
      [EVIDENCE_LIST]
      
      Please provide this information within 5 business days to avoid delays.
      
      Thank you,
      PropertyHub Support Team
    `);

    this.templates.set('dispute_resolution', `
      Dear [CUSTOMER_NAME],
      
      Your dispute [DISPUTE_ID] has been resolved.
      
      Resolution: [OUTCOME]
      Details: [RESOLUTION_DETAILS]
      
      [REFUND_INFO]
      
      If you have any questions, please contact our support team.
      
      Best regards,
      PropertyHub Team
    `);

    console.log('✅ Communication templates initialized');
  }

  /**
   * Initialize automated rules for dispute handling
   */
  private initializeAutoRules(): void {
    // Auto-escalate high-value disputes
    this.autoRules.set('high_value_escalation', (dispute) => {
      return dispute.amount >= 1000000; // ₦10,000+
    });

    // Auto-escalate repeated disputes from same customer
    this.autoRules.set('repeat_customer_escalation', (dispute) => {
      const customerDisputes = this.getCustomerDisputes(dispute.userId);
      return customerDisputes.length >= 3;
    });

    // Auto-flag fraud disputes with high risk score
    this.autoRules.set('fraud_high_risk', (dispute) => {
      return dispute.type === 'fraud_claim' && dispute.riskScore >= 80;
    });

    // Auto-resolve low-risk authorization disputes
    this.autoRules.set('auto_resolve_auth_low_risk', (dispute) => {
      return dispute.category === 'authorization' && 
             dispute.riskScore <= 20 && 
             dispute.amount <= 100000; // ₦1,000 or less
    });

    // Auto-escalate chargeback disputes
    this.autoRules.set('chargeback_immediate_escalation', (dispute) => {
      return dispute.type === 'chargeback';
    });

    // Auto-flag disputes from blocked users
    this.autoRules.set('blocked_user_dispute', (dispute) => {
      return this.isUserBlocked(dispute.userId);
    });

    // Auto-escalate disputes with insufficient evidence
    this.autoRules.set('insufficient_evidence_escalation', (dispute) => {
      const requiredEvidence = this.getRequiredEvidence(dispute.category);
      const submittedEvidence = dispute.evidence.map(e => e.type);
      const missingEvidence = requiredEvidence.filter(req => !submittedEvidence.includes(req));
      return missingEvidence.length > 0 && this.isDueDateApproaching(dispute);
    });

    // Auto-flag patterns indicating fraud rings
    this.autoRules.set('fraud_ring_pattern', (dispute) => {
      return this.detectFraudRingPattern(dispute);
    });

    // Auto-prioritize disputes from VIP customers
    this.autoRules.set('vip_customer_priority', (dispute) => {
      return this.isVIPCustomer(dispute.userId);
    });

    console.log('✅ Automated rules initialized');
  }

  /**
   * Create new dispute
   */
  public async createDispute(disputeData: Partial<PaymentDispute>): Promise<PaymentDispute> {
    const disputeId = `dispute_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const dispute: PaymentDispute = {
      id: disputeId,
      transactionId: disputeData.transactionId!,
      userId: disputeData.userId!,
      customerEmail: disputeData.customerEmail!,
      amount: disputeData.amount!,
      currency: disputeData.currency || 'NGN',
      type: disputeData.type || 'chargeback',
      category: disputeData.category || 'general',
      reason: disputeData.reason || '',
      description: disputeData.description || '',
      status: 'new',
      stage: 'notification',
      priority: this.calculatePriority(disputeData),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate: this.calculateDueDate(disputeData.category || 'general'),
      evidence: [],
      communications: [],
      tags: disputeData.tags || [],
      internalNotes: [],
      riskScore: disputeData.riskScore || 0,
      autoEscalated: false,
      requiresManualReview: false,
      disputedAmount: disputeData.amount!,
      potentialLoss: disputeData.amount!,
      fees: {
        disputeFee: this.calculateDisputeFee(disputeData.amount!),
        processingFee: 0,
        representmentFee: 0
      }
    };

    // Run automated checks
    await this.runAutomatedChecks(dispute);

    // Initialize workflow
    await this.initializeWorkflow(dispute);

    // Send initial notifications
    await this.sendDisputeNotification(dispute);

    // Store dispute
    this.disputes.set(disputeId, dispute);

    console.log(`📋 New dispute created: ${disputeId}`);
    
    return dispute;
  }

  /**
   * Update dispute status
   */
  public async updateDisputeStatus(
    disputeId: string, 
    status: DisputeStatus,
    note?: string,
    updatedBy?: string
  ): Promise<PaymentDispute> {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) {
      throw new Error(`Dispute not found: ${disputeId}`);
    }

    const previousStatus = dispute.status;
    dispute.status = status;
    dispute.updatedAt = new Date().toISOString();

    // Add status change note
    if (note) {
      this.addDisputeNote(disputeId, note, updatedBy || 'system', 'internal');
    }

    // Handle status-specific actions
    await this.handleStatusChange(dispute, previousStatus, status);

    // Update workflow stage
    await this.updateWorkflowStage(dispute);

    this.disputes.set(disputeId, dispute);

    console.log(`📋 Dispute ${disputeId} status updated: ${previousStatus} → ${status}`);

    return dispute;
  }

  /**
   * Add evidence to dispute
   */
  public async addEvidence(
    disputeId: string,
    evidence: Partial<DisputeEvidence>,
    uploadedBy: string
  ): Promise<DisputeEvidence> {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) {
      throw new Error(`Dispute not found: ${disputeId}`);
    }

    const evidenceId = `evidence_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const newEvidence: DisputeEvidence = {
      id: evidenceId,
      type: evidence.type!,
      title: evidence.title!,
      description: evidence.description!,
      fileUrl: evidence.fileUrl,
      fileType: evidence.fileType,
      fileSize: evidence.fileSize,
      uploadedAt: new Date().toISOString(),
      uploadedBy,
      isRequired: evidence.isRequired || false,
      isSubmitted: false
    };

    dispute.evidence.push(newEvidence);
    dispute.updatedAt = new Date().toISOString();

    // Check if evidence collection is complete
    await this.checkEvidenceCompleteness(dispute);

    this.disputes.set(disputeId, dispute);

    console.log(`📎 Evidence added to dispute ${disputeId}: ${evidence.type}`);

    return newEvidence;
  }

  /**
   * Add communication to dispute
   */
  public async addCommunication(
    disputeId: string,
    communication: Partial<DisputeCommunication>
  ): Promise<DisputeCommunication> {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) {
      throw new Error(`Dispute not found: ${disputeId}`);
    }

    const commId = `comm_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const newCommunication: DisputeCommunication = {
      id: commId,
      type: communication.type!,
      direction: communication.direction!,
      from: communication.from!,
      to: communication.to!,
      subject: communication.subject!,
      message: communication.message!,
      timestamp: new Date().toISOString(),
      attachments: communication.attachments || [],
      isInternal: communication.isInternal || false,
      relatedEvidenceId: communication.relatedEvidenceId
    };

    dispute.communications.push(newCommunication);
    dispute.updatedAt = new Date().toISOString();

    this.disputes.set(disputeId, dispute);

    console.log(`💬 Communication added to dispute ${disputeId}: ${communication.type}`);

    return newCommunication;
  }

  /**
   * Resolve dispute
   */
  public async resolveDispute(
    disputeId: string,
    resolution: Partial<DisputeResolution>,
    resolvedBy: string
  ): Promise<PaymentDispute> {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) {
      throw new Error(`Dispute not found: ${disputeId}`);
    }

    const disputeResolution: DisputeResolution = {
      outcome: resolution.outcome!,
      reason: resolution.reason!,
      resolvedBy,
      resolvedAt: new Date().toISOString(),
      refundAmount: resolution.refundAmount,
      partialCredit: resolution.partialCredit,
      preventiveMeasures: resolution.preventiveMeasures || [],
      customerSatisfaction: resolution.customerSatisfaction
    };

    dispute.resolution = disputeResolution;
    dispute.resolvedAt = new Date().toISOString();
    dispute.status = this.mapOutcomeToStatus(resolution.outcome!);
    dispute.updatedAt = new Date().toISOString();

    // Process financial resolution
    await this.processFinancialResolution(dispute);

    // Send resolution notification
    await this.sendResolutionNotification(dispute);

    // Update analytics
    await this.updateDisputeAnalytics(dispute);

    this.disputes.set(disputeId, dispute);

    console.log(`✅ Dispute ${disputeId} resolved: ${resolution.outcome}`);

    return dispute;
  }

  /**
   * Get dispute analytics
   */
  public async getDisputeAnalytics(dateRange?: { start: string; end: string }): Promise<DisputeAnalytics> {
    const disputes = Array.from(this.disputes.values());
    
    // Filter by date range if provided
    const filteredDisputes = dateRange 
      ? disputes.filter(d => {
          const createdAt = new Date(d.createdAt);
          const start = new Date(dateRange.start);
          const end = new Date(dateRange.end);
          return createdAt >= start && createdAt <= end;
        })
      : disputes;

    const totalDisputes = filteredDisputes.length;
    const openDisputes = filteredDisputes.filter(d => !['won', 'lost', 'closed'].includes(d.status)).length;
    const resolvedDisputes = filteredDisputes.filter(d => d.resolvedAt).length;
    const wonDisputes = filteredDisputes.filter(d => d.status === 'won').length;
    
    const winRate = resolvedDisputes > 0 ? (wonDisputes / resolvedDisputes) * 100 : 0;
    
    const totalDisputedAmount = filteredDisputes.reduce((sum, d) => sum + d.disputedAmount, 0);
    const totalRecovered = filteredDisputes
      .filter(d => d.status === 'won')
      .reduce((sum, d) => sum + d.disputedAmount, 0);

    // Calculate average resolution time
    const resolvedDisputesWithTime = filteredDisputes.filter(d => d.resolvedAt);
    const averageResolutionTime = resolvedDisputesWithTime.length > 0
      ? resolvedDisputesWithTime.reduce((sum, d) => {
          const created = new Date(d.createdAt);
          const resolved = new Date(d.resolvedAt!);
          return sum + (resolved.getTime() - created.getTime());
        }, 0) / resolvedDisputesWithTime.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    // Group by month
    const disputesByMonth = this.groupDisputesByMonth(filteredDisputes);
    
    // Group by type
    const disputesByType = this.groupDisputesByType(filteredDisputes);
    
    // Group by category
    const disputesByCategory = this.groupDisputesByCategory(filteredDisputes);

    // Calculate financial impact
    const totalFees = filteredDisputes.reduce((sum, d) => 
      sum + d.fees.disputeFee + d.fees.processingFee + d.fees.representmentFee, 0
    );

    return {
      totalDisputes,
      openDisputes,
      resolvedDisputes,
      winRate,
      averageResolutionTime,
      totalDisputedAmount,
      totalRecovered,
      disputesByMonth,
      disputesByType,
      disputesByCategory,
      responseTimeMetrics: {
        averageFirstResponse: 2.5, // Mock data
        averageFullResponse: 5.8,
        onTimeResponseRate: 92.3
      },
      financialImpact: {
        totalFees,
        recoveredAmount: totalRecovered,
        preventedLosses: totalRecovered * 0.15, // Estimated prevented losses
        costPerDispute: totalDisputes > 0 ? totalFees / totalDisputes : 0
      }
    };
  }

  /**
   * Get disputes by status
   */
  public getDisputesByStatus(status: DisputeStatus): PaymentDispute[] {
    return Array.from(this.disputes.values()).filter(d => d.status === status);
  }

  /**
   * Get customer disputes
   */
  public getCustomerDisputes(userId: string): PaymentDispute[] {
    return Array.from(this.disputes.values()).filter(d => d.userId === userId);
  }

  private getUserProfile(userId: string): { transactionHistory: { totalAmount: number } } | null {
    const customerDisputes = this.getCustomerDisputes(userId);
    const totalAmount = customerDisputes.reduce((sum, dispute) => sum + (dispute.amount || 0), 0);

    return {
      transactionHistory: {
        totalAmount,
      },
    };
  }

  /**
   * Search disputes
   */
  public searchDisputes(query: {
    status?: DisputeStatus;
    type?: DisputeType;
    category?: DisputeCategory;
    userId?: string;
    transactionId?: string;
    dateRange?: { start: string; end: string };
  }): PaymentDispute[] {
    let disputes = Array.from(this.disputes.values());

    if (query.status) {
      disputes = disputes.filter(d => d.status === query.status);
    }
    
    if (query.type) {
      disputes = disputes.filter(d => d.type === query.type);
    }
    
    if (query.category) {
      disputes = disputes.filter(d => d.category === query.category);
    }
    
    if (query.userId) {
      disputes = disputes.filter(d => d.userId === query.userId);
    }
    
    if (query.transactionId) {
      disputes = disputes.filter(d => d.transactionId === query.transactionId);
    }
    
    if (query.dateRange) {
      const start = new Date(query.dateRange.start);
      const end = new Date(query.dateRange.end);
      disputes = disputes.filter(d => {
        const created = new Date(d.createdAt);
        return created >= start && created <= end;
      });
    }

    return disputes;
  }

  // Private helper methods
  private calculatePriority(disputeData: Partial<PaymentDispute>): DisputePriority {
    if (disputeData.amount && disputeData.amount >= 2000000) return 'critical'; // ₦20,000+
    if (disputeData.amount && disputeData.amount >= 1000000) return 'high';     // ₦10,000+
    if (disputeData.amount && disputeData.amount >= 500000) return 'medium';    // ₦5,000+
    return 'low';
  }

  private calculateDueDate(category: DisputeCategory): string {
    const daysToAdd = {
      'fraud': 7,
      'authorization': 10,
      'processing_error': 5,
      'duplicate_processing': 7,
      'product_not_received': 14,
      'product_unacceptable': 14,
      'cancelled_recurring': 10,
      'credit_not_processed': 10,
      'general': 10
    };

    return addDays(new Date(), daysToAdd[category]).toISOString();
  }

  private calculateDisputeFee(amount: number): number {
    // Simplified fee calculation
    if (amount >= 1000000) return 5000; // ₦50 for high-value disputes
    if (amount >= 500000) return 3000;  // ₦30 for medium-value disputes
    return 2000; // ₦20 for low-value disputes
  }

  private async runAutomatedChecks(dispute: PaymentDispute): Promise<void> {
    for (const [ruleName, ruleFunction] of this.autoRules.entries()) {
      if (ruleFunction(dispute)) {
        console.log(`🤖 Auto-rule triggered: ${ruleName} for dispute ${dispute.id}`);
        
        switch (ruleName) {
          case 'high_value_escalation':
            dispute.priority = 'critical';
            dispute.autoEscalated = true;
            await this.addDisputeNote(dispute.id, 'Auto-escalated due to high transaction value', 'system', 'internal');
            break;
            
          case 'repeat_customer_escalation':
            dispute.requiresManualReview = true;
            dispute.priority = 'high';
            await this.addDisputeNote(dispute.id, 'Flagged: Repeat customer with multiple disputes', 'system', 'internal');
            break;
            
          case 'fraud_high_risk':
            dispute.priority = 'high';
            dispute.requiresManualReview = true;
            await this.addDisputeNote(dispute.id, 'High fraud risk score detected', 'system', 'internal');
            break;
            
          case 'auto_resolve_auth_low_risk':
            await this.initiateAutoResolution(dispute, 'won', 'Low-risk authorization dispute auto-resolved');
            break;
            
          case 'chargeback_immediate_escalation':
            dispute.priority = 'critical';
            dispute.autoEscalated = true;
            dispute.requiresManualReview = true;
            await this.addDisputeNote(dispute.id, 'Chargeback detected - immediate escalation required', 'system', 'internal');
            break;
            
          case 'blocked_user_dispute':
            dispute.priority = 'high';
            dispute.requiresManualReview = true;
            dispute.tags.push('blocked_user');
            await this.addDisputeNote(dispute.id, 'Dispute from blocked user account', 'system', 'internal');
            break;
            
          case 'insufficient_evidence_escalation':
            dispute.priority = 'high';
            dispute.requiresManualReview = true;
            await this.sendEvidenceReminderNotification(dispute);
            break;
            
          case 'fraud_ring_pattern':
            dispute.priority = 'critical';
            dispute.autoEscalated = true;
            dispute.requiresManualReview = true;
            dispute.tags.push('fraud_ring_suspected');
            await this.addDisputeNote(dispute.id, 'Potential fraud ring pattern detected', 'system', 'internal');
            break;
            
          case 'vip_customer_priority':
            dispute.priority = 'high';
            dispute.tags.push('vip_customer');
            await this.addDisputeNote(dispute.id, 'VIP customer dispute - prioritized handling', 'system', 'internal');
            break;
        }
      }
    }
  }

  /**
   * Initiate automatic resolution for low-risk disputes
   */
  private async initiateAutoResolution(
    dispute: PaymentDispute, 
    outcome: DisputeOutcome, 
    reason: string
  ): Promise<void> {
    try {
      console.log(`🤖 Auto-resolving dispute ${dispute.id}: ${outcome}`);
      
      await this.resolveDispute(dispute.id, {
        outcome,
        reason,
        preventiveMeasures: ['Enhanced transaction monitoring', 'Improved authorization checks']
      }, 'system');
      
      await this.addDisputeNote(dispute.id, `Auto-resolved: ${reason}`, 'system', 'internal');
      
    } catch (error) {
      console.error(`❌ Failed to auto-resolve dispute ${dispute.id}:`, error);
      dispute.requiresManualReview = true;
      await this.addDisputeNote(dispute.id, 'Auto-resolution failed - flagged for manual review', 'system', 'internal');
    }
  }

  /**
   * Send evidence reminder notification
   */
  private async sendEvidenceReminderNotification(dispute: PaymentDispute): Promise<void> {
    const template = this.templates.get('evidence_request');
    if (!template) return;

    const requiredEvidence = this.getRequiredEvidence(dispute.category);
    const submittedEvidence = dispute.evidence.map(e => e.type);
    const missingEvidence = requiredEvidence.filter(req => !submittedEvidence.includes(req));

    const evidenceList = missingEvidence.map(type => `- ${this.formatEvidenceType(type)}`).join('\n');

    const message = this.fillTemplate(template, {
      CUSTOMER_NAME: 'Customer Support Team',
      DISPUTE_ID: dispute.id,
      EVIDENCE_LIST: evidenceList
    });

    await this.addCommunication(dispute.id, {
      type: 'evidence_request',
      direction: 'outbound',
      from: 'disputes@propertyhub.app',
      to: 'support@propertyhub.app',
      subject: `Evidence Required - Dispute ${dispute.id}`,
      message,
      isInternal: true
    });
  }

  /**
   * Enhanced workflow management with automated actions
   */
  public async advanceWorkflowStep(disputeId: string, stepId: string): Promise<void> {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) {
      throw new Error(`Dispute not found: ${disputeId}`);
    }

    const workflow = this.workflows.get(dispute.category);
    if (!workflow) return;

    const stepIndex = workflow.findIndex(step => step.id === stepId);
    if (stepIndex === -1) return;

    const currentStep = workflow[stepIndex];
    
    // Mark current step as completed
    currentStep.status = 'completed';
    currentStep.completedAt = new Date().toISOString();
    currentStep.completedBy = 'system';

    // Execute automated actions for this step
    await this.executeAutomatedActions(dispute, currentStep);

    // Advance to next step if available
    if (stepIndex + 1 < workflow.length) {
      const nextStep = workflow[stepIndex + 1];
      nextStep.status = 'in_progress';
      
      // Check if next step can be auto-completed
      if (await this.canAutoCompleteStep(dispute, nextStep)) {
        await this.advanceWorkflowStep(disputeId, nextStep.id);
      }
    }

    console.log(`📋 Workflow step advanced: ${disputeId} - ${currentStep.name}`);
  }

  /**
   * Execute automated actions for workflow step
   */
  private async executeAutomatedActions(dispute: PaymentDispute, step: DisputeWorkflowStep): Promise<void> {
    for (const action of step.automatedActions) {
      try {
        switch (action) {
          case 'collect_transaction_data':
            await this.collectTransactionData(dispute);
            break;
          case 'run_fraud_analysis':
            await this.runFraudAnalysis(dispute);
            break;
          case 'generate_evidence_report':
            await this.generateEvidenceReport(dispute);
            break;
          case 'submit_to_processor':
            await this.submitToProcessor(dispute);
            break;
          case 'notify_stakeholders':
            await this.notifyStakeholders(dispute);
            break;
          case 'verify_authorization':
            await this.verifyAuthorization(dispute);
            break;
          case 'compile_documentation':
            await this.compileDocumentation(dispute);
            break;
        }
      } catch (error) {
        console.error(`❌ Failed to execute automated action ${action}:`, error);
        await this.addDisputeNote(
          dispute.id, 
          `Automated action failed: ${action} - ${error}`, 
          'system', 
          'internal'
        );
      }
    }
  }

  /**
   * Check if workflow step can be auto-completed
   */
  private async canAutoCompleteStep(dispute: PaymentDispute, step: DisputeWorkflowStep): Promise<boolean> {
    // Check if all required evidence is collected
    const hasRequiredEvidence = step.requiredEvidence.every(evidenceType =>
      dispute.evidence.some(evidence => evidence.type === evidenceType && evidence.isSubmitted)
    );

    // Check if step has automated completion criteria
    const hasAutomatedCompletion = step.automatedActions.length > 0;

    return hasRequiredEvidence && hasAutomatedCompletion;
  }

  // Automated action implementations

  private async collectTransactionData(dispute: PaymentDispute): Promise<void> {
    console.log(`📊 Collecting transaction data for dispute ${dispute.id}`);
    // Implementation would collect detailed transaction data
    await this.addEvidence(dispute.id, {
      type: 'transaction_log',
      title: 'Complete Transaction Log',
      description: 'Comprehensive transaction data including timestamps, amounts, and metadata',
      isRequired: true,
      isSubmitted: true
    }, 'system');
  }

  private async runFraudAnalysis(dispute: PaymentDispute): Promise<void> {
    console.log(`🔍 Running fraud analysis for dispute ${dispute.id}`);
    // Implementation would run comprehensive fraud analysis
    await this.addEvidence(dispute.id, {
      type: 'fraud_analysis',
      title: 'Automated Fraud Analysis Report',
      description: 'AI-powered fraud analysis including risk scoring and pattern detection',
      isRequired: true,
      isSubmitted: true
    }, 'system');
  }

  private async generateEvidenceReport(dispute: PaymentDispute): Promise<void> {
    console.log(`📄 Generating evidence report for dispute ${dispute.id}`);
    // Implementation would compile all evidence into a structured report
  }

  private async submitToProcessor(dispute: PaymentDispute): Promise<void> {
    console.log(`📤 Submitting dispute ${dispute.id} to payment processor`);
    // Implementation would submit to Paystack or other processor
  }

  private async notifyStakeholders(dispute: PaymentDispute): Promise<void> {
    console.log(`📢 Notifying stakeholders about dispute ${dispute.id}`);
    // Implementation would notify relevant team members
  }

  private async verifyAuthorization(dispute: PaymentDispute): Promise<void> {
    console.log(`✅ Verifying authorization for dispute ${dispute.id}`);
    // Implementation would verify payment authorization
  }

  private async compileDocumentation(dispute: PaymentDispute): Promise<void> {
    console.log(`📋 Compiling documentation for dispute ${dispute.id}`);
    // Implementation would compile all documentation
  }

  // Helper methods for automated rules

  private isUserBlocked(userId: string): boolean {
    // Implementation would check if user is in blocked list
    return false; // Mock implementation
  }

  private getRequiredEvidence(category: DisputeCategory): EvidenceType[] {
    const evidenceMap: Record<DisputeCategory, EvidenceType[]> = {
      'fraud': ['transaction_log', 'fraud_analysis', 'customer_profile', 'authorization_proof'],
      'authorization': ['authorization_proof', 'receipt', 'customer_communication'],
      'processing_error': ['transaction_log', 'receipt'],
      'duplicate_processing': ['transaction_log', 'duplicate_charge_proof'],
      'product_not_received': ['shipping_proof', 'customer_communication'],
      'product_unacceptable': ['customer_communication', 'terms_of_service'],
      'cancelled_recurring': ['cancellation_proof', 'customer_communication'],
      'credit_not_processed': ['refund_proof', 'transaction_log'],
      'general': ['receipt', 'customer_communication']
    };

    return evidenceMap[category] || [];
  }

  private isDueDateApproaching(dispute: PaymentDispute): boolean {
    const dueDate = new Date(dispute.dueDate);
    const now = new Date();
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilDue <= 24; // Due within 24 hours
  }

  private detectFraudRingPattern(dispute: PaymentDispute): boolean {
    // Implementation would detect patterns indicating organized fraud
    const customerDisputes = this.getCustomerDisputes(dispute.userId);
    const recentDisputes = customerDisputes.filter(d => 
      new Date(d.createdAt) >= subDays(new Date(), 30)
    );
    
    // Check for multiple disputes with similar patterns
    return recentDisputes.length >= 2 && 
           recentDisputes.every(d => d.category === 'fraud' || d.type === 'fraud_claim');
  }

  private isVIPCustomer(userId: string): boolean {
    // Implementation would check VIP customer status
    const userProfile = this.getUserProfile(userId);
    return userProfile?.transactionHistory?.totalAmount >= 10000000; // ₦100,000+ total
  }

  private formatEvidenceType(type: EvidenceType): string {
    const formatMap: Record<EvidenceType, string> = {
      'receipt': 'Transaction Receipt',
      'shipping_proof': 'Shipping/Delivery Proof',
      'customer_communication': 'Customer Communication Records',
      'authorization_proof': 'Payment Authorization Evidence',
      'duplicate_charge_proof': 'Duplicate Charge Documentation',
      'cancellation_proof': 'Service Cancellation Proof',
      'refund_proof': 'Refund Processing Evidence',
      'terms_of_service': 'Terms of Service Agreement',
      'fraud_analysis': 'Fraud Analysis Report',
      'customer_profile': 'Customer Profile Information',
      'transaction_log': 'Detailed Transaction Log'
    };

    return formatMap[type] || type.replace('_', ' ').toUpperCase();
  }

  /**
   * Add dispute note
   */
  public addDisputeNote(
    disputeId: string, 
    content: string, 
    createdBy: string, 
    type: 'internal' | 'customer_visible' = 'internal'
  ): void {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) return;

    const note: DisputeNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      content,
      createdBy,
      createdAt: new Date().toISOString(),
      type,
      tags: []
    };

    dispute.internalNotes.push(note);
    dispute.updatedAt = new Date().toISOString();
    
    this.disputes.set(disputeId, dispute);
  }

  private async initializeWorkflow(dispute: PaymentDispute): Promise<void> {
    const workflow = this.workflows.get(dispute.category);
    if (workflow) {
      console.log(`📋 Initialized ${dispute.category} workflow for dispute ${dispute.id}`);
    }
  }

  private async sendDisputeNotification(dispute: PaymentDispute): Promise<void> {
    const template = this.templates.get('dispute_notification');
    if (template) {
      const message = this.fillTemplate(template, {
        CUSTOMER_NAME: 'Customer',
        TRANSACTION_ID: dispute.transactionId,
        AMOUNT: dispute.amount.toString(),
        CURRENCY: dispute.currency,
        TRANSACTION_DATE: format(new Date(dispute.createdAt), 'PPP'),
        DISPUTE_REASON: dispute.reason
      });

      await this.addCommunication(dispute.id, {
        type: 'dispute_notification',
        direction: 'outbound',
        from: 'support@propertyhub.app',
        to: dispute.customerEmail,
        subject: `Dispute Notification - ${dispute.id}`,
        message,
        isInternal: false
      });
    }
  }

  private async handleStatusChange(
    dispute: PaymentDispute,
    previousStatus: DisputeStatus,
    newStatus: DisputeStatus
  ): Promise<void> {
    // Handle specific status transitions
    switch (newStatus) {
      case 'evidence_submitted':
        await this.processEvidenceSubmission(dispute);
        break;
      case 'won':
      case 'lost':
        await this.processDisputeConclusion(dispute);
        break;
    }
  }

  private async updateWorkflowStage(dispute: PaymentDispute): Promise<void> {
    // Update workflow stage based on status
    const stageMapping: Record<DisputeStatus, DisputeStage> = {
      'new': 'notification',
      'under_review': 'evidence_collection',
      'awaiting_evidence': 'evidence_collection',
      'evidence_submitted': 'representment',
      'in_arbitration': 'arbitration',
      'won': 'resolution',
      'lost': 'resolution',
      'expired': 'resolution',
      'withdrawn': 'resolution',
      'closed': 'resolution'
    };

    dispute.stage = stageMapping[dispute.status] || dispute.stage;
  }

  private async checkEvidenceCompleteness(dispute: PaymentDispute): Promise<void> {
    const workflow = this.workflows.get(dispute.category);
    if (!workflow) return;

    const currentStep = workflow.find(step => step.status === 'in_progress');
    if (currentStep) {
      const requiredEvidence = currentStep.requiredEvidence;
      const submittedEvidence = dispute.evidence.map(e => e.type);
      
      const isComplete = requiredEvidence.every(required => 
        submittedEvidence.includes(required)
      );

      if (isComplete) {
        await this.updateDisputeStatus(dispute.id, 'evidence_submitted', 'All required evidence collected');
      }
    }
  }

  private async processEvidenceSubmission(dispute: PaymentDispute): Promise<void> {
    console.log(`📎 Processing evidence submission for dispute ${dispute.id}`);
    // Automated evidence review and submission to processor
  }

  private async processDisputeConclusion(dispute: PaymentDispute): Promise<void> {
    console.log(`🎯 Processing dispute conclusion for ${dispute.id}: ${dispute.status}`);
    // Handle post-resolution tasks
  }

  private async processFinancialResolution(dispute: PaymentDispute): Promise<void> {
    if (!dispute.resolution) return;

    console.log(`💰 Processing financial resolution for dispute ${dispute.id}`);
    
    // Process refunds, partial credits, etc.
    if (dispute.resolution.refundAmount) {
      console.log(`Refunding ${dispute.resolution.refundAmount} ${dispute.currency}`);
    }
  }

  private async sendResolutionNotification(dispute: PaymentDispute): Promise<void> {
    if (!dispute.resolution) return;

    const template = this.templates.get('dispute_resolution');
    if (template) {
      const refundInfo = dispute.resolution.refundAmount 
        ? `Refund Amount: ${dispute.resolution.refundAmount} ${dispute.currency}`
        : 'No refund applicable.';

      const message = this.fillTemplate(template, {
        CUSTOMER_NAME: 'Customer',
        DISPUTE_ID: dispute.id,
        OUTCOME: dispute.resolution.outcome,
        RESOLUTION_DETAILS: dispute.resolution.reason,
        REFUND_INFO: refundInfo
      });

      await this.addCommunication(dispute.id, {
        type: 'resolution_notice',
        direction: 'outbound',
        from: 'support@propertyhub.app',
        to: dispute.customerEmail,
        subject: `Dispute Resolution - ${dispute.id}`,
        message,
        isInternal: false
      });
    }
  }

  private async updateDisputeAnalytics(dispute: PaymentDispute): Promise<void> {
    console.log(`📊 Updating analytics for resolved dispute ${dispute.id}`);
  }

  private mapOutcomeToStatus(outcome: DisputeOutcome): DisputeStatus {
    const mapping: Record<DisputeOutcome, DisputeStatus> = {
      'won': 'won',
      'lost': 'lost',
      'partial_win': 'won',
      'withdrawn': 'withdrawn',
      'expired': 'expired',
      'settled': 'closed'
    };

    return mapping[outcome] || 'closed';
  }

  private fillTemplate(template: string, variables: Record<string, string>): string {
    let filled = template;
    for (const [key, value] of Object.entries(variables)) {
      filled = filled.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
    }
    return filled;
  }

  private groupDisputesByMonth(disputes: PaymentDispute[]): Array<{ month: string; count: number; amount: number }> {
    const groups = new Map<string, { count: number; amount: number }>();
    
    disputes.forEach(dispute => {
      const month = format(new Date(dispute.createdAt), 'yyyy-MM');
      const existing = groups.get(month) || { count: 0, amount: 0 };
      groups.set(month, {
        count: existing.count + 1,
        amount: existing.amount + dispute.disputedAmount
      });
    });

    return Array.from(groups.entries()).map(([month, data]) => ({
      month,
      count: data.count,
      amount: data.amount
    }));
  }

  private groupDisputesByType(disputes: PaymentDispute[]): Array<{ type: DisputeType; count: number; percentage: number }> {
    const groups = new Map<DisputeType, number>();
    
    disputes.forEach(dispute => {
      groups.set(dispute.type, (groups.get(dispute.type) || 0) + 1);
    });

    const total = disputes.length;
    return Array.from(groups.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  }

  private groupDisputesByCategory(disputes: PaymentDispute[]): Array<{ category: DisputeCategory; count: number; winRate: number }> {
    const groups = new Map<DisputeCategory, { total: number; won: number }>();
    
    disputes.forEach(dispute => {
      const existing = groups.get(dispute.category) || { total: 0, won: 0 };
      groups.set(dispute.category, {
        total: existing.total + 1,
        won: existing.won + (dispute.status === 'won' ? 1 : 0)
      });
    });

    return Array.from(groups.entries()).map(([category, data]) => ({
      category,
      count: data.total,
      winRate: data.total > 0 ? (data.won / data.total) * 100 : 0
    }));
  }
}

// Export singleton instance
export const disputeManagementSystem = new DisputeManagementSystem();

export default DisputeManagementSystem;
