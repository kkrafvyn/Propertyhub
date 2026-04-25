/**
 * useUtility Hook
 * 
 * Custom React hook for utility service management
 * Handles DStv, Water, Electricity, WiFi services
 * 
 * @author PropertyHub Team
 */

import { useState, useCallback, useEffect } from 'react';
import { propertyServiceService, servicePaymentService, smartMeterService } from '../services/utilityService';
import { advancedUtilityService, serviceAutomationService } from '../services/advancedUtilityService';
import type { PropertyService, ServicePayment, SmartMeter } from '../types/utilities';

export interface UseUtilityState {
  services: PropertyService[];
  payments: ServicePayment[];
  meters: SmartMeter[];
  loading: boolean;
  error: Error | null;
  dashboard: any;
  analytics: any;
}

export interface UseUtilityReturn extends UseUtilityState {
  getPropertyServices: (propertyId: string) => Promise<void>;
  addService: (serviceData: Partial<PropertyService>) => Promise<void>;
  updateService: (serviceId: string, updates: Partial<PropertyService>) => Promise<void>;
  deleteService: (serviceId: string) => Promise<void>;
  payForService: (serviceId: string, userId: string, provider?: 'paystack' | 'flutterwave') => Promise<void>;
  enableAutoRenewal: (serviceId: string) => Promise<void>;
  disableAutoRenewal: (serviceId: string) => Promise<void>;
  getPaymentHistory: (serviceId: string) => Promise<void>;
  getDashboard: (propertyId: string) => Promise<void>;
  getAnalytics: (propertyId: string, serviceType?: string) => Promise<void>;
  recordMeterReading: (meterId: string, reading: number) => Promise<void>;
  clearError: () => void;
}

export const useUtility = (): UseUtilityReturn => {
  const [state, setState] = useState<UseUtilityState>({
    services: [],
    payments: [],
    meters: [],
    loading: false,
    error: null,
    dashboard: null,
    analytics: null,
  });

  const getPropertyServices = useCallback(async (propertyId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await propertyServiceService.getPropertyServices(propertyId);
      if (error) throw error;

      setState((prev) => ({ ...prev, services: data || [], loading: false }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch services');
      setState((prev) => ({ ...prev, error, loading: false }));
    }
  }, []);

  const addService = useCallback(async (serviceData: Partial<PropertyService>) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await propertyServiceService.addService(serviceData);
      if (error) throw error;

      setState((prev) => ({
        ...prev,
        services: [data, ...(prev.services || [])],
        loading: false,
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add service');
      setState((prev) => ({ ...prev, error, loading: false }));
      throw error;
    }
  }, []);

  const updateService = useCallback(async (serviceId: string, updates: Partial<PropertyService>) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await propertyServiceService.updateService(serviceId, updates);
      if (error) throw error;

      setState((prev) => ({
        ...prev,
        services: prev.services.map((s) => (s.id === serviceId ? (data as PropertyService) : s)),
        loading: false,
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update service');
      setState((prev) => ({ ...prev, error, loading: false }));
      throw error;
    }
  }, []);

  const deleteService = useCallback(async (serviceId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await propertyServiceService.deleteService(serviceId);
      if (error) throw error;

      setState((prev) => ({
        ...prev,
        services: prev.services.filter((s) => s.id !== serviceId),
        loading: false,
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete service');
      setState((prev) => ({ ...prev, error, loading: false }));
      throw error;
    }
  }, []);

  const payForService = useCallback(async (serviceId: string, userId: string, provider: 'paystack' | 'flutterwave' = 'paystack') => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await advancedUtilityService.payForService(serviceId, userId, provider);
      if (!result.success) throw result.error || new Error('Payment failed');

      setState((prev) => ({ ...prev, loading: false }));

      if (result.authUrl) {
        window.location.href = result.authUrl;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Payment failed');
      setState((prev) => ({ ...prev, error, loading: false }));
      throw error;
    }
  }, []);

  const enableAutoRenewal = useCallback(async (serviceId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await advancedUtilityService.enableAutoRenewal(serviceId);
      if (!result.success) throw result.error;

      setState((prev) => ({
        ...prev,
        services: prev.services.map((s) => (s.id === serviceId ? { ...s, auto_renew: true } : s)),
        loading: false,
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to enable auto-renewal');
      setState((prev) => ({ ...prev, error, loading: false }));
      throw error;
    }
  }, []);

  const disableAutoRenewal = useCallback(async (serviceId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await advancedUtilityService.disableAutoRenewal(serviceId);
      if (!result.success) throw result.error;

      setState((prev) => ({
        ...prev,
        services: prev.services.map((s) => (s.id === serviceId ? { ...s, auto_renew: false } : s)),
        loading: false,
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to disable auto-renewal');
      setState((prev) => ({ ...prev, error, loading: false }));
      throw error;
    }
  }, []);

  const getPaymentHistory = useCallback(async (serviceId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await servicePaymentService.getPaymentHistory(serviceId);
      if (error) throw error;

      setState((prev) => ({ ...prev, payments: data || [], loading: false }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch payment history');
      setState((prev) => ({ ...prev, error, loading: false }));
    }
  }, []);

  const getDashboard = useCallback(async (propertyId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const dashboard = await advancedUtilityService.getServiceDashboard(propertyId);
      setState((prev) => ({
        ...prev,
        dashboard,
        services: dashboard.services || [],
        loading: false,
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch dashboard');
      setState((prev) => ({ ...prev, error, loading: false }));
    }
  }, []);

  const getAnalytics = useCallback(async (propertyId: string, serviceType?: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const analytics = await advancedUtilityService.getServiceAnalytics(propertyId, serviceType);
      setState((prev) => ({ ...prev, analytics, loading: false }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch analytics');
      setState((prev) => ({ ...prev, error, loading: false }));
    }
  }, []);

  const recordMeterReading = useCallback(async (meterId: string, reading: number) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await smartMeterService.recordReading(meterId, reading);
      if (error) throw error;

      setState((prev) => ({
        ...prev,
        meters: prev.meters.map((m) => (m.id === meterId ? (data as SmartMeter) : m)),
        loading: false,
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to record meter reading');
      setState((prev) => ({ ...prev, error, loading: false }));
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    getPropertyServices,
    addService,
    updateService,
    deleteService,
    payForService,
    enableAutoRenewal,
    disableAutoRenewal,
    getPaymentHistory,
    getDashboard,
    getAnalytics,
    recordMeterReading,
    clearError,
  };
};

export default useUtility;
