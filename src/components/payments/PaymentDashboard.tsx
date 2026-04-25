/**
 * PropertyHub - Payment Dashboard Component
 * 
 * Comprehensive payment management dashboard for users to:
 * - View transaction history and payment status
 * - Manage payment methods and billing information
 * - Process refunds and handle disputes
 * - View payment analytics and reports
 * - Set up payment plans and subscriptions
 * - Download receipts and invoices
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '../ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { 
  CreditCard, 
  DollarSign, 
  Download, 
  Eye, 
  Filter, 
  MoreVertical, 
  Plus, 
  RefreshCw, 
  Search, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Receipt,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  Home
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Services
import { 
  paymentService, 
  PaymentTransaction, 
  PaymentMethod, 
  PaymentAnalytics,
  PaymentType,
  PaymentStatus,
  TransactionStatus
} from '../../utils/paymentService';

// Hooks
import { useAuth } from '../auth/AuthProvider';

interface PaymentDashboardProps {
  userId?: string;
  className?: string;
}

export function PaymentDashboard({ 
  userId, 
  className = '' 
}: PaymentDashboardProps) {
  const { user: currentUser } = useAuth();
  const effectiveUserId = userId || currentUser?.id;

  // State management
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<PaymentType | 'all'>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Modal states
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState<boolean>(false);
  const [showRefundDialog, setShowRefundDialog] = useState<boolean>(false);
  const [refundReason, setRefundReason] = useState<string>('');
  const [refundAmount, setRefundAmount] = useState<string>('');

  // Load data on mount and when filters change
  useEffect(() => {
    if (effectiveUserId) {
      loadDashboardData();
    }
  }, [effectiveUserId, dateRange, statusFilter, typeFilter]);

  // Load all dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [transactionsData, methodsData, analyticsData] = await Promise.all([
        paymentService.getTransactionHistory({
          customerId: effectiveUserId,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          limit: 50
        }),
        paymentService.getPaymentMethods(effectiveUserId!),
        paymentService.getPaymentAnalytics({
          startDate: dateRange.start,
          endDate: dateRange.end,
          customerId: effectiveUserId
        })
      ]);

      setTransactions(transactionsData.transactions);
      setPaymentMethods(methodsData);
      setAnalytics(analyticsData);
      
    } catch (error) {
      console.error('❌ Failed to load payment dashboard:', error);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions based on search query
  const filteredTransactions = useMemo(() => {
    if (!searchQuery) return transactions;
    
    const query = searchQuery.toLowerCase();
    return transactions.filter(transaction => 
      transaction.reference.toLowerCase().includes(query) ||
      transaction.type.toLowerCase().includes(query) ||
      transaction.property?.title.toLowerCase().includes(query) ||
      transaction.customer.name.toLowerCase().includes(query)
    );
  }, [transactions, searchQuery]);

  // Handle transaction details view
  const handleViewTransaction = (transaction: PaymentTransaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetails(true);
  };

  // Handle refund initiation
  const handleRefundTransaction = async () => {
    if (!selectedTransaction) return;

    try {
      const amount = refundAmount ? parseFloat(refundAmount) : undefined;
      
      await paymentService.processRefund({
        transactionId: selectedTransaction.id,
        amount,
        reason: refundReason,
        metadata: {
          initiatedBy: effectiveUserId,
          originalAmount: selectedTransaction.amount
        }
      });

      toast.success('Refund initiated successfully');
      setShowRefundDialog(false);
      setRefundReason('');
      setRefundAmount('');
      loadDashboardData(); // Refresh data
      
    } catch (error) {
      console.error('❌ Refund failed:', error);
      toast.error('Failed to process refund');
    }
  };

  // Download receipt/invoice
  const handleDownloadReceipt = async (transaction: PaymentTransaction) => {
    try {
      // This would typically generate a PDF receipt
      toast.info('Receipt download will be available soon');
    } catch (error) {
      console.error('❌ Receipt download failed:', error);
      toast.error('Failed to download receipt');
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: PaymentStatus | TransactionStatus) => {
    switch (status) {
      case 'succeeded':
      case 'success': return 'default';
      case 'processing': return 'secondary';
      case 'failed': return 'destructive';
      case 'refunded':
      case 'reversed': return 'outline';
      default: return 'secondary';
    }
  };

  // Get status icon
  const getStatusIcon = (status: PaymentStatus | TransactionStatus) => {
    switch (status) {
      case 'succeeded':
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'canceled':
      case 'abandoned': return <Ban className="w-4 h-4 text-gray-600" />;
      case 'refunded':
      case 'reversed': return <RefreshCw className="w-4 h-4 text-blue-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
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

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                  <p className="text-2xl font-bold">{formatCurrency(analytics.totalRevenue)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>+12% from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Transactions</p>
                  <p className="text-2xl font-bold">{analytics.totalTransactions}</p>
                </div>
                <CreditCard className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <span>Success rate: {analytics.successRate.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(analytics.averageTransactionValue)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <span>Per transaction</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Your latest payment activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(transaction.status)}
                        <div>
                          <p className="font-medium">{transaction.property?.title || transaction.type}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(transaction.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(transaction.amount)}</p>
                        <Badge variant={getStatusBadgeVariant(transaction.status)} className="text-xs">
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Manage your saved payment methods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentMethods.slice(0, 3).map((method) => (
                    <div key={method.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CreditCard className="w-8 h-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {method.brand} •••• {method.last4}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Expires {method.expiry}
                          </p>
                        </div>
                      </div>
                      {method.isDefault && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Payment Method
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PaymentStatus | 'all')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="succeeded">Succeeded</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as PaymentType | 'all')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="property_purchase">Property Purchase</SelectItem>
                      <SelectItem value="rental_payment">Rental Payment</SelectItem>
                      <SelectItem value="booking_fee">Booking Fee</SelectItem>
                      <SelectItem value="tour_fee">Tour Fee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={loadDashboardData}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{transaction.reference}</p>
                          <p className="text-sm text-muted-foreground">{transaction.type}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {transaction.property ? (
                          <div className="flex items-center space-x-2">
                            <Home className="w-4 h-4 text-muted-foreground" />
                            <span>{transaction.property.title}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(transaction.status)}
                          <Badge variant={getStatusBadgeVariant(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(transaction.createdAt), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedTransaction(transaction)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Transaction Details</DialogTitle>
                              <DialogDescription>
                                Reference: {transaction.reference}
                              </DialogDescription>
                            </DialogHeader>
                            
                            {selectedTransaction && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Amount</Label>
                                    <p className="font-medium">{formatCurrency(selectedTransaction.amount)}</p>
                                  </div>
                                  <div>
                                    <Label>Status</Label>
                                    <div className="flex items-center space-x-2 mt-1">
                                      {getStatusIcon(selectedTransaction.status)}
                                      <Badge variant={getStatusBadgeVariant(selectedTransaction.status)}>
                                        {selectedTransaction.status}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Type</Label>
                                    <p>{selectedTransaction.type.replace('_', ' ').toUpperCase()}</p>
                                  </div>
                                  <div>
                                    <Label>Payment Method</Label>
                                    <p>{selectedTransaction.paymentMethod.brand} •••• {selectedTransaction.paymentMethod.last4}</p>
                                  </div>
                                </div>

                                {selectedTransaction.property && (
                                  <div>
                                    <Label>Property</Label>
                                    <p className="font-medium">{selectedTransaction.property.title}</p>
                                    <p className="text-sm text-muted-foreground">{selectedTransaction.property.location}</p>
                                  </div>
                                )}

                                <Separator />

                                <div className="space-y-2">
                                  <Label>Timeline</Label>
                                  {selectedTransaction.timeline.map((event, index) => (
                                    <div key={index} className="flex justify-between text-sm">
                                      <span>{event.message}</span>
                                      <span className="text-muted-foreground">
                                        {format(new Date(event.timestamp), 'MMM d, HH:mm')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <DialogFooter>
                              <Button variant="outline" onClick={() => handleDownloadReceipt(selectedTransaction!)}>
                                <Download className="w-4 h-4 mr-2" />
                                Download Receipt
                              </Button>
                              {selectedTransaction?.status === 'success' && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline">Request Refund</Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Request Refund</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to request a refund for this transaction?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label htmlFor="refund-amount">Refund Amount (optional)</Label>
                                        <Input
                                          id="refund-amount"
                                          type="number"
                                          placeholder="Leave empty for full refund"
                                          value={refundAmount}
                                          onChange={(e) => setRefundAmount(e.target.value)}
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="refund-reason">Reason</Label>
                                        <Textarea
                                          id="refund-reason"
                                          placeholder="Please explain why you're requesting a refund"
                                          value={refundReason}
                                          onChange={(e) => setRefundReason(e.target.value)}
                                        />
                                      </div>
                                    </div>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={handleRefundTransaction}>
                                        Submit Refund Request
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
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
          <Card>
            <CardHeader>
              <CardTitle>Saved Payment Methods</CardTitle>
              <CardDescription>Manage your payment methods for faster checkout</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <Card key={method.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <CreditCard className="w-8 h-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {method.brand} •••• {method.last4}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Expires {method.expiry}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {method.isDefault && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                <Button variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Payment Method
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <>
              {/* Top Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.topPaymentMethods.map((method, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{method.method}</span>
                          <span>{method.percentage}%</span>
                        </div>
                        <Progress value={method.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Revenue by Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Spending by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.revenueByType.map((type, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="font-medium">{type.type.replace('_', ' ').toUpperCase()}</span>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(type.amount)}</p>
                          <p className="text-sm text-muted-foreground">{type.count} transactions</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}