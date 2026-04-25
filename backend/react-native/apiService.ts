/**
 * React Native API Service
 * 
 * Comprehensive API service for React Native mobile app
 * Handles HTTP requests, authentication, caching, and offline support
 * 
 * @author PropertyHub Team
 * @version 1.0.0
 */

import { getConfig, API_ENDPOINTS, STORAGE_KEYS, ERROR_CODES } from './config';
import type { User, Property, ChatRoom, Message, BookingData } from '../../types';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  useCache?: boolean;
  retryCount?: number;
}

export interface AuthCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface BiometricCredentials {
  userId: string;
  biometricToken: string;
}

export interface PushNotificationData {
  token: string;
  platform: 'ios' | 'android';
  userId: string;
}

class ReactNativeApiService {
  private baseUrl: string;
  private authToken: string | null = null;
  private refreshToken: string | null = null;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private offlineQueue: Array<{ url: string; options: RequestOptions; timestamp: number }> = [];
  private isOnline: boolean = true;
  private requestQueue: Map<string, Promise<any>> = new Map();

  constructor() {
    const config = getConfig();
    this.baseUrl = config.apiUrl;
    this.initializeService();
  }

  /**
   * Initialize the API service
   * Load cached tokens and setup offline queue
   */
  private async initializeService(): Promise<void> {
    try {
      // Load cached authentication tokens
      this.authToken = await this.getStorageItem(STORAGE_KEYS.AUTH_TOKEN);
      this.refreshToken = await this.getStorageItem(STORAGE_KEYS.REFRESH_TOKEN);
      
      // Load offline queue
      const queueData = await this.getStorageItem(STORAGE_KEYS.OFFLINE_QUEUE);
      if (queueData) {
        this.offlineQueue = JSON.parse(queueData);
      }

      // Setup network monitoring
      this.setupNetworkMonitoring();
      
      console.log('🚀 React Native API Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize API service:', error);
    }
  }

