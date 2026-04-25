import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { 
  MessageCircle, 
  Search, 
  Users, 
  Eye, 
  Shield,
  AlertTriangle,
  UserCheck,
  UserX,
  Settings,
  Crown,
  User as UserIcon,
  RefreshCw,
  CheckCircle,
  XCircle,
  Mail,
  Calendar,
  Activity,
  Ban,
  Unlock,
  Wifi,
  WifiOff,
  AlertCircle
} from 'lucide-react';
import { AdminChatOversight } from './AdminChatOversight';
import { BackendHealthChecker } from './BackendHealthChecker';
import { BackendSetupGuide } from './BackendSetupGuide';
import { QuickBackendTest } from './QuickBackendTest';
import { toast } from "sonner";
import { projectId, publicAnonKey, getSupabaseFunctionUrl } from '../services/supabaseProject';
import { User as UserType } from '../types';

interface AdminUser extends UserType {
  status?: 'active' | 'inactive' | 'suspended' | 'banned';
  lastLogin?: string;
  stats?: {
    propertiesViewed?: number;
    propertiesLiked?: number;
    propertiesSaved?: number;
    reviewsGiven?: number;
    responseRate?: number;
    totalMessages?: number;
    totalBookings?: number;
  };
}

interface AdminDashboardProps {
  currentUser: UserType;
}

interface UserManagementStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  suspendedUsers: number;
  totalAdmins: number;
  totalHosts: number;
  totalManagers: number;
}

