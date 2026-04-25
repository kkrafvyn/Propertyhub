/**
 * Utility Service Layer
 * 
 * Handle property utilities: DStv, Water, Electricity, WiFi
 * Includes smart meter integration and auto-renewal
 * 
 * @author PropertyHub Team
 */

import { supabase } from './supabaseClient';
import { backendApiRequest } from './backendApi';
import type {
  PropertyService,
  ServicePayment,
  SmartMeter,
  BillingCycle,
  ServiceType,
  ServiceStatus,
  ServiceRenewalRequest,
} from '../types/utilities';

/**
 * ============================================
 * PROPERTY SERVICE MANAGEMENT
 * ============================================
 */

export const propertyServiceService = {
  /**
   * Add service to property
   */
  async addService(serviceData: Partial<PropertyService>): Promise<{ data: PropertyService | null; error: any }> {
    try {
      try {
        const frequency = (serviceData.payment_frequency || (serviceData as any).billing_cycle || 'monthly').toLowerCase();
        const billingCycleMap: Record<string, string> = {
          daily: 'monthly',
          weekly: 'monthly',
          bi_weekly: 'monthly',
          monthly: 'monthly',
          quarterly: 'quarterly',
          yearly: 'annual',
          annual: 'annual',
          'semi-annual': 'semi-annual',
        };

        const backendData = await backendApiRequest<PropertyService>('/api/v1/utilities/add-service', {
          method: 'POST',
          body: JSON.stringify({
            propertyId: serviceData.property_id,
            serviceType: (serviceData.service_type || '').toLowerCase(),
            monthlyBudget: serviceData.amount || (serviceData as any).monthly_budget || 0,
            billingCycle: billingCycleMap[frequency] || 'monthly',
            autoRenew: serviceData.auto_renew || false,
          }),
        });

        if (backendData) {
          return { data: backendData, error: null };
        }
      } catch {
        // Fallback to direct database call when backend endpoint is not available.
      }

      const { data, error } = await supabase
        .from('property_services')
        .insert({
          ...serviceData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get all services for property
   */
  async getPropertyServices(propertyId: string): Promise<{ data: PropertyService[] | null; error: any }> {
    try {
      try {
        const backendData = await backendApiRequest<PropertyService[]>(
          `/api/v1/utilities/services/${encodeURIComponent(propertyId)}`
        );
        if (Array.isArray(backendData)) {
          return { data: backendData, error: null };
        }
      } catch {
        // Fallback to direct database call when backend endpoint is not available.
      }

      const { data, error } = await supabase
        .from('property_services')
        .select('*')
        .eq('property_id', propertyId)
        .order('service_type', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get single service
   */
  async getService(serviceId: string): Promise<{ data: PropertyService | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('property_services')
        .select('*')
        .eq('id', serviceId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Update service
   */
  async updateService(serviceId: string, updates: Partial<PropertyService>): Promise<{ data: PropertyService | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('property_services')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', serviceId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Delete service
   */
  async deleteService(serviceId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('property_services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  /**
   * Get services expiring soon
   */
  async getExpiringServices(daysUntilExpiry: number = 7): Promise<{ data: PropertyService[] | null; error: any }> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysUntilExpiry);

      const { data, error } = await supabase
        .from('property_services')
        .select('*')
        .eq('status', 'active')
        .lte('next_renewal_date', futureDate.toISOString())
        .gt('next_renewal_date', new Date().toISOString())
        .order('next_renewal_date', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get expired services
   */
  async getExpiredServices(): Promise<{ data: PropertyService[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('property_services')
        .select('*')
        .lt('next_renewal_date', new Date().toISOString())
        .eq('status', 'active')
        .order('next_renewal_date', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

/**
 * ============================================
 * SERVICE PAYMENT TRACKING
 * ============================================
 */

export const servicePaymentService = {
  /**
   * Record service payment
   */
  async recordPayment(paymentData: Partial<ServicePayment>): Promise<{ data: ServicePayment | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('service_payments')
        .insert({
          ...paymentData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get service payment history
   */
  async getPaymentHistory(serviceId: string, limit: number = 20): Promise<{ data: ServicePayment[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('service_payments')
        .select('*')
        .eq('service_id', serviceId)
        .order('payment_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get total spent on service
   */
  async getTotalSpent(serviceId: string): Promise<{ total: number | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('service_payments')
        .select('amount')
        .eq('service_id', serviceId)
        .eq('status', 'completed');

      if (error) throw error;

      const total = data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      return { total, error: null };
    } catch (error) {
      return { total: null, error };
    }
  },
};

/**
 * ============================================
 * SMART METER MANAGEMENT
 * ============================================
 */

export const smartMeterService = {
  /**
   * Create smart meter record
   */
  async createMeter(meterData: Partial<SmartMeter>): Promise<{ data: SmartMeter | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('smart_meters')
        .insert({
          ...meterData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get property meters
   */
  async getPropertyMeters(propertyId: string): Promise<{ data: SmartMeter[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('smart_meters')
        .select('*')
        .eq('property_id', propertyId)
        .order('meter_type', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Record meter reading
   */
  async recordReading(
    meterId: string,
    currentReading: number
  ): Promise<{ data: SmartMeter | null; error: any }> {
    try {
      // Get current meter data
      const { data: currentMeter } = await supabase
        .from('smart_meters')
        .select('*')
        .eq('id', meterId)
        .single();

      const consumption = currentReading - (currentMeter?.current_reading || 0);

      try {
        await backendApiRequest('/api/v1/utilities/smart-meter/reading', {
          method: 'POST',
          body: JSON.stringify({
            serviceId: currentMeter?.service_id || meterId,
            reading: currentReading,
            unit: currentMeter?.unit || currentMeter?.meter_type || 'kWh',
          }),
        });
      } catch {
        // Keep local update path active even if backend logging endpoint is unavailable.
      }

      const { data, error } = await supabase
        .from('smart_meters')
        .update({
          previous_reading: currentMeter?.current_reading || 0,
          current_reading: currentReading,
          consumption,
          last_reading_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', meterId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get meter consumption history
   */
  async getConsumptionHistory(
    propertyId: string,
    meterType: string,
    months: number = 12
  ): Promise<{ data: any[] | null; error: any }> {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data, error } = await supabase
        .from('smart_meters')
        .select('*')
        .eq('property_id', propertyId)
        .eq('meter_type', meterType)
        .gte('last_reading_date', startDate.toISOString())
        .order('last_reading_date', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

/**
 * ============================================
 * BILLING CYCLE MANAGEMENT
 * ============================================
 */

export const billingCycleService = {
  /**
   * Create billing cycle
   */
  async createCycle(cycleData: Partial<BillingCycle>): Promise<{ data: BillingCycle | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('billing_cycles')
        .insert({
          ...cycleData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get billing cycles for property
   */
  async getPropertyBillingCycles(
    propertyId: string,
    months: number = 12
  ): Promise<{ data: BillingCycle[] | null; error: any }> {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data, error } = await supabase
        .from('billing_cycles')
        .select('*')
        .eq('property_id', propertyId)
        .gte('period_start', startDate.toISOString())
        .order('period_start', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get current billing cycle
   */
  async getCurrentCycle(propertyId: string): Promise<{ data: BillingCycle | null; error: any }> {
    try {
      const now = new Date();

      const { data, error } = await supabase
        .from('billing_cycles')
        .select('*')
        .eq('property_id', propertyId)
        .lte('period_start', now.toISOString())
        .gte('period_end', now.toISOString())
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

/**
 * ============================================
 * UTILITY ANALYTICS
 * ============================================
 */

export const utilityAnalyticsService = {
  /**
   * Get utility bill summary for property
   */
  async getUtilityBillSummary(propertyId: string): Promise<any> {
    try {
      const { data: services, error: servicesError } = await propertyServiceService.getPropertyServices(propertyId);

      if (servicesError) throw servicesError;

      const summary = {
        period: new Date().toISOString().split('T')[0],
        services: (services || []).map((service) => ({
          service_type: service.service_type,
          provider: service.provider,
          amount: service.amount,
          status: service.status,
          next_due: service.next_renewal_date,
        })),
        total_amount: (services || []).reduce((sum, s) => sum + s.amount, 0),
        total_due_count: (services || []).filter((s) => s.status === 'active').length,
      };

      return { data: summary, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Calculate monthly utility cost
   */
  async getMonthlyUtilityCost(propertyId: string): Promise<{ total: number | null; error: any }> {
    try {
      const { data: services, error: servicesError } = await propertyServiceService.getPropertyServices(propertyId);

      if (servicesError) throw servicesError;

      const total = (services || []).reduce((sum, service) => {
        if (service.status === 'active' && service.payment_frequency === 'monthly') {
          return sum + service.amount;
        }
        return sum;
      }, 0);

      return { total, error: null };
    } catch (error) {
      return { total: null, error };
    }
  },

  /**
   * Get utility trends
   */
  async getUtilityTrends(propertyId: string, months: number = 6): Promise<{ data: any[] | null; error: any }> {
    try {
      const { data: cycles, error: cyclesError } = await billingCycleService.getPropertyBillingCycles(
        propertyId,
        months
      );

      if (cyclesError) throw cyclesError;

      return { data: cycles, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

export default {
  services: propertyServiceService,
  payments: servicePaymentService,
  meters: smartMeterService,
  billing: billingCycleService,
  analytics: utilityAnalyticsService,
};
