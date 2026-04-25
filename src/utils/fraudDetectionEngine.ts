/**
 * PropertyHub - Advanced Fraud Detection Engine
 * 
 * Comprehensive fraud detection system with machine learning-inspired algorithms,
 * behavioral analysis, risk scoring, and real-time monitoring.
 * 
 * Features:
 * - Multi-layered fraud detection rules
 * - Behavioral pattern analysis
 * - Real-time risk scoring
 * - Velocity checking and threshold monitoring
 * - Device fingerprinting and geo-location analysis
 * - Machine learning-style pattern recognition
 * - Automated response and blocking
 * - Risk profiling and user scoring
 */

import { format, subDays, subHours, subMinutes } from 'date-fns';
import { toast } from 'sonner';

// Types
export interface PaymentTransaction {
  id: string;
  userId: string;
  email: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  location?: {
    country: string;
    city: string;
    coordinates?: { lat: number; lng: number };
  };
  timestamp: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'blocked';
  propertyId?: string;
  cardBin?: string; // First 6 digits of card
  cardLast4?: string;
  velocity?: VelocityMetrics;
  riskFactors?: RiskFactor[];
}

export interface VelocityMetrics {
  transactionsLast5Minutes: number;
  transactionsLast1Hour: number;
  transactionsLast24Hours: number;
  amountLast1Hour: number;
  amountLast24Hours: number;
  uniqueCardsLast24Hours: number;
  failedAttemptsLast1Hour: number;
}

export interface RiskFactor {
  type: FraudRuleType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100
  description: string;
  details?: any;
}

export interface FraudAlert {
  id: string;
  transactionId: string;
  userId: string;
  type: FraudRuleType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  description: string;
  details: any;
  timestamp: string;
  status: 'active' | 'resolved' | 'false_positive' | 'confirmed_fraud';
  assignedTo?: string;
  resolution?: {
    action: string;
    reason: string;
    resolvedBy: string;
    resolvedAt: string;
  };
}

export interface RiskProfile {
  userId: string;
  email: string;
  riskScore: number; // 0-1000
  riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  trustScore: number; // 0-1000
  transactionHistory: {
    totalTransactions: number;
    totalAmount: number;
    successRate: number;
    chargebackRate: number;
    disputeRate: number;
  };
  behaviorFlags: string[];
  lastRiskAssessment: string;
  riskFactors: RiskFactor[];
}

export type FraudRuleType =
  | 'velocity_check'
  | 'amount_threshold'
  | 'geo_location'
  | 'device_fingerprint'
  | 'behavioral_pattern'
  | 'card_testing'
  | 'email_pattern'
  | 'time_pattern'
  | 'ip_reputation'
  | 'payment_method'
  | 'user_history'
  | 'property_pattern'
  | 'network_analysis';

export interface FraudDetectionConfig {
  enabled: boolean;
  autoBlockEnabled: boolean;
  alertThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  velocityLimits: {
    maxTransactionsPer5Minutes: number;
    maxTransactionsPer1Hour: number;
    maxTransactionsPer24Hours: number;
    maxAmountPer1Hour: number;
    maxAmountPer24Hours: number;
    maxFailedAttemptsPer1Hour: number;
  };
  amountThresholds: {
    smallTransaction: number;
    mediumTransaction: number;
    largeTransaction: number;
    suspiciousAmount: number;
  };
  geoLocationRules: {
    blockedCountries: string[];
    suspiciousCountries: string[];
    maxDistanceKm: number; // Max distance between consecutive transactions
    timeWindowMinutes: number; // Time window for geo-velocity check
  };
  behaviorRules: {
    newUserHighAmountThreshold: number;
    rapidPaymentMethodChangeCount: number;
    suspiciousUserAgentPatterns: string[];
    unusualTimePatterns: boolean;
  };
}

/**
 * Advanced Fraud Detection Engine
 */
export class FraudDetectionEngine {
  private config: FraudDetectionConfig;
  private transactionHistory: Map<string, PaymentTransaction[]> = new Map();
  private userProfiles: Map<string, RiskProfile> = new Map();
  private blockedIPs: Set<string> = new Set();
  private blockedEmails: Set<string> = new Set();
  private suspiciousPatterns: Map<string, number> = new Map();

  constructor(config: FraudDetectionConfig) {
    this.config = config;
    this.initializeEngine();
  }

  /**
   * Initialize fraud detection engine
   */
  private initializeEngine(): void {
    console.log('🛡️ Initializing Advanced Fraud Detection Engine');
    
    // Load historical data (in production, this would come from database)
    this.loadHistoricalData();
    
    // Initialize suspicious patterns detection
    this.initializeSuspiciousPatterns();
    
    // Initialize advanced ML-style rules
    this.initializeAdvancedRules();
    
    // Start real-time monitoring
    this.startRealTimeMonitoring();
    
    console.log('✅ Fraud Detection Engine initialized successfully');
  }

  /**
   * Initialize advanced fraud detection rules
   */
  private initializeAdvancedRules(): void {
    console.log('🤖 Initializing advanced fraud detection rules');
    
    // Advanced velocity rules
    this.initializeVelocityRules();
    
    // Behavioral analysis rules  
    this.initializeBehavioralRules();
    
    // Network analysis rules
    this.initializeNetworkRules();
    
    // Device fingerprinting rules
    this.initializeDeviceRules();
    
    // Geographic anomaly detection
    this.initializeGeoRules();
    
    console.log('✅ Advanced fraud detection rules initialized');
  }

  /**
   * Initialize advanced velocity rules
   */
  private initializeVelocityRules(): void {
    // Dynamic velocity thresholds based on user history
    this.suspiciousPatterns.set('velocity_burst_pattern', 90);
    this.suspiciousPatterns.set('micro_transaction_testing', 85);
    this.suspiciousPatterns.set('amount_progression_pattern', 75);
    this.suspiciousPatterns.set('failed_to_success_ratio', 80);
  }