export function AdminDashboard({ currentUser }: AdminDashboardProps) {
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected' | 'offline'>('checking');
  const [stats, setStats] = useState<UserManagementStats>({
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
    suspendedUsers: 0,
    totalAdmins: 0,
    totalHosts: 0,
    totalManagers: 0
  });
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const serverUrl = getSupabaseFunctionUrl();

  // Fetch all users for admin management
  const fetchAllUsers = useCallback(async () => {
    if (currentUser.role !== 'admin') return;
    
    setLoading(true);
    try {
      console.log('🔍 Fetching users from:', `${serverUrl}/admin/users`);
      console.log('📡 Using projectId:', projectId);
      console.log('🔑 Using Authorization Bearer:', publicAnonKey.substring(0, 20) + '...');
      
      // First check if server is healthy
      setConnectionStatus('checking');
      try {
        const healthResponse = await fetch(`${serverUrl}/health`, {
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });
        
        if (!healthResponse.ok) {
          throw new Error(`Server health check failed: ${healthResponse.status} ${healthResponse.statusText}`);
        }
        
        const healthData = await healthResponse.json();
        console.log('✅ Server health check passed:', healthData);
        setConnectionStatus('connected');
      } catch (healthError) {
        console.error('❌ Server health check failed:', healthError);
        setConnectionStatus('disconnected');
        
        // Show specific error message based on error type
        if (healthError.name === 'TimeoutError') {
          toast.error('Server timeout: The backend server is taking too long to respond.');
        } else if (healthError.message.includes('NetworkError')) {
          toast.error('Network error: Cannot connect to backend server. Please check if it\'s running.');
        } else {
          toast.error('Backend server is not responding. Please check your setup.');
        }
        
        // Use fallback mock data if server is not available
        const mockStats = {
          totalUsers: 0,
          activeUsers: 0,
          newUsersThisMonth: 0,
          suspendedUsers: 0,
          totalAdmins: 0,
          totalHosts: 0,
          totalManagers: 0
        };
        
        setAllUsers([]);
        setStats(mockStats);
        setConnectionStatus('offline');
        toast.warning('Using offline mode - user data unavailable while the server is down');
        return;
      }

      // Proceed with actual fetch if health check passes
      const response = await fetch(`${serverUrl}/admin/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'X-Admin-User-ID': currentUser.id,
          'Accept': 'application/json',
        },
        mode: 'cors',
      });

      console.log('📊 Response status:', response.status, response.statusText);
      console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📊 Response data:', result);

      if (result.success) {
        setAllUsers(result.users);
        setStats(result.stats);
        toast.success(`Loaded ${result.users.length} users successfully`);
      } else {
        console.error('❌ API returned error:', result.error);
        toast.error(`API Error: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Network error fetching users:', error);
      
      // Provide more specific error messages
      if (error instanceof TypeError && error.message.includes('NetworkError')) {
        toast.error('❌ Network Error: Cannot connect to backend server', {
          description: 'Check the System Health tab for troubleshooting steps',
          duration: 5000,
        });
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error('🌐 Connection Failed: Please check your internet connection', {
          description: 'Server may be unreachable or offline',
          duration: 5000,
        });
      } else if (error.message.includes('timeout')) {
        toast.error('⏱️ Request Timeout: Server is taking too long to respond', {
          description: 'Try refreshing or check server status',
          duration: 5000,
        });
      } else {
        toast.error(`🚨 Error: ${error.message || 'Unknown error occurred'}`, {
          description: 'Check the System Health tab for more details',
          duration: 5000,
        });
      }
      
      // Show debug information
      console.group('🔧 Debug Information');
      console.log('Server URL:', serverUrl);
      console.log('Project ID:', projectId);
      console.log('Current User:', currentUser);
      console.log('Error Details:', error);
      console.log('Error Stack:', error.stack);
      console.groupEnd();
    } finally {
      setLoading(false);
    }
  }, [serverUrl, currentUser]);

  // Update user role
  const updateUserRole = async (userId: string, newRole: string) => {
    if (currentUser.role !== 'admin') return;
    
    try {
      console.log(`🔄 Updating user ${userId} role to ${newRole}`);
      
      const response = await fetch(`${serverUrl}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'X-Admin-User-ID': currentUser.id,
          'Accept': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        toast.success(`User role updated to ${newRole}`);
        await fetchAllUsers(); // Refresh the list
      } else {
        console.error('❌ Failed to update role:', result.error);
        toast.error(`Failed to update user role: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error updating user role:', error);
      if (error instanceof TypeError && error.message.includes('NetworkError')) {
        toast.error('Network error: Cannot update user role. Server unavailable.');
      } else {
        toast.error(`Error updating user role: ${error.message || 'Unknown error'}`);
      }
    }
  };

  // Update user status
  const updateUserStatus = async (userId: string, newStatus: string) => {
    if (currentUser.role !== 'admin') return;
    
    try {
      console.log(`🔄 Updating user ${userId} status to ${newStatus}`);
      
      const response = await fetch(`${serverUrl}/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'X-Admin-User-ID': currentUser.id,
          'Accept': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        toast.success(`User status updated to ${newStatus}`);
        await fetchAllUsers(); // Refresh the list
      } else {
        console.error('❌ Failed to update status:', result.error);
        toast.error(`Failed to update user status: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error updating user status:', error);
      if (error instanceof TypeError && error.message.includes('NetworkError')) {
        toast.error('Network error: Cannot update user status. Server unavailable.');
      } else {
        toast.error(`Error updating user status: ${error.message || 'Unknown error'}`);
      }
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllUsers();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  // Filter users based on search, role, and status
  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Load data on mount
  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  if (currentUser.role !== 'admin') {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Access Denied</h3>
          <p className="text-muted-foreground">
            Only administrators can access the admin dashboard.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Connection Status Component
  const ConnectionStatus = () => (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {connectionStatus === 'checking' && (
              <>
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Checking server connection...</span>
              </>
            )}
            {connectionStatus === 'connected' && (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-700 dark:text-green-400">Server connected</span>
              </>
            )}
            {connectionStatus === 'disconnected' && (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700 dark:text-red-400">Server disconnected</span>
              </>
            )}
            {connectionStatus === 'offline' && (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-yellow-700 dark:text-yellow-400">Using offline data</span>
              </>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground">
            Server: {serverUrl.replace('https://', '').split('/')[0]}
          </div>
        </div>
        
        {connectionStatus === 'offline' && (
          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-xs text-yellow-700 dark:text-yellow-300">
                <p className="font-medium mb-1">Backend server unavailable</p>
                <p>Make sure the Supabase Edge Function server is running. User management features will be limited.</p>
                <details className="mt-2">
                  <summary className="cursor-pointer font-medium">Troubleshooting steps</summary>
                  <ul className="mt-1 space-y-1 ml-4">
                    <li>• Check if Supabase project is active</li>
                    <li>• Verify environment variables are set</li>
                    <li>• Ensure Edge Functions are deployed</li>
                    <li>• Check network connectivity</li>
                  </ul>
                </details>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const UserManagementTab = () => (
    <div className="space-y-6">
      {/* Connection Status */}
      <ConnectionStatus />
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{stats.activeUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Hosts</p>
                <p className="text-2xl font-bold">{stats.totalHosts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold">{stats.totalAdmins}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              User Management
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="host">Host</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground mb-4">
            Showing {filteredUsers.length} of {allUsers.length} users
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-96">
            <div className="divide-y">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading users...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No users found</p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">{user.name}</h4>
                            {user.verified && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {user.email}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role}
                            </Badge>
                            <Badge 
                              variant={user.status === 'active' ? 'default' : 
                                      user.status === 'suspended' ? 'destructive' : 'secondary'}
                            >
                              {user.status || 'active'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Role Change */}
                        <Select
                          value={user.role}
                          onValueChange={(newRole) => updateUserRole(user.id, newRole)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="host">Host</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Status Actions */}
                        {user.status === 'suspended' || user.status === 'banned' ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="flex items-center gap-1">
                                <Unlock className="w-3 h-3" />
                                Restore
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Restore User Account</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to restore {user.name}'s account? They will regain full access to the platform.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => updateUserStatus(user.id, 'active')}>
                                  Restore Account
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive" className="flex items-center gap-1">
                                <Ban className="w-3 h-3" />
                                Suspend
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Suspend User Account</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to suspend {user.name}'s account? They will lose access to the platform until restored.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => updateUserStatus(user.id, 'suspended')}>
                                  Suspend Account
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>

                    {/* Additional User Info */}
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Joined: {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'Unknown'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        Last Login: {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        Messages: {user.stats?.totalMessages || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        Bookings: {user.stats?.totalBookings || 0}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Manage users, monitor chats, and oversee platform operations
          </p>
        </motion.div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Chat Oversight
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              System Health
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserManagementTab />
          </TabsContent>

          <TabsContent value="chat">
            <AdminChatOversight currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="health">
            <div className="space-y-6">
              <BackendHealthChecker />
              <QuickBackendTest />
              <BackendSetupGuide />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
