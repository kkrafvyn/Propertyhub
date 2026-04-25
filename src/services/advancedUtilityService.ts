/**
 * Utility Service Enhancement
 * 
 * Advanced features for DStv, Water, Electricity, WiFi management
 * Includes auto-renewal, consumption tracking, notifications, and billing
 */

import { supabase } from './supabaseClient';
import { transactionService, paymentOrchestrationService } from './paymentService';
import { backendApiRequest } from './backendApi';
import type { PropertyService, ServicePayment, SmartMeter } from '../types/utilities';

/**
 * ============================================
 * ADVANCED UTILITY SERVICE OPERATIONS
 * ============================================
 */

export const advancedUtilityService = {
  /**
   * Get comprehensive service dashboard
   */
  async getServiceDashboard(propertyId: string): Promise<{
    services: PropertyService[];
    totalMonthlySpend: number;
    expiringServices: PropertyService[];
    expiredServices: PropertyService[];
    recentPayments: ServicePayment[];
  }> {
    try {
      // Get all services
      let services: PropertyService[] | null = null;

      try {
        const backendServices = await backendApiRequest<PropertyService[]>(
          `/api/v1/utilities/services/${encodeURIComponent(propertyId)}`
        );
        if (Array.isArray(backendServices)) {
          services = backendServices;
        }
      } catch {
        // Fallback to direct query when backend endpoint is unavailable.
      }

      if (!services) {
        const response = await supabase
          .from('property_services')
          .select('*')
          .eq('property_id', propertyId)
          .order('service_type');
        services = (response.data || []) as PropertyService[];
      }

      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const expiringServices = (services || []).filter(
        (s) =>
          new Date(s.next_renewal_date) <= endOfMonth &&
          new Date(s.next_renewal_date) > now
      );

      const expiredServices = (services || []).filter(
        (s) => new Date(s.next_renewal_date) <= now
      );

      // Calculate total monthly spend
      const totalMonthlySpend = (services || [])
        .filter((s) => s.status === 'active')
        .reduce((total, service) => {
          // Estimate monthly based on frequency
          const frequency = service.payment_frequency;
          let monthlyAmount = service.amount;

          if (frequency === 'daily') {
            monthlyAmount = service.amount * 30;
          } else if (frequency === 'weekly') {
            monthlyAmount = service.amount * 4.33;
          } else if (frequency === 'bi_weekly') {
            monthlyAmount = service.amount * 2.17;
          } else if (frequency === 'quarterly') {
            monthlyAmount = service.amount / 3;
          } else if (frequency === 'yearly') {
            monthlyAmount = service.amount / 12;
          }

          return total + monthlyAmount;
        }, 0);

      // Get recent payments
      const { data: recentPayments } = await supabase
        .from('service_payments')
        .select('*')
        .in('service_id', services?.map((s) => s.id) || [])
        .order('payment_date', { ascending: false })
        .limit(10);

      return {
        services: services || [],
        totalMonthlySpend: Math.round(totalMonthlySpend * 100) / 100,
        expiringServices,
        expiredServices,
        recentPayments: recentPayments || [],
      };
    } catch (error) {
      console.error('Dashboard error:', error);
      return {
        services: [],
        totalMonthlySpend: 0,
        expiringServices: [],
        expiredServices: [],
        recentPayments: [],
      };
    }
  },

  /**
   * Pay for service using payment system
   */
  async payForService(
    serviceId: string,
    userId: string,
    provider: 'paystack' | 'flutterwave' = 'paystack'
  ): Promise<{ success: boolean; transactionId?: string; authUrl?: string; error?: any }> {
    try {
      const { data: service } = await supabase
        .from('property_services')
        .select('*')
        .eq('id', serviceId)
        .single();

      if (!service) throw new Error('Service not found');

      // Initiate payment
      const result = await paymentOrchestrationService.processPayment({
        user_id: userId,
        amount: service.amount,
        currency: service.currency || 'GHS',
        transaction_type: 'service_payment',
        provider,
        property_id: service.property_id,
        metadata: {
          service_id: serviceId,
          service_type: service.service_type,
          account_number: service.account_number,
        },
      });

      if (!result.success) {
        throw result;
      }

      // Update service last_payment_date
      const newRenewalDate = new Date();

      if (service.payment_frequency === 'daily') {
        newRenewalDate.setDate(newRenewalDate.getDate() + 1);
      } else if (service.payment_frequency === 'weekly') {
        newRenewalDate.setDate(newRenewalDate.getDate() + 7);
      } else if (service.payment_frequency === 'bi_weekly') {
        newRenewalDate.setDate(newRenewalDate.getDate() + 14);
      } else if (service.payment_frequency === 'monthly') {
        newRenewalDate.setMonth(newRenewalDate.getMonth() + 1);
      } else if (service.payment_frequency === 'quarterly') {
        newRenewalDate.setMonth(newRenewalDate.getMonth() + 3);
      } else if (service.payment_frequency === 'yearly') {
        newRenewalDate.setFullYear(newRenewalDate.getFullYear() + 1);
      }

      await supabase
        .from('property_services')
        .update({
          last_payment_date: new Date().toISOString(),
          next_renewal_date: newRenewalDate.toISOString(),
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', serviceId);

      // Record service payment
      await supabase
        .from('service_payments')
        .insert({
          service_id: serviceId,
          amount: service.amount,
          currency: service.currency || 'GHS',
          payment_date: new Date().toISOString(),
          payment_method: provider,
          provider_reference: result.reference,
          status: 'pending', // Will update when webhook comes
        });

      return {
        success: true,
        transactionId: result.transaction_id,
        authUrl: result.authorization_url,
      };
    } catch (error) {
      console.error('Service payment error:', error);
      return {
        success: false,
        error,
      };
    }
  },

  /**
   * Enable auto-renewal for service
   */
  async enableAutoRenewal(serviceId: string): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase
        .from('property_services')
        .update({
          auto_renew: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', serviceId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  },

  /**
   * Disable auto-renewal for service
   */
  async disableAutoRenewal(serviceId: string): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase
        .from('property_services')
        .update({
          auto_renew: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', serviceId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  },

  /**
   * Get service analytics
   */
  async getServiceAnalytics(
    propertyId: string,
    serviceType?: string
  ): Promise<{
    totalSpent: number;
    averageMonthly: number;
    highestExpense: number;
    lowestExpense: number;
    paymentTrend: Array<{ month: string; amount: number }>;
  }> {
    try {
      let query = supabase
        .from('property_services')
        .select('id, amount, payment_frequency')
        .eq('property_id', propertyId);

      if (serviceType) {
        query = query.eq('service_type', serviceType);
      }

      const { data: services } = await query;

      // Get payment history
      let paymentQuery = supabase
        .from('service_payments')
        .select('amount, payment_date, status')
        .eq('status', 'completed');

      if (services && services.length > 0) {
        paymentQuery = paymentQuery.in('service_id', services.map((s) => s.id));
      }

      const { data: payments } = await paymentQuery.order('payment_date', { ascending: true });

      // Calculate analytics
      const totalSpent = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const averageMonthly = totalSpent / 12; // Approximate
      const amounts = (payments || []).map((p) => p.amount || 0);
      const highestExpense = Math.max(...amounts, 0);
      const lowestExpense = Math.min(...amounts, 0);

      // Group by month for trend
      const paymentTrend: { [key: string]: number } = {};
      (payments || []).forEach((payment) => {
        const date = new Date(payment.payment_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        paymentTrend[monthKey] = (paymentTrend[monthKey] || 0) + (payment.amount || 0);
      });

      const trend = Object.entries(paymentTrend)
        .sort()
        .slice(-12) // Last 12 months
        .map(([month, amount]) => ({
          month,
          amount: Math.round(amount * 100) / 100,
        }));

      return {
        totalSpent: Math.round(totalSpent * 100) / 100,
        averageMonthly: Math.round(averageMonthly * 100) / 100,
        highestExpense: Math.round(highestExpense * 100) / 100,
        lowestExpense: Math.round(lowestExpense * 100) / 100,
        paymentTrend: trend,
      };
    } catch (error) {
      console.error('Analytics error:', error);
      return {
        totalSpent: 0,
        averageMonthly: 0,
        highestExpense: 0,
        lowestExpense: 0,
        paymentTrend: [],
      };
    }
  },

  /**
   * Get service recommendations
   */
  async getServiceRecommendations(propertyId: string): Promise<string[]> {
    try {
      const { services, expiredServices } = await advancedUtilityService.getServiceDashboard(
        propertyId
      );

      const recommendations: string[] = [];

      // Check for expired services
      if (expiredServices.length > 0) {
        recommendations.push(
          `You have ${expiredServices.length} expired service(s). Renew them to avoid service interruption.`
        );
      }

      // Check for auto-renewal
      const withoutAutoRenewal = services.filter((s) => s.status === 'active' && !s.auto_renew);
      if (withoutAutoRenewal.length > 0) {
        recommendations.push(
          `Enable auto-renewal for ${withoutAutoRenewal.length} service(s) to avoid manual payments.`
        );
      }

      // Check for high spending
      const dashboard = await advancedUtilityService.getServiceDashboard(propertyId);
      if (dashboard.totalMonthlySpend > 5000) {
        recommendations.push(
          `Your average monthly utility spending (GHS ${dashboard.totalMonthlySpend}) is high. Consider reviewing your services.`
        );
      }

      return recommendations;
    } catch (error) {
      console.error('Recommendations error:', error);
      return [];
    }
  },
};

/**
 * ============================================
 * SERVICE AUTOMATION
 * ============================================
 */

export const serviceAutomationService = {
  /**
   * Send expiring service notifications
   */
  async notifyExpiringServices(): Promise<{ notified: number; failed: number }> {
    try {
      const { data: services, error } = await supabase
        .from('property_services')
        .select('*, properties(owner_id)')
        .eq('status', 'active')
        .lte('next_renewal_date', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString())
        .gt('next_renewal_date', new Date().toISOString());

      if (error) throw error;

      let notified = 0;
      let failed = 0;

      for (const service of services || []) {
        try {
          await supabase.from('notifications').insert({
            user_id: service.properties?.owner_id,
            type: 'service_expiring',
            title: 'Service Renewal Required',
            message: `Your ${service.service_type} service (${service.account_number}) expires on ${new Date(service.next_renewal_date).toLocaleDateString()}`,
            data: { service_id: service.id },
          });

          notified++;
        } catch (err) {
          failed++;
        }
      }

      return { notified, failed };
    } catch (error) {
      console.error('Notification error:', error);
      return { notified: 0, failed: 0 };
    }
  },

  /**
   * Auto-renew services with auto_renew enabled
   */
  async autoRenewServices(): Promise<{ renewed: number; failed: number }> {
    try {
      const { data: services, error } = await supabase
        .from('property_services')
        .select('*')
        .eq('auto_renew', true)
        .lte('next_renewal_date', new Date().toISOString());

      if (error) throw error;

      let renewed = 0;
      let failed = 0;

      for (const service of services || []) {
        try {
          // Get property owner
          const { data: property } = await supabase
            .from('properties')
            .select('owner_id')
            .eq('id', service.property_id)
            .single();

          if (!property) continue;

          // Attempt payment
          const result = await advancedUtilityService.payForService(
            service.id,
            property.owner_id,
            'paystack'
          );

          if (result.success) {
            renewed++;
          } else {
            failed++;
          }
        } catch (err) {
          failed++;
        }
      }

      return { renewed, failed };
    } catch (error) {
      console.error('Auto-renewal error:', error);
      return { renewed: 0, failed: 0 };
    }
  },

  /**
   * Alert on overdue renewals
   */
  async alertOverdueServices(): Promise<{ alerted: number }> {
    try {
      const { data: services } = await supabase
        .from('property_services')
        .select('*, properties(owner_id)')
        .eq('status', 'active')
        .lt('next_renewal_date', new Date().toISOString());

      let alerted = 0;

      for (const service of services || []) {
        try {
          const daysOverdue = Math.floor(
            (Date.now() - new Date(service.next_renewal_date).getTime()) / (1000 * 60 * 60 * 24)
          );

          await supabase.from('notifications').insert({
            user_id: service.properties?.owner_id,
            type: 'service_overdue',
            title: 'Service Renewal Overdue',
            message: `Your ${service.service_type} service is ${daysOverdue} days overdue. Renew immediately to restore service.`,
            data: { service_id: service.id },
          });

          alerted++;
        } catch (err) {
          console.error('Alert failed:', err);
        }
      }

      return { alerted };
    } catch (error) {
      console.error('Overdue alert error:', error);
      return { alerted: 0 };
    }
  },
};

export default {
  advancedUtility: advancedUtilityService,
  automation: serviceAutomationService,
};
