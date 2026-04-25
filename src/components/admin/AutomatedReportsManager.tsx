/**
 * PropertyHub - Automated Reports Manager Component
 * 
 * Comprehensive interface for managing automated payment reports,
 * configuring schedules, and monitoring report generation.
 * 
 * Features:
 * - Report configuration management
 * - Schedule management and monitoring
 * - Report history and analytics
 * - Recipient management
 * - Template customization
 * - Real-time report generation status
 * - Export and download capabilities
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
  Calendar,
  Clock,
  Download,
  Edit,
  FileText,
  Mail,
  Play,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Copy,
  Filter,
  Search,
  MoreVertical
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

// Services
import { 
  automatedReportingSystem,
  ReportConfig,
  PaymentReport,
  ReportType,
  ReportFrequency,
  ReportFormat,
  ReportRecipient
} from '../../utils/automatedReportingSystem';

interface AutomatedReportsManagerProps {
  className?: string;
}

const createDefaultMetadata = () => ({
  createdBy: 'system',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  description: '',
  tags: [] as string[]
});

export function AutomatedReportsManager({ 
  className = '' 
}: AutomatedReportsManagerProps) {
  
  // State management
  const [loading, setLoading] = useState<boolean>(true);
  const [reportConfigs, setReportConfigs] = useState<ReportConfig[]>([]);
  const [reportHistory, setReportHistory] = useState<Map<string, PaymentReport[]>>(new Map());
  const [activeTab, setActiveTab] = useState<string>('configurations');
  const [selectedConfig, setSelectedConfig] = useState<ReportConfig | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false);
  const [showEditDialog, setShowEditDialog] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form state for creating/editing reports
  const [formData, setFormData] = useState<Partial<ReportConfig>>({
    name: '',
    type: 'daily_summary',
    frequency: 'daily',
    format: ['pdf'],
    recipients: [],
    enabled: true,
    metadata: createDefaultMetadata()
  });

  // Load data on component mount
  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get report configurations
      const configs = automatedReportingSystem.getReportConfigs();
      setReportConfigs(configs);
      
      // Get report history for each configuration
      const historyMap = new Map<string, PaymentReport[]>();
      configs.forEach(config => {
        const history = automatedReportingSystem.getReportHistory(config.id);
        historyMap.set(config.id, history);
      });
      setReportHistory(historyMap);
      
    } catch (error) {
      console.error('❌ Failed to load report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle form submission for creating/editing reports
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (selectedConfig) {
        // Update existing configuration
        await automatedReportingSystem.updateReportConfig(selectedConfig.id, formData);
        toast.success('Report configuration updated successfully');
        setShowEditDialog(false);
      } else {
        // Create new configuration
        await automatedReportingSystem.createReportConfig(formData as Omit<ReportConfig, 'id' | 'metadata'>);
        toast.success('Report configuration created successfully');
        setShowCreateDialog(false);
      }
      
      // Reset form and reload data
      setFormData({
        name: '',
        type: 'daily_summary',
        frequency: 'daily',
        format: ['pdf'],
        recipients: [],
        enabled: true,
        metadata: createDefaultMetadata()
      });
      setSelectedConfig(null);
      await loadReportData();
      
    } catch (error) {
      console.error('❌ Failed to save report configuration:', error);
      toast.error('Failed to save report configuration');
    }
  };

  // Handle manual report generation
  const handleGenerateReport = async (configId: string) => {
    try {
      toast.info('Generating report...');
      await automatedReportingSystem.generateReport(configId);
      await loadReportData();
    } catch (error) {
      console.error('❌ Failed to generate report:', error);
      toast.error('Failed to generate report');
    }
  };

  // Handle configuration deletion
  const handleDeleteConfig = async (configId: string) => {
    try {
      await automatedReportingSystem.deleteReportConfig(configId);
      toast.success('Report configuration deleted');
      await loadReportData();
    } catch (error) {
      console.error('❌ Failed to delete configuration:', error);
      toast.error('Failed to delete configuration');
    }
  };

  // Handle enabling/disabling configurations
  const handleToggleConfig = async (configId: string, enabled: boolean) => {
    try {
      await automatedReportingSystem.updateReportConfig(configId, { enabled });
      toast.success(enabled ? 'Report enabled' : 'Report disabled');
      await loadReportData();
    } catch (error) {
      console.error('❌ Failed to toggle configuration:', error);
      toast.error('Failed to update configuration');
    }
  };

  // Handle editing configuration
  const handleEditConfig = (config: ReportConfig) => {
    setSelectedConfig(config);
    setFormData({
      name: config.name,
      type: config.type,
      frequency: config.frequency,
      format: config.format,
      recipients: config.recipients,
      enabled: config.enabled,
      metadata: config.metadata
    });
    setShowEditDialog(true);
  };

  // Handle recipient management
  const addRecipient = () => {
    const newRecipient: ReportRecipient = {
      type: 'email',
      address: '',
      name: '',
      role: 'user',
      preferences: {
        format: ['pdf'],
        frequency: ['daily'],
        sections: []
      }
    };
    
    setFormData(prev => ({
      ...prev,
      recipients: [...(prev.recipients || []), newRecipient]
    }));
  };

  const removeRecipient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      recipients: prev.recipients?.filter((_, i) => i !== index) || []
    }));
  };

  const updateRecipient = (index: number, updates: Partial<ReportRecipient>) => {
    setFormData(prev => ({
      ...prev,
      recipients: prev.recipients?.map((recipient, i) => 
        i === index ? { ...recipient, ...updates } : recipient
      ) || []
    }));
  };

  // Filter configurations based on search and status
  const filteredConfigs = reportConfigs.filter(config => {
    const matchesSearch = config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         config.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'enabled' && config.enabled) ||
                         (filterStatus === 'disabled' && !config.enabled);
    return matchesSearch && matchesStatus;
  });

  // Get status badge component
  const getStatusBadge = (enabled: boolean, lastGenerated?: string) => {
    if (!enabled) {
      return <Badge variant="secondary">Disabled</Badge>;
    }
    
    if (!lastGenerated) {
      return <Badge variant="outline">Not Run</Badge>;
    }
    
    const lastRun = new Date(lastGenerated);
    const hoursAgo = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60);
    
    if (hoursAgo < 24) {
      return <Badge variant="default">Active</Badge>;
    } else {
      return <Badge variant="destructive">Overdue</Badge>;
    }
  };

  // Get frequency display
  const getFrequencyDisplay = (frequency: ReportFrequency) => {
    const frequencyMap = {
      'daily': 'Daily',
      'weekly': 'Weekly',
      'monthly': 'Monthly',
      'quarterly': 'Quarterly',
      'on_demand': 'On Demand'
    };
    return frequencyMap[frequency] || frequency;
  };

  // Get report type display
  const getReportTypeDisplay = (type: ReportType) => {
    const typeMap = {
      'daily_summary': 'Daily Summary',
      'weekly_analytics': 'Weekly Analytics',
      'monthly_reconciliation': 'Monthly Reconciliation',
      'fraud_summary': 'Fraud Summary',
      'dispute_summary': 'Dispute Summary',
      'performance_report': 'Performance Report',
      'revenue_report': 'Revenue Report',
      'custom': 'Custom Report'
    };
    return typeMap[type] || type;
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
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
          <h1 className="text-3xl font-bold">Automated Reports</h1>
          <p className="text-muted-foreground">
            Manage automated payment reports and schedules
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={loadReportData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Report Configuration</DialogTitle>
                <DialogDescription>
                  Set up automated report generation with custom schedules and recipients.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmitForm} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Report Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Daily Payment Summary"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="type">Report Type</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value: ReportType) => setFormData(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily_summary">Daily Summary</SelectItem>
                        <SelectItem value="weekly_analytics">Weekly Analytics</SelectItem>
                        <SelectItem value="monthly_reconciliation">Monthly Reconciliation</SelectItem>
                        <SelectItem value="fraud_summary">Fraud Summary</SelectItem>
                        <SelectItem value="dispute_summary">Dispute Summary</SelectItem>
                        <SelectItem value="performance_report">Performance Report</SelectItem>
                        <SelectItem value="revenue_report">Revenue Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select 
                      value={formData.frequency} 
                      onValueChange={(value: ReportFrequency) => setFormData(prev => ({ ...prev, frequency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="on_demand">On Demand</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Enabled</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.enabled}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
                      />
                      <span className="text-sm text-muted-foreground">
                        {formData.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.metadata?.description}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      metadata: { ...prev.metadata, description: e.target.value }
                    }))}
                    placeholder="Brief description of this report..."
                    rows={3}
                  />
                </div>

                {/* Format Selection */}
                <div className="space-y-2">
                  <Label>Report Formats</Label>
                  <div className="flex gap-4">
                    {(['pdf', 'excel', 'csv'] as ReportFormat[]).map(format => (
                      <label key={format} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.format?.includes(format)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                format: [...(prev.format || []), format]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                format: prev.format?.filter(f => f !== format) || []
                              }));
                            }
                          }}
                        />
                        <span className="text-sm">{format.toUpperCase()}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Recipients */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Recipients</Label>
                    <Button type="button" onClick={addRecipient} variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Recipient
                    </Button>
                  </div>
                  
                  {formData.recipients?.map((recipient, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input
                              value={recipient.address}
                              onChange={(e) => updateRecipient(index, { address: e.target.value })}
                              placeholder="user@example.com"
                              type="email"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                              value={recipient.name || ''}
                              onChange={(e) => updateRecipient(index, { name: e.target.value })}
                              placeholder="Recipient Name"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Role</Label>
                            <div className="flex gap-2">
                              <Select 
                                value={recipient.role} 
                                onValueChange={(value) => updateRecipient(index, { role: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="finance">Finance</SelectItem>
                                  <SelectItem value="security">Security</SelectItem>
                                  <SelectItem value="executive">Executive</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              <Button 
                                type="button" 
                                onClick={() => removeRecipient(index)} 
                                variant="destructive" 
                                size="sm"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end gap-3">
                  <Button 
                    type="button" 
                    onClick={() => setShowCreateDialog(false)} 
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Create Report
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configurations">Configurations</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Configurations Tab */}
        <TabsContent value="configurations" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search configurations..."
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
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Configurations Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Last Generated</TableHead>
                    <TableHead>Next Scheduled</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{config.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {config.metadata.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getReportTypeDisplay(config.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{getFrequencyDisplay(config.frequency)}</TableCell>
                      <TableCell>
                        {getStatusBadge(config.enabled, config.lastGenerated)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{config.recipients.length}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {config.lastGenerated ? (
                          <div>
                            <p className="text-sm">
                              {format(new Date(config.lastGenerated), 'MMM d, HH:mm')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(config.lastGenerated), { addSuffix: true })}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">
                            {format(new Date(config.nextScheduled), 'MMM d, HH:mm')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(config.nextScheduled))}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            onClick={() => handleGenerateReport(config.id)}
                            variant="ghost"
                            size="sm"
                            disabled={!config.enabled}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            onClick={() => handleEditConfig(config)}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          <Switch
                            checked={config.enabled}
                            onCheckedChange={(checked) => handleToggleConfig(config.id, checked)}
                          />
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Report Configuration</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{config.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteConfig(config.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>
                View and download previously generated reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from(reportHistory.entries()).map(([configId, reports]) => {
                  const config = reportConfigs.find(c => c.id === configId);
                  if (!config || reports.length === 0) return null;
                  
                  return (
                    <div key={configId} className="space-y-2">
                      <h4 className="font-medium">{config.name}</h4>
                      <div className="space-y-2">
                        {reports.slice(0, 5).map((report) => (
                          <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{report.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  Generated {format(new Date(report.generatedAt), 'MMM d, yyyy HH:mm')}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                report.status === 'completed' ? 'default' :
                                report.status === 'generating' ? 'secondary' :
                                report.status === 'sent' ? 'default' : 'destructive'
                              }>
                                {report.status}
                              </Badge>
                              
                              {report.fileUrls.pdf && (
                                <Button variant="ghost" size="sm">
                                  <Download className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Configurations</p>
                    <p className="text-2xl font-bold">{reportConfigs.length}</p>
                  </div>
                  <Settings className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Reports</p>
                    <p className="text-2xl font-bold">
                      {reportConfigs.filter(c => c.enabled).length}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Reports Generated</p>
                    <p className="text-2xl font-bold">
                      {Array.from(reportHistory.values()).reduce((total, reports) => total + reports.length, 0)}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Report Configuration</DialogTitle>
            <DialogDescription>
              Update report settings and recipients.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitForm} className="space-y-6">
            {/* Same form content as create dialog */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Report Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Enabled</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.enabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                type="button" 
                onClick={() => setShowEditDialog(false)} 
                variant="outline"
              >
                Cancel
              </Button>
              <Button type="submit">
                Update Report
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
