/**
 * Landlord Dashboard Types
 * 
 * Analytics, metrics, and reporting for property owners
 */

export interface DashboardMetrics {
  id: string;
  user_id: string;
  metric_date: string;
  total_income: number;
  total_expenses: number;
  occupancy_rate: number; // 0-100
  total_properties: number;
  active_bookings: number;
  tenant_score: number; // 0-100
  maintenance_requests: number;
  created_at: string;
}

export interface IncomeBreakdown {
  period: string;
  rent_income: number;
  service_payments: number;
  deposit_interest: number;
  total: number;
}

export interface ExpenseBreakdown {
  period: string;
  maintenance: number;
  utilities: number;
  property_tax: number;
  insurance: number;
  commission: number;
  other: number;
  total: number;
}

export interface PropertyPerformance {
  property_id: string;
  property_name: string;
  occupancy_rate: number;
  monthly_income: number;
  current_tenants: number;
  maintenance_issues: number;
  average_rating: number;
  days_vacant: number;
}

export interface TenantProfile {
  tenant_id: string;
  name: string;
  email: string;
  phone?: string;
  property_id: string;
  check_in_date: string;
  check_out_date?: string;
  payment_status: 'current' | 'late' | 'overdue';
  tenant_score: number;
  payment_history_score: number;
  maintenance_score: number;
  communication_score: number;
  reviews?: Array<{
    rating: number;
    comment: string;
  }>;
}

export interface MaintenanceSummary {
  total_requests: number;
  open_requests: number;
  in_progress: number;
  average_resolution_time: number; // days
  categories: Record<string, number>;
}

export interface AnalyticsReport {
  id: string;
  user_id: string;
  report_type: 'income' | 'expense' | 'occupancy' | 'tenant' | 'maintenance';
  period_start: string;
  period_end: string;
  data: Record<string, any>;
  generated_at: string;
  filename?: string;
}

export interface YearlyPerformance {
  year: number;
  total_income: number;
  total_expenses: number;
  net_profit: number;
  average_occupancy_rate: number;
  property_count: number;
  tenant_count: number;
  return_on_investment: number;
}

export interface PaymentTrend {
  date: string;
  amount: number;
  count: number;
  average_per_tenant: number;
}

export interface OccupancyChart {
  date: string;
  occupancy_rate: number;
  occupied_units: number;
  vacant_units: number;
}

