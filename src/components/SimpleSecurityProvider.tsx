/**
 * Simple Security Provider
 * 
 * Provides basic security features for PropertyHub
 * without complex dependencies that might cause build issues.
 * 
 * @author PropertyHub Team
 * @version 1.0.0
 */

import React, { createContext, useContext, useCallback } from 'react';
import { toast } from "sonner";

// Types
interface SecurityContextType {
  isSecure: boolean;
  validateInput: (input: string, type?: 'text' | 'email' | 'url') => string;
  checkPermission: (resource: string, action: string) => boolean;
  logSecurityEvent: (event: any) => void;
}

// Security utilities
class SimpleSecurityManager {
  /**
   * Basic XSS protection - sanitize input
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/javascript:/gi, '')
      .trim()
      .slice(0, 1000); // Limit length
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitized = this.sanitizeInput(email.toLowerCase());
    
    if (!emailRegex.test(sanitized)) {
      console.warn('Invalid email format:', email);
      return '';
    }
    
    return sanitized;
  }

  /**
   * Validate URL format
   */
  static validateURL(url: string): string {
    try {
      const sanitized = this.sanitizeInput(url);
      const urlObj = new URL(sanitized);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        console.warn('Invalid URL protocol:', urlObj.protocol);
        return '';
      }
      
      return sanitized;
    } catch (error) {
      console.warn('Invalid URL format:', url);
      return '';
    }
  }

  /**
   * Basic permission checking
   */
  static checkPermission(resource: string, action: string): boolean {
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
    
    return false;
  }

  /**
   * Log security events
   */
  static logEvent(event: any): void {
    console.log('Security Event:', event);
    
    // In production, you would send this to a security monitoring service
    if (event.severity === 'high' || event.severity === 'critical') {
      console.warn('High severity security event:', event);
    }
  }
}

// Security Context
const SecurityContext = createContext<SecurityContextType | null>(null);

// Simple Security Provider Component
export function SimpleSecurityProvider({ children }: { children: React.ReactNode }) {
  /**
   * Validate input based on type
   */
  const validateInput = useCallback((input: string, type: 'text' | 'email' | 'url' = 'text'): string => {
    if (!input || typeof input !== 'string') return '';

    switch (type) {
      case 'email':
        return SimpleSecurityManager.validateEmail(input);
      case 'url':
        return SimpleSecurityManager.validateURL(input);
      case 'text':
      default:
        return SimpleSecurityManager.sanitizeInput(input);
    }
  }, []);

  /**
   * Check user permissions
   */
  const checkPermission = useCallback((resource: string, action: string): boolean => {
    return SimpleSecurityManager.checkPermission(resource, action);
  }, []);

  /**
   * Log security event
   */
  const logSecurityEvent = useCallback((event: any) => {
    SimpleSecurityManager.logEvent(event);
  }, []);

  const contextValue: SecurityContextType = {
    isSecure: true,
    validateInput,
    checkPermission,
    logSecurityEvent
  };

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}
    </SecurityContext.Provider>
  );
}

// Hook to use security context
export function useSimpleSecurity(): SecurityContextType {
  const context = useContext(SecurityContext);
  if (!context) {
    // Return a default implementation if provider is not found
    return {
      isSecure: true,
      validateInput: (input: string) => SimpleSecurityManager.sanitizeInput(input),
      checkPermission: (resource: string, action: string) => SimpleSecurityManager.checkPermission(resource, action),
      logSecurityEvent: (event: any) => SimpleSecurityManager.logEvent(event)
    };
  }
  return context;
}

export default SimpleSecurityProvider;