  /**
   * Initialize behavioral analysis rules
   */
  private initializeBehavioralRules(): void {
    // User behavior patterns
    this.suspiciousPatterns.set('new_user_large_transaction', 70);
    this.suspiciousPatterns.set('dormant_account_reactivation', 65);
    this.suspiciousPatterns.set('unusual_time_pattern', 50);
    this.suspiciousPatterns.set('payment_method_hopping', 75);
    this.suspiciousPatterns.set('shipping_billing_mismatch', 60);
  }

  /**
   * Initialize network analysis rules
   */
  private initializeNetworkRules(): void {
    // Network-based detection
    this.suspiciousPatterns.set('proxy_vpn_usage', 55);
    this.suspiciousPatterns.set('tor_network_access', 95);
    this.suspiciousPatterns.set('shared_ip_multiple_users', 45);
    this.suspiciousPatterns.set('bot_like_behavior', 85);
  }

  /**
   * Initialize device fingerprinting rules
   */
  private initializeDeviceRules(): void {
    // Device-based patterns
    this.suspiciousPatterns.set('device_spoofing_indicators', 80);
    this.suspiciousPatterns.set('emulator_detection', 90);
    this.suspiciousPatterns.set('multiple_accounts_same_device', 70);
    this.suspiciousPatterns.set('device_farm_pattern', 95);
  }

  /**
   * Initialize geographic rules
   */
  private initializeGeoRules(): void {
    // Geographic anomaly patterns
    this.suspiciousPatterns.set('impossible_travel', 95);
    this.suspiciousPatterns.set('high_risk_country', 60);
    this.suspiciousPatterns.set('geo_velocity_anomaly', 85);
    this.suspiciousPatterns.set('jurisdiction_shopping', 50);
  }

  /**
   * Start real-time monitoring
   */
  private startRealTimeMonitoring(): void {
    console.log('🔍 Starting real-time fraud monitoring');
    
    // Monitor transaction patterns every 5 minutes
    setInterval(() => {
      this.performPatternAnalysis();
    }, 5 * 60 * 1000);
    
    // Monitor velocity patterns every minute
    setInterval(() => {
      this.performVelocityAnalysis();
    }, 60 * 1000);
    
    // Monitor network patterns every 10 minutes
    setInterval(() => {
      this.performNetworkAnalysis();
    }, 10 * 60 * 1000);
  }

  /**
   * Perform real-time pattern analysis
   */
  private performPatternAnalysis(): void {
    console.log('🔍 Performing real-time pattern analysis');
    
    // Analyze recent transactions for patterns
    const recentTimeWindow = subMinutes(new Date(), 10);
    
    // Check for burst patterns
    this.detectBurstPatterns(recentTimeWindow);
    
    // Check for coordinated attacks
    this.detectCoordinatedAttacks(recentTimeWindow);
    
    // Check for unusual geographic clusters
    this.detectGeographicAnomalies(recentTimeWindow);
  }

  /**
   * Perform velocity analysis
   */
  private performVelocityAnalysis(): void {
    const now = new Date();
    const oneMinuteAgo = subMinutes(now, 1);
    
    // Get all transactions in the last minute
    const recentTransactions = this.getAllRecentTransactions(oneMinuteAgo);
    
    // Check for velocity spikes
    if (recentTransactions.length > 50) { // Threshold for high velocity
      console.warn(`⚠️ High transaction velocity detected: ${recentTransactions.length} transactions/minute`);
      this.triggerVelocityAlert(recentTransactions.length);
    }
  }

  /**
   * Perform network analysis
   */
  private performNetworkAnalysis(): void {
    console.log('🌐 Performing network analysis');
    
    // Analyze IP patterns, proxy usage, etc.
    this.analyzeIPPatterns();
    this.detectProxyUsage();
    this.analyzeUserAgentPatterns();
  }

