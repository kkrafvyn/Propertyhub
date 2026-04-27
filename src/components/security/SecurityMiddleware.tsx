/**
 * Security Middleware Component
 * 
 * Provides comprehensive security features for PropertyHub:
 * - Input validation and sanitization
 * - XSS protection
 * - CSRF protection
 * - Rate limiting
 * - Session management
 * - Audit logging
 * - Content Security Policy
 * 
 * @author PropertyHub Team
 * @version 1.0.0
 */

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { toast } from "sonner";

// Types
interface SecurityConfig {
  enableXSSProtection: boolean;
  enableCSRFProtection: boolean;
  enableRateLimit: boolean;
  enableAuditLog: boolean;
  maxRequestsPerMinute: number;
  sessionTimeout: number;
  contentSecurityPolicy: string;
}

interface SecurityEvent {
  id: string;
  type: 'xss_attempt' | 'csrf_attempt' | 'rate_limit' | 'invalid_session' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userId?: string;
  userAgent: string;
  ipAddress: string;
  timestamp: number;
  details?: any;
}

interface SecurityContextType {
  isSecure: boolean;
  validateInput: (input: string, type?: 'text' | 'email' | 'url' | 'html') => string;
  checkPermission: (resource: string, action: string) => boolean;
  logSecurityEvent: (event: Omit<SecurityEvent, 'id' | 'timestamp' | 'userAgent' | 'ipAddress'>) => void;
  getSecurityStatus: () => SecurityStatus;
  enableSecurityMode: (enabled: boolean) => void;
}

interface SecurityStatus {
  xssProtection: boolean;
  csrfProtection: boolean;
  rateLimit: boolean;
  sessionValid: boolean;
  lastSecurityCheck: number;
}

// Security utilities
class SecurityManager {
  private static config: SecurityConfig = {
    enableXSSProtection: true,
    enableCSRFProtection: true,
    enableRateLimit: true,
    enableAuditLog: true,
    maxRequestsPerMinute: 60,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  };

  private static requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private static securityEvents: SecurityEvent[] = [];
  private static sessionStartTime: number = Date.now();
  private static isSecurityEnabled: boolean = true;

  /**
   * XSS Protection - Sanitize input to prevent script injection
   */
  static sanitizeXSS(input: string): string {
    if (!this.config.enableXSSProtection || !this.isSecurityEnabled) return input;

    return input
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitized = this.sanitizeXSS(email.toLowerCase().trim());
    
    if (!emailRegex.test(sanitized)) {
      this.logEvent({
        type: 'xss_attempt',
        severity: 'medium',
        message: 'Invalid email format detected',
        details: { originalInput: email, sanitizedInput: sanitized }
      });
      return '';
    }
    
    return sanitized;
  }

