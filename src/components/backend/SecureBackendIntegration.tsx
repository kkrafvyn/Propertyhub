/**
 * Secure Backend Integration Component
 * 
 * This component provides secure integration between the web frontend
 * and React Native backend services. It handles:
 * - API authentication and token management
 * - Data encryption/decryption
 * - Request/response validation
 * - Error handling and logging
 * - Cross-platform compatibility
 * 
 * @author PropertyHub Team
 * @version 1.0.0
 */

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { toast } from "sonner";

// Types
interface BackendConfig {
  apiBaseUrl: string;
  apiKey: string;
  encryptionKey: string;
  timeout: number;
  retryAttempts: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  requestId: string;
}

interface BackendContextType {
  isConnected: boolean;
  isAuthenticated: boolean;
  apiCall: <T>(endpoint: string, options?: RequestInit) => Promise<ApiResponse<T>>;
  authenticate: (credentials: any) => Promise<boolean>;
  disconnect: () => void;
  getConnectionStatus: () => 'connected' | 'disconnected' | 'error';
}

// Context
const BackendContext = createContext<BackendContextType | null>(null);

// Security utilities
class SecurityUtils {
  /**
   * Generate secure request ID
   */
  static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Simple XOR encryption for demonstration
   * In production, use proper encryption libraries
   */
  static encrypt(data: string, key: string): string {
    try {
      let result = '';
      for (let i = 0; i < data.length; i++) {
        result += String.fromCharCode(
          data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      return btoa(result);
    } catch (error) {
      console.error('Encryption error:', error);
      return data;
    }
  }

  /**
   * Simple XOR decryption for demonstration
   */
  static decrypt(encryptedData: string, key: string): string {
    try {
      const data = atob(encryptedData);
      let result = '';
      for (let i = 0; i < data.length; i++) {
        result += String.fromCharCode(
          data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      return result;
    } catch (error) {
      console.error('Decryption error:', error);
      return encryptedData;
    }
  }

  /**
   * Validate API response structure
   */
  static validateResponse(response: any): boolean {
    return (
      response &&
      typeof response === 'object' &&
      typeof response.success === 'boolean' &&
      typeof response.timestamp === 'number' &&
      typeof response.requestId === 'string'
    );
  }

  /**
   * Sanitize request data
   */
  static sanitizeData(data: any): any {
    if (typeof data === 'string') {
      return data.replace(/[<>'"]/g, '');
    }
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }
    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          sanitized[key] = this.sanitizeData(data[key]);
        }
      }
      return sanitized;
    }
    return data;
  }
}

// Backend API client
class SecureApiClient {
  private config: BackendConfig;
  private authToken?: string;
  private requestQueue: Map<string, Promise<any>> = new Map();

  constructor(config: BackendConfig) {
    this.config = config;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.authToken = undefined;
  }

  /**
   * Get secure headers for requests
   */
  private getHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.config.apiKey,
      'X-Request-Time': Date.now().toString(),
      ...additionalHeaders
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Make secure API request
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const requestId = SecurityUtils.generateRequestId();
    const url = `${this.config.apiBaseUrl}${endpoint}`;

    try {
      // Prepare request data
      let body = options.body;
      if (body && typeof body === 'string') {
        // Sanitize and optionally encrypt request data
        const sanitizedData = SecurityUtils.sanitizeData(JSON.parse(body));
        body = JSON.stringify(sanitizedData);
      }

      // Make request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        ...options,
        body,
        headers: this.getHeaders(options.headers as Record<string, string>),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Parse response
      const responseData = await response.json();

      // Validate response structure
      if (!SecurityUtils.validateResponse(responseData)) {
        throw new Error('Invalid response structure');
      }

      // Check for API errors
      if (!response.ok) {
        throw new Error(responseData.error || `HTTP ${response.status}`);
      }

      return {
        success: true,
        data: responseData.data,
        timestamp: Date.now(),
        requestId
      };

    } catch (error) {
      console.error(`API request failed [${requestId}]:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        requestId
      };
    }
  }

  /**
   * Make request with retry logic
   */
  async requestWithRetry<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await this.request<T>(endpoint, options);
        if (result.success) {
          return result;
        }
        lastError = result.error;
      } catch (error) {
        lastError = error;
        if (attempt === this.config.retryAttempts) break;
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    return {
      success: false,
      error: lastError || 'Max retry attempts reached',
      timestamp: Date.now(),
      requestId: SecurityUtils.generateRequestId()
    };
  }
}

// Backend Provider Component
export function SecureBackendProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [apiClient, setApiClient] = useState<SecureApiClient | null>(null);

  // Initialize API client
  useEffect(() => {
    const config: BackendConfig = {
      apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api',
      apiKey: process.env.REACT_APP_API_KEY || 'dev-api-key',
      encryptionKey: process.env.REACT_APP_ENCRYPTION_KEY || 'dev-encryption-key',
      timeout: 30000,
      retryAttempts: 3
    };

    const client = new SecureApiClient(config);
    setApiClient(client);

    // Test connection
    testConnection(client);
  }, []);

  /**
   * Test backend connection
   */
  const testConnection = async (client: SecureApiClient) => {
    try {
      const response = await client.request('/health');
      if (response.success) {
        setIsConnected(true);
        toast.success('Backend connected successfully');
      } else {
        setIsConnected(false);
        toast.error('Backend connection failed');
      }
    } catch (error) {
      setIsConnected(false);
      console.error('Connection test failed:', error);
    }
  };

  /**
   * Make authenticated API call
   */
  const apiCall = useCallback(async <T,>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
    if (!apiClient) {
      return {
        success: false,
        error: 'API client not initialized',
        timestamp: Date.now(),
        requestId: SecurityUtils.generateRequestId()
      };
    }

    return apiClient.requestWithRetry<T>(endpoint, options);
  }, [apiClient]);

  /**
   * Authenticate user
   */
  const authenticate = useCallback(async (credentials: any): Promise<boolean> => {
    if (!apiClient) return false;

    try {
      const response = await apiClient.request<{ token?: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(SecurityUtils.sanitizeData(credentials))
      });

      if (response.success && response.data?.token) {
        apiClient.setAuthToken(response.data.token);
        setIsAuthenticated(true);
        toast.success('Authentication successful');
        return true;
      } else {
        toast.error('Authentication failed');
        return false;
      }
    } catch (error) {
      console.error('Authentication error:', error);
      toast.error('Authentication error');
      return false;
    }
  }, [apiClient]);

  /**
   * Disconnect from backend
   */
  const disconnect = useCallback(() => {
    if (apiClient) {
      apiClient.clearAuthToken();
    }
    setIsAuthenticated(false);
    setIsConnected(false);
    toast.info('Disconnected from backend');
  }, [apiClient]);

  /**
   * Get connection status
   */
  const getConnectionStatus = useCallback((): 'connected' | 'disconnected' | 'error' => {
    if (!apiClient) return 'error';
    if (isConnected) return 'connected';
    return 'disconnected';
  }, [isConnected, apiClient]);

  const contextValue: BackendContextType = {
    isConnected,
    isAuthenticated,
    apiCall,
    authenticate,
    disconnect,
    getConnectionStatus
  };

  return (
    <BackendContext.Provider value={contextValue}>
      {children}
    </BackendContext.Provider>
  );
}

// Hook to use backend context
export function useSecureBackend(): BackendContextType {
  const context = useContext(BackendContext);
  if (!context) {
    throw new Error('useSecureBackend must be used within a SecureBackendProvider');
  }
  return context;
}

// Connection Status Indicator Component
export function BackendConnectionIndicator() {
  const { isConnected, isAuthenticated, getConnectionStatus } = useSecureBackend();
  const status = getConnectionStatus();

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'disconnected': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    if (isAuthenticated) return 'Authenticated';
    if (isConnected) return 'Connected';
    return 'Disconnected';
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span className="text-muted-foreground">{getStatusText()}</span>
    </div>
  );
}

// React Native Bridge Helper
export class ReactNativeBridge {
  /**
   * Check if running in React Native environment
   */
  static isReactNative(): boolean {
    return typeof navigator !== 'undefined' && 
           navigator.product === 'ReactNative';
  }

  /**
   * Send message to React Native
   */
  static sendToRN(message: any): void {
    if (this.isReactNative() && (window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify(message));
    }
  }

  /**
   * Setup message listener for React Native
   */
  static setupRNListener(callback: (message: any) => void): () => void {
    const handler = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        callback(message);
      } catch (error) {
        console.error('Failed to parse RN message:', error);
      }
    };

    if (this.isReactNative()) {
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }

    return () => {};
  }
}

export default SecureBackendProvider;