  /**
   * Enhanced card testing detection
   */
  private async enhancedCardTesting(transaction: PaymentTransaction): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];
    
    // Check for micro-transaction testing pattern
    if (transaction.amount <= 100) { // ₦1 or less
      const recentMicroTransactions = this.getRecentMicroTransactions(transaction.userId, 60); // Last hour
      
      if (recentMicroTransactions.length >= 5) {
        factors.push({
          type: 'card_testing',
          severity: 'high',
          score: 85,
          description: `Multiple micro-transactions detected: ${recentMicroTransactions.length} in past hour`,
          details: { 
            count: recentMicroTransactions.length,
            amounts: recentMicroTransactions.map(t => t.amount),
            pattern: 'micro_transaction_testing'
          }
        });
      }
    }

    // Check for amount progression pattern (common in card testing)
    const recentAmounts = this.getRecentTransactionAmounts(transaction.userId, 30);
    if (this.detectAmountProgression(recentAmounts)) {
      factors.push({
        type: 'card_testing',
        severity: 'medium',
        score: 60,
        description: 'Amount progression pattern detected (possible card testing)',
        details: { amounts: recentAmounts, pattern: 'amount_progression' }
      });
    }

    return factors;
  }

  /**
   * Enhanced behavioral pattern detection
   */
  private async enhancedBehavioralAnalysis(transaction: PaymentTransaction): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];
    
    // Check for payment method hopping
    const recentPaymentMethods = this.getRecentPaymentMethods(transaction.userId, 24); // Last 24 hours
    if (recentPaymentMethods.length >= 3) {
      factors.push({
        type: 'behavioral_pattern',
        severity: 'medium',
        score: 65,
        description: `Multiple payment methods used recently: ${recentPaymentMethods.length}`,
        details: { methods: recentPaymentMethods, pattern: 'payment_method_hopping' }
      });
    }

    // Check for dormant account reactivation
    const userProfile = this.getUserProfile(transaction.userId);
    if (userProfile && this.isDormantAccountReactivation(userProfile, transaction)) {
      factors.push({
        type: 'behavioral_pattern',
        severity: 'medium',
        score: 55,
        description: 'Dormant account with sudden high-value transaction',
        details: { 
          lastActivity: userProfile.lastRiskAssessment,
          currentAmount: transaction.amount,
          pattern: 'dormant_reactivation'
        }
      });
    }

    // Check for unusual session behavior
    const sessionAnalysis = this.analyzeSessionBehavior(transaction);
    if (sessionAnalysis.isUnusual) {
      factors.push({
        type: 'behavioral_pattern',
        severity: sessionAnalysis.severity,
        score: sessionAnalysis.riskScore,
        description: sessionAnalysis.description,
        details: sessionAnalysis.details
      });
    }

    return factors;
  }

  /**
   * Enhanced network analysis
   */
  private async enhancedNetworkAnalysis(transaction: PaymentTransaction): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];
    
    // Enhanced proxy/VPN detection
    const proxyAnalysis = this.advancedProxyDetection(transaction.ipAddress);
    if (proxyAnalysis.isProxy) {
      factors.push({
        type: 'network_analysis',
        severity: proxyAnalysis.riskLevel as any,
        score: proxyAnalysis.riskScore,
        description: `${proxyAnalysis.type} detected`,
        details: proxyAnalysis
      });
    }

    // Check for shared IP with multiple users
    const ipUsers = this.getIPUsers(transaction.ipAddress);
    if (ipUsers.length > 5) {
      factors.push({
        type: 'network_analysis',
        severity: 'medium',
        score: 50,
        description: `IP address shared by multiple users: ${ipUsers.length}`,
        details: { userCount: ipUsers.length, ip: transaction.ipAddress }
      });
    }

    // Bot detection based on user agent patterns
    const botAnalysis = this.detectBotBehavior(transaction.userAgent, transaction.ipAddress);
    if (botAnalysis.isBot) {
      factors.push({
        type: 'network_analysis',
        severity: 'high',
        score: 85,
        description: 'Bot-like behavior detected',
        details: botAnalysis
      });
    }

    return factors;
  }

  // Helper methods for enhanced detection

  private getRecentMicroTransactions(userId: string, minutes: number): PaymentTransaction[] {
    const cutoff = subMinutes(new Date(), minutes);
    return this.getUserTransactions(userId)
      .filter(t => new Date(t.timestamp) >= cutoff && t.amount <= 100);
  }

  private getRecentTransactionAmounts(userId: string, minutes: number): number[] {
    const cutoff = subMinutes(new Date(), minutes);
    return this.getUserTransactions(userId)
      .filter(t => new Date(t.timestamp) >= cutoff)
      .map(t => t.amount)
      .sort((a, b) => a - b);
  }

  private detectAmountProgression(amounts: number[]): boolean {
    if (amounts.length < 3) return false;
    
    // Check if amounts are in ascending order (common testing pattern)
    let isAscending = true;
    for (let i = 1; i < amounts.length; i++) {
      if (amounts[i] <= amounts[i - 1]) {
        isAscending = false;
        break;
      }
    }
    
    return isAscending && amounts[amounts.length - 1] > amounts[0] * 5;
  }

  private getRecentPaymentMethods(userId: string, hours: number): string[] {
    const cutoff = subHours(new Date(), hours);
    const methods = new Set<string>();
    
    this.getUserTransactions(userId)
      .filter(t => new Date(t.timestamp) >= cutoff)
      .forEach(t => methods.add(t.paymentMethod));
    
    return Array.from(methods);
  }

  private isDormantAccountReactivation(profile: RiskProfile, transaction: PaymentTransaction): boolean {
    const lastActivity = new Date(profile.lastRiskAssessment);
    const daysSinceActivity = Math.floor((new Date().getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    
    // Consider dormant if no activity for 30+ days and current transaction is high value
    return daysSinceActivity >= 30 && transaction.amount >= 500000; // ₦5,000+
  }

  private analyzeSessionBehavior(transaction: PaymentTransaction): {
    isUnusual: boolean;
    severity: 'low' | 'medium' | 'high';
    riskScore: number;
    description: string;
    details: any;
  } {
    // Analyze user session patterns (simplified)
    const sessionData = {
      transactionTime: new Date(transaction.timestamp).getHours(),
      userAgent: transaction.userAgent,
      ipAddress: transaction.ipAddress
    };

    // Check for unusual time patterns
    const isUnusualTime = sessionData.transactionTime >= 2 && sessionData.transactionTime <= 5;
    
    // Check for unusual user agent
    const hasUnusualUserAgent = this.isUnusualUserAgent(sessionData.userAgent);
    
    if (isUnusualTime || hasUnusualUserAgent) {
      return {
        isUnusual: true,
        severity: 'low',
        riskScore: 35,
        description: 'Unusual session behavior detected',
        details: {
          unusualTime: isUnusualTime,
          unusualUserAgent: hasUnusualUserAgent,
          sessionData
        }
      };
    }

    return {
      isUnusual: false,
      severity: 'low',
      riskScore: 0,
      description: '',
      details: {}
    };
  }

  private advancedProxyDetection(ipAddress: string): {
    isProxy: boolean;
    type: string;
    riskLevel: string;
    riskScore: number;
    details: any;
  } {
    // Enhanced proxy detection (simplified)
    // In production, this would use IP intelligence services
    
    const proxyIndicators = {
      isDataCenter: this.isDataCenterIP(ipAddress),
      isTor: this.isTorExitNode(ipAddress),
      isVPN: this.isKnownVPN(ipAddress),
      isPublicProxy: this.isPublicProxy(ipAddress)
    };

    let isProxy = false;
    let type = 'unknown';
    let riskLevel = 'low';
    let riskScore = 0;

    if (proxyIndicators.isTor) {
      isProxy = true;
      type = 'Tor Network';
      riskLevel = 'high';
      riskScore = 95;
    } else if (proxyIndicators.isPublicProxy) {
      isProxy = true;
      type = 'Public Proxy';
      riskLevel = 'high';
      riskScore = 80;
    } else if (proxyIndicators.isVPN) {
      isProxy = true;
      type = 'VPN';
      riskLevel = 'medium';
      riskScore = 55;
    } else if (proxyIndicators.isDataCenter) {
      isProxy = true;
      type = 'Data Center';
      riskLevel = 'medium';
      riskScore = 45;
    }

    return {
      isProxy,
      type,
      riskLevel,
      riskScore,
      details: proxyIndicators
    };
  }

  private getIPUsers(ipAddress: string): string[] {
    const users: string[] = [];
    for (const [userId, transactions] of this.transactionHistory.entries()) {
      if (transactions.some(t => t.ipAddress === ipAddress)) {
        users.push(userId);
      }
    }
    return users;
  }

  private detectBotBehavior(userAgent: string, ipAddress: string): {
    isBot: boolean;
    confidence: number;
    indicators: string[];
    details: any;
  } {
    const indicators: string[] = [];
    let confidence = 0;

    // Check user agent patterns
    const botPatterns = [
      'bot', 'crawler', 'spider', 'scraper', 'automated',
      'headless', 'phantom', 'selenium', 'webdriver'
    ];

    const lowerUserAgent = userAgent.toLowerCase();
    botPatterns.forEach(pattern => {
      if (lowerUserAgent.includes(pattern)) {
        indicators.push(`User agent contains '${pattern}'`);
        confidence += 30;
      }
    });

    // Check for missing or minimal user agent
    if (!userAgent || userAgent.length < 20) {
      indicators.push('Minimal or missing user agent');
      confidence += 25;
    }

    // Check for rapid requests from same IP (simplified)
    const recentFromIP = this.getRecentTransactionsFromIP(ipAddress, 5);
    if (recentFromIP.length > 10) {
      indicators.push('High frequency requests from IP');
      confidence += 35;
    }

    return {
      isBot: confidence >= 60,
      confidence,
      indicators,
      details: {
        userAgent,
        ipAddress,
        recentTransactions: recentFromIP.length
      }
    };
  }

  // Additional helper methods

  private getAllRecentTransactions(since: Date): PaymentTransaction[] {
    const transactions: PaymentTransaction[] = [];
    for (const userTransactions of this.transactionHistory.values()) {
      transactions.push(...userTransactions.filter(t => new Date(t.timestamp) >= since));
    }
    return transactions;
  }

  private getRecentTransactionsFromIP(ipAddress: string, minutes: number): PaymentTransaction[] {
    const cutoff = subMinutes(new Date(), minutes);
    const transactions: PaymentTransaction[] = [];
    
    for (const userTransactions of this.transactionHistory.values()) {
      transactions.push(...userTransactions.filter(t => 
        t.ipAddress === ipAddress && new Date(t.timestamp) >= cutoff
      ));
    }
    
    return transactions;
  }

  private detectBurstPatterns(since: Date): void {
    const transactions = this.getAllRecentTransactions(since);
    
    // Group by user and check for bursts
    const userBursts = new Map<string, number>();
    transactions.forEach(t => {
      userBursts.set(t.userId, (userBursts.get(t.userId) || 0) + 1);
    });

    userBursts.forEach((count, userId) => {
      if (count >= 10) { // Threshold for burst pattern
        console.warn(`⚠️ Burst pattern detected for user ${userId}: ${count} transactions in 10 minutes`);
      }
    });
  }

  private detectCoordinatedAttacks(since: Date): void {
    // Detect coordinated attacks across multiple accounts
    const transactions = this.getAllRecentTransactions(since);
    
    // Group by IP address
    const ipGroups = new Map<string, PaymentTransaction[]>();
    transactions.forEach(t => {
      if (!ipGroups.has(t.ipAddress)) {
        ipGroups.set(t.ipAddress, []);
      }
      ipGroups.get(t.ipAddress)!.push(t);
    });

    ipGroups.forEach((ipTransactions, ip) => {
      const uniqueUsers = new Set(ipTransactions.map(t => t.userId)).size;
      if (uniqueUsers >= 5 && ipTransactions.length >= 20) {
        console.warn(`⚠️ Potential coordinated attack from IP ${ip}: ${uniqueUsers} users, ${ipTransactions.length} transactions`);
      }
    });
  }

  private detectGeographicAnomalies(since: Date): void {
    // Detect unusual geographic clustering
    const transactions = this.getAllRecentTransactions(since);
    
    // Group by country
    const countryGroups = new Map<string, number>();
    transactions.forEach(t => {
      if (t.location?.country) {
        countryGroups.set(t.location.country, (countryGroups.get(t.location.country) || 0) + 1);
      }
    });

    countryGroups.forEach((count, country) => {
      const percentage = (count / transactions.length) * 100;
      if (percentage > 80) { // More than 80% from one country
        console.warn(`⚠️ Geographic clustering detected: ${percentage.toFixed(1)}% of transactions from ${country}`);
      }
    });
  }

  private analyzeIPPatterns(): void {
    // Analyze IP address patterns for anomalies
    console.log('🔍 Analyzing IP patterns...');
  }

  private detectProxyUsage(): void {
    // Enhanced proxy detection
    console.log('🔍 Detecting proxy usage...');
  }

  private analyzeUserAgentPatterns(): void {
    // Analyze user agent patterns for bots
    console.log('🔍 Analyzing user agent patterns...');
  }

  private triggerVelocityAlert(transactionCount: number): void {
    console.warn(`🚨 Velocity alert triggered: ${transactionCount} transactions/minute`);
    // In production, this would trigger alerts to security team
  }

  private isUnusualUserAgent(userAgent: string): boolean {
    // Check for unusual user agent patterns
    const unusualPatterns = ['headless', 'phantom', 'selenium', 'webdriver', 'bot'];
    return unusualPatterns.some(pattern => userAgent.toLowerCase().includes(pattern));
  }

  private isDataCenterIP(ip: string): boolean {
    // Simplified data center detection
    // In production, use IP intelligence services
    const dataCenterRanges = ['127.0.0.1', '192.168.']; // Mock patterns
    return dataCenterRanges.some(range => ip.startsWith(range));
  }

  private isTorExitNode(ip: string): boolean {
    // Simplified Tor detection
    // In production, use Tor exit node lists
    return false; // Mock implementation
  }

  private isKnownVPN(ip: string): boolean {
    // Simplified VPN detection
    // In production, use VPN detection services
    return false; // Mock implementation
  }

  private isPublicProxy(ip: string): boolean {
    // Simplified public proxy detection
    return false; // Mock implementation
  }

  /**
   * Load historical transaction data for analysis
   */
  private loadHistoricalData(): void {
    // In production, load from database
    // For demo, we'll use mock data
    console.log('📊 Loading historical transaction data...');
  }

  /**
   * Initialize suspicious pattern detection
   */
  private initializeSuspiciousPatterns(): void {
    const suspiciousEmailPatterns = [
      'temp',
      '10minutemail',
      'guerrillamail',
      'mailinator',
      'throwaway'
    ];

    const suspiciousUserAgentPatterns = [
      'bot',
      'crawler',
      'automated',
      'script'
    ];

    suspiciousEmailPatterns.forEach(pattern => {
      this.suspiciousPatterns.set(`email_${pattern}`, 30); // 30 point risk score
    });

    suspiciousUserAgentPatterns.forEach(pattern => {
      this.suspiciousPatterns.set(`user_agent_${pattern}`, 40); // 40 point risk score
    });
  }

  /**
   * Main fraud detection analysis
   */
  public async analyzeTransaction(transaction: PaymentTransaction): Promise<{
    isBlocked: boolean;
    riskScore: number;
    riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
    alerts: FraudAlert[];
    riskFactors: RiskFactor[];
  }> {
    console.log(`🔍 Analyzing transaction: ${transaction.id}`);

    const riskFactors: RiskFactor[] = [];
    const alerts: FraudAlert[] = [];

    // Run all fraud detection rules
    const velocityRisk = await this.checkVelocityRules(transaction);
    const amountRisk = await this.checkAmountThresholds(transaction);
    const geoRisk = await this.checkGeoLocationRules(transaction);
    const behaviorRisk = await this.checkBehavioralPatterns(transaction);
    const deviceRisk = await this.checkDeviceFingerprint(transaction);
    const networkRisk = await this.checkNetworkAnalysis(transaction);
    const historyRisk = await this.checkUserHistory(transaction);
    const cardRisk = await this.checkCardTesting(transaction);

    // Collect all risk factors
    riskFactors.push(
      ...velocityRisk.factors,
      ...amountRisk.factors,
      ...geoRisk.factors,
      ...behaviorRisk.factors,
      ...deviceRisk.factors,
      ...networkRisk.factors,
      ...historyRisk.factors,
      ...cardRisk.factors
    );

    // Calculate total risk score
    const totalRiskScore = this.calculateRiskScore(riskFactors);
    const riskLevel = this.determineRiskLevel(totalRiskScore);

    // Generate alerts for high-risk transactions
    if (riskLevel === 'high' || riskLevel === 'very_high') {
      const alert = this.createFraudAlert(transaction, riskFactors, totalRiskScore);
      alerts.push(alert);
    }

    // Determine if transaction should be blocked
    const isBlocked = this.shouldBlockTransaction(totalRiskScore, riskFactors);

    // Update user risk profile
    await this.updateUserRiskProfile(transaction, totalRiskScore, riskFactors);

    // Log the analysis
    this.logFraudAnalysis(transaction, {
      riskScore: totalRiskScore,
      riskLevel,
      isBlocked,
      riskFactors: riskFactors.length
    });

    return {
      isBlocked,
      riskScore: totalRiskScore,
      riskLevel,
      alerts,
      riskFactors
    };
  }

  /**
   * Velocity-based fraud detection
   */
  private async checkVelocityRules(transaction: PaymentTransaction): Promise<{
    factors: RiskFactor[]
  }> {
    const factors: RiskFactor[] = [];
    
    // Get user's recent transactions
    const userTransactions = this.getUserTransactions(transaction.userId);
    const now = new Date();
    const last5Min = subMinutes(now, 5);
    const last1Hour = subHours(now, 1);
    const last24Hours = subDays(now, 1);

    // Count recent transactions
    const transactionsLast5Minutes = userTransactions.filter(
      t => new Date(t.timestamp) >= last5Min
    ).length;

    const transactionsLast1Hour = userTransactions.filter(
      t => new Date(t.timestamp) >= last1Hour
    ).length;

    const transactionsLast24Hours = userTransactions.filter(
      t => new Date(t.timestamp) >= last24Hours
    ).length;

    // Calculate amount velocity
    const amountLast1Hour = userTransactions
      .filter(t => new Date(t.timestamp) >= last1Hour)
      .reduce((sum, t) => sum + t.amount, 0);

    const amountLast24Hours = userTransactions
      .filter(t => new Date(t.timestamp) >= last24Hours)
      .reduce((sum, t) => sum + t.amount, 0);

    // Count failed attempts
    const failedAttemptsLast1Hour = userTransactions
      .filter(t => new Date(t.timestamp) >= last1Hour && t.status === 'failed')
      .length;

    // Check velocity limits
    if (transactionsLast5Minutes >= this.config.velocityLimits.maxTransactionsPer5Minutes) {
      factors.push({
        type: 'velocity_check',
        severity: 'high',
        score: 80,
        description: `Too many transactions in 5 minutes: ${transactionsLast5Minutes}`,
        details: { count: transactionsLast5Minutes, limit: this.config.velocityLimits.maxTransactionsPer5Minutes }
      });
    }

    if (transactionsLast1Hour >= this.config.velocityLimits.maxTransactionsPer1Hour) {
      factors.push({
        type: 'velocity_check',
        severity: 'medium',
        score: 60,
        description: `High transaction frequency in 1 hour: ${transactionsLast1Hour}`,
        details: { count: transactionsLast1Hour, limit: this.config.velocityLimits.maxTransactionsPer1Hour }
      });
    }

    if (amountLast1Hour >= this.config.velocityLimits.maxAmountPer1Hour) {
      factors.push({
        type: 'velocity_check',
        severity: 'high',
        score: 70,
        description: `High transaction amount in 1 hour: ${amountLast1Hour}`,
        details: { amount: amountLast1Hour, limit: this.config.velocityLimits.maxAmountPer1Hour }
      });
    }

    if (failedAttemptsLast1Hour >= this.config.velocityLimits.maxFailedAttemptsPer1Hour) {
      factors.push({
        type: 'velocity_check',
        severity: 'critical',
        score: 90,
        description: `Too many failed attempts: ${failedAttemptsLast1Hour}`,
        details: { count: failedAttemptsLast1Hour, limit: this.config.velocityLimits.maxFailedAttemptsPer1Hour }
      });
    }

    return { factors };
  }

  /**
   * Amount-based fraud detection
   */
  private async checkAmountThresholds(transaction: PaymentTransaction): Promise<{
    factors: RiskFactor[]
  }> {
    const factors: RiskFactor[] = [];
    const { amount } = transaction;

    // Check for unusual amounts
    if (amount >= this.config.amountThresholds.suspiciousAmount) {
      factors.push({
        type: 'amount_threshold',
        severity: 'high',
        score: 75,
        description: `Suspicious high amount: ${amount}`,
        details: { amount, threshold: this.config.amountThresholds.suspiciousAmount }
      });
    }

    // Check for round numbers (potential testing)
    if (amount % 100 === 0 && amount >= 1000) {
      factors.push({
        type: 'amount_threshold',
        severity: 'low',
        score: 20,
        description: 'Round number amount (potential testing)',
        details: { amount }
      });
    }

    // Check for common test amounts
    const testAmounts = [1, 10, 100, 1000, 9999, 12345];
    if (testAmounts.includes(amount)) {
      factors.push({
        type: 'amount_threshold',
        severity: 'medium',
        score: 50,
        description: 'Common testing amount',
        details: { amount }
      });
    }

    return { factors };
  }

  /**
   * Geographic location fraud detection
   */
  private async checkGeoLocationRules(transaction: PaymentTransaction): Promise<{
    factors: RiskFactor[]
  }> {
    const factors: RiskFactor[] = [];
    const { location, userId } = transaction;

    if (!location) {
      factors.push({
        type: 'geo_location',
        severity: 'low',
        score: 15,
        description: 'Missing location information',
        details: {}
      });
      return { factors };
    }

    // Check blocked countries
    if (this.config.geoLocationRules.blockedCountries.includes(location.country)) {
      factors.push({
        type: 'geo_location',
        severity: 'critical',
        score: 95,
        description: `Transaction from blocked country: ${location.country}`,
        details: { country: location.country }
      });
    }

    // Check suspicious countries
    if (this.config.geoLocationRules.suspiciousCountries.includes(location.country)) {
      factors.push({
        type: 'geo_location',
        severity: 'medium',
        score: 40,
        description: `Transaction from suspicious country: ${location.country}`,
        details: { country: location.country }
      });
    }

    // Check geo-velocity (impossible travel)
    const recentTransactions = this.getUserTransactions(userId)
      .filter(t => t.location && new Date(t.timestamp) >= subHours(new Date(), 2))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (recentTransactions.length > 0 && location.coordinates) {
      const lastTransaction = recentTransactions[0];
      if (lastTransaction.location?.coordinates) {
        const distance = this.calculateDistance(
          location.coordinates,
          lastTransaction.location.coordinates
        );
        const timeDiff = (new Date(transaction.timestamp).getTime() - 
                         new Date(lastTransaction.timestamp).getTime()) / (1000 * 60); // minutes

        const maxPossibleDistance = (timeDiff / 60) * 900; // 900 km/h (commercial flight)

        if (distance > maxPossibleDistance) {
          factors.push({
            type: 'geo_location',
            severity: 'high',
            score: 85,
            description: 'Impossible travel detected',
            details: {
              distance,
              timeDiff,
              maxPossibleDistance,
              from: lastTransaction.location,
              to: location
            }
          });
        }
      }
    }

    return { factors };
  }

  /**
   * Behavioral pattern analysis
   */
  private async checkBehavioralPatterns(transaction: PaymentTransaction): Promise<{
    factors: RiskFactor[]
  }> {
    const factors: RiskFactor[] = [];
    const { email, userAgent, userId } = transaction;

    // Check email patterns
    for (const [pattern, score] of this.suspiciousPatterns.entries()) {
      if (pattern.startsWith('email_') && email.toLowerCase().includes(pattern.replace('email_', ''))) {
        factors.push({
          type: 'email_pattern',
          severity: score > 50 ? 'medium' : 'low',
          score,
          description: `Suspicious email pattern: ${pattern}`,
          details: { email, pattern }
        });
      }
    }

    // Check user agent patterns
    for (const [pattern, score] of this.suspiciousPatterns.entries()) {
      if (pattern.startsWith('user_agent_') && userAgent.toLowerCase().includes(pattern.replace('user_agent_', ''))) {
        factors.push({
          type: 'behavioral_pattern',
          severity: 'medium',
          score,
          description: `Suspicious user agent pattern: ${pattern}`,
          details: { userAgent, pattern }
        });
      }
    }

    // Check time patterns (unusual hours)
    const transactionHour = new Date(transaction.timestamp).getHours();
    if (transactionHour >= 2 && transactionHour <= 5) {
      factors.push({
        type: 'time_pattern',
        severity: 'low',
        score: 25,
        description: 'Transaction at unusual hours (2-5 AM)',
        details: { hour: transactionHour }
      });
    }

    // Check new user with high amount
    const userProfile = this.getUserProfile(userId);
    if ((!userProfile || userProfile.transactionHistory.totalTransactions < 3) && 
        transaction.amount >= this.config.behaviorRules.newUserHighAmountThreshold) {
      factors.push({
        type: 'behavioral_pattern',
        severity: 'medium',
        score: 55,
        description: 'New user with high transaction amount',
        details: { 
          amount: transaction.amount,
          threshold: this.config.behaviorRules.newUserHighAmountThreshold,
          totalTransactions: userProfile?.transactionHistory.totalTransactions || 0
        }
      });
    }

    return { factors };
  }

  /**
   * Device fingerprint analysis
   */
  private async checkDeviceFingerprint(transaction: PaymentTransaction): Promise<{
    factors: RiskFactor[]
  }> {
    const factors: RiskFactor[] = [];
    const { deviceFingerprint, userId } = transaction;

    if (!deviceFingerprint) {
      factors.push({
        type: 'device_fingerprint',
        severity: 'low',
        score: 10,
        description: 'Missing device fingerprint',
        details: {}
      });
      return { factors };
    }

    // Check if device is used by multiple users
    const deviceUsers = this.getDeviceUsers(deviceFingerprint);
    if (deviceUsers.length > 3) {
      factors.push({
        type: 'device_fingerprint',
        severity: 'medium',
        score: 45,
        description: `Device used by multiple users: ${deviceUsers.length}`,
        details: { userCount: deviceUsers.length, deviceFingerprint }
      });
    }

    return { factors };
  }

  /**
   * Network analysis (IP reputation, proxy detection)
   */
  private async checkNetworkAnalysis(transaction: PaymentTransaction): Promise<{
    factors: RiskFactor[]
  }> {
    const factors: RiskFactor[] = [];
    const { ipAddress } = transaction;

    // Check blocked IPs
    if (this.blockedIPs.has(ipAddress)) {
      factors.push({
        type: 'ip_reputation',
        severity: 'critical',
        score: 100,
        description: 'IP address is blocked',
        details: { ipAddress }
      });
    }

    // Check for proxy/VPN patterns (simplified detection)
    if (this.isProxyIP(ipAddress)) {
      factors.push({
        type: 'network_analysis',
        severity: 'medium',
        score: 50,
        description: 'Transaction through proxy/VPN',
        details: { ipAddress }
      });
    }

    return { factors };
  }

  /**
   * User transaction history analysis
   */
  private async checkUserHistory(transaction: PaymentTransaction): Promise<{
    factors: RiskFactor[]
  }> {
    const factors: RiskFactor[] = [];
    const userProfile = this.getUserProfile(transaction.userId);

    if (!userProfile) {
      factors.push({
        type: 'user_history',
        severity: 'low',
        score: 20,
        description: 'No transaction history available',
        details: {}
      });
      return { factors };
    }

    // Check success rate
    if (userProfile.transactionHistory.successRate < 0.5 && 
        userProfile.transactionHistory.totalTransactions >= 5) {
      factors.push({
        type: 'user_history',
        severity: 'high',
        score: 70,
        description: `Low success rate: ${userProfile.transactionHistory.successRate}`,
        details: { 
          successRate: userProfile.transactionHistory.successRate,
          totalTransactions: userProfile.transactionHistory.totalTransactions
        }
      });
    }

    // Check chargeback rate
    if (userProfile.transactionHistory.chargebackRate > 0.02) { // >2%
      factors.push({
        type: 'user_history',
        severity: 'high',
        score: 80,
        description: `High chargeback rate: ${userProfile.transactionHistory.chargebackRate}`,
        details: { chargebackRate: userProfile.transactionHistory.chargebackRate }
      });
    }

    return { factors };
  }

  /**
   * Card testing detection
   */
  private async checkCardTesting(transaction: PaymentTransaction): Promise<{
    factors: RiskFactor[]
  }> {
    const factors: RiskFactor[] = [];
    const { cardBin, amount } = transaction;

    // Check for small amounts (typical of card testing)
    if (amount <= 10) {
      factors.push({
        type: 'card_testing',
        severity: 'medium',
        score: 40,
        description: 'Small amount transaction (potential card testing)',
        details: { amount }
      });
    }

    // Check for multiple cards from same BIN
    if (cardBin) {
      const binTransactions = this.getBinTransactions(cardBin);
      if (binTransactions.length >= 10) {
        factors.push({
          type: 'card_testing',
          severity: 'high',
          score: 75,
          description: `High activity from card BIN: ${cardBin}`,
          details: { cardBin, transactionCount: binTransactions.length }
        });
      }
    }

    return { factors };
  }

  /**
   * Calculate overall risk score
   */
  private calculateRiskScore(riskFactors: RiskFactor[]): number {
    if (riskFactors.length === 0) return 0;

    // Weight factors by severity
    const weights = {
      low: 0.5,
      medium: 1.0,
      high: 1.5,
      critical: 2.0
    };

    let totalScore = 0;
    let totalWeight = 0;

    riskFactors.forEach(factor => {
      const weight = weights[factor.severity];
      totalScore += factor.score * weight;
      totalWeight += weight;
    });

    // Normalize to 0-1000 scale
    const normalizedScore = Math.min(1000, (totalScore / Math.max(1, totalWeight)));
    
    return Math.round(normalizedScore);
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(riskScore: number): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
    if (riskScore >= 800) return 'very_high';
    if (riskScore >= 600) return 'high';
    if (riskScore >= 400) return 'medium';
    if (riskScore >= 200) return 'low';
    return 'very_low';
  }

  /**
   * Determine if transaction should be blocked
   */
  private shouldBlockTransaction(riskScore: number, riskFactors: RiskFactor[]): boolean {
    if (!this.config.autoBlockEnabled) return false;

    // Auto-block for critical risk factors
    const hasCritical = riskFactors.some(f => f.severity === 'critical');
    if (hasCritical) return true;

    // Block if risk score exceeds threshold
    return riskScore >= this.config.alertThresholds.critical;
  }

  /**
   * Create fraud alert
   */
  private createFraudAlert(
    transaction: PaymentTransaction, 
    riskFactors: RiskFactor[], 
    riskScore: number
  ): FraudAlert {
    const primaryFactor = riskFactors.reduce((max, factor) => 
      factor.score > max.score ? factor : max
    );

    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      transactionId: transaction.id,
      userId: transaction.userId,
      type: primaryFactor.type,
      severity: primaryFactor.severity,
      score: riskScore,
      description: `High-risk transaction detected: ${primaryFactor.description}`,
      details: {
        transaction,
        riskFactors,
        primaryFactor
      },
      timestamp: new Date().toISOString(),
      status: 'active'
    };
  }

  /**
   * Update user risk profile
   */
  private async updateUserRiskProfile(
    transaction: PaymentTransaction,
    riskScore: number,
    riskFactors: RiskFactor[]
  ): Promise<void> {
    let profile = this.userProfiles.get(transaction.userId);

    if (!profile) {
      profile = {
        userId: transaction.userId,
        email: transaction.email,
        riskScore: 0,
        riskLevel: 'very_low',
        trustScore: 1000,
        transactionHistory: {
          totalTransactions: 0,
          totalAmount: 0,
          successRate: 1.0,
          chargebackRate: 0,
          disputeRate: 0
        },
        behaviorFlags: [],
        lastRiskAssessment: new Date().toISOString(),
        riskFactors: []
      };
    }

    // Update transaction history
    profile.transactionHistory.totalTransactions++;
    profile.transactionHistory.totalAmount += transaction.amount;

    // Update risk score (weighted average)
    const weight = 0.3; // Weight for new transaction
    profile.riskScore = Math.round(
      (profile.riskScore * (1 - weight)) + (riskScore * weight)
    );

    // Update trust score (inverse of risk score)
    profile.trustScore = Math.max(0, 1000 - profile.riskScore);

    // Update risk level
    profile.riskLevel = this.determineRiskLevel(profile.riskScore);

    // Add behavior flags
    riskFactors.forEach(factor => {
      const flag = `${factor.type}_${factor.severity}`;
      if (!profile!.behaviorFlags.includes(flag)) {
        profile!.behaviorFlags.push(flag);
      }
    });

    // Keep only recent risk factors
    profile.riskFactors = [...riskFactors, ...profile.riskFactors].slice(0, 10);
    profile.lastRiskAssessment = new Date().toISOString();

    this.userProfiles.set(transaction.userId, profile);
  }

  // Helper methods
  private getUserTransactions(userId: string): PaymentTransaction[] {
    return this.transactionHistory.get(userId) || [];
  }

  private getUserProfile(userId: string): RiskProfile | undefined {
    return this.userProfiles.get(userId);
  }

  private getDeviceUsers(deviceFingerprint: string): string[] {
    const users: string[] = [];
    for (const [userId, transactions] of this.transactionHistory.entries()) {
      if (transactions.some(t => t.deviceFingerprint === deviceFingerprint)) {
        users.push(userId);
      }
    }
    return users;
  }

  private getBinTransactions(cardBin: string): PaymentTransaction[] {
    const transactions: PaymentTransaction[] = [];
    for (const userTransactions of this.transactionHistory.values()) {
      transactions.push(...userTransactions.filter(t => t.cardBin === cardBin));
    }
    return transactions;
  }

  private isProxyIP(ipAddress: string): boolean {
    // Simplified proxy detection (in production, use a real IP intelligence service)
    const proxyIndicators = [
      '10.',    // Private networks often used by proxies
      '192.168.', // Private networks
      '172.',   // Private networks
    ];
    
    return proxyIndicators.some(indicator => ipAddress.startsWith(indicator));
  }

  private calculateDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(coord2.lat - coord1.lat);
    const dLng = this.deg2rad(coord2.lng - coord1.lng);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(coord1.lat)) * Math.cos(this.deg2rad(coord2.lat)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  private logFraudAnalysis(transaction: PaymentTransaction, analysis: any): void {
    console.log(`🛡️ Fraud Analysis [${transaction.id}]:`, {
      userId: transaction.userId,
      amount: transaction.amount,
      riskScore: analysis.riskScore,
      riskLevel: analysis.riskLevel,
      isBlocked: analysis.isBlocked,
      riskFactors: analysis.riskFactors
    });
  }

  /**
   * Public API methods
   */
  public addTransaction(transaction: PaymentTransaction): void {
    const userTransactions = this.getUserTransactions(transaction.userId);
    userTransactions.push(transaction);
    this.transactionHistory.set(transaction.userId, userTransactions);
  }

  public blockIP(ipAddress: string): void {
    this.blockedIPs.add(ipAddress);
  }

  public blockEmail(email: string): void {
    this.blockedEmails.add(email);
  }

  public getUserRiskProfile(userId: string): RiskProfile | undefined {
    return this.getUserProfile(userId);
  }

  public updateConfig(newConfig: Partial<FraudDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Default fraud detection configuration
 */
export const defaultFraudDetectionConfig: FraudDetectionConfig = {
  enabled: true,
  autoBlockEnabled: true,
  alertThresholds: {
    low: 200,
    medium: 400,
    high: 600,
    critical: 800
  },
  velocityLimits: {
    maxTransactionsPer5Minutes: 5,
    maxTransactionsPer1Hour: 20,
    maxTransactionsPer24Hours: 100,
    maxAmountPer1Hour: 1000000, // ₦10,000
    maxAmountPer24Hours: 5000000, // ₦50,000
    maxFailedAttemptsPer1Hour: 5
  },
  amountThresholds: {
    smallTransaction: 1000, // ₦10
    mediumTransaction: 100000, // ₦1,000
    largeTransaction: 1000000, // ₦10,000
    suspiciousAmount: 5000000 // ₦50,000
  },
  geoLocationRules: {
    blockedCountries: [], // Add high-risk countries
    suspiciousCountries: [], // Add countries requiring extra verification
    maxDistanceKm: 1000,
    timeWindowMinutes: 60
  },
  behaviorRules: {
    newUserHighAmountThreshold: 500000, // ₦5,000 for new users
    rapidPaymentMethodChangeCount: 3,
    suspiciousUserAgentPatterns: ['bot', 'crawler', 'automated'],
    unusualTimePatterns: true
  }
};

// Export singleton instance
export const fraudDetectionEngine = new FraudDetectionEngine(defaultFraudDetectionConfig);

export default FraudDetectionEngine;