  /**
   * Validate URL format
   */
  static validateURL(url: string): string {
    try {
      const sanitized = this.sanitizeXSS(url);
      const urlObj = new URL(sanitized);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        this.logEvent({
          type: 'xss_attempt',
          severity: 'high',
          message: 'Suspicious URL protocol detected',
          details: { originalInput: url, protocol: urlObj.protocol }
        });
        return '';
      }
      
      return sanitized;
    } catch (error) {
      this.logEvent({
        type: 'xss_attempt',
        severity: 'medium',
        message: 'Invalid URL format detected',
        details: { originalInput: url, error: error.message }
      });
      return '';
    }
  }

  /**
   * Validate general text input
   */
  static validateText(text: string): string {
    if (typeof text !== 'string') return '';
    
    // Remove potentially dangerous characters and limit length
    const sanitized = this.sanitizeXSS(text.trim().slice(0, 1000));
    
    // Check for SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(--|\/\*|\*\/|;|'|")/g
    ];
    
    const hasSQLInjection = sqlPatterns.some(pattern => pattern.test(sanitized));
    if (hasSQLInjection) {
      this.logEvent({
        type: 'xss_attempt',
        severity: 'critical',
        message: 'SQL injection attempt detected',
        details: { originalInput: text }
      });
      return '';
    }
    
    return sanitized;
  }

  /**
   * Rate limiting - Check if request is within limits
   */
  static checkRateLimit(identifier: string = 'anonymous'): boolean {
    if (!this.config.enableRateLimit || !this.isSecurityEnabled) return true;

    const now = Date.now();
    const resetTime = now + 60 * 1000; // 1 minute window
    
    const current = this.requestCounts.get(identifier);
    
    if (!current || now > current.resetTime) {
      this.requestCounts.set(identifier, { count: 1, resetTime });
      return true;
    }
    
    if (current.count >= this.config.maxRequestsPerMinute) {
      this.logEvent({
        type: 'rate_limit',
        severity: 'medium',
        message: 'Rate limit exceeded',
        details: { identifier, requestCount: current.count }
      });
      return false;
    }
    
    current.count += 1;
    return true;
  }

  /**
   * Session validation
   */
  static isSessionValid(): boolean {
    const sessionAge = Date.now() - this.sessionStartTime;
    const isValid = sessionAge < this.config.sessionTimeout;
    
    if (!isValid) {
      this.logEvent({
        type: 'invalid_session',
        severity: 'low',
        message: 'Session expired',
        details: { sessionAge, timeout: this.config.sessionTimeout }
      });
    }
    
    return isValid;
  }

  /**
   * Log security event
   */
  static logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'userAgent' | 'ipAddress'>): void {
    if (!this.config.enableAuditLog) return;

    const securityEvent: SecurityEvent = {
      ...event,
      id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      ipAddress: 'unknown' // In production, get from server
    };

    this.securityEvents.push(securityEvent);
    
    // Keep only last 1000 events to prevent memory issues
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    // Log critical events to console
    if (event.severity === 'critical' || event.severity === 'high') {
      console.warn('🚨 Security Event:', securityEvent);
    }

    // In production, send to security monitoring service
    this.reportToSecurityService(securityEvent);
  }

  /**
   * Report to the configured security monitoring sink when available.
   */
  private static reportToSecurityService(event: SecurityEvent): void {
    // Until a remote sink is wired in, keep local reporting scoped to development.
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Security Event Reported:', event);
    }
  }

  /**
   * CSRF Token management
   */
  static generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Set Content Security Policy
   */
  static setCSP(): void {
    if (typeof document !== 'undefined') {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = this.config.contentSecurityPolicy;
      document.head.appendChild(meta);
    }
  }

  /**
   * Enable/disable security features
   */
  static setSecurityMode(enabled: boolean): void {
    this.isSecurityEnabled = enabled;
    if (enabled) {
      this.setCSP();
    }
  }

  /**
   * Get security status
   */
  static getStatus(): SecurityStatus {
    return {
      xssProtection: this.config.enableXSSProtection && this.isSecurityEnabled,
      csrfProtection: this.config.enableCSRFProtection && this.isSecurityEnabled,
      rateLimit: this.config.enableRateLimit && this.isSecurityEnabled,
      sessionValid: this.isSessionValid(),
      lastSecurityCheck: Date.now()
    };
  }

  /**
   * Get recent security events
   */
  static getRecentEvents(limit: number = 50): SecurityEvent[] {
    return this.securityEvents.slice(-limit);
  }

  /**
   * Clear security events (admin only)
   */
  static clearEvents(): void {
    this.securityEvents = [];
  }

  /**
   * Reset session timer
   */
  static refreshSession(): void {
    this.sessionStartTime = Date.now();
  }
}

// Security Context
const SecurityContext = createContext<SecurityContextType | null>(null);