  /**
   * Setup network connectivity monitoring
   */
  private setupNetworkMonitoring(): void {
    // For React Native, you would use @react-native-community/netinfo
    // For web, we'll use the Navigator API
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.processOfflineQueue();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });

      this.isOnline = navigator.onLine;
    }
  }

  /**
   * Generic request method with retry logic and caching
   */
  private async request<T>(
    endpoint: string, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const config = getConfig();
    const url = `${this.baseUrl}${endpoint}`;
    const cacheKey = `${options.method || 'GET'}-${url}`;

    // Check cache for GET requests
    if ((options.method === 'GET' || !options.method) && options.useCache !== false) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < config.cacheTimeout) {
        return { success: true, data: cached.data };
      }
    }

    // Check if request is already in progress (deduplication)
    if (this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey);
    }

    const requestPromise = this.executeRequest<T>(url, options);
    this.requestQueue.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      this.requestQueue.delete(cacheKey);

      // Cache successful GET requests
      if (result.success && (options.method === 'GET' || !options.method)) {
        this.cache.set(cacheKey, { data: result.data, timestamp: Date.now() });
      }

      return result;
    } catch (error) {
      this.requestQueue.delete(cacheKey);
      throw error;
    }
  }

  /**
   * Execute HTTP request with timeout and error handling
   */
  private async executeRequest<T>(
    url: string, 
    options: RequestOptions
  ): Promise<ApiResponse<T>> {
    const config = getConfig();
    const timeout = options.timeout || config.authTimeout;

    // Prepare request headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    // Add authentication header if available
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    // Handle offline mode
    if (!this.isOnline) {
      if (options.method && options.method !== 'GET') {
        // Queue non-GET requests for later
        this.offlineQueue.push({ url, options, timestamp: Date.now() });
        await this.saveOfflineQueue();
        return {
          success: false,
          error: 'Request queued for when connection is restored',
          code: ERROR_CODES.OFFLINE_MODE,
        };
      } else {
        // Try to serve from cache for GET requests
        const cacheKey = `GET-${url}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
          return { success: true, data: cached.data };
        }
        return {
          success: false,
          error: 'No internet connection and no cached data available',
          code: ERROR_CODES.NETWORK_ERROR,
        };
      }
    }

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle authentication errors
      if (response.status === 401) {
        const refreshed = await this.refreshAuthToken();
        if (refreshed) {
          // Retry request with new token
          headers['Authorization'] = `Bearer ${this.authToken}`;
          const retryResponse = await fetch(url, {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
          });
          return this.handleResponse<T>(retryResponse);
        } else {
          return {
            success: false,
            error: 'Authentication expired',
            code: ERROR_CODES.AUTH_EXPIRED,
          };
        }
      }

      return this.handleResponse<T>(response);
    } catch (error: any) {
      console.error('❌ API Request failed:', error);
      
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
          code: ERROR_CODES.NETWORK_ERROR,
        };
      }

      return {
        success: false,
        error: error.message || 'Network request failed',
        code: ERROR_CODES.NETWORK_ERROR,
      };
    }
  }

  /**
   * Handle HTTP response and parse JSON
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || `HTTP ${response.status}`,
          code: data.code || `HTTP_${response.status}`,
        };
      }

      return {
        success: true,
        data: data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to parse response',
        code: ERROR_CODES.SERVER_ERROR,
      };
    }
  }

  /**
   * Authentication Methods
   */
  public async login(credentials: AuthCredentials): Promise<ApiResponse<{ user: User; token: string; refreshToken: string }>> {
    const result = await this.request<{ user: User; token: string; refreshToken: string }>(
      API_ENDPOINTS.auth.login,
      {
        method: 'POST',
        body: credentials,
        useCache: false,
      }
    );

    if (result.success && result.data) {
      this.authToken = result.data.token;
      this.refreshToken = result.data.refreshToken;
      
      // Store tokens
      await this.setStorageItem(STORAGE_KEYS.AUTH_TOKEN, this.authToken);
      await this.setStorageItem(STORAGE_KEYS.REFRESH_TOKEN, this.refreshToken);
      await this.setStorageItem(STORAGE_KEYS.USER_DATA, JSON.stringify(result.data.user));
    }

    return result;
  }

  public async signup(userData: Partial<User> & { password: string }): Promise<ApiResponse<{ user: User; token: string; refreshToken: string }>> {
    const result = await this.request<{ user: User; token: string; refreshToken: string }>(
      API_ENDPOINTS.auth.signup,
      {
        method: 'POST',
        body: userData,
        useCache: false,
      }
    );

    if (result.success && result.data) {
      this.authToken = result.data.token;
      this.refreshToken = result.data.refreshToken;
      
      // Store tokens
      await this.setStorageItem(STORAGE_KEYS.AUTH_TOKEN, this.authToken);
      await this.setStorageItem(STORAGE_KEYS.REFRESH_TOKEN, this.refreshToken);
      await this.setStorageItem(STORAGE_KEYS.USER_DATA, JSON.stringify(result.data.user));
    }

    return result;
  }

  public async biometricLogin(credentials: BiometricCredentials): Promise<ApiResponse<{ user: User; token: string; refreshToken: string }>> {
    return this.request<{ user: User; token: string; refreshToken: string }>(
      API_ENDPOINTS.auth.biometric,
      {
        method: 'POST',
        body: credentials,
        useCache: false,
      }
    );
  }

  public async logout(): Promise<ApiResponse<void>> {
    const result = await this.request<void>(API_ENDPOINTS.auth.logout, {
      method: 'POST',
      useCache: false,
    });

    // Clear stored tokens regardless of API response
    this.authToken = null;
    this.refreshToken = null;
    await this.removeStorageItem(STORAGE_KEYS.AUTH_TOKEN);
    await this.removeStorageItem(STORAGE_KEYS.REFRESH_TOKEN);
    await this.removeStorageItem(STORAGE_KEYS.USER_DATA);

    return result;
  }

  private async refreshAuthToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const result = await this.request<{ token: string; refreshToken: string }>(
        API_ENDPOINTS.auth.refresh,
        {
          method: 'POST',
          body: { refreshToken: this.refreshToken },
          useCache: false,
        }
      );

      if (result.success && result.data) {
        this.authToken = result.data.token;
        this.refreshToken = result.data.refreshToken;
        
        await this.setStorageItem(STORAGE_KEYS.AUTH_TOKEN, this.authToken);
        await this.setStorageItem(STORAGE_KEYS.REFRESH_TOKEN, this.refreshToken);
        
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to refresh token:', error);
    }

    return false;
  }

  /**
   * Property Methods
   */
  public async getProperties(filters?: any): Promise<ApiResponse<Property[]>> {
    const queryParams = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    return this.request<Property[]>(`${API_ENDPOINTS.properties.list}${queryParams}`);
  }

  public async searchProperties(query: string, filters?: any): Promise<ApiResponse<Property[]>> {
    return this.request<Property[]>(API_ENDPOINTS.properties.search, {
      method: 'POST',
      body: { query, filters },
    });
  }

  public async getPropertyDetails(propertyId: string): Promise<ApiResponse<Property>> {
    return this.request<Property>(API_ENDPOINTS.properties.details.replace(':id', propertyId));
  }

  public async toggleFavorite(propertyId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`${API_ENDPOINTS.properties.favorites}/${propertyId}`, {
      method: 'POST',
      useCache: false,
    });
  }

  public async bookProperty(propertyId: string, bookingData: BookingData): Promise<ApiResponse<any>> {
    return this.request<any>(
      API_ENDPOINTS.properties.booking.replace(':id', propertyId),
      {
        method: 'POST',
        body: bookingData,
        useCache: false,
      }
    );
  }

  /**
   * Chat Methods
   */
  public async getChatRooms(): Promise<ApiResponse<ChatRoom[]>> {
    return this.request<ChatRoom[]>(API_ENDPOINTS.chat.rooms);
  }

  public async getChatMessages(roomId: string, page = 1): Promise<ApiResponse<Message[]>> {
    return this.request<Message[]>(
      `${API_ENDPOINTS.chat.messages.replace(':roomId', roomId)}?page=${page}`
    );
  }

  public async sendMessage(roomId: string, message: string, attachments?: any[]): Promise<ApiResponse<Message>> {
    return this.request<Message>(
      API_ENDPOINTS.chat.messages.replace(':roomId', roomId),
      {
        method: 'POST',
        body: { message, attachments },
        useCache: false,
      }
    );
  }

  /**
   * User Methods
   */
  public async getUserProfile(): Promise<ApiResponse<User>> {
    return this.request<User>(API_ENDPOINTS.user.profile);
  }

  public async updateUserProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>(API_ENDPOINTS.user.profile, {
      method: 'PUT',
      body: userData,
      useCache: false,
    });
  }

  public async getUserDashboard(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.user.dashboard);
  }

  /**
   * Push Notification Methods
   */
  public async registerPushToken(data: PushNotificationData): Promise<ApiResponse<void>> {
    return this.request<void>(API_ENDPOINTS.notifications.register, {
      method: 'POST',
      body: data,
      useCache: false,
    });
  }

  public async updateNotificationPreferences(preferences: any): Promise<ApiResponse<void>> {
    return this.request<void>(API_ENDPOINTS.notifications.preferences, {
      method: 'PUT',
      body: preferences,
      useCache: false,
    });
  }

  /**
   * Analytics Methods
   */
  public async trackEvent(event: string, properties?: any): Promise<ApiResponse<void>> {
    return this.request<void>(API_ENDPOINTS.analytics.track, {
      method: 'POST',
      body: { event, properties, timestamp: Date.now() },
      useCache: false,
    });
  }

  /**
   * Offline Support Methods
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    console.log(`📱 Processing ${this.offlineQueue.length} queued requests`);

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const queuedRequest of queue) {
      try {
        await this.executeRequest(queuedRequest.url, queuedRequest.options);
        console.log('✅ Processed queued request:', queuedRequest.url);
      } catch (error) {
        console.error('❌ Failed to process queued request:', queuedRequest.url, error);
        // Re-queue failed requests
        this.offlineQueue.push(queuedRequest);
      }
    }

    await this.saveOfflineQueue();
  }

  private async saveOfflineQueue(): Promise<void> {
    await this.setStorageItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(this.offlineQueue));
  }

  /**
   * Storage Methods (Abstract - implement based on platform)
   */
  private async getStorageItem(key: string): Promise<string | null> {
    // For React Native, use AsyncStorage
    // For web, use localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  }

  private async setStorageItem(key: string, value: string): Promise<void> {
    // For React Native, use AsyncStorage
    // For web, use localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }

  private async removeStorageItem(key: string): Promise<void> {
    // For React Native, use AsyncStorage
    // For web, use localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }

  /**
   * Utility Methods
   */
  public isAuthenticated(): boolean {
    return !!this.authToken;
  }

  public clearCache(): void {
    this.cache.clear();
    console.log('🧹 API cache cleared');
  }

  public getQueueSize(): number {
    return this.offlineQueue.length;
  }

  public isOnlineStatus(): boolean {
    return this.isOnline;
  }
}

// Export singleton instance
export const apiService = new ReactNativeApiService();
export default apiService;