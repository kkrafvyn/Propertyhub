/**
 * PropertyHub - Enhanced Fraud Detection Dashboard
 * 
 * Advanced fraud monitoring interface with real-time alerts,
 * pattern visualization, and comprehensive fraud analytics.
 * 
 * Features:
 * - Real-time fraud alerts and monitoring
 * - Advanced pattern visualization
 * - Risk scoring and trend analysis
 * - Automated rule management
 * - Investigation workflows
 * - Machine learning insights
 * - Geographic fraud mapping
 * - User behavior analysis
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { 
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  Eye,
  Search,
  Filter,
  Download,
  RefreshCw,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Users,
  Activity,
  Brain,
  Zap,
  Target,
  Globe,
  Monitor,
  Smartphone,
  CreditCard,
  Lock
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
  Cell,
  ScatterChart,
  Scatter
} from 'recharts';
import { format, subDays, subHours } from 'date-fns';
import { toast } from 'sonner';

// Services
import { 
  FraudDetectionEngine,
  FraudAlert,
  RiskProfile,
  PaymentTransaction,
  FraudDetectionConfig,
  FraudRuleType
} from '../../utils/fraudDetectionEngine';

interface FraudDashboardData {
  alerts: FraudAlert[];
  riskProfiles: RiskProfile[];
  riskTrends: Array<{
    timestamp: string;
    riskScore: number;
    alertCount: number;
    blockedTransactions: number;
  }>;
  threatDistribution: Array<{
    type: FraudRuleType;
    count: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    percentage: number;
  }>;
  geographicThreats: Array<{
    country: string;
    threatCount: number;
    riskLevel: number;
    coordinates: { lat: number; lng: number };
  }>;
  velocityMetrics: {
    transactionsPerMinute: number;
    averageRiskScore: number;
    blockRate: number;
    falsePositiveRate: number;
  };
  topRiskFactors: Array<{
    factor: string;
    frequency: number;
    impact: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
  userBehaviorPatterns: Array<{
    pattern: string;
    occurrences: number;
    riskLevel: 'low' | 'medium' | 'high';
    description: string;
  }>;
}

interface EnhancedFraudDetectionDashboardProps {
  className?: string;
}

export function EnhancedFraudDetectionDashboard({ 
  className = '' 
}: EnhancedFraudDetectionDashboardProps) {
  
  // State management
  const [loading, setLoading] = useState<boolean>(true);
  const [realTimeMode, setRealTimeMode] = useState<boolean>(true);
  const [dashboardData, setDashboardData] = useState<FraudDashboardData | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Initialize fraud detection engine
  const [fraudEngine] = useState(() => new FraudDetectionEngine({
    enabled: true,
    autoBlockEnabled: true,
    alertThresholds: {
      low: 30,
      medium: 50,
      high: 70,
      critical: 85
    },
    velocityLimits: {
      maxTransactionsPer5Minutes: 10,
      maxTransactionsPer1Hour: 50,
      maxTransactionsPer24Hours: 200,
      maxAmountPer1Hour: 5000000, // ₦50,000
      maxAmountPer24Hours: 20000000, // ₦200,000
      maxFailedAttemptsPer1Hour: 5
    },
    amountThresholds: {
      smallTransaction: 10000, // ₦100
      mediumTransaction: 100000, // ₦1,000
      largeTransaction: 1000000, // ₦10,000
      suspiciousAmount: 5000000 // ₦50,000
    },
    geoLocationRules: {
      blockedCountries: ['BLOCKED_COUNTRY_1', 'BLOCKED_COUNTRY_2'],
      suspiciousCountries: ['SUSPICIOUS_COUNTRY_1', 'SUSPICIOUS_COUNTRY_2'],
      maxDistanceKm: 1000,
      timeWindowMinutes: 60
    },
    behaviorRules: {
      newUserHighAmountThreshold: 500000, // ₦5,000
      rapidPaymentMethodChangeCount: 3,
      suspiciousUserAgentPatterns: ['bot', 'crawler', 'automated'],
      unusualTimePatterns: true
    }
  }));

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // In production, this would fetch real data from your backend
      const mockData: FraudDashboardData = {
        alerts: [
          {
            id: 'alert_001',
            transactionId: 'txn_12345',
            userId: 'user_67890',
            type: 'velocity_check',
            severity: 'high',
            score: 85,
            description: 'Multiple rapid transactions detected from same user',
            details: {
              transactionCount: 8,
              timeWindow: '5 minutes',
              amounts: [1000, 1500, 2000, 1800, 2200, 1900, 2100, 1700]
            },
            timestamp: new Date().toISOString(),
            status: 'active'
          },
          {
            id: 'alert_002',
            transactionId: 'txn_23456',
            userId: 'user_78901',
            type: 'geo_location',
            severity: 'critical',
            score: 95,
            description: 'Impossible travel detected between transactions',
            details: {
              distance: 5000,
              timeWindow: '30 minutes',
              locations: ['Lagos, Nigeria', 'London, UK']
            },
            timestamp: subHours(new Date(), 2).toISOString(),
            status: 'active'
          },
          {
            id: 'alert_003',
            transactionId: 'txn_34567',
            userId: 'user_89012',
            type: 'card_testing',
            severity: 'medium',
            score: 60,
            description: 'Card testing pattern detected',
            details: {
              attempts: 12,
              successRate: 0.25,
              amounts: [100, 200, 300, 500, 1000]
            },
            timestamp: subHours(new Date(), 4).toISOString(),
            status: 'resolved'
          }
        ],
        riskProfiles: [
          {
            userId: 'user_67890',
            email: 'suspicious@example.com',
            riskScore: 750,
            riskLevel: 'high',
            trustScore: 250,
            transactionHistory: {
              totalTransactions: 25,
              totalAmount: 2500000,
              successRate: 0.68,
              chargebackRate: 0.08,
              disputeRate: 0.04
            },
            behaviorFlags: ['velocity_check_high', 'amount_threshold_medium'],
            lastRiskAssessment: new Date().toISOString(),
            riskFactors: []
          }
        ],
        riskTrends: Array.from({ length: 24 }, (_, i) => ({
          timestamp: format(subHours(new Date(), 23 - i), 'HH:mm'),
          riskScore: 30 + Math.random() * 40,
          alertCount: Math.floor(Math.random() * 10),
          blockedTransactions: Math.floor(Math.random() * 5)
        })),
        threatDistribution: [
          { type: 'velocity_check', count: 45, severity: 'high', percentage: 32 },
          { type: 'geo_location', count: 28, severity: 'critical', percentage: 20 },
          { type: 'card_testing', count: 35, severity: 'medium', percentage: 25 },
          { type: 'behavioral_pattern', count: 22, severity: 'medium', percentage: 15 },
          { type: 'network_analysis', count: 12, severity: 'low', percentage: 8 }
        ],
        geographicThreats: [
          { country: 'Nigeria', threatCount: 45, riskLevel: 25, coordinates: { lat: 9.0820, lng: 8.6753 } },
          { country: 'Ghana', threatCount: 18, riskLevel: 15, coordinates: { lat: 7.9465, lng: -1.0232 } },
          { country: 'Kenya', threatCount: 12, riskLevel: 10, coordinates: { lat: -0.0236, lng: 37.9062 } },
          { country: 'South Africa', threatCount: 8, riskLevel: 8, coordinates: { lat: -30.5595, lng: 22.9375 } }
        ],
        velocityMetrics: {
          transactionsPerMinute: 45.2,
          averageRiskScore: 35.7,
          blockRate: 2.1,
          falsePositiveRate: 0.8
        },
        topRiskFactors: [
          { factor: 'High Velocity', frequency: 45, impact: 85, trend: 'increasing' },
          { factor: 'Geographic Anomaly', frequency: 28, impact: 92, trend: 'stable' },
          { factor: 'New User High Amount', frequency: 22, impact: 65, trend: 'decreasing' },
          { factor: 'Card Testing', frequency: 35, impact: 70, trend: 'increasing' },
          { factor: 'Suspicious IP', frequency: 18, impact: 55, trend: 'stable' }
        ],
        userBehaviorPatterns: [
          { pattern: 'Rapid Payment Method Changes', occurrences: 23, riskLevel: 'high', description: 'Users switching between multiple payment methods rapidly' },
          { pattern: 'Unusual Time Activity', occurrences: 18, riskLevel: 'medium', description: 'Transactions during unusual hours (2-5 AM)' },
          { pattern: 'Device Hopping', occurrences: 15, riskLevel: 'high', description: 'Same user accessing from multiple devices quickly' },
          { pattern: 'Proxy Usage', occurrences: 12, riskLevel: 'medium', description: 'Transactions through proxy or VPN services' }
        ]
      };

      setDashboardData(mockData);
      
    } catch (error) {
      console.error('❌ Failed to load fraud dashboard data:', error);
      toast.error('Failed to load fraud detection data');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  // Load data on mount and set up real-time updates
  useEffect(() => {
    loadDashboardData();
    
    if (realTimeMode) {
      const interval = setInterval(loadDashboardData, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [loadDashboardData, realTimeMode]);

  // Handle alert investigation
  const handleInvestigateAlert = (alert: FraudAlert) => {
    setSelectedAlert(alert);
    toast.info(`Investigating alert: ${alert.description}`);
  };

  // Handle alert resolution
  const handleResolveAlert = async (alertId: string, resolution: string) => {
    try {
      // In production, this would update the alert status in your backend
      toast.success(`Alert ${alertId} resolved: ${resolution}`);
      await loadDashboardData();
    } catch (error) {
      console.error('❌ Failed to resolve alert:', error);
      toast.error('Failed to resolve alert');
    }
  };

  // Get severity color
  const getSeverityColor = (severity: 'low' | 'medium' | 'high' | 'critical') => {
    switch (severity) {
      case 'low': return 'theme-success-badge';
      case 'medium': return 'theme-warning-badge';
      case 'high': return 'theme-info-badge';
      case 'critical': return 'theme-danger-badge';
      default: return 'theme-info-badge';
    }
  };

  // Get trend icon
  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-[color:var(--destructive)]" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-[color:var(--success)]" />;
      case 'stable': return <Activity className="h-4 w-4 text-[color:var(--warning)]" />;
    }
  };

  // Chart colors
  const chartColors = {
    primary: '#55624d',
    secondary: '#8a6b2d',
    success: '#5c7058',
    warning: '#b58d43',
    danger: '#8f4638',
    critical: '#6f4436'
  };

  // Filter alerts based on search and severity
  const filteredAlerts = dashboardData?.alerts.filter(alert => {
    const matchesSearch = alert.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         alert.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
    return matchesSearch && matchesSeverity;
  }) || [];

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Failed to load fraud detection data</p>
          <Button onClick={loadDashboardData} className="mt-4">
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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Fraud Detection Center
          </h1>
          <p className="text-muted-foreground">
            Advanced fraud monitoring and threat analysis
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="real-time">Real-time</Label>
            <Switch
              id="real-time"
              checked={realTimeMode}
              onCheckedChange={setRealTimeMode}
            />
          </div>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold text-[color:var(--destructive)]">
                  {dashboardData.alerts.filter(a => a.status === 'active').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-[color:var(--destructive)]" />
            </div>
            <div className="flex items-center text-sm text-muted-foreground mt-2">
              <span>Critical: {dashboardData.alerts.filter(a => a.severity === 'critical').length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Risk Score</p>
                <p className="text-2xl font-bold">
                  {dashboardData.velocityMetrics.averageRiskScore.toFixed(1)}
                </p>
              </div>
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="mt-2 flex items-center text-sm text-[color:var(--success)]">
              <TrendingDown className="w-4 h-4 mr-1" />
              <span>-2.3% from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Block Rate</p>
                <p className="text-2xl font-bold">
                  {dashboardData.velocityMetrics.blockRate.toFixed(1)}%
                </p>
              </div>
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="mt-2 flex items-center text-sm text-[color:var(--destructive)]">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>+0.5% from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">False Positive Rate</p>
                <p className="text-2xl font-bold">
                  {dashboardData.velocityMetrics.falsePositiveRate.toFixed(1)}%
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="mt-2 flex items-center text-sm text-[color:var(--success)]">
              <TrendingDown className="w-4 h-4 mr-1" />
              <span>-0.2% from yesterday</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
          <TabsTrigger value="patterns">Threat Patterns</TabsTrigger>
          <TabsTrigger value="geography">Geographic Analysis</TabsTrigger>
          <TabsTrigger value="rules">Detection Rules</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Score Trends</CardTitle>
                <CardDescription>Real-time risk scoring over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dashboardData.riskTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="riskScore" 
                      stroke={chartColors.danger} 
                      fill={chartColors.danger}
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Threat Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Threat Type Distribution</CardTitle>
                <CardDescription>Distribution of detected fraud patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dashboardData.threatDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name.replace('_', ' ')} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {dashboardData.threatDistribution.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={Object.values(chartColors)[index % Object.values(chartColors).length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Risk Factors */}
          <Card>
            <CardHeader>
              <CardTitle>Top Risk Factors</CardTitle>
              <CardDescription>Most frequent fraud indicators and their impact</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.topRiskFactors.map((factor, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{factor.factor}</span>
                        {getTrendIcon(factor.trend)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Frequency: {factor.frequency}</span>
                        <span>Impact: {factor.impact}%</span>
                      </div>
                    </div>
                    <Progress value={factor.impact} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          {/* Alert Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search alerts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Alerts Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alert ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-mono text-sm">
                        {alert.id}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {alert.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{alert.score}</span>
                          <Progress value={alert.score} className="w-16 h-2" />
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {alert.description}
                      </TableCell>
                      <TableCell>
                        {format(new Date(alert.timestamp), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          alert.status === 'active' ? 'destructive' :
                          alert.status === 'resolved' ? 'default' : 'secondary'
                        }>
                          {alert.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            onClick={() => handleInvestigateAlert(alert)}
                            variant="ghost"
                            size="sm"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {alert.status === 'active' && (
                            <Button
                              onClick={() => handleResolveAlert(alert.id, 'manual_review')}
                              variant="ghost"
                              size="sm"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Threat Patterns Tab */}
        <TabsContent value="patterns" className="space-y-6">
          {/* User Behavior Patterns */}
          <Card>
            <CardHeader>
              <CardTitle>User Behavior Patterns</CardTitle>
              <CardDescription>Detected behavioral anomalies and suspicious patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dashboardData.userBehaviorPatterns.map((pattern, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{pattern.pattern}</h4>
                        <Badge className={getSeverityColor(pattern.riskLevel)}>
                          {pattern.riskLevel.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {pattern.description}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span>Occurrences: {pattern.occurrences}</span>
                        <span>Risk Level: {pattern.riskLevel}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Threat Analysis Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Threat Pattern Analysis</CardTitle>
              <CardDescription>Frequency and severity of different threat types</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={dashboardData.threatDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill={chartColors.primary} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Geographic Analysis Tab */}
        <TabsContent value="geography" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Threat Distribution</CardTitle>
              <CardDescription>Fraud threats by geographic location</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.geographicThreats.map((threat, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{threat.country}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Threats: {threat.threatCount}</span>
                        <span>Risk Level: {threat.riskLevel}%</span>
                      </div>
                    </div>
                    <Progress value={threat.riskLevel} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detection Rules Tab */}
        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fraud Detection Rules</CardTitle>
              <CardDescription>Manage and configure fraud detection rules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-12">
                  <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Rule Management</h3>
                  <p className="text-muted-foreground mb-4">
                    Configure and tune fraud detection rules for optimal performance
                  </p>
                  <Button>
                    <Settings className="w-4 h-4 mr-2" />
                    Configure Rules
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alert Investigation Modal */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Alert Investigation: {selectedAlert?.id}</DialogTitle>
            <DialogDescription>
              Detailed analysis and investigation tools for this fraud alert
            </DialogDescription>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Alert Type</Label>
                  <p className="font-medium">{selectedAlert.type.replace('_', ' ').toUpperCase()}</p>
                </div>
                <div>
                  <Label>Risk Score</Label>
                  <p className="font-medium text-[color:var(--destructive)]">{selectedAlert.score}</p>
                </div>
                <div>
                  <Label>Severity</Label>
                  <Badge className={getSeverityColor(selectedAlert.severity)}>
                    {selectedAlert.severity.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge variant={selectedAlert.status === 'active' ? 'destructive' : 'default'}>
                    {selectedAlert.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label>Description</Label>
                <p className="text-sm">{selectedAlert.description}</p>
              </div>
              
              <div>
                <Label>Details</Label>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                  {JSON.stringify(selectedAlert.details, null, 2)}
                </pre>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setSelectedAlert(null)}>
                  Close
                </Button>
                <Button onClick={() => handleResolveAlert(selectedAlert.id, 'investigated')}>
                  Mark as Resolved
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
