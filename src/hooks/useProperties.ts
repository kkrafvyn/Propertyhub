/**
 * useProperties Hook
 * 
 * Custom React hook for managing property data
 * Handles fetching, filtering, and caching of property listings
 * 
 * @author PropertyHub Team
 */

import { useCallback, useEffect, useState } from 'react';
import { propertyService } from '../services/supabaseApi';
import type { PropertyDB } from '../types/database';

export interface PropertyFilters {
  location?: string;
  priceMin?: number;
  priceMax?: number;
  type?: string;
  limit?: number;
  offset?: number;
}

export interface UsePropertiesReturn {
  properties: PropertyDB[];
  property: PropertyDB | null;
  loading: boolean;
  error: Error | null;
  total: number | null;
  fetchProperties: (filters?: PropertyFilters) => Promise<void>;
  fetchProperty: (propertyId: string) => Promise<void>;
  createProperty: (data: Partial<PropertyDB>, userId: string) => Promise<void>;
  updateProperty: (propertyId: string, data: Partial<PropertyDB>) => Promise<void>;
  deleteProperty: (propertyId: string) => Promise<void>;
  getPropertiesByOwner: (userId: string) => Promise<void>;
}

export const useProperties = (): UsePropertiesReturn => {
  const [properties, setProperties] = useState<PropertyDB[]>([]);
  const [property, setProperty] = useState<PropertyDB | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  const fetchProperties = useCallback(async (filters?: PropertyFilters) => {
    setLoading(true);
    setError(null);
    try {
      const { data, count, error: fetchError } = await propertyService.getProperties(filters);
      if (fetchError) throw fetchError;

      setProperties(data || []);
      setTotal(count);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch properties');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProperty = useCallback(async (propertyId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await propertyService.getProperty(propertyId);
      if (fetchError) throw fetchError;

      setProperty(data || null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch property');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProperty = useCallback(
    async (data: Partial<PropertyDB>, userId: string) => {
      setLoading(true);
      setError(null);
      try {
        const { data: newProperty, error: createError } = await propertyService.createProperty(
          userId,
          data
        );
        if (createError) throw createError;

        if (newProperty) {
          setProperties((prev) => [newProperty, ...prev]);
          setProperty(newProperty);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create property');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateProperty = useCallback(async (propertyId: string, data: Partial<PropertyDB>) => {
    setLoading(true);
    setError(null);
    try {
      const { data: updatedProperty, error: updateError } = await propertyService.updateProperty(
        propertyId,
        data
      );
      if (updateError) throw updateError;

      if (updatedProperty) {
        setProperties((prev) =>
          prev.map((p) => (p.id === propertyId ? updatedProperty : p))
        );
        if (property?.id === propertyId) {
          setProperty(updatedProperty);
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update property');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [property]);

  const deleteProperty = useCallback(async (propertyId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error: deleteError } = await propertyService.deleteProperty(propertyId);
      if (deleteError) throw deleteError;

      setProperties((prev) => prev.filter((p) => p.id !== propertyId));
      if (property?.id === propertyId) {
        setProperty(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete property');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [property]);

  const getPropertiesByOwner = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await propertyService.getPropertiesByOwner(userId);
      if (fetchError) throw fetchError;

      setProperties(data || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch owner properties');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    properties,
    property,
    loading,
    error,
    total,
    fetchProperties,
    fetchProperty,
    createProperty,
    updateProperty,
    deleteProperty,
    getPropertiesByOwner,
  };
};

export default useProperties;
