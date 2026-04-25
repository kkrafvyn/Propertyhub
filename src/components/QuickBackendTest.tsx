import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  PlayCircle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Copy
} from 'lucide-react';
import { toast } from "sonner";
import { projectId, publicAnonKey, getSupabaseFunctionUrl } from '../services/supabaseProject';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  message: string;
  responseTime: number;
  success: boolean;
  data?: any;
  error?: string;
}

export function QuickBackendTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [customEndpoint, setCustomEndpoint] = useState('');

  const serverUrl = getSupabaseFunctionUrl();

  const runTest = async (endpoint: string, method: string = 'GET', body?: any) => {
    const start = Date.now();
    try {
      const response = await fetch(`${serverUrl}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
          ...(endpoint.includes('/admin/') && { 'X-Admin-User-ID': 'test-admin-id' }),
        },
        ...(body && { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(15000),
      });

      const responseTime = Date.now() - start;
      let data: any;
      let message = 'Request completed';

      try {
        data = await response.json();
        if (data.error) {
          message = data.error;
        } else if (data.message) {
          message = data.message;
        } else {
          message = `Response received (${Object.keys(data).length} fields)`;
        }
      } catch {
        message = 'Non-JSON response';
      }

      return {
        endpoint,
        method,
        status: response.status,
        message,
        responseTime,
        success: response.ok,
        data
      };
    } catch (error) {
      const responseTime = Date.now() - start;
      return {
        endpoint,
        method,
        status: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setTestResults([]);

    const tests = [
      { endpoint: '/health', method: 'GET' },
      { endpoint: '/properties', method: 'GET' },
      { endpoint: '/users', method: 'GET' },
      { endpoint: '/admin/users', method: 'GET' },
      { endpoint: '/chat/rooms/test-user', method: 'GET' },
    ];

    const results: TestResult[] = [];

    for (const test of tests) {
      const result = await runTest(test.endpoint, test.method);
      results.push(result);
      setTestResults([...results]);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setTesting(false);

    // Summary
    const successful = results.filter(r => r.success).length;
    const total = results.length;
    
    if (successful === total) {
      toast.success(`All ${total} tests passed!`);
    } else {
      toast.error(`${total - successful} out of ${total} tests failed`);
    }
  };

  const runCustomTest = async () => {
    if (!customEndpoint.trim()) {
      toast.error('Please enter an endpoint to test');
      return;
    }

    setTesting(true);
    const result = await runTest(customEndpoint);
    setTestResults(prev => [...prev, result]);
    setTesting(false);
    setCustomEndpoint('');

    if (result.success) {
      toast.success('Custom test completed successfully');
    } else {
      toast.error('Custom test failed');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusBadge = (result: TestResult) => {
    if (result.status === 0) {
      return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">No Response</Badge>;
    } else if (result.status >= 200 && result.status < 300) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{result.status}</Badge>;
    } else if (result.status >= 400 && result.status < 500) {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">{result.status}</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">{result.status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlayCircle className="w-5 h-5 text-primary" />
          Quick Backend Test
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Test all backend endpoints to verify functionality
        </p>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Test Controls */}
          <div className="flex gap-2">
            <Button onClick={runAllTests} disabled={testing} className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4" />
              {testing ? 'Testing...' : 'Run All Tests'}
            </Button>
            
            <div className="flex gap-2 flex-1">
              <Input
                placeholder="Enter custom endpoint (e.g., /health)"
                value={customEndpoint}
                onChange={(e) => setCustomEndpoint(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && runCustomTest()}
                disabled={testing}
              />
              <Button 
                variant="outline" 
                onClick={runCustomTest} 
                disabled={testing || !customEndpoint.trim()}
              >
                Test
              </Button>
            </div>
          </div>

          {/* Results */}
          {testResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Test Results</h4>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <code className="text-sm font-mono">{result.method} {result.endpoint}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(result)}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {result.responseTime}ms
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
                    
                    {result.data && (
                      <details className="text-xs">
                        <summary className="cursor-pointer font-medium text-muted-foreground mb-1">
                          Response Data
                        </summary>
                        <div className="bg-muted p-2 rounded font-mono overflow-x-auto">
                          <div className="flex items-start justify-between">
                            <pre>{JSON.stringify(result.data, null, 2)}</pre>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(JSON.stringify(result.data, null, 2))}
                              className="ml-2"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </details>
                    )}
                    
                    {result.error && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-300">
                        <strong>Error:</strong> {result.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Server Info */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <h5 className="font-medium text-sm mb-2">Server Configuration</h5>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center justify-between">
                <span>Base URL:</span>
                <div className="flex items-center gap-1">
                  <code className="bg-background px-1 rounded">{serverUrl}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(serverUrl)}
                    className="h-auto p-1"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Project ID:</span>
                <code className="bg-background px-1 rounded">{projectId}</code>
              </div>
              <div className="flex items-center justify-between">
                <span>Auth Key:</span>
                <code className="bg-background px-1 rounded">{publicAnonKey ? 'Configured' : 'Missing'}</code>
              </div>
            </div>
          </div>

          {testing && (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Running tests...</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
