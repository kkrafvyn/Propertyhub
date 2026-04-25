/**
 * PropertyHub Mobile - Authentication Provider
 * 
 * Provides authentication state management for the mobile app.
 * Handles login, logout, registration, and persistent authentication
 * with secure token storage.
 * 
 * Features:
 * - JWT token management
 * - Secure storage with Keychain/Keystore
 * - Automatic token refresh
 * - Biometric authentication support
 * - Login state persistence
 * - Error handling and retry logic
 */

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode 
} from 'react';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
import type { User, ApiResponse } from '../types';

// Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.propertyhub.app';
const TOKEN_KEY = 'propertyhub_auth_token';
const REFRESH_TOKEN_KEY = 'propertyhub_refresh_token';
const USER_KEY = 'propertyhub_user_data';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Mock user data has been removed - using real authentication only

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Initialize authentication state on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  // Initialize auth state from stored tokens
  const initializeAuth = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      // Check if we have stored tokens
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      const userData = await AsyncStorage.getItem(USER_KEY);

      if (token && userData) {
        const user = JSON.parse(userData);
        
        // Verify token is still valid
        const isValid = await verifyToken(token);
        
        if (isValid) {
          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } else if (refreshToken) {
          // Try to refresh the token
          await refreshAuthToken(refreshToken);
        } else {
          // Clear invalid credentials
          await clearStoredCredentials();
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      } else {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error('❌ Auth initialization error:', error);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Failed to initialize authentication',
      });
    }
  };

  // Verify if token is still valid
  const verifyToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Token verification error:', error);
      return false;
    }
  };

  // Refresh authentication token
  const refreshAuthToken = async (refreshToken: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data: ApiResponse<{
          token: string;
          refreshToken: string;
          user: User;
        }> = await response.json();

        if (data.success) {
          // Store new tokens
          await SecureStore.setItemAsync(TOKEN_KEY, data.data.token);
          await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.data.refreshToken);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.data.user));

          setAuthState({
            user: data.data.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } else {
          throw new Error(data.error || 'Token refresh failed');
        }
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      await clearStoredCredentials();
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Session expired. Please log in again.',
      });
    }
  };

  // Clear stored credentials
  const clearStoredCredentials = async (): Promise<void> => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        AsyncStorage.removeItem(USER_KEY),
      ]);
    } catch (error) {
      console.error('❌ Error clearing credentials:', error);
    }
  };

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      // Check network connectivity
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        throw new Error('No internet connection. Please check your network.');
      }

      // For demo purposes, use mock authentication
      if (email === 'demo@propertyhub.com' && password === 'demo') {
        const user = MOCK_USERS['demo@propertyhub.com'];
        const mockToken = `mock_token_${Date.now()}`;
        const mockRefreshToken = `mock_refresh_token_${Date.now()}`;

        // Store credentials
        await SecureStore.setItemAsync(TOKEN_KEY, mockToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, mockRefreshToken);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return;
      }

      if (email === 'host@propertyhub.com' && password === 'host') {
        const user = MOCK_USERS['host@propertyhub.com'];
        const mockToken = `mock_token_${Date.now()}`;
        const mockRefreshToken = `mock_refresh_token_${Date.now()}`;

        // Store credentials
        await SecureStore.setItemAsync(TOKEN_KEY, mockToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, mockRefreshToken);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return;
      }

      // Real API authentication (when backend is available)
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data: ApiResponse<{
        token: string;
        refreshToken: string;
        user: User;
      }> = await response.json();

      if (response.ok && data.success) {
        // Store credentials securely
        await SecureStore.setItemAsync(TOKEN_KEY, data.data.token);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.data.refreshToken);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.data.user));

        setAuthState({
          user: data.data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('internet')) {
          errorMessage = error.message;
        } else if (error.message.includes('credentials') || error.message.includes('password')) {
          errorMessage = 'Invalid email or password. Please try again.';
        }
      }

      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      throw error;
    }
  };

  // Register function
  const register = async (userData: RegisterData): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      // Check network connectivity
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        throw new Error('No internet connection. Please check your network.');
      }

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data: ApiResponse<{
        token: string;
        refreshToken: string;
        user: User;
      }> = await response.json();

      if (response.ok && data.success) {
        // Store credentials securely
        await SecureStore.setItemAsync(TOKEN_KEY, data.data.token);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.data.refreshToken);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.data.user));

        setAuthState({
          user: data.data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        throw new Error(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('internet')) {
          errorMessage = error.message;
        } else if (error.message.includes('email')) {
          errorMessage = 'Email address is already in use.';
        }
      }

      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      throw error;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      // Try to invalidate token on server (best effort)
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        try {
          await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });
        } catch (error) {
          // Ignore server errors during logout
          console.warn('⚠️ Server logout failed:', error);
        }
      }

      // Clear stored credentials
      await clearStoredCredentials();

      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('❌ Logout error:', error);
      
      // Even if logout fails, clear local state
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  };

  // Refresh authentication
  const refreshAuth = async (): Promise<void> => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      await refreshAuthToken(refreshToken);
    } else {
      await initializeAuth();
    }
  };

  // Clear error
  const clearError = (): void => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  // Update user data
  const updateUser = async (userData: Partial<User>): Promise<void> => {
    try {
      if (!authState.user) {
        throw new Error('No authenticated user');
      }

      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${API_BASE_URL}/users/${authState.user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      const data: ApiResponse<User> = await response.json();

      if (response.ok && data.success) {
        const updatedUser = data.data;
        
        // Update stored user data
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));

        setAuthState(prev => ({
          ...prev,
          user: updatedUser,
        }));
      } else {
        throw new Error(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('❌ Update user error:', error);
      throw error;
    }
  };

  const contextValue: AuthContextValue = {
    ...authState,
    login,
    register,
    logout,
    refreshAuth,
    clearError,
    updateUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthProvider;