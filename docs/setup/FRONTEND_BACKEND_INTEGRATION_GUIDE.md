# Frontend-Backend Integration Guide

Complete guide for wiring the PropertyHub frontend React components to the backend API server.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Service Setup](#api-service-setup)
3. [Authentication Integration](#authentication-integration)
4. [Feature Integration](#feature-integration)
5. [Error Handling](#error-handling)
6. [WebSocket Integration](#websocket-integration)
7. [Testing Integration](#testing-integration)

---

## Architecture Overview

### Request Flow

```
React Component
         ↓
usePayment / useMessaging Hook
         ↓
API Service (api.ts / api-service.ts)
         ↓
HTTP/WebSocket Request
         ↓
Backend API Server (api-server.js)
         ↓
Database (Supabase)
         ↓
Response returned
         ↓
Component Updates State
```

### File Structure

```
src/
├── services/
│   ├── api.ts                    # Main API service
│   ├── payment-service.ts        # Payment-specific calls
│   ├── messaging-service.ts      # WebSocket + messaging
│   ├── verification-service.ts   # Verification APIs
│   ├── analytics-service.ts      # Dashboard APIs
│   └── utility-service.ts        # Utility management
├── hooks/
│   ├── usePayment.ts            # Payment logic
│   ├── useMessaging.ts          # Real-time messaging
│   ├── useVerification.ts       # Verification flow
│   ├── useAnalytics.ts          # Dashboard analytics
│   └── useUtility.ts            # Utility management
└── types/
    ├── api.ts                   # API response types
    ├── payment.ts               # Payment types
    ├── message.ts               # Message types
    └── user.ts                  # User types
```

---

## API Service Setup

### Step 1: Create Base API Service

File: `src/services/api.ts`

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';
const TIMEOUT = 30000; // 30 seconds

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  details?: any;
}

class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => this.handleError(error)
    );

    // Load token from localStorage
    this.loadTokenFromStorage();
  }

  /**
   * Set authentication token
   */
  public setToken(token: string): void {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  /**
   * Clear authentication token
   */
  public clearToken(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  /**
   * Load token from localStorage on initialization
   */
  private loadTokenFromStorage(): void {
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.token = token;
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: AxiosError): Promise<never> {
    const apiError: ApiError = {
      statusCode: error.response?.status || 500,
      message: error.response?.statusText || 'Unknown error',
      details: error.response?.data,
    };

    // Handle specific status codes
    if (apiError.statusCode === 401) {
      // Unauthorized - clear token and redirect to login
      this.clearToken();
      window.location.href = '/login';
    } else if (apiError.statusCode === 429) {
      apiError.message = 'Too many requests. Please try again later.';
    } else if (apiError.statusCode === 503) {
      apiError.message = 'Server is temporarily unavailable.';
    }

    return Promise.reject(apiError);
  }

  // ============================================================
  // GET Request
  // ============================================================

  public async get<T>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    return this.client.get(endpoint, { params });
  }

  // ============================================================
  // POST Request
  // ============================================================

  public async post<T>(
    endpoint: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    return this.client.post(endpoint, data);
  }

  // ============================================================
  // PUT Request
  // ============================================================

  public async put<T>(
    endpoint: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    return this.client.put(endpoint, data);
  }

  // ============================================================
  // DELETE Request
  // ============================================================

  public async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.client.delete(endpoint);
  }

  // ============================================================
  // File Upload
  // ============================================================

  public async uploadFile(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>
  ): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.keys(additionalData).forEach((key) => {
        formData.append(key, additionalData[key]);
      });
    }

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
    };

    return axios.post(`${API_BASE_URL}${endpoint}`, formData, config);
  }
}

export default new ApiService();
```

### Step 2: Create Environment Configuration

File: `.env.local` (in root `src/` folder)

```
REACT_APP_API_URL=http://localhost:8080/api/v1
REACT_APP_WS_URL=ws://localhost:8080
REACT_APP_ENV=development
REACT_APP_LOG_LEVEL=debug
```

### Step 3: Update TypeScript Types

File: `src/types/api.ts`

```typescript
// API Response Types
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  avatar_url?: string;
  role: 'admin' | 'landlord' | 'tenant' | 'agent';
  is_verified: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: 'paystack' | 'flutterwave' | 'bank_transfer';
  reference_id: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  type: 'direct' | 'group';
  name?: string;
  last_message_at?: string;
  archived: boolean;
  muted: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video';
  file_url?: string;
  status: 'sent' | 'delivered' | 'read' | 'deleted';
  is_edited: boolean;
  read_by?: string[];
  created_at: string;
  edited_at?: string;
}

export interface Pagination {
  limit: number;
  offset: number;
  total: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: Pagination;
}
```

---

## Authentication Integration

### Step 1: Create Auth Service

File: `src/services/auth-service.ts`

```typescript
import apiService from './api';
import { User } from '@/types/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refresh_token: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: string;
}

class AuthService {
  private currentUser: User | null = null;

  constructor() {
    this.loadUserFromStorage();
  }

  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiService.post<LoginResponse>('/auth/login', credentials);
    
    if (response.data?.token) {
      apiService.setToken(response.data.token);
      this.currentUser = response.data.user;
      this.saveUserToStorage(response.data.user);
    }

    return response.data!;
  }

  /**
   * Signup user
   */
  async signup(data: SignupRequest): Promise<LoginResponse> {
    const response = await apiService.post<LoginResponse>('/auth/signup', data);
    
    if (response.data?.token) {
      apiService.setToken(response.data.token);
      this.currentUser = response.data.user;
      this.saveUserToStorage(response.data.user);
    }

    return response.data!;
  }

  /**
   * Logout user
   */
  logout(): void {
    apiService.clearToken();
    this.currentUser = null;
    localStorage.removeItem('user');
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Refresh token
   */
  async refreshToken(refreshToken: string): Promise<string> {
    const response = await apiService.post<{ token: string }>(
      '/auth/refresh',
      { refresh_token: refreshToken }
    );
    
    if (response.data?.token) {
      apiService.setToken(response.data.token);
    }

    return response.data!.token;
  }

  /**
   * Save user to localStorage
   */
  private saveUserToStorage(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  /**
   * Load user from localStorage
   */
  private loadUserFromStorage(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      this.currentUser = JSON.parse(userData);
    }
  }
}

export default new AuthService();
```

### Step 2: Create Authentication Hook

File: `src/hooks/useAuth.ts`

```typescript
import { useState, useCallback, useEffect } from 'react';
import authService, { LoginRequest, SignupRequest, LoginResponse } from '@/services/auth-service';
import { User } from '@/types/api';

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: authService.getCurrentUser(),
    isLoading: false,
    isAuthenticated: !!authService.getCurrentUser(),
    error: null,
  });

  const login = useCallback(async (credentials: LoginRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await authService.login(credentials);
      setState(prev => ({
        ...prev,
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      }));
      return response;
    } catch (error: any) {
      const message = error.message || 'Login failed';
      setState(prev => ({
        ...prev,
        error: message,
        isLoading: false,
      }));
      throw error;
    }
  }, []);

  const signup = useCallback(async (data: SignupRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await authService.signup(data);
      setState(prev => ({
        ...prev,
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      }));
      return response;
    } catch (error: any) {
      const message = error.message || 'Signup failed';
      setState(prev => ({
        ...prev,
        error: message,
        isLoading: false,
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    login,
    signup,
    logout,
  };
}
```

---

## Feature Integration

### Payment Integration

#### Service Layer

File: `src/services/payment-service.ts`

```typescript
import apiService from './api';
import { Payment, ApiResponse } from '@/types/api';

export interface InitializePaymentRequest {
  amount: number;
  description: string;
  paymentMethod: 'paystack' | 'flutterwave';
  email: string;
  phone: string;
}

export interface InitializePaymentResponse {
  paymentId: string;
  authorization_url: string;
  access_code: string;
}

class PaymentService {
  /**
   * Initialize payment
   */
  async initializePayment(
    request: InitializePaymentRequest
  ): Promise<InitializePaymentResponse> {
    const response = await apiService.post<InitializePaymentResponse>(
      '/payments/initialize',
      request
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to initialize payment');
    }

    return response.data!;
  }

  /**
   * Verify payment
   */
  async verifyPayment(paymentId: string): Promise<Payment> {
    const response = await apiService.get<Payment>(
      `/payments/${paymentId}/verify`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to verify payment');
    }

    return response.data!;
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ payments: Payment[]; pagination: any }> {
    const response = await apiService.get<Payment[]>(
      `/payments/history/${userId}`,
      { limit, offset }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch payment history');
    }

    return {
      payments: response.data!,
      pagination: response.pagination,
    };
  }

  /**
   * Process refund
   */
  async processRefund(paymentId: string, reason: string): Promise<any> {
    const response = await apiService.post(
      `/payments/${paymentId}/refund`,
      { reason }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to process refund');
    }

    return response.data;
  }
}

export default new PaymentService();
```

#### Hook Layer

File: `src/hooks/usePayment.ts`

```typescript
import { useState, useCallback } from 'react';
import paymentService, {
  InitializePaymentRequest,
  InitializePaymentResponse,
} from '@/services/payment-service';
import { Payment } from '@/types/api';

export interface PaymentState {
  isLoading: boolean;
  error: string | null;
  paymentHistory: Payment[];
  currentPayment: Payment | null;
}

export function usePayment() {
  const [state, setState] = useState<PaymentState>({
    isLoading: false,
    error: null,
    paymentHistory: [],
    currentPayment: null,
  });

  const initializePayment = useCallback(
    async (request: InitializePaymentRequest): Promise<InitializePaymentResponse> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      try {
        const result = await paymentService.initializePayment(request);
        setState(prev => ({ ...prev, isLoading: false }));
        return result;
      } catch (error: any) {
        setState(prev => ({
          ...prev,
          error: error.message,
          isLoading: false,
        }));
        throw error;
      }
    },
    []
  );

  const verifyPayment = useCallback(async (paymentId: string): Promise<Payment> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const payment = await paymentService.verifyPayment(paymentId);
      setState(prev => ({
        ...prev,
        currentPayment: payment,
        isLoading: false,
      }));
      return payment;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false,
      }));
      throw error;
    }
  }, []);

  const getPaymentHistory = useCallback(
    async (userId: string, limit?: number, offset?: number) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      try {
        const { payments } = await paymentService.getPaymentHistory(
          userId,
          limit,
          offset
        );
        setState(prev => ({
          ...prev,
          paymentHistory: payments,
          isLoading: false,
        }));
        return payments;
      } catch (error: any) {
        setState(prev => ({
          ...prev,
          error: error.message,
          isLoading: false,
        }));
        throw error;
      }
    },
    []
  );

  return {
    ...state,
    initializePayment,
    verifyPayment,
    getPaymentHistory,
  };
}
```

#### Component Usage

```typescript
// In your React component
import { usePayment } from '@/hooks/usePayment';

export function PaymentComponent() {
  const { isLoading, error, initializePayment } = usePayment();

  const handlePayment = async () => {
    try {
      const result = await initializePayment({
        amount: 50000,
        description: 'Rent Payment',
        paymentMethod: 'paystack',
        email: 'user@example.com',
        phone: '+234701234567',
      });

      // Redirect to payment provider
      window.location.href = result.authorization_url;
    } catch (err) {
      console.error('Payment failed:', err);
    }
  };

  return (
    <div>
      <button onClick={handlePayment} disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Pay Now'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

### Messaging Integration

#### WebSocket Service

File: `src/services/messaging-service.ts`

```typescript
import { io, Socket } from 'socket.io-client';
import apiService from './api';
import { Conversation, Message } from '@/types/api';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8080';

export interface MessagingCallbacks {
  onMessageReceived?: (message: Message) => void;
  onConversationCreated?: (conversation: Conversation) => void;
  onTypingIndicator?: (userId: string) => void;
  onUserOffline?: (userId: string) => void;
}

class MessagingService {
  private socket: Socket | null = null;
  private callbacks: MessagingCallbacks = {};
  private token: string | null = null;

  /**
   * Initialize WebSocket connection
   */
  connect(token: string, callbacks?: MessagingCallbacks): Promise<void> {
    return new Promise((resolve, reject) => {
      this.token = token;
      this.callbacks = callbacks || {};

      this.socket = io(WS_URL, {
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      // Connection events
      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        reject(error);
      });

      // Message events
      this.socket.on('message:new', (message: Message) => {
        this.callbacks.onMessageReceived?.(message);
      });

      this.socket.on('conversation:created', (conversation: Conversation) => {
        this.callbacks.onConversationCreated?.(conversation);
      });

      this.socket.on('user:typing', ({ userId }: { userId: string }) => {
        this.callbacks.onTypingIndicator?.(userId);
      });

      this.socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
      });
    });
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Get conversations
   */
  async getConversations(
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<Conversation[]> {
    const response = await apiService.get<Conversation[]>(
      `/messages/conversations/${userId}`,
      { limit, offset }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch conversations');
    }

    return response.data! || [];
  }

  /**
   * Create conversation
   */
  async createConversation(
    participants: string[],
    type: 'direct' | 'group',
    name?: string
  ): Promise<Conversation> {
    const response = await apiService.post<Conversation>(
      '/messages/conversations/create',
      { participants, type, name }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to create conversation');
    }

    return response.data!;
  }

  /**
   * Get messages from conversation
   */
  async getMessages(
    conversationId: string,
    limit?: number,
    offset?: number
  ): Promise<Message[]> {
    const response = await apiService.get<Message[]>(
      `/messages/conversation/${conversationId}/messages`,
      { limit, offset }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch messages');
    }

    return response.data! || [];
  }

  /**
   * Send message via HTTP (also broadcasts via WebSocket)
   */
  async sendMessage(
    conversationId: string,
    content: string,
    messageType: string = 'text'
  ): Promise<Message> {
    const response = await apiService.post<Message>(
      '/messages/send',
      { conversationId, content, messageType }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to send message');
    }

    return response.data!;
  }

  /**
   * Edit message
   */
  async editMessage(messageId: string, content: string): Promise<Message> {
    const response = await apiService.put<Message>(
      `/messages/${messageId}/edit`,
      { content }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to edit message');
    }

    return response.data!;
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId: string): Promise<void> {
    const response = await apiService.delete(`/messages/${messageId}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete message');
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    const response = await apiService.post(`/messages/${messageId}/read`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to mark as read');
    }
  }

  /**
   * Emit typing indicator
   */
  emitTyping(conversationId: string): void {
    this.socket?.emit('user:typing', { conversationId });
  }

  /**
   * Stop typing indicator
   */
  emitStopTyping(conversationId: string): void {
    this.socket?.emit('user:stop-typing', { conversationId });
  }

  /**
   * Join conversation room
   */
  joinConversation(conversationId: string): void {
    this.socket?.emit('conversation:join', { conversationId });
  }

  /**
   * Leave conversation room
   */
  leaveConversation(conversationId: string): void {
    this.socket?.emit('conversation:leave', { conversationId });
  }
}

export default new MessagingService();
```

#### Messaging Hook

File: `src/hooks/useMessaging.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import messagingService, { MessagingCallbacks } from '@/services/messaging-service';
import { Conversation, Message } from '@/types/api';

export interface MessagingState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  typingUsers: Set<string>;
}

