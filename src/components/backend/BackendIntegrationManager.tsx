/**
 * Backend Integration Manager
 * 
 * Provides comprehensive backend integration including:
 * - API management
 * - Real-time data synchronization
 * - Offline support
 * - Caching strategies
 * - Error handling
 * 
 * @author PropertyHub Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cloud, 
  CloudOff, 
  Database, 
  Wifi, 
  WifiOff,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Zap
} from 'lucide-react';

import { useAppContext } from '../../hooks/useAppContext';
import { Property, User, ApiResponse } from '../../types';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

// API configuration
interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

// Request queue item
interface QueuedRequest {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  timestamp: string;
  retries: number;
  priority: 'low' | 'medium' | 'high';
}

// Sync status
interface SyncStatus {
  isOnline: boolean;
  lastSync: string | null;
  pendingRequests: number;
  failedRequests: number;
  syncInProgress: boolean;
}

// Cache entry
interface CacheEntry<T = any> {
  data: T;
  timestamp: string;
  expiry: string;
  etag?: string;
}

// API Client Class
class ApiClient {
  private config: ApiConfig;
  private requestQueue: QueuedRequest[] = [];
  private cache = new Map<string, CacheEntry>();
  private syncStatus: SyncStatus = {
    isOnline: navigator.onLine,
    lastSync: null,
    pendingRequests: 0,
    failedRequests: 0,
    syncInProgress: false
  };

  constructor(config: ApiConfig) {
    this.config = config;
    this.setupEventListeners();
    this.loadCacheFromStorage();
    this.loadQueueFromStorage();
  }

  private setupEventListeners() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  private handleOnline = async () => {
    this.syncStatus.isOnline = true;
    await this.processQueue();
  };

  private handleOffline = () => {
    this.syncStatus.isOnline = false;
  };

  private loadCacheFromStorage() {
    try {
      const cachedData = localStorage.getItem('api_cache');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        this.cache = new Map(parsed);
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  private saveCacheToStorage() {
    try {
      const cacheArray = Array.from(this.cache.entries());
      localStorage.setItem('api_cache', JSON.stringify(cacheArray));
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }

  private loadQueueFromStorage() {
    try {
      const queueData = localStorage.getItem('api_queue');
      if (queueData) {
        this.requestQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.warn('Failed to load queue from storage:', error);
    }
  }

  private saveQueueToStorage() {
    try {
      localStorage.setItem('api_queue', JSON.stringify(this.requestQueue));
    } catch (error) {
      console.warn('Failed to save queue to storage:', error);
    }
  }

  private getCacheKey(url: string, params?: any): string {
    return params ? `${url}?${new URLSearchParams(params).toString()}` : url;
  }

  private isExpired(entry: CacheEntry): boolean {
    return new Date(entry.expiry) < new Date();
  }

  private async makeRequest<T>(
    url: string, 
    options: RequestInit = {},
    useCache: boolean = true
  ): Promise<ApiResponse<T>> {
    const cacheKey = this.getCacheKey(url, options.body);
    
    // Check cache first
    if (useCache && options.method === 'GET') {
      const cached = this.cache.get(cacheKey);
      if (cached && !this.isExpired(cached)) {
        return {
          success: true,
          data: cached.data,
          timestamp: cached.timestamp
        };
      }
    }

    // If offline, queue the request
    if (!this.syncStatus.isOnline && options.method !== 'GET') {
      return this.queueRequest(url, options);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.baseUrl}${url}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const result: ApiResponse<T> = {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };

      // Cache successful GET requests
      if (options.method === 'GET' && useCache) {
        const cacheEntry: CacheEntry<T> = {
          data,
          timestamp: result.timestamp,
          expiry: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
          etag: response.headers.get('etag') || undefined
        };
        
        this.cache.set(cacheKey, cacheEntry);
        this.saveCacheToStorage();
      }

      return result;

    } catch (error) {
      const errorResult: ApiResponse<T> = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };

      // For offline scenarios, try to serve from cache
      if (!this.syncStatus.isOnline && useCache) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          return {
            success: true,
            data: cached.data,
            timestamp: cached.timestamp,
            message: 'Served from cache (offline)'
          };
        }
      }

      // Queue request for retry if it's not a GET request
      if (options.method !== 'GET') {
        await this.queueRequest(url, options);
      }

      return errorResult;
    }
  }

  private async queueRequest(url: string, options: RequestInit): Promise<ApiResponse> {
    const queuedRequest: QueuedRequest = {
      id: Date.now().toString(),
      url,
      method: (options.method as any) || 'GET',
      data: options.body,
      timestamp: new Date().toISOString(),
      retries: 0,
      priority: 'medium'
    };

    this.requestQueue.push(queuedRequest);
    this.syncStatus.pendingRequests = this.requestQueue.length;
    this.saveQueueToStorage();

    return {
      success: false,
      error: 'Request queued for later processing',
      timestamp: new Date().toISOString(),
      message: 'Request will be processed when connection is restored'
    };
  }

  private async processQueue(): Promise<void> {
    if (this.syncStatus.syncInProgress || this.requestQueue.length === 0) {
      return;
    }

    this.syncStatus.syncInProgress = true;
    const processedRequests: string[] = [];

    for (const request of this.requestQueue) {
      try {
        await this.makeRequest(request.url, {
          method: request.method,
          body: request.data
        }, false);

        processedRequests.push(request.id);
      } catch (error) {
        request.retries += 1;
        
        if (request.retries >= this.config.retryAttempts) {
          processedRequests.push(request.id);
          this.syncStatus.failedRequests += 1;
        }
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Remove processed requests
    this.requestQueue = this.requestQueue.filter(
      request => !processedRequests.includes(request.id)
    );

    this.syncStatus.pendingRequests = this.requestQueue.length;
    this.syncStatus.syncInProgress = false;
    this.syncStatus.lastSync = new Date().toISOString();
    
    this.saveQueueToStorage();
  }

  // Public API methods
  async getProperties(filters?: any): Promise<ApiResponse<Property[]>> {
    return this.makeRequest<Property[]>('/properties', { 
      method: 'GET',
      body: filters ? JSON.stringify(filters) : undefined
    });
  }

  async getProperty(id: string): Promise<ApiResponse<Property>> {
    return this.makeRequest<Property>(`/properties/${id}`);
  }

  async createProperty(property: Partial<Property>): Promise<ApiResponse<Property>> {
    return this.makeRequest<Property>('/properties', {
      method: 'POST',
      body: JSON.stringify(property)
    });
  }

  async updateProperty(id: string, updates: Partial<Property>): Promise<ApiResponse<Property>> {
    return this.makeRequest<Property>(`/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteProperty(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`/properties/${id}`, {
      method: 'DELETE'
    });
  }

  async login(credentials: { email: string; password: string }): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.makeRequest<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  // Utility methods
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  clearCache(): void {
    this.cache.clear();
    localStorage.removeItem('api_cache');
  }

  clearQueue(): void {
    this.requestQueue = [];
    this.syncStatus.pendingRequests = 0;
    localStorage.removeItem('api_queue');
  }

  async forceSync(): Promise<void> {
    if (this.syncStatus.isOnline) {
      await this.processQueue();
    }
  }
}

// React hook for backend integration
const useBackendIntegration = () => {
  const apiClientRef = useRef<ApiClient | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    lastSync: null,
    pendingRequests: 0,
    failedRequests: 0,
    syncInProgress: false
  });

  // Initialize API client
  useEffect(() => {
    const config: ApiConfig = {
      baseUrl: process.env.REACT_APP_API_URL || 'https://api.propertyhub.com',
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000
    };

    apiClientRef.current = new ApiClient(config);

    // Update sync status periodically
    const statusInterval = setInterval(() => {
      if (apiClientRef.current) {
        setSyncStatus(apiClientRef.current.getSyncStatus());
      }
    }, 1000);

    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  const apiClient = apiClientRef.current;

  return {
    apiClient,
    syncStatus,
    isOnline: syncStatus.isOnline,
    hasPendingRequests: syncStatus.pendingRequests > 0,
    hasFailedRequests: syncStatus.failedRequests > 0
  };
};

// Sync status indicator component
const SyncStatusIndicator: React.FC<{ syncStatus: SyncStatus }> = ({ syncStatus }) => {
  const getStatusInfo = () => {
    if (!syncStatus.isOnline) {
      return {
        icon: WifiOff,
        label: 'Offline',
        color: 'text-red-500',
        bgColor: 'bg-red-100'
      };
    }

    if (syncStatus.syncInProgress) {
      return {
        icon: RefreshCw,
        label: 'Syncing...',
        color: 'text-blue-500',
        bgColor: 'bg-blue-100'
      };
    }

    if (syncStatus.pendingRequests > 0) {
      return {
        icon: Clock,
        label: `${syncStatus.pendingRequests} pending`,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-100'
      };
    }

    return {
      icon: CheckCircle,
      label: 'Synced',
      color: 'text-green-500',
      bgColor: 'bg-green-100'
    };
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  return (
    <motion.div
      className={`flex items-center space-x-2 px-3 py-1 rounded-full ${statusInfo.bgColor}`}
      animate={{ scale: syncStatus.syncInProgress ? [1, 1.05, 1] : 1 }}
      transition={{ repeat: syncStatus.syncInProgress ? Infinity : 0, duration: 1 }}
    >
      <Icon 
        className={`h-4 w-4 ${statusInfo.color} ${
          syncStatus.syncInProgress ? 'animate-spin' : ''
        }`} 
      />
      <span className={`text-sm font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    </motion.div>
  );
};

// Backend integration dashboard
export const BackendIntegrationManager: React.FC = () => {
  const { apiClient, syncStatus } = useBackendIntegration();
  const [testResults, setTestResults] = useState<Array<{ test: string; status: 'pass' | 'fail' | 'pending' }>>([]);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const runConnectionTests = async () => {
    if (!apiClient) return;

    setIsTestingConnection(true);
    const tests = [
      { name: 'API Reachability', test: () => apiClient.getProperties() },
      { name: 'Authentication', test: () => apiClient.login({ email: 'test@test.com', password: 'test' }) },
      { name: 'Property Fetch', test: () => apiClient.getProperty('test-id') }
    ];

    const results = [];

    for (const test of tests) {
      try {
        const result = await test.test();
        results.push({
          test: test.name,
          status: result.success ? 'pass' : 'fail'
        });
      } catch (error) {
        results.push({
          test: test.name,
          status: 'fail'
        });
      }
    }

    setTestResults(results);
    setIsTestingConnection(false);
  };

  const handleForceSync = async () => {
    if (apiClient) {
      await apiClient.forceSync();
    }
  };

  const handleClearCache = () => {
    if (apiClient) {
      apiClient.clearCache();
    }
  };

  const handleClearQueue = () => {
    if (apiClient) {
      apiClient.clearQueue();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Backend Integration</h1>
        <SyncStatusIndicator syncStatus={syncStatus} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Connection</p>
                <p className="text-lg font-semibold">
                  {syncStatus.isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
              {syncStatus.isOnline ? (
                <Wifi className="h-8 w-8 text-green-500" />
              ) : (
                <WifiOff className="h-8 w-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
                <p className="text-lg font-semibold">{syncStatus.pendingRequests}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed Requests</p>
                <p className="text-lg font-semibold">{syncStatus.failedRequests}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Last Sync</p>
                <p className="text-lg font-semibold">
                  {syncStatus.lastSync 
                    ? new Date(syncStatus.lastSync).toLocaleTimeString()
                    : 'Never'
                  }
                </p>
              </div>
              <RefreshCw className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Controls</h3>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button onClick={handleForceSync} disabled={!syncStatus.isOnline}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Force Sync
            </Button>

            <Button variant="outline" onClick={runConnectionTests} disabled={isTestingConnection}>
              <Zap className="h-4 w-4 mr-2" />
              {isTestingConnection ? 'Testing...' : 'Test Connection'}
            </Button>

            <Button variant="outline" onClick={handleClearCache}>
              <Database className="h-4 w-4 mr-2" />
              Clear Cache
            </Button>

            <Button variant="outline" onClick={handleClearQueue}>
              <Cloud className="h-4 w-4 mr-2" />
              Clear Queue
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connection Tests */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Connection Tests</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="font-medium">{result.test}</span>
                  <Badge 
                    variant={
                      result.status === 'pass' ? 'default' : 
                      result.status === 'fail' ? 'destructive' : 'secondary'
                    }
                  >
                    {result.status === 'pass' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {result.status === 'fail' && <AlertCircle className="h-3 w-3 mr-1" />}
                    {result.status.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export { useBackendIntegration, ApiClient };
export default BackendIntegrationManager;