// Security Provider Component
export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [isSecure, setIsSecure] = useState(true);

  // Initialize security on mount
  useEffect(() => {
    SecurityManager.setSecurityMode(true);
    SecurityManager.refreshSession();

    // Set up periodic security checks
    const securityCheckInterval = setInterval(() => {
      const status = SecurityManager.getStatus();
      setIsSecure(status.sessionValid);
    }, 60000); // Check every minute

    return () => clearInterval(securityCheckInterval);
  }, []);

  /**
   * Validate input based on type
   */
  const validateInput = useCallback((input: string, type: 'text' | 'email' | 'url' | 'html' = 'text'): string => {
    if (!input || typeof input !== 'string') return '';

    switch (type) {
      case 'email':
        return SecurityManager.validateEmail(input);
      case 'url':
        return SecurityManager.validateURL(input);
      case 'html':
        return SecurityManager.sanitizeXSS(input);
      case 'text':
      default:
        return SecurityManager.validateText(input);
    }
  }, []);

  /**
   * Check user permissions (basic implementation)
   */
  const checkPermission = useCallback((resource: string, action: string): boolean => {
    // Basic permission check - enhance based on your needs
    const userRole = localStorage.getItem('userRole') || 'user';
    
    // Admin has access to everything
    if (userRole === 'admin') return true;
    
    // Manager has access to most things
    if (userRole === 'manager' && !['admin_panel', 'user_management'].includes(resource)) {
      return true;
    }
    
    // Host has access to property management
    if (userRole === 'host' && ['properties', 'analytics', 'bookings'].includes(resource)) {
      return true;
    }
    
    // User has basic access
    if (userRole === 'user' && ['properties', 'profile', 'bookings'].includes(resource) && action === 'read') {
      return true;
    }
    
    // Log unauthorized access attempt
    SecurityManager.logEvent({
      type: 'unauthorized_access',
      severity: 'medium',
      message: 'Unauthorized access attempt',
      details: { resource, action, userRole }
    });
    
    return false;
  }, []);

  /**
   * Log security event
   */
  const logSecurityEvent = useCallback((event: Omit<SecurityEvent, 'id' | 'timestamp' | 'userAgent' | 'ipAddress'>) => {
    SecurityManager.logEvent(event);
  }, []);

  /**
   * Get security status
   */
  const getSecurityStatus = useCallback((): SecurityStatus => {
    return SecurityManager.getStatus();
  }, []);

  /**
   * Enable/disable security mode
   */
  const enableSecurityMode = useCallback((enabled: boolean) => {
    SecurityManager.setSecurityMode(enabled);
    setIsSecure(enabled);
    
    if (enabled) {
      toast.success('🔒 Security mode enabled');
    } else {
      toast.warning('⚠️ Security mode disabled');
    }
  }, []);

  const contextValue: SecurityContextType = {
    isSecure,
    validateInput,
    checkPermission,
    logSecurityEvent,
    getSecurityStatus,
    enableSecurityMode
  };

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}
    </SecurityContext.Provider>
  );
}

// Hook to use security context
export function useSecurity(): SecurityContextType {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}

// Security Status Component
export function SecurityStatusIndicator() {
  const { getSecurityStatus, isSecure } = useSecurity();
  const [status, setStatus] = useState<SecurityStatus | null>(null);

  useEffect(() => {
    setStatus(getSecurityStatus());
    const interval = setInterval(() => {
      setStatus(getSecurityStatus());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [getSecurityStatus]);

  if (!status) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className={`w-2 h-2 rounded-full ${isSecure ? 'bg-green-500' : 'bg-red-500'}`} />
      <span>Security: {isSecure ? 'Active' : 'Inactive'}</span>
    </div>
  );
}

// Secure Form Component
interface SecureFormProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  children?: React.ReactNode;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function SecureForm({ children, onSubmit, ...props }: SecureFormProps) {
  const { validateInput, checkPermission, logSecurityEvent } = useSecurity();
  const [csrfToken] = useState(() => SecurityManager.generateCSRFToken());

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Rate limiting check
    if (!SecurityManager.checkRateLimit()) {
      toast.error('Too many requests. Please wait before trying again.');
      return;
    }

    // Session validation
    if (!SecurityManager.isSessionValid()) {
      toast.error('Session expired. Please log in again.');
      return;
    }

    // Proceed with original submit handler
    if (onSubmit) {
      onSubmit(e);
    }
  }, [onSubmit]);

  return (
    <form {...props} onSubmit={handleSubmit}>
      <input type="hidden" name="_csrf" value={csrfToken} />
      {children}
    </form>
  );
}

// Secure Input Component
export function SecureInput({ 
  type = 'text', 
  value, 
  onChange, 
  validation = 'text',
  ...props 
}: React.InputHTMLAttributes<HTMLInputElement> & { 
  validation?: 'text' | 'email' | 'url' | 'html' 
}) {
  const { validateInput } = useSecurity();

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const validatedValue = validateInput(rawValue, validation);
    
    // Create a new event with validated value
    const validatedEvent = {
      ...e,
      target: {
        ...e.target,
        value: validatedValue
      }
    };

    if (onChange) {
      onChange(validatedEvent);
    }
  }, [onChange, validateInput, validation]);

  return (
    <input
      {...props}
      type={type}
      value={value}
      onChange={handleChange}
      autoComplete={type === 'password' ? 'current-password' : 'off'}
    />
  );
}

export { SecurityManager };
export default SecurityProvider;