export function useMessaging(token: string) {
  const [state, setState] = useState<MessagingState>({
    isConnected: false,
    isLoading: false,
    error: null,
    conversations: [],
    currentConversation: null,
    messages: [],
    typingUsers: new Set(),
  });

  // Connect WebSocket on mount
  useEffect(() => {
    const callbacks: MessagingCallbacks = {
      onMessageReceived: (message) => {
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, message],
        }));
      },
      onTypingIndicator: (userId) => {
        setState(prev => {
          const typingUsers = new Set(prev.typingUsers);
          typingUsers.add(userId);
          return { ...prev, typingUsers };
        });

        // Remove after 2 seconds
        setTimeout(() => {
          setState(prev => {
            const typingUsers = new Set(prev.typingUsers);
            typingUsers.delete(userId);
            return { ...prev, typingUsers };
          });
        }, 2000);
      },
    };

    messagingService
      .connect(token, callbacks)
      .then(() => {
        setState(prev => ({ ...prev, isConnected: true }));
      })
      .catch(error => {
        setState(prev => ({
          ...prev,
          error: error.message,
        }));
      });

    return () => {
      messagingService.disconnect();
    };
  }, [token]);

  const getConversations = useCallback(async (userId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const conversations = await messagingService.getConversations(userId);
      setState(prev => ({
        ...prev,
        conversations,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false,
      }));
    }
  }, []);

  const openConversation = useCallback(async (conversation: Conversation) => {
    setState(prev => ({
      ...prev,
      currentConversation: conversation,
      isLoading: true,
    }));

    try {
      messagingService.joinConversation(conversation.id);
      const messages = await messagingService.getMessages(conversation.id);
      setState(prev => ({
        ...prev,
        messages,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false,
      }));
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!state.currentConversation) {
        setState(prev => ({
          ...prev,
          error: 'No conversation selected',
        }));
        return;
      }

      try {
        await messagingService.sendMessage(state.currentConversation.id, content);
      } catch (error: any) {
        setState(prev => ({
          ...prev,
          error: error.message,
        }));
      }
    },
    [state.currentConversation]
  );

  const emitTyping = useCallback(() => {
    if (state.currentConversation) {
      messagingService.emitTyping(state.currentConversation.id);
    }
  }, [state.currentConversation]);

  return {
    ...state,
    getConversations,
    openConversation,
    sendMessage,
    emitTyping,
  };
}
```

---

## Error Handling

### Global Error Handler

File: `src/services/error-handler.ts`

```typescript
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: any): void {
  if (error instanceof ApiError) {
    console.error(`[${error.statusCode}] ${error.message}`, error.details);

    switch (error.statusCode) {
      case 400:
        console.error('Validation error:', error.details);
        break;
      case 401:
        console.error('Unauthorized - please login');
        window.location.href = '/login';
        break;
      case 403:
        console.error('Forbidden - access denied');
        break;
      case 404:
        console.error('Resource not found');
        break;
      case 429:
        console.error('Too many requests - rate limited');
        break;
      case 500:
        console.error('Server error');
        break;
      default:
        console.error('Unexpected error:', error.message);
    }
  } else {
    console.error('Unknown error:', error);
  }
}
```

---

## WebSocket Integration

### Real-Time Events

The backend emits these events:

| Event | Description | Payload |
|-------|-------------|---------|
| `message:new` | New message received | `Message` |
| `message:edit` | Message edited | `{messageId, newContent}` |
| `message:delete` | Message deleted | `{messageId}` |
| `message:read` | Message marked as read | `{messageId, userId}` |
| `user:typing` | User typing indicator | `{userId, conversationId}` |
| `user:stop-typing` | User stopped typing | `{userId, conversationId}` |
| `conversation:join` | User joined room | `{conversationId, userId}` |
| `conversation:leave` | User left room | `{conversationId, userId}` |

---

## Testing Integration

### Integration Tests

File: `src/__tests__/integration.test.ts`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentComponent } from '@/components/PaymentComponent';
import apiService from '@/services/api';

// Mock API service
jest.mock('@/services/api');

describe('Payment Integration', () => {
  it('should initialize payment and redirect', async () => {
    const mockInitialize = jest.fn().mockResolvedValue({
      paymentId: 'test-123',
      authorization_url: 'https://payment.com/auth',
      access_code: 'test-access',
    });

    (apiService.post as jest.Mock).mockImplementation(mockInitialize);

    render(<PaymentComponent />);

    const button = screen.getByRole('button', { name: /pay now/i });
    await userEvent.click(button);

    await waitFor(() => {
      expect(mockInitialize).toHaveBeenCalledWith(
        '/payments/initialize',
        expect.objectContaining({
          amount: expect.any(Number),
          email: expect.any(String),
        })
      );
    });
  });
});
```

---

## Summary

**Integration Checklist:**

- [ ] API Service configured with base URL and interceptors
- [ ] Authentication integrated with token management
- [ ] Payment endpoints wired to hooks and components
- [ ] Messaging service connected with WebSocket
- [ ] Error handling implemented globally
- [ ] Types defined for all API responses
- [ ] Tests passing for integration scenarios
- [ ] Environment variables configured
- [ ] Rate limiting handled in UI
- [ ] Offline fallback implemented

---

**Last Updated:** January 2024
**Reference:** api-server.js, backend-tests.js, database-migrations.sql
