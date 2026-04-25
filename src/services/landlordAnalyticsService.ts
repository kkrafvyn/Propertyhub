/**
 * Landlord Analytics Service
 *
 * Comprehensive analytics and reporting for landlords
 * Includes revenue tracking, occupancy analysis, tenant scoring
 *
 * @author PropertyHub Team
 */

import { supabase as supabaseClient } from './supabaseClient';
import { backendApiRequest } from './backendApi';
import type { Property, User } from '../types';

// ============================================================================
// Type Definitions
// ============================================================================

export interface RevenueMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  averageRent: number;
  expectedRevenue: number;
  actualRevenue: number;
  variance: number;
  collectionRate: number;
}

export interface OccupancyMetrics {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
  averageOccupancyDuration: number;
  vacancyDuration: number;
  turnoverRate: number;
}

export interface TenantScore {
  tenantId: string;
  tenantName: string;
  property: string;
  paymentScore: number; // 0-100: payment history
  behaviorScore: number; // 0-100: maintenance, complaints
  riskScore: number; // 0-100: overall risk (higher = riskier)
  overallScore: number; // 0-100: composite score
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface PropertyMetrics {
  propertyId: string;
  propertyName: string;
  revenue: RevenueMetrics;
  occupancy: OccupancyMetrics;
  topTenants: TenantScore[];
  maintenanceCosts: number;
  expenses: number;
  netIncome: number;
  roi: number;
  lastUpdated: string;
}

export interface LandlordAnalytics {
  userId: string;
  totalProperties: number;
  totalUnits: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalExpenses: number;
  netIncome: number;
  portfolioOccupancyRate: number;
  averagePropertyOccupancy: number;
  topPerformingProperty: string;
  riskAlerts: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
    propertyId?: string;
  }>;
  properties: PropertyMetrics[];
}

export interface PaymentAnalytics {
  totalPayments: number;
  onTimePayments: number;
  latePayments: number;
  missedPayments: number;
  collectionRate: number;
  averageLateDays: number;
  monthlyTrend: Array<{
    month: string;
    received: number;
    expected: number;
  }>;
}

// ============================================================================
// Landlord Analytics Service
// ============================================================================

