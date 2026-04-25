/**
 * useLandlordDashboard Hook
 *
 * Custom React hook for landlord analytics and dashboard state management
 * Handles analytics data fetching, filtering, and real-time updates
 *
 * @author PropertyHub Team
 */

import { useState, useCallback, useEffect } from 'react';
import landlordAnalyticsService from '../services/landlordAnalyticsService';
import type {
  LandlordAnalytics,
  PropertyMetrics,
  PaymentAnalytics,
  TenantScore,
} from '../services/landlordAnalyticsService';

export interface UseLandlordDashboardState {
  analytics: LandlordAnalytics | null;
  paymentAnalytics: PaymentAnalytics | null;
  selectedProperty: PropertyMetrics | null;
  selectedTenants: TenantScore[];
  timeframe: 'monthly' | 'quarterly' | 'yearly';
  loading: boolean;
  error: Error | null;
  lastUpdated: string | null;
}

export interface UseLandlordDashboardReturn extends UseLandlordDashboardState {
  fetchLandlordAnalytics: (userId: string) => Promise<void>;
  fetchPropertyMetrics: (propertyId: string) => Promise<void>;
  fetchPaymentAnalytics: (userId: string, propertyId?: string) => Promise<void>;
  fetchTenantScores: (propertyId: string) => Promise<void>;
  selectProperty: (propertyId: string) => void;
  setTimeframe: (timeframe: 'monthly' | 'quarterly' | 'yearly') => void;
  generateReport: (userId: string) => Promise<any>;
  clearError: () => void;
  refreshData: (userId: string) => Promise<void>;
}

export const useLandlordDashboard = (): UseLandlordDashboardReturn => {
  const [state, setState] = useState<UseLandlordDashboardState>({
    analytics: null,
    paymentAnalytics: null,
    selectedProperty: null,
    selectedTenants: [],
    timeframe: 'monthly',
    loading: false,
    error: null,
    lastUpdated: null,
  });

  // Fetch landlord analytics
  const fetchLandlordAnalytics = useCallback(async (userId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await landlordAnalyticsService.getLandlordAnalytics(userId);
      if (error) throw error;

      setState((prev) => ({
        ...prev,
        analytics: data,
        loading: false,
        lastUpdated: new Date().toISOString(),
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch analytics');
      setState((prev) => ({ ...prev, error, loading: false }));
      throw error;
    }
  }, []);

  // Fetch specific property metrics
  const fetchPropertyMetrics = useCallback(async (propertyId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await landlordAnalyticsService.getPropertyMetrics(propertyId);
      if (error) throw error;

      setState((prev) => ({
        ...prev,
        selectedProperty: data,
        loading: false,
        lastUpdated: new Date().toISOString(),
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch property metrics');
      setState((prev) => ({ ...prev, error, loading: false }));
      throw error;
    }
  }, []);

  // Fetch payment analytics
  const fetchPaymentAnalytics = useCallback(async (userId: string, propertyId?: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await landlordAnalyticsService.getPaymentAnalytics(userId, propertyId);
      if (error) throw error;

      setState((prev) => ({
        ...prev,
        paymentAnalytics: data,
        loading: false,
        lastUpdated: new Date().toISOString(),
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch payment analytics');
      setState((prev) => ({ ...prev, error, loading: false }));
      throw error;
    }
  }, []);

  // Fetch tenant scores
  const fetchTenantScores = useCallback(async (propertyId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const tenants = await landlordAnalyticsService.getTenantScores(propertyId);

      setState((prev) => ({
        ...prev,
        selectedTenants: tenants,
        loading: false,
        lastUpdated: new Date().toISOString(),
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch tenant scores');
      setState((prev) => ({ ...prev, error, loading: false }));
      throw error;
    }
  }, []);

  // Select property
  const selectProperty = useCallback((propertyId: string) => {
    if (state.analytics) {
      const property = state.analytics.properties.find((p) => p.propertyId === propertyId);
      setState((prev) => ({
        ...prev,
        selectedProperty: property || null,
      }));
    }
  }, [state.analytics]);

  // Set timeframe
  const setTimeframe = useCallback((timeframe: 'monthly' | 'quarterly' | 'yearly') => {
    setState((prev) => ({ ...prev, timeframe }));
  }, []);

  // Generate report
  const generateReport = useCallback(async (userId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await landlordAnalyticsService.generateAnalyticsReport(userId);
      if (error) throw error;

      setState((prev) => ({
        ...prev,
        loading: false,
        lastUpdated: new Date().toISOString(),
      }));

      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate report');
      setState((prev) => ({ ...prev, error, loading: false }));
      throw error;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Refresh all data
  const refreshData = useCallback(async (userId: string) => {
    await Promise.all([
      fetchLandlordAnalytics(userId),
      fetchPaymentAnalytics(userId),
    ]);
  }, [fetchLandlordAnalytics, fetchPaymentAnalytics]);

  return {
    ...state,
    fetchLandlordAnalytics,
    fetchPropertyMetrics,
    fetchPaymentAnalytics,
    fetchTenantScores,
    selectProperty,
    setTimeframe,
    generateReport,
    clearError,
    refreshData,
  };
};

export default useLandlordDashboard;
