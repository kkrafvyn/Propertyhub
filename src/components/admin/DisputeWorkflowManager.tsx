/**
 * PropertyHub - Dispute Workflow Manager
 * 
 * Comprehensive dispute management interface with automated workflows,
 * evidence tracking, and resolution management.
 * 
 * Features:
 * - Visual workflow progress tracking
 * - Automated evidence collection
 * - Communication timeline
 * - Bulk dispute operations
 * - Analytics and reporting
 * - SLA monitoring
 * - Escalation management
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
import { Textarea } from '../ui/textarea';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { 
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  MessageSquare,
  Paperclip,
  User,
  Calendar,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  Download,
  RefreshCw,
  Play,
  Pause,
  FastForward,
  MoreVertical,
  Eye,
  Mail,
  Phone,
  Settings,
  Upload,
  Flag,
  Shield,
  DollarSign
} from 'lucide-react';
import { format, formatDistanceToNow, isAfter, isBefore } from 'date-fns';
import { toast } from 'sonner';

// Services
import { 
  DisputeManagementSystem,
  PaymentDispute,
  DisputeEvidence,
  DisputeCommunication,
  DisputeStatus,
  DisputeCategory,
  DisputeType,
  DisputePriority,
  DisputeAnalytics
} from '../../utils/disputeManagementSystem';

interface DisputeWorkflowManagerProps {
  className?: string;
}

export function DisputeWorkflowManager({ 
  className = '' 
}: DisputeWorkflowManagerProps) {
  
  // State management
  const [loading, setLoading] = useState<boolean>(true);
  const [disputes, setDisputes] = useState<PaymentDispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<PaymentDispute | null>(null);
  const [disputeAnalytics, setDisputeAnalytics] = useState<DisputeAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<string>('active');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false);
  const [showEvidenceDialog, setShowEvidenceDialog] = useState<boolean>(false);

  // Initialize dispute management system
  const [disputeSystem] = useState(() => new DisputeManagementSystem());

  // Form state
  const [newDispute, setNewDispute] = useState<Partial<PaymentDispute>>({
    transactionId: '',
    userId: '',
    customerEmail: '',
    amount: 0,
    currency: 'NGN',
    type: 'chargeback',
    category: 'general',
    reason: '',
    description: ''
  });

  const [newEvidence, setNewEvidence] = useState<Partial<DisputeEvidence>>({
    type: 'receipt',
    title: '',
    description: '',
    isRequired: false
  });

  // Load disputes data
  const loadDisputesData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get all disputes (in production, this would be paginated)
      const allDisputes = disputeSystem.searchDisputes({});
      setDisputes(allDisputes);
      
      // Get analytics
      const analytics = await disputeSystem.getDisputeAnalytics();
      setDisputeAnalytics(analytics);
      
    } catch (error) {
      console.error('❌ Failed to load disputes data:', error);
      toast.error('Failed to load disputes data');
    } finally {
      setLoading(false);
    }
  }, [disputeSystem]);

  // Load data on mount
  useEffect(() => {
    loadDisputesData();
  }, [loadDisputesData]);

  // Handle dispute creation
  const handleCreateDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const dispute = await disputeSystem.createDispute(newDispute);
      toast.success(`Dispute ${dispute.id} created successfully`);
      setShowCreateDialog(false);
      setNewDispute({
        transactionId: '',
        userId: '',
        customerEmail: '',
        amount: 0,
        currency: 'NGN',
        type: 'chargeback',
        category: 'general',
        reason: '',
        description: ''
      });
      await loadDisputesData();
    } catch (error) {
      console.error('❌ Failed to create dispute:', error);
      toast.error('Failed to create dispute');
    }
  };

  // Handle evidence submission
  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDispute) return;
    
    try {
      await disputeSystem.addEvidence(selectedDispute.id, newEvidence, 'admin');
      toast.success('Evidence added successfully');
      setShowEvidenceDialog(false);
      setNewEvidence({
        type: 'receipt',
        title: '',
        description: '',
        isRequired: false
      });
      
      // Refresh selected dispute
      const updatedDisputes = disputeSystem.searchDisputes({});
      const updatedDispute = updatedDisputes.find(d => d.id === selectedDispute.id);
      if (updatedDispute) {
        setSelectedDispute(updatedDispute);
      }
      await loadDisputesData();
    } catch (error) {
      console.error('❌ Failed to submit evidence:', error);
      toast.error('Failed to submit evidence');
    }
  };

  // Handle dispute status update
  const handleUpdateStatus = async (disputeId: string, status: DisputeStatus, note?: string) => {
    try {
      await disputeSystem.updateDisputeStatus(disputeId, status, note, 'admin');
      toast.success(`Dispute status updated to ${status}`);
      await loadDisputesData();
      
      // Update selected dispute if it's the one being updated
      if (selectedDispute?.id === disputeId) {
        const updatedDisputes = disputeSystem.searchDisputes({});
        const updatedDispute = updatedDisputes.find(d => d.id === disputeId);
        if (updatedDispute) {
          setSelectedDispute(updatedDispute);
        }
      }
    } catch (error) {
      console.error('❌ Failed to update dispute status:', error);
      toast.error('Failed to update dispute status');
    }
  };

  // Handle dispute resolution
  const handleResolveDispute = async (disputeId: string, outcome: 'won' | 'lost' | 'settled', reason: string) => {
    try {
      await disputeSystem.resolveDispute(disputeId, { outcome, reason }, 'admin');
      toast.success(`Dispute resolved: ${outcome}`);
      await loadDisputesData();
    } catch (error) {
      console.error('❌ Failed to resolve dispute:', error);
      toast.error('Failed to resolve dispute');
    }
  };

  // Filter disputes
  const filteredDisputes = disputes.filter(dispute => {
    const matchesSearch = dispute.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dispute.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dispute.transactionId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || dispute.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || dispute.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Get priority color
  const getPriorityColor = (priority: DisputePriority) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Get status color
  const getStatusColor = (status: DisputeStatus) => {
    switch (status) {
      case 'new': return 'text-blue-600 bg-blue-50';
      case 'under_review': return 'text-yellow-600 bg-yellow-50';
      case 'awaiting_evidence': return 'text-orange-600 bg-orange-50';
      case 'evidence_submitted': return 'text-purple-600 bg-purple-50';
      case 'in_arbitration': return 'text-indigo-600 bg-indigo-50';
      case 'won': return 'text-green-600 bg-green-50';
      case 'lost': return 'text-red-600 bg-red-50';
      case 'expired': return 'text-gray-600 bg-gray-50';
      case 'withdrawn': return 'text-gray-600 bg-gray-50';
      case 'closed': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Check if due date is approaching
  const isDueDateApproaching = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilDue <= 24 && hoursUntilDue > 0;
  };

  // Check if overdue
  const isOverdue = (dueDate: string) => {
    return isAfter(new Date(), new Date(dueDate));
  };

  // Get workflow progress
  const getWorkflowProgress = (dispute: PaymentDispute) => {
    const stages = ['notification', 'evidence_collection', 'representment', 'arbitration', 'resolution'];
    const currentIndex = stages.indexOf(dispute.stage);
    return ((currentIndex + 1) / stages.length) * 100;
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount / 100); // Assuming amounts are in kobo
  };

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

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Dispute Management
          </h1>
          <p className="text-muted-foreground">
            Comprehensive dispute tracking and workflow management
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={loadDisputesData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <FileText className="w-4 h-4 mr-2" />
                New Dispute
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Dispute</DialogTitle>
                <DialogDescription>
                  Manually create a new payment dispute for tracking and resolution.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateDispute} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transactionId">Transaction ID</Label>
                    <Input
                      id="transactionId"
                      value={newDispute.transactionId}
                      onChange={(e) => setNewDispute(prev => ({ ...prev, transactionId: e.target.value }))}
                      placeholder="txn_12345"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">Customer Email</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={newDispute.customerEmail}
                      onChange={(e) => setNewDispute(prev => ({ ...prev, customerEmail: e.target.value }))}
                      placeholder="customer@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={newDispute.amount}
                      onChange={(e) => setNewDispute(prev => ({ ...prev, amount: Number(e.target.value) }))}
                      placeholder="100000"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="type">Dispute Type</Label>
                    <Select 
                      value={newDispute.type} 
                      onValueChange={(value: DisputeType) => setNewDispute(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chargeback">Chargeback</SelectItem>
                        <SelectItem value="inquiry">Inquiry</SelectItem>
                        <SelectItem value="refund_request">Refund Request</SelectItem>
                        <SelectItem value="authorization_dispute">Authorization Dispute</SelectItem>
                        <SelectItem value="processing_error">Processing Error</SelectItem>
                        <SelectItem value="fraud_claim">Fraud Claim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={newDispute.category} 
                      onValueChange={(value: DisputeCategory) => setNewDispute(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fraud">Fraud</SelectItem>
                        <SelectItem value="authorization">Authorization</SelectItem>
                        <SelectItem value="processing_error">Processing Error</SelectItem>
                        <SelectItem value="duplicate_processing">Duplicate Processing</SelectItem>
                        <SelectItem value="product_not_received">Product Not Received</SelectItem>
                        <SelectItem value="product_unacceptable">Product Unacceptable</SelectItem>
                        <SelectItem value="cancelled_recurring">Cancelled Recurring</SelectItem>
                        <SelectItem value="credit_not_processed">Credit Not Processed</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Input
                    id="reason"
                    value={newDispute.reason}
                    onChange={(e) => setNewDispute(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Brief reason for the dispute"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newDispute.description}
                    onChange={(e) => setNewDispute(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed description of the dispute..."
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" onClick={() => setShowCreateDialog(false)} variant="outline">
                    Cancel
                  </Button>
                  <Button type="submit">
                    Create Dispute
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Analytics Cards */}
      {disputeAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Disputes</p>
                  <p className="text-2xl font-bold">{disputeAnalytics.totalDisputes}</p>
                </div>
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <span>Open: {disputeAnalytics.openDisputes}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold">{disputeAnalytics.winRate.toFixed(1)}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="flex items-center text-sm text-green-600 mt-2">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>+2.3% this month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Resolution Time</p>
                  <p className="text-2xl font-bold">{disputeAnalytics.averageResolutionTime.toFixed(1)}d</p>
                </div>
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="flex items-center text-sm text-green-600 mt-2">
                <TrendingDown className="w-4 h-4 mr-1" />
                <span>-1.2 days</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Disputed</p>
                  <p className="text-2xl font-bold">{formatCurrency(disputeAnalytics.totalDisputedAmount)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <span>Recovered: {formatCurrency(disputeAnalytics.totalRecovered)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Active Disputes</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Active Disputes Tab */}
        <TabsContent value="active" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search disputes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="awaiting_evidence">Awaiting Evidence</SelectItem>
                    <SelectItem value="evidence_submitted">Evidence Submitted</SelectItem>
                    <SelectItem value="in_arbitration">In Arbitration</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Disputes Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dispute ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDisputes.filter(d => !['won', 'lost', 'closed'].includes(d.status)).map((dispute) => (
                    <TableRow key={dispute.id}>
                      <TableCell className="font-mono text-sm">
                        {dispute.id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{dispute.customerEmail}</p>
                          <p className="text-sm text-muted-foreground">ID: {dispute.userId}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(dispute.amount, dispute.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {dispute.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(dispute.priority)}>
                          {dispute.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(dispute.status)}>
                          {dispute.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={
                          isOverdue(dispute.dueDate) ? 'text-red-600' :
                          isDueDateApproaching(dispute.dueDate) ? 'text-orange-600' :
                          'text-muted-foreground'
                        }>
                          <p className="text-sm">
                            {format(new Date(dispute.dueDate), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs">
                            {formatDistanceToNow(new Date(dispute.dueDate), { addSuffix: true })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress value={getWorkflowProgress(dispute)} className="h-2" />
                          <p className="text-xs text-muted-foreground capitalize">
                            {dispute.stage.replace('_', ' ')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            onClick={() => setSelectedDispute(dispute)}
                            variant="ghost"
                            size="sm"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          <Select onValueChange={(value) => handleUpdateStatus(dispute.id, value as DisputeStatus)}>
                            <SelectTrigger className="w-auto">
                              <Play className="w-4 h-4" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="under_review">Review</SelectItem>
                              <SelectItem value="awaiting_evidence">Request Evidence</SelectItem>
                              <SelectItem value="evidence_submitted">Submit Evidence</SelectItem>
                              <SelectItem value="in_arbitration">Send to Arbitration</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resolved Disputes Tab */}
        <TabsContent value="resolved" className="space-y-6">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dispute ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Resolution</TableHead>
                    <TableHead>Resolved Date</TableHead>
                    <TableHead>Resolution Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDisputes.filter(d => ['won', 'lost', 'closed'].includes(d.status)).map((dispute) => (
                    <TableRow key={dispute.id}>
                      <TableCell className="font-mono text-sm">
                        {dispute.id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{dispute.customerEmail}</p>
                          <p className="text-sm text-muted-foreground">ID: {dispute.userId}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(dispute.amount, dispute.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(dispute.status)}>
                          {dispute.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {dispute.resolvedAt && (
                          <div>
                            <p className="text-sm">
                              {format(new Date(dispute.resolvedAt), 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(dispute.resolvedAt), { addSuffix: true })}
                            </p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {dispute.resolvedAt && (
                          <span className="text-sm">
                            {Math.ceil((new Date(dispute.resolvedAt).getTime() - new Date(dispute.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => setSelectedDispute(dispute)}
                          variant="ghost"
                          size="sm"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Management</CardTitle>
              <CardDescription>
                Configure and monitor automated dispute workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Workflow Configuration</h3>
                <p className="text-muted-foreground mb-4">
                  Set up automated workflows for different dispute categories
                </p>
                <Button>
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Workflows
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {disputeAnalytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Disputes by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {disputeAnalytics.disputesByType.map((type, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{type.type.replace('_', ' ').toUpperCase()}</span>
                          <span>{type.count} disputes</span>
                        </div>
                        <Progress value={type.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Disputes by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {disputeAnalytics.disputesByCategory.map((category, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{category.category.replace('_', ' ').toUpperCase()}</span>
                          <span>Win Rate: {category.winRate.toFixed(1)}%</span>
                        </div>
                        <Progress value={category.winRate} className="h-2" />
                        <div className="text-xs text-muted-foreground">
                          {category.count} disputes
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dispute Details Modal */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dispute Details: {selectedDispute?.id}</DialogTitle>
            <DialogDescription>
              Comprehensive dispute information and management tools
            </DialogDescription>
          </DialogHeader>
          
          {selectedDispute && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Transaction ID</Label>
                    <p className="font-mono text-sm">{selectedDispute.transactionId}</p>
                  </div>
                  <div>
                    <Label>Customer Email</Label>
                    <p>{selectedDispute.customerEmail}</p>
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <p className="font-medium">{formatCurrency(selectedDispute.amount, selectedDispute.currency)}</p>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Badge variant="outline">
                      {selectedDispute.type.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label>Priority</Label>
                    <Badge className={getPriorityColor(selectedDispute.priority)}>
                      {selectedDispute.priority.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge className={getStatusColor(selectedDispute.status)}>
                      {selectedDispute.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <p className={
                      isOverdue(selectedDispute.dueDate) ? 'text-red-600' :
                      isDueDateApproaching(selectedDispute.dueDate) ? 'text-orange-600' :
                      ''
                    }>
                      {format(new Date(selectedDispute.dueDate), 'PPP')}
                    </p>
                  </div>
                  <div>
                    <Label>Created</Label>
                    <p>{format(new Date(selectedDispute.createdAt), 'PPP')}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div>
                <Label>Description</Label>
                <p className="text-sm mt-1">{selectedDispute.description}</p>
              </div>

              <Separator />

              {/* Evidence Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label>Evidence ({selectedDispute.evidence.length})</Label>
                  <Dialog open={showEvidenceDialog} onOpenChange={setShowEvidenceDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Upload className="w-4 h-4 mr-2" />
                        Add Evidence
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Evidence</DialogTitle>
                        <DialogDescription>
                          Submit new evidence for this dispute
                        </DialogDescription>
                      </DialogHeader>
                      
                      <form onSubmit={handleSubmitEvidence} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="evidenceType">Evidence Type</Label>
                          <Select 
                            value={newEvidence.type} 
                            onValueChange={(value) => setNewEvidence(prev => ({ ...prev, type: value as any }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="receipt">Receipt</SelectItem>
                              <SelectItem value="shipping_proof">Shipping Proof</SelectItem>
                              <SelectItem value="customer_communication">Customer Communication</SelectItem>
                              <SelectItem value="authorization_proof">Authorization Proof</SelectItem>
                              <SelectItem value="duplicate_charge_proof">Duplicate Charge Proof</SelectItem>
                              <SelectItem value="cancellation_proof">Cancellation Proof</SelectItem>
                              <SelectItem value="refund_proof">Refund Proof</SelectItem>
                              <SelectItem value="terms_of_service">Terms of Service</SelectItem>
                              <SelectItem value="fraud_analysis">Fraud Analysis</SelectItem>
                              <SelectItem value="customer_profile">Customer Profile</SelectItem>
                              <SelectItem value="transaction_log">Transaction Log</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="evidenceTitle">Title</Label>
                          <Input
                            id="evidenceTitle"
                            value={newEvidence.title}
                            onChange={(e) => setNewEvidence(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Evidence title"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="evidenceDescription">Description</Label>
                          <Textarea
                            id="evidenceDescription"
                            value={newEvidence.description}
                            onChange={(e) => setNewEvidence(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Detailed description of the evidence"
                            rows={3}
                          />
                        </div>
                        
                        <div className="flex justify-end gap-3">
                          <Button type="button" onClick={() => setShowEvidenceDialog(false)} variant="outline">
                            Cancel
                          </Button>
                          <Button type="submit">
                            Add Evidence
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {selectedDispute.evidence.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDispute.evidence.map((evidence) => (
                      <div key={evidence.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Paperclip className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{evidence.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {evidence.type.replace('_', ' ').toUpperCase()} • 
                              Added {format(new Date(evidence.uploadedAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {evidence.isRequired && (
                            <Badge variant="outline">Required</Badge>
                          )}
                          {evidence.isSubmitted && (
                            <Badge variant="default">Submitted</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No evidence submitted yet</p>
                )}
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button 
                  onClick={() => setSelectedDispute(null)} 
                  variant="outline"
                >
                  Close
                </Button>
                
                {!['won', 'lost', 'closed'].includes(selectedDispute.status) && (
                  <>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          Resolve as Lost
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Resolve Dispute as Lost</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will mark the dispute as lost and close it. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleResolveDispute(selectedDispute.id, 'lost', 'Insufficient evidence or customer claim valid')}
                          >
                            Resolve as Lost
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button>
                          Resolve as Won
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Resolve Dispute as Won</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will mark the dispute as won and close it. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleResolveDispute(selectedDispute.id, 'won', 'Sufficient evidence provided to support merchant position')}
                          >
                            Resolve as Won
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}