import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { 
  Shield, 
  Users, 
  Building2, 
  TrendingUp, 
  DollarSign, 
  MessageSquare, 
  Eye,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  BarChart3,
  Activity,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { User } from '../types';
import { AdminChatOversight } from './AdminChatOversight';
import { PaymentAnalyticsDashboard } from './admin/PaymentAnalyticsDashboard';
import { AutomatedReportsManager } from './admin/AutomatedReportsManager';
import { EnhancedFraudDetectionDashboard } from './admin/EnhancedFraudDetectionDashboard';
import { DisputeWorkflowManager } from './admin/DisputeWorkflowManager';
import { toast } from "sonner";

interface AdminPanelProps {
  currentUser: User;
}

export function AdminPanel({ currentUser }: AdminPanelProps) {
  if (currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const stats = [
    { title: 'Total Users', value: '1,234', icon: Users, color: 'text-blue-600' },
    { title: 'Properties', value: '456', icon: Building2, color: 'text-green-600' },
    { title: 'Revenue', value: '₦12.5M', icon: DollarSign, color: 'text-purple-600' },
    { title: 'Active Alerts', value: '12', icon: AlertTriangle, color: 'text-red-600' },
    { title: 'Fraud Rate', value: '0.12%', icon: Shield, color: 'text-orange-600' },
    { title: 'Dispute Win Rate', value: '87.3%', icon: CheckCircle, color: 'text-green-600' }
  ];

  return (
    <div className="min-h-[100dvh] bg-background pb-28 lg:pb-10">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage your PropertyHub platform</p>
            </div>
            <Badge variant="outline" className="theme-accent-badge rounded-full px-4 py-2">
              <Shield className="w-4 h-4 mr-1" />
              Administrator
            </Badge>
          </div>
        </motion.div>

        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-[24px] border border-border bg-card p-1 lg:grid-cols-3 2xl:grid-cols-6">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm">
              <DollarSign className="w-4 h-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="fraud-detection" className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm">
              <Shield className="w-4 h-4" />
              Fraud
            </TabsTrigger>
            <TabsTrigger value="disputes" className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm">
              <AlertTriangle className="w-4 h-4" />
              Disputes
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm">
              <BarChart3 className="w-4 h-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="chat-oversight" className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm">
              <Eye className="w-4 h-4" />
              Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                          <p className="text-2xl font-bold">{stat.value}</p>
                        </div>
                        <stat.icon className={`h-8 w-8 ${stat.color}`} />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => toast.success('Payment analytics available in Payments tab')}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Payment Analytics
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => toast.success('Fraud detection available in Fraud tab')}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Fraud Monitoring
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => toast.success('Dispute management available in Disputes tab')}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Dispute Management
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => toast.success('Automated reports available in Reports tab')}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Generate Reports
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest platform activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      'Fraud alert: High velocity detected',
                      'Dispute resolved: Won chargeback case',
                      'Payment processed: ₦2,500,000',
                      'Daily report generated and sent',
                      'New user registration received',
                      'Automated rules updated'
                    ].map((activity, index) => (
                      <motion.div
                        key={index}
                        className="flex items-center rounded-lg border border-border bg-card/60 p-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                      >
                        <div className="w-2 h-2 bg-primary rounded-full mr-3" />
                        <span className="text-sm">{activity}</span>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <PaymentAnalyticsDashboard />
            </motion.div>
          </TabsContent>

          <TabsContent value="fraud-detection" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <EnhancedFraudDetectionDashboard />
            </motion.div>
          </TabsContent>

          <TabsContent value="disputes" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <DisputeWorkflowManager />
            </motion.div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AutomatedReportsManager />
            </motion.div>
          </TabsContent>

          <TabsContent value="chat-oversight" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="min-h-[420px] lg:h-[calc(100dvh-12rem)]"
            >
              <AdminChatOversight currentUser={currentUser} />
            </motion.div>
          </TabsContent>

          <TabsContent value="management" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage platform users</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full"
                    onClick={() => toast.info('User management coming soon!')}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Manage Users
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Property Management</CardTitle>
                  <CardDescription>Oversee property listings</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full"
                    onClick={() => toast.info('Property management coming soon!')}
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Manage Properties
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Analytics</CardTitle>
                  <CardDescription>View platform metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full"
                    onClick={() => toast.info('Analytics coming soon!')}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
