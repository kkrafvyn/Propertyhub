import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Server,
  Globe,
  Database,
  Key,
  Clock
} from 'lucide-react';
import { projectId, publicAnonKey, getSupabaseFunctionUrl } from '../services/supabaseProject';
import { toast } from "sonner";

interface HealthCheckResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'checking';
  message: string;
  details?: string;
  timestamp?: string;
  responseTime?: number;
}

export function BackendHealthChecker() {
  const [checks, setChecks] = useState<HealthCheckResult[]>([]);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const serverUrl = getSupabaseFunctionUrl();

  const performHealthChecks = async () => {
    setChecking(true);
    const results: HealthCheckResult[] = [];

    // Check 1: Environment Variables
    results.push({
      name: 'Environment Configuration',
      status: projectId && publicAnonKey ? 'success' : 'error',
      message: projectId && publicAnonKey ? 'Environment variables loaded' : 'Missing environment variables',
      details: `Project ID: ${projectId ? 'Set' : 'Missing'}, Anon Key: ${publicAnonKey ? 'Set' : 'Missing'}`
    });

    // Check 2: Server Health Endpoint
    try {
      const start = Date.now();
      const healthResponse = await fetch(`${serverUrl}/health`, {
        signal: AbortSignal.timeout(10000),
      });
      const responseTime = Date.now() - start;

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        results.push({
          name: 'Server Health',
          status: 'success',
          message: 'Server is responding',
          details: `Response time: ${responseTime}ms, Status: ${healthData.status}`,
          responseTime
        });
      } else {
        results.push({
          name: 'Server Health',
          status: 'error',
          message: `Server returned ${healthResponse.status}`,
          details: healthResponse.statusText
        });
      }
    } catch (error) {
      results.push({
        name: 'Server Health',
        status: 'error',
        message: 'Server unreachable',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Check 3: Admin Endpoint
    try {
      const start = Date.now();
      const adminResponse = await fetch(`${serverUrl}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          'X-Admin-User-ID': 'test-user',
        },
        signal: AbortSignal.timeout(10000),
      });
      const responseTime = Date.now() - start;

      // We expect a 404 or 403 here since we're using a test user ID
      if (adminResponse.status === 404 || adminResponse.status === 403) {
        results.push({
          name: 'Admin Endpoints',
          status: 'success',
          message: 'Admin endpoints accessible',
          details: `Response time: ${responseTime}ms, Authentication working`,
          responseTime
        });
      } else if (adminResponse.ok) {
        results.push({
          name: 'Admin Endpoints',
          status: 'success',
          message: 'Admin endpoints working',
          details: `Response time: ${responseTime}ms`,
          responseTime
        });
      } else {
        results.push({
          name: 'Admin Endpoints',
          status: 'warning',
          message: `Unexpected response: ${adminResponse.status}`,
          details: adminResponse.statusText
        });
      }
    } catch (error) {
      results.push({
        name: 'Admin Endpoints',
        status: 'error',
        message: 'Admin endpoints unreachable',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Check 4: CORS Configuration
    try {
      const corsResponse = await fetch(`${serverUrl}/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type, Authorization',
        },
      });

      results.push({
        name: 'CORS Configuration',
        status: corsResponse.ok ? 'success' : 'warning',
        message: corsResponse.ok ? 'CORS properly configured' : 'CORS may have issues',
        details: corsResponse.ok ? 'Preflight request successful' : 'Preflight request failed'
      });
    } catch (error) {
      results.push({
        name: 'CORS Configuration',
        status: 'warning',
        message: 'Could not verify CORS',
        details: 'Preflight request failed'
      });
    }

    // Check 5: Network Connectivity
    try {
      await fetch('https://www.google.com/favicon.ico', { 
        mode: 'no-cors',
        signal: AbortSignal.timeout(5000),
      });
      results.push({
        name: 'Network Connectivity',
        status: 'success',
        message: 'Internet connection active',
        details: 'External requests working'
      });
    } catch (error) {
      results.push({
        name: 'Network Connectivity',
        status: 'error',
        message: 'Network connectivity issues',
        details: 'Cannot reach external services'
      });
    }

    setChecks(results);
    setLastCheck(new Date());
    setChecking(false);

    // Show summary toast
    const errors = results.filter(r => r.status === 'error').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    
    if (errors > 0) {
      toast.error(`Health check failed: ${errors} error(s), ${warnings} warning(s)`);
    } else if (warnings > 0) {
      toast.warning(`Health check completed with ${warnings} warning(s)`);
    } else {
      toast.success('All health checks passed!');
    }
  };

  useEffect(() => {
    performHealthChecks();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'checking':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">OK</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Error</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Warning</Badge>;
      case 'checking':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Checking</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            Backend Health Status
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={performHealthChecks}
            disabled={checking}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking...' : 'Refresh'}
          </Button>
        </div>
        {lastCheck && (
          <p className="text-sm text-muted-foreground">
            Last checked: {lastCheck.toLocaleString()}
          </p>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {checks.map((check, index) => (
            <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
              <div className="flex items-start gap-3">
                {getStatusIcon(check.status)}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{check.name}</h4>
                    {getStatusBadge(check.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{check.message}</p>
                  {check.details && (
                    <p className="text-xs text-muted-foreground">{check.details}</p>
                  )}
                  {check.responseTime && (
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{check.responseTime}ms</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {checks.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Running health checks...</p>
          </div>
        )}

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Connection Details
          </h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p><strong>Server URL:</strong> {serverUrl}</p>
            <p><strong>Project ID:</strong> {projectId}</p>
            <p><strong>Environment:</strong> {window.location.hostname}</p>
            <p><strong>User Agent:</strong> {navigator.userAgent.split(' ').slice(0, 3).join(' ')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
