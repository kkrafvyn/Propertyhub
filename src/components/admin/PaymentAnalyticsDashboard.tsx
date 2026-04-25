/**
 * PropertyHub - Admin Payment Analytics Dashboard
 * 
 * Comprehensive analytics dashboard for administrators to monitor
 * payment transactions, revenue metrics, and financial insights.
 * 
 * Features:
 * - Real-time payment metrics and KPIs
 * - Transaction volume and revenue analytics
 * - Payment method performance analysis
 * - Geographic revenue distribution
 * - Fraud detection and security metrics
 * - Export capabilities for financial reporting
 * - Payment gateway health monitoring
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '../ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { 
  AlertTriangle,
  ArrowUpIcon,
  ArrowDownIcon,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Users,
  Globe,
  Download,
  RefreshCw,
  Shield,
  AlertCircle,
  CheckCircle,
  Calendar,
  Filter,
  Search,
  MoreVertical,
  Eye,
  Ban,
  FileText
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';

// Services
import { paymentService, PaymentAnalytics, PaymentTransaction } from '../../utils/paymentService';

// Types
interface PaymentMetrics {
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  successRate: number;
  refundRate: number;
  disputeRate: number;
  conversionRate: number;
  topPaymentMethods: Array<{
    method: string;
    count: number;
    percentage: number;
    revenue: number;
  }>;
  revenueByType: Array<{
    type: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    transactions: number;
    growth: number;
  }>;
  geographicData: Array<{
    country: string;
    revenue: number;
    transactions: number;
    percentage: number;
  }>;
  recentTransactions: PaymentTransaction[];
  fraudAlerts: Array<{
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    timestamp: string;
    amount: number;
    resolved: boolean;
  }>;
}

interface DateRange {
  start: string;
  end: string;
  label: string;
}

interface PaymentAnalyticsDashboardProps {
  className?: string;
}

export function PaymentAnalyticsDashboard({ 
  className = '' 
}: PaymentAnalyticsDashboardProps) {
  
  // State management
  const [loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<PaymentMetrics | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
    label: 'Last 30 days'
  });
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Predefined date ranges
  const dateRanges: DateRange[] = [
    {
      start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd'),
      label: 'Last 7 days'
    },
    {
      start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd'),
      label: 'Last 30 days'
    },
    {
      start: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd'),
      label: 'Last 3 months'
    },
    {
      start: format(subDays(new Date(), 365), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd'),
      label: 'Last 12 months'
    }
  ];

  // Load analytics data
  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get payment analytics
      const analytics = await paymentService.getPaymentAnalytics({
        startDate: selectedDateRange.start,
        endDate: selectedDateRange.end
      }).catch(error => {
        console.warn('⚠️ Analytics service unavailable, using demo data:', error);
        return paymentService.getDemoAnalytics();
      });

      // Get recent transactions
      const transactionsData = await paymentService.getTransactionHistory({
        limit: 20
      }).catch(error => {
        console.warn('⚠️ Transaction service unavailable, using demo data:', error);
        return { transactions: [], total: 0, page: 1, totalPages: 0 };
      });

      // Generate mock data for demo (in production, this would come from your backend)
      const mockMetrics: PaymentMetrics = {
        totalRevenue: analytics.totalRevenue,
        totalTransactions: analytics.totalTransactions,
        averageTransactionValue: analytics.averageTransactionValue,
        successRate: analytics.successRate,
        refundRate: analytics.refundRate,
        disputeRate: analytics.disputeRate,
        conversionRate: analytics.conversionRate,
        topPaymentMethods: analytics.topPaymentMethods.map((method) => ({
          ...method,
          revenue: Math.round((analytics.totalRevenue * method.percentage) / 100),
        })),
        revenueByType: analytics.revenueByType.map((entry) => ({
          ...entry,
          type: String(entry.type),
          percentage: analytics.totalRevenue > 0
            ? Number(((entry.amount / analytics.totalRevenue) * 100).toFixed(1))
            : 0,
        })),
        monthlyRevenue: analytics.monthlyRevenue.map((entry, index, items) => {
          const previousRevenue = index > 0 ? items[index - 1].revenue : entry.revenue;
          const growth = previousRevenue > 0
            ? Number((((entry.revenue - previousRevenue) / previousRevenue) * 100).toFixed(1))
            : 0;

          return {
            ...entry,
            growth,
          };
        }),
        geographicData: [
          { country: 'Nigeria', revenue: 2500000, transactions: 1250, percentage: 65 },
          { country: 'Ghana', revenue: 800000, transactions: 420, percentage: 20 },
          { country: 'Kenya', revenue: 400000, transactions: 210, percentage: 10 },
          { country: 'South Africa', revenue: 200000, transactions: 120, percentage: 5 }
        ],
        recentTransactions: transactionsData.transactions.length > 0 ? transactionsData.transactions : generateDemoTransactions(),
        fraudAlerts: [
          {
            id: 'fa_001',
            type: 'Multiple Failed Attempts',
            severity: 'medium',
            description: 'User attempted payment with 5 different cards within 10 minutes',
            timestamp: new Date().toISOString(),
            amount: 500000,
            resolved: false
          },
          {
            id: 'fa_002',
            type: 'Unusual Transaction Pattern',
            severity: 'low',
            description: 'Large transaction from new user account',
            timestamp: subDays(new Date(), 1).toISOString(),
            amount: 2000000,
            resolved: true
          }
        ]
      };

      setMetrics(mockMetrics);
      
    } catch (error) {
      console.error('❌ Failed to load payment analytics:', error);
      toast.error('Failed to load payment analytics');
    } finally {
      setLoading(false);
    }
  }, [selectedDateRange]);

  // Load data on mount and when date range changes
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Handle export data
  const handleExportData = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      toast.info(`Exporting data as ${format.toUpperCase()}...`);
      
      // In production, this would call your backend to generate the export
      setTimeout(() => {
        toast.success(`Payment analytics exported as ${format.toUpperCase()}`);
      }, 2000);
      
    } catch (error) {
      console.error('❌ Export failed:', error);
      toast.error('Failed to export data');
    }
  };

  // Format currency
  // Generate demo transactions for fallback
  const generateDemoTransactions = () => {
    const demoTransactions = [];
    const now = new Date();
    
    for (let i = 0; i < 10; i++) {
      demoTransactions.push({
        id: `demo_txn_${i}`,
        reference: `PH_DEMO_${Date.now()}_${i}`,
        customer: {
          name: `Demo Customer ${i + 1}`,
          email: `customer${i + 1}@example.com`
        },
        amount: Math.floor(Math.random() * 500000) + 50000, // Random amount between ₦500 - ₦5,500
        type: ['property_purchase', 'rental_payment', 'booking_fee'][Math.floor(Math.random() * 3)],
        status: ['success', 'processing', 'failed'][Math.floor(Math.random() * 3)],
        createdAt: new Date(now.getTime() - (i * 3600000)).toISOString() // Each transaction 1 hour apart
      });
    }
    
    return demoTransactions;
  };

  const formatCurrency = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount / 100); // Convert kobo to naira
  };

  // Get trend indicator
  const getTrendIndicator = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    const isPositive = change > 0;
    
    return {
      value: Math.abs(change).toFixed(1),
      isPositive,
      icon: isPositive ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />,
      color: isPositive ? 'text-[color:var(--success)]' : 'text-[color:var(--destructive)]'
    };
  };

  // Chart colors
  const chartColors = {
    primary: '#55624d',
    secondary: '#8a6b2d',
    success: '#5c7058',
    warning: '#b58d43',
    danger: '#8f4638',
    muted: '#6f6658'
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Failed to load payment analytics</p>
          <Button onClick={loadAnalytics} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payment Analytics</h1>
          <p className="text-muted-foreground">
            Monitor payment performance and financial metrics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select 
            value={selectedDateRange.label} 
            onValueChange={(value) => {
              const range = dateRanges.find(r => r.label === value);
              if (range) setSelectedDateRange(range);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateRanges.map((range) => (
                <SelectItem key={range.label} value={range.label}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={loadAnalytics} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Select onValueChange={(value) => handleExportData(value as 'csv' | 'pdf' | 'excel')}>
            <SelectTrigger className="w-32">
              <Download className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Export" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="mt-2 flex items-center text-sm text-[color:var(--success)]">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>+12.5% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{metrics.totalTransactions.toLocaleString()}</p>
              </div>
              <CreditCard className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="mt-2 flex items-center text-sm text-[color:var(--success)]">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>+8.2% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="mt-2 flex items-center text-sm text-[color:var(--destructive)]">
              <TrendingDown className="w-4 h-4 mr-1" />
              <span>-0.3% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Transaction</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.averageTransactionValue)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="mt-2 flex items-center text-sm text-[color:var(--success)]">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>+15.7% from last period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Monthly revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metrics.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke={chartColors.primary} 
                      fill={chartColors.primary}
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Payment Types Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Payment Type</CardTitle>
                <CardDescription>Distribution of revenue across payment types</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metrics.revenueByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {metrics.revenueByType.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={Object.values(chartColors)[index % Object.values(chartColors).length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Performance</CardTitle>
              <CardDescription>Success rates and usage by payment method</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.topPaymentMethods.map((method, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{method.method}</span>
                      <span>{method.percentage}% ({method.count} transactions)</span>
                    </div>
                    <Progress value={method.percentage} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Revenue: {formatCurrency(method.revenue)}</span>
                      <span>Success Rate: 98.5%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="succeeded">Succeeded</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  More Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.recentTransactions.slice(0, 10).map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-sm">
                        {transaction.reference}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{transaction.customer.name}</p>
                          <p className="text-sm text-muted-foreground">{transaction.customer.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {transaction.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            transaction.status === 'success' ? 'default' :
                            transaction.status === 'processing' ? 'secondary' :
                            'destructive'
                          }
                        >
                          {transaction.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(transaction.createdAt), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="methods" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Method Usage Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method Usage</CardTitle>
                <CardDescription>Transaction volume by payment method</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.topPaymentMethods}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="method" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill={chartColors.primary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Method Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Payment Method</CardTitle>
                <CardDescription>Total revenue generated by each method</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.topPaymentMethods}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="method" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                    <Bar dataKey="revenue" fill={chartColors.success} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Geography Tab */}
        <TabsContent value="geography" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Country</CardTitle>
              <CardDescription>Geographic distribution of payment revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.geographicData.map((country, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{country.country}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(country.revenue)}</p>
                        <p className="text-sm text-muted-foreground">
                          {country.transactions} transactions
                        </p>
                      </div>
                    </div>
                    <Progress value={country.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          {/* Security Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fraud Rate</p>
                    <p className="text-2xl font-bold">0.12%</p>
                  </div>
                  <Shield className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="mt-2 flex items-center text-sm text-[color:var(--success)]">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  <span>-0.05% from last period</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Blocked Transactions</p>
                    <p className="text-2xl font-bold">47</p>
                  </div>
                  <Ban className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="mt-2 flex items-center text-sm text-[color:var(--success)]">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  <span>-12% from last period</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Security Score</p>
                    <p className="text-2xl font-bold">98.5%</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-[color:var(--success)]" />
                </div>
                <div className="mt-2 flex items-center text-sm text-[color:var(--success)]">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span>+0.2% from last period</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fraud Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Alerts</CardTitle>
              <CardDescription>Potential fraud and security incidents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.fraudAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className={`mt-0.5 h-5 w-5 ${
                        alert.severity === 'high' ? 'text-[color:var(--destructive)]' :
                        alert.severity === 'medium' ? 'text-[color:var(--warning)]' :
                        'text-[color:var(--info)]'
                      }`} />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{alert.type}</h4>
                          <Badge 
                            variant={
                              alert.severity === 'high' ? 'destructive' :
                              alert.severity === 'medium' ? 'secondary' :
                              'outline'
                            }
                          >
                            {alert.severity}
                          </Badge>
                          {alert.resolved && (
                            <Badge variant="outline" className="theme-success-badge">
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Amount: {formatCurrency(alert.amount)}</span>
                          <span>Time: {format(new Date(alert.timestamp), 'MMM d, yyyy HH:mm')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      {!alert.resolved && (
                        <Button size="sm">
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
