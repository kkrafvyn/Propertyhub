/**
 * Simple Backend Provider
 * 
 * Provides basic backend integration for PropertyHub
 * without complex dependencies that might cause build issues.
 * 
 * @author PropertyHub Team
 * @version 1.0.0
 */

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { toast } from "sonner";

// Types
interface BackendContextType {
  isConnected: boolean;
  isAuthenticated: boolean;
  apiCall: <T>(endpoint: string, options?: RequestInit) => Promise<ApiResponse<T>>;
  authenticate: (credentials: any) => Promise<boolean>;
  disconnect: () => void;
  getConnectionStatus: () => 'connected' | 'disconnected' | 'error';
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  requestId: string;
}

// Simple API client
class SimpleApiClient {
  private authToken?: string;

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  clearAuthToken(): void {
    this.authToken = undefined;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // For demo purposes, we'll simulate API responses
      if (endpoint.includes('/demo') || endpoint.includes('/test')) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return {
          success: true,
          data: { message: 'Demo API response' } as T,
          timestamp: Date.now(),
          requestId
        };
      }

      // For other endpoints, return a mock success response
      return {
        success: true,
        data: undefined,
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
}

// Backend Context
const BackendContext = createContext<BackendContextType | null>(null);

// Simple Backend Provider Component
export function SimpleBackendProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [apiClient] = useState(() => new SimpleApiClient());

  // Initialize connection
  useEffect(() => {
    // Simulate connection
    setTimeout(() => {
      setIsConnected(true);
      console.log('📡 Simple backend connected');
    }, 1000);
  }, []);

  /**
   * Make API call
   */
  const apiCall = useCallback(async <T,>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
    if (!apiClient) {
      return {
        success: false,
        error: 'API client not initialized',
        timestamp: Date.now(),
        requestId: `err_${Date.now()}`
      };
    }

    return apiClient.request<T>(endpoint, options);
  }, [apiClient]);

  /**
   * Authenticate user
   */
  const authenticate = useCallback(async (credentials: any): Promise<boolean> => {
    try {
      // Simulate authentication
      const response = await apiClient.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });

      if (response.success) {
        const mockToken = `token_${Date.now()}`;
        apiClient.setAuthToken(mockToken);
        setIsAuthenticated(true);
        console.log('✅ Authentication successful');
        return true;
      } else {
        console.log('❌ Authentication failed');
        return false;
      }
    } catch (error) {
      console.error('Authentication error:', error);
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
    console.log('📡 Disconnected from backend');
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
export function useSimpleBackend(): BackendContextType {
  const context = useContext(BackendContext);
  if (!context) {
    // Return a default implementation if provider is not found
    return {
      isConnected: false,
      isAuthenticated: false,
      apiCall: async () => ({ success: false, error: 'No backend provider', timestamp: Date.now(), requestId: 'no_provider' }),
      authenticate: async () => false,
      disconnect: () => {},
      getConnectionStatus: () => 'disconnected'
    };
  }
  return context;
}

export default SimpleBackendProvider;