export const landlordAnalyticsService = {
  // Get comprehensive landlord dashboard analytics
  async getLandlordAnalytics(userId: string): Promise<{ data: LandlordAnalytics | null; error: any }> {
    try {
      try {
        const backendData = await backendApiRequest<any>(
          `/api/v1/landlord/analytics/${encodeURIComponent(userId)}`
        );

        if (backendData) {
          const normalizedProperties = Array.isArray(backendData.properties)
            ? backendData.properties.map((property: any) => ({
                propertyId: property.id || property.propertyId || '',
                propertyName: property.name || property.propertyName || 'Property',
                revenue: {
                  totalRevenue: property.revenue || property.totalRevenue || 0,
                  monthlyRevenue: property.monthlyRevenue || 0,
                  averageRent: property.averageRent || 0,
                  expectedRevenue: property.expectedRevenue || 0,
                  actualRevenue: property.actualRevenue || property.revenue || 0,
                  variance: property.variance || 0,
                  collectionRate: property.collectionRate || 0,
                },
                occupancy: {
                  totalUnits: property.total_units || property.totalUnits || 0,
                  occupiedUnits: property.occupied_units || property.occupiedUnits || 0,
                  vacantUnits:
                    (property.total_units || property.totalUnits || 0) -
                    (property.occupied_units || property.occupiedUnits || 0),
                  occupancyRate: property.occupancyRate || 0,
                  averageOccupancyDuration: 0,
                  vacancyDuration: 0,
                  turnoverRate: 0,
                },
                topTenants: [],
                maintenanceCosts: 0,
                expenses: 0,
                netIncome: property.revenue || property.netIncome || 0,
                roi: property.roi || 0,
                lastUpdated: new Date().toISOString(),
              }))
            : [];

          const totalRevenue = backendData.totalRevenue || 0;
          const monthlyRevenue = backendData.monthlyRevenue || 0;
          const totalExpenses = backendData.totalExpenses || 0;

          return {
            data: {
              userId,
              totalProperties: backendData.totalProperties || normalizedProperties.length,
              totalUnits: backendData.totalUnits || 0,
              totalRevenue,
              monthlyRevenue,
              totalExpenses,
              netIncome: backendData.netIncome || monthlyRevenue - totalExpenses,
              portfolioOccupancyRate: backendData.occupancyRate || backendData.portfolioOccupancyRate || 0,
              averagePropertyOccupancy: backendData.occupancyRate || backendData.averagePropertyOccupancy || 0,
              topPerformingProperty: normalizedProperties[0]?.propertyId || '',
              riskAlerts: Array.isArray(backendData.riskAlerts) ? backendData.riskAlerts : [],
              properties: normalizedProperties,
            },
            error: null,
          };
        }
      } catch {
        // Fallback to direct database aggregation when backend endpoint is unavailable.
      }

      // Fetch user properties
      const { data: properties, error: propError } = await supabaseClient
        .from('properties')
        .select('id, name, address, units, monthly_rent, status')
        .eq('owner_id', userId);

      if (propError) throw propError;
      if (!properties || properties.length === 0) {
        return {
          data: {
            userId,
            totalProperties: 0,
            totalUnits: 0,
            totalRevenue: 0,
            monthlyRevenue: 0,
            totalExpenses: 0,
            netIncome: 0,
            portfolioOccupancyRate: 0,
            averagePropertyOccupancy: 0,
            topPerformingProperty: '',
            riskAlerts: [],
            properties: [],
          },
          error: null,
        };
      }

      // Get metrics for each property
      const propertyMetrics = await Promise.all(
        properties.map((prop: any) => this.getPropertyMetrics(prop.id))
      );

      // Aggregate analytics
      const aggregated = this.aggregatePropertyMetrics(propertyMetrics.map((m) => m.data));

      // Identify risk alerts
      const riskAlerts = this.identifyRiskAlerts(aggregated);

      return {
        data: {
          userId,
          totalProperties: properties.length,
          totalUnits: aggregated.totalUnits,
          totalRevenue: aggregated.totalRevenue,
          monthlyRevenue: aggregated.monthlyRevenue,
          totalExpenses: aggregated.totalExpenses,
          netIncome: aggregated.netIncome,
          portfolioOccupancyRate: aggregated.portfolioOccupancyRate,
          averagePropertyOccupancy:
            aggregated.properties.length > 0
              ? aggregated.properties.reduce((sum: number, p: any) => sum + p.occupancy.occupancyRate, 0) /
                aggregated.properties.length
              : 0,
          topPerformingProperty: this.getTopPerformingProperty(aggregated.properties),
          riskAlerts,
          properties: aggregated.properties,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get metrics for a specific property
  async getPropertyMetrics(propertyId: string): Promise<{ data: PropertyMetrics | null; error: any }> {
    try {
      try {
        const backendData = await backendApiRequest<any>(
          `/api/v1/landlord/analytics/property/${encodeURIComponent(propertyId)}`
        );

        if (backendData) {
          const monthlyRevenue = backendData.monthlyRevenue || 0;
          const totalRevenue = backendData.totalRevenue || 0;

          return {
            data: {
              propertyId: backendData.propertyId || propertyId,
              propertyName: backendData.propertyName || 'Property',
              revenue: {
                totalRevenue,
                monthlyRevenue,
                averageRent: backendData.averageRent || 0,
                expectedRevenue: backendData.expectedRevenue || monthlyRevenue,
                actualRevenue: backendData.actualRevenue || monthlyRevenue,
                variance: backendData.variance || 0,
                collectionRate: backendData.paymentStatus?.collectionRate || backendData.collectionRate || 0,
              },
              occupancy: {
                totalUnits: backendData.totalUnits || 0,
                occupiedUnits: backendData.occupiedUnits || 0,
                vacantUnits: Math.max(0, (backendData.totalUnits || 0) - (backendData.occupiedUnits || 0)),
                occupancyRate: backendData.occupancyRate || 0,
                averageOccupancyDuration: 0,
                vacancyDuration: 0,
                turnoverRate: 0,
              },
              topTenants: [],
              maintenanceCosts: 0,
              expenses: 0,
              netIncome: backendData.netIncome || monthlyRevenue,
              roi: backendData.roi || 0,
              lastUpdated: new Date().toISOString(),
            },
            error: null,
          };
        }
      } catch {
        // Fallback to direct database aggregation when backend endpoint is unavailable.
      }

      // Fetch property data
      const { data: property, error: propError } = await supabaseClient
        .from('properties')
        .select('id, name, units, monthly_rent')
        .eq('id', propertyId)
        .single();

      if (propError) throw propError;

      // Get revenue metrics
      const revenue = await this.getRevenueMetrics(propertyId);

      // Get occupancy metrics
      const occupancy = await this.getOccupancyMetrics(propertyId);

      // Get tenant scores
      const topTenants = await this.getTenantScores(propertyId, 5);

      // Get maintenance & expenses
      const { data: expenses } = await supabaseClient
        .from('property_expenses')
        .select('amount')
        .eq('property_id', propertyId)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const totalExpenses = expenses?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;

      const netIncome = revenue.actualRevenue - totalExpenses;
      const roi = revenue.expectedRevenue > 0 ? (netIncome / revenue.expectedRevenue) * 100 : 0;

      return {
        data: {
          propertyId,
          propertyName: property.name,
          revenue,
          occupancy,
          topTenants,
          maintenanceCosts: totalExpenses,
          expenses: totalExpenses,
          netIncome,
          roi,
          lastUpdated: new Date().toISOString(),
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get revenue metrics for a property
  async getRevenueMetrics(propertyId: string): Promise<RevenueMetrics> {
    try {
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), 1);

      // Fetch property details
      const { data: property } = await supabaseClient
        .from('properties')
        .select('monthly_rent, units')
        .eq('id', propertyId)
        .single();

      // Fetch payments this month
      const { data: thisMonthPayments } = await supabaseClient
        .from('payments')
        .select('amount')
        .eq('property_id', propertyId)
        .eq('status', 'completed')
        .gte('created_at', thisMonth.toISOString());

      // Fetch all payments for collection rate
      const { data: allPayments } = await supabaseClient
        .from('payments')
        .select('amount, status')
        .eq('property_id', propertyId)
        .gte('created_at', lastYear.toISOString());

      // Fetch total revenue
      const { data: totalRevenueData } = await supabaseClient
        .from('payments')
        .select('amount')
        .eq('property_id', propertyId)
        .eq('status', 'completed');

      const totalRevenue = totalRevenueData?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
      const monthlyRevenue = thisMonthPayments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
      const averageRent = property?.monthly_rent || 0;

      const expectedRevenue = (property?.units || 1) * averageRent;
      const actualRevenue = monthlyRevenue;
      const collectionRate =
        allPayments && allPayments.length > 0
          ? (allPayments.filter((p: any) => p.status === 'completed').length / allPayments.length) * 100
          : 0;

      return {
        totalRevenue,
        monthlyRevenue,
        averageRent,
        expectedRevenue,
        actualRevenue,
        variance: actualRevenue - expectedRevenue,
        collectionRate: Math.round(collectionRate),
      };
    } catch (error) {
      console.error('Error getting revenue metrics:', error);
      return {
        totalRevenue: 0,
        monthlyRevenue: 0,
        averageRent: 0,
        expectedRevenue: 0,
        actualRevenue: 0,
        variance: 0,
        collectionRate: 0,
      };
    }
  },

  // Get occupancy metrics for a property
  async getOccupancyMetrics(propertyId: string): Promise<OccupancyMetrics> {
    try {
      const { data: property } = await supabaseClient
        .from('properties')
        .select('units')
        .eq('id', propertyId)
        .single();

      const { data: bookings } = await supabaseClient
        .from('bookings')
        .select('id, status, check_in_date, check_out_date')
        .eq('property_id', propertyId)
        .eq('status', 'active');

      const totalUnits = property?.units || 1;
      const occupiedUnits = bookings?.length || 0;
      const vacantUnits = totalUnits - occupiedUnits;
      const occupancyRate = (occupiedUnits / totalUnits) * 100;

      const averageOccupancyDuration =
        bookings && bookings.length > 0
          ? bookings.reduce((sum: number, b: any) => {
              const checkIn = new Date(b.check_in_date);
              const checkOut = new Date(b.check_out_date);
              const duration = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
              return sum + duration;
            }, 0) / bookings.length
          : 0;

      return {
        totalUnits,
        occupiedUnits,
        vacantUnits,
        occupancyRate: Math.round(occupancyRate),
        averageOccupancyDuration: Math.round(averageOccupancyDuration),
        vacancyDuration: 0,
        turnoverRate: 0,
      };
    } catch (error) {
      console.error('Error getting occupancy metrics:', error);
      return {
        totalUnits: 0,
        occupiedUnits: 0,
        vacantUnits: 0,
        occupancyRate: 0,
        averageOccupancyDuration: 0,
        vacancyDuration: 0,
        turnoverRate: 0,
      };
    }
  },

  // Get tenant scores for a property
  async getTenantScores(propertyId: string, limit: number = 10): Promise<TenantScore[]> {
    try {
      const { data: tenants } = await supabaseClient
        .from('bookings')
        .select('user_id, users(id, full_name)')
        .eq('property_id', propertyId)
        .eq('status', 'active')
        .limit(limit);

      if (!tenants || tenants.length === 0) return [];

      const tenantScores = await Promise.all(
        tenants.map(async (booking: any) => {
          const paymentScore = await this.calculatePaymentScore(booking.user_id, propertyId);
          const behaviorScore = await this.calculateBehaviorScore(booking.user_id, propertyId);
          const riskScore = (100 - paymentScore + 100 - behaviorScore) / 2;

          return {
            tenantId: booking.user_id,
            tenantName: booking.users?.full_name || 'Unknown',
            property: propertyId,
            paymentScore,
            behaviorScore,
            riskScore: Math.min(100, Math.max(0, riskScore)),
            overallScore: (paymentScore + behaviorScore) / 2,
            riskLevel: (riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
            recommendations: this.getTenantRecommendations(paymentScore, behaviorScore),
          } as TenantScore;
        })
      );

      return tenantScores.sort((a, b) => b.overallScore - a.overallScore);
    } catch (error) {
      console.error('Error getting tenant scores:', error);
      return [];
    }
  },

  // Calculate payment score for a tenant
  async calculatePaymentScore(userId: string, propertyId: string): Promise<number> {
    try {
      const { data: payments } = await supabaseClient
        .from('payments')
        .select('status, due_date, paid_date')
        .eq('user_id', userId)
        .eq('property_id', propertyId);

      if (!payments || payments.length === 0) return 75; // Default score

      const onTimeCount = payments.filter((p: any) => {
        if (p.status !== 'completed') return false;
        const dueDate = new Date(p.due_date);
        const paidDate = new Date(p.paid_date);
        return paidDate <= dueDate;
      }).length;

      const score = (onTimeCount / payments.length) * 100;
      return Math.min(100, Math.max(0, score));
    } catch (error) {
      console.error('Error calculating payment score:', error);
      return 75;
    }
  },

  // Calculate behavior score for a tenant
  async calculateBehaviorScore(userId: string, propertyId: string): Promise<number> {
    try {
      const { data: complaints } = await supabaseClient
        .from('complaints')
        .select('severity')
        .eq('user_id', userId)
        .eq('property_id', propertyId);

      if (!complaints || complaints.length === 0) return 95;

      const severeCount = complaints.filter((c: any) => c.severity === 'high').length;
      const moderateCount = complaints.filter((c: any) => c.severity === 'medium').length;

      const penalty = severeCount * 20 + moderateCount * 10;
      const score = 95 - penalty;

      return Math.min(100, Math.max(0, score));
    } catch (error) {
      console.error('Error calculating behavior score:', error);
      return 95;
    }
  },

  // Get recommendations for tenant
  getTenantRecommendations(paymentScore: number, behaviorScore: number): string[] {
    const recommendations: string[] = [];

    if (paymentScore < 80) {
      recommendations.push('Monitor payment patterns closely');
    }
    if (paymentScore < 60) {
      recommendations.push('Consider payment plan or eviction');
    }
    if (behaviorScore < 80) {
      recommendations.push('Increase property inspections');
    }
    if (behaviorScore < 60) {
      recommendations.push('Document issues for legal protection');
    }
    if (paymentScore >= 95 && behaviorScore >= 95) {
      recommendations.push('Excellent tenant - consider renewal incentive');
    }

    return recommendations.length > 0 ? recommendations : ['No immediate actions needed'];
  },

  // Get payment analytics
  async getPaymentAnalytics(userId: string, propertyId?: string): Promise<{ data: PaymentAnalytics | null; error: any }> {
    try {
      let query = supabaseClient.from('payments').select('amount, status, created_at, due_date, paid_date');

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data: payments, error } = await query;
      if (error) throw error;

      if (!payments || payments.length === 0) {
        return {
          data: {
            totalPayments: 0,
            onTimePayments: 0,
            latePayments: 0,
            missedPayments: 0,
            collectionRate: 0,
            averageLateDays: 0,
            monthlyTrend: [],
          },
          error: null,
        };
      }

      const onTimePayments = payments.filter((p: any) => {
        if (p.status !== 'completed') return false;
        const dueDate = new Date(p.due_date);
        const paidDate = new Date(p.paid_date);
        return paidDate <= dueDate;
      }).length;

      const latePayments = payments.filter((p: any) => {
        if (p.status !== 'completed') return false;
        const dueDate = new Date(p.due_date);
        const paidDate = new Date(p.paid_date);
        return paidDate > dueDate;
      }).length;

      const missedPayments = payments.filter((p: any) => p.status === 'failed' || p.status === 'pending').length;

      const monthlyTrend = this.calculateMonthlyTrend(payments);

      return {
        data: {
          totalPayments: payments.length,
          onTimePayments,
          latePayments,
          missedPayments,
          collectionRate: ((onTimePayments + latePayments) / payments.length) * 100,
          averageLateDays: this.calculateAverageLateDays(payments),
          monthlyTrend,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Calculate average late payment days
  calculateAverageLateDays(payments: any[]): number {
    const latePayments = payments.filter((p: any) => {
      if (p.status !== 'completed') return false;
      const dueDate = new Date(p.due_date);
      const paidDate = new Date(p.paid_date);
      return paidDate > dueDate;
    });

    if (latePayments.length === 0) return 0;

    const totalLateDays = latePayments.reduce((sum: number, p: any) => {
      const dueDate = new Date(p.due_date);
      const paidDate = new Date(p.paid_date);
      const lateDays = Math.floor((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return sum + lateDays;
    }, 0);

    return Math.round(totalLateDays / latePayments.length);
  },

  // Calculate monthly trend
  calculateMonthlyTrend(
    payments: any[]
  ): Array<{ month: string; received: number; expected: number }> {
    const months: { [key: string]: { received: number; expected: number } } = {};

    payments.forEach((payment: any) => {
      const date = new Date(payment.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!months[monthKey]) {
        months[monthKey] = { received: 0, expected: 0 };
      }

      months[monthKey].expected += payment.amount || 0;
      if (payment.status === 'completed') {
        months[monthKey].received += payment.amount || 0;
      }
    });

    return Object.entries(months)
      .map(([month, data]) => ({
        month,
        ...data,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  },

  // Aggregate property metrics
  aggregatePropertyMetrics(properties: any[]): any {
    if (properties.length === 0) {
      return {
        totalUnits: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
        portfolioOccupancyRate: 0,
        properties: [],
      };
    }

    const totalUnits = properties.reduce((sum: number, p: any) => sum + (p.occupancy.totalUnits || 0), 0);
    const totalRevenue = properties.reduce((sum: number, p: any) => sum + (p.revenue.totalRevenue || 0), 0);
    const monthlyRevenue = properties.reduce((sum: number, p: any) => sum + (p.revenue.monthlyRevenue || 0), 0);
    const totalExpenses = properties.reduce((sum: number, p: any) => sum + (p.expenses || 0), 0);
    const netIncome = monthlyRevenue - totalExpenses;

    const totalOccupiedUnits = properties.reduce((sum: number, p: any) => sum + (p.occupancy.occupiedUnits || 0), 0);
    const portfolioOccupancyRate = totalUnits > 0 ? (totalOccupiedUnits / totalUnits) * 100 : 0;

    return {
      totalUnits,
      totalRevenue,
      monthlyRevenue,
      totalExpenses,
      netIncome,
      portfolioOccupancyRate: Math.round(portfolioOccupancyRate),
      properties,
    };
  },

  // Get top performing property
  getTopPerformingProperty(properties: any[]): string {
    if (properties.length === 0) return '';
    return properties.reduce((top: any, current: any) =>
      current.roi > top.roi ? current : top
    ).propertyId;
  },

  // Identify risk alerts
  identifyRiskAlerts(
    analytics: any
  ): Array<{ type: string; severity: string; message: string; propertyId?: string }> {
    const alerts: any[] = [];

    analytics.properties?.forEach((prop: any) => {
      if (prop.occupancy.occupancyRate < 50) {
        alerts.push({
          type: 'low_occupancy',
          severity: 'high',
          message: `Low occupancy (${prop.occupancy.occupancyRate}%) - Consider marketing or price reduction`,
          propertyId: prop.propertyId,
        });
      }

      if (prop.revenue.collectionRate < 80) {
        alerts.push({
          type: 'low_collection',
          severity: 'medium',
          message: `Low collection rate (${prop.revenue.collectionRate}%) - Chase outstanding payments`,
          propertyId: prop.propertyId,
        });
      }

      if (prop.roi < 0) {
        alerts.push({
          type: 'negative_roi',
          severity: 'high',
          message: 'Property showing negative ROI - Review expenses',
          propertyId: prop.propertyId,
        });
      }
    });

    return alerts;
  },

  // Generate full analytics report
  async generateAnalyticsReport(userId: string): Promise<{ data: any; error: any }> {
    try {
      const analytics = await this.getLandlordAnalytics(userId);
      if (analytics.error) throw analytics.error;

      return {
        data: {
          ...analytics.data,
          generatedAt: new Date().toISOString(),
          reportType: 'Full Analytics Report',
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error };
    }
  },
};

export default landlordAnalyticsService;
