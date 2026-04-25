import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { 
  CheckCircle, 
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Copy,
  Terminal,
  Database,
  Server,
  Key,
  Globe,
  AlertTriangle,
  BookOpen
} from 'lucide-react';
import { toast } from "sonner";
import { projectId, publicAnonKey } from '../services/supabaseProject';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'pending' | 'error';
  commands?: string[];
  links?: { text: string; url: string }[];
  troubleshooting?: string[];
}

export function BackendSetupGuide() {
  const [openSections, setOpenSections] = useState<string[]>(['environment']);

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const setupSteps: SetupStep[] = [
    {
      id: 'environment',
      title: 'Environment Variables',
      description: 'Check if Supabase environment variables are configured',
      status: projectId && publicAnonKey ? 'completed' : 'error',
      commands: [
        'SUPABASE_URL=https://your-project.supabase.co',
        'SUPABASE_ANON_KEY=your-anon-key',
        'SUPABASE_SERVICE_ROLE_KEY=your-service-role-key'
      ],
      troubleshooting: [
        'Check if .env file exists in project root',
        'Verify variable names match exactly',
        'Restart development server after changes',
        'Check Supabase dashboard for correct values'
      ]
    },
    {
      id: 'supabase-project',
      title: 'Supabase Project Setup',
      description: 'Ensure your Supabase project is active and configured',
      status: projectId ? 'completed' : 'pending',
      links: [
        { text: 'Supabase Dashboard', url: 'https://app.supabase.com/' },
        { text: 'Project Settings', url: `https://app.supabase.com/project/${projectId}/settings/api` }
      ],
      troubleshooting: [
        'Create a new Supabase project if needed',
        'Enable Edge Functions in your project',
        'Check project status in dashboard',
        'Verify billing is set up (if required)'
      ]
    },
    {
      id: 'edge-functions',
      title: 'Edge Functions Deployment',
      description: 'Deploy the backend server as a Supabase Edge Function',
      status: 'pending',
      commands: [
        'npm install -g supabase',
        'supabase login',
        'supabase functions deploy server',
        'supabase functions list'
      ],
      links: [
        { text: 'Edge Functions Guide', url: 'https://supabase.com/docs/guides/functions' },
        { text: 'Supabase CLI', url: 'https://supabase.com/docs/guides/cli' }
      ],
      troubleshooting: [
        'Install Supabase CLI if not available',
        'Login to Supabase CLI with correct credentials',
        'Check function deployment logs',
        'Verify function is active in dashboard'
      ]
    },
    {
      id: 'cors-config',
      title: 'CORS Configuration',
      description: 'Configure Cross-Origin Resource Sharing for web requests',
      status: 'pending',
      troubleshooting: [
        'Check if CORS headers are set in Edge Function',
        'Verify allowed origins include your domain',
        'Test with different browsers',
        'Check browser console for CORS errors'
      ]
    },
    {
      id: 'database-setup',
      title: 'Database Tables',
      description: 'Set up required database tables and policies',
      status: 'pending',
      commands: [
        '-- Create kv_store table',
        'CREATE TABLE kv_store_8669f8c6 (',
        '  key TEXT PRIMARY KEY,',
        '  value JSONB NOT NULL,',
        '  created_at TIMESTAMP DEFAULT NOW()',
        ');'
      ],
      troubleshooting: [
        'Run SQL commands in Supabase SQL editor',
        'Check table permissions and RLS policies',
        'Verify database connection',
        'Check for any foreign key constraints'
      ]
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Error</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Backend Setup Guide
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Follow these steps to set up the PropertyHub backend server
        </p>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {setupSteps.map((step, index) => (
            <Collapsible
              key={step.id}
              open={openSections.includes(step.id)}
              onOpenChange={() => toggleSection(step.id)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {index + 1}
                    </div>
                    {getStatusIcon(step.status)}
                    <div className="text-left">
                      <h4 className="font-medium">{step.title}</h4>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(step.status)}
                    {openSections.includes(step.id) ? 
                      <ChevronDown className="w-4 h-4" /> : 
                      <ChevronRight className="w-4 h-4" />
                    }
                  </div>
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="pt-4">
                <div className="ml-12 space-y-4">
                  {step.commands && (
                    <div>
                      <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Terminal className="w-4 h-4" />
                        Commands
                      </h5>
                      <div className="bg-muted rounded-lg p-3 font-mono text-sm space-y-1">
                        {step.commands.map((command, idx) => (
                          <div key={idx} className="flex items-center justify-between group">
                            <code className="flex-1">{command}</code>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(command)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {step.links && (
                    <div>
                      <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" />
                        Useful Links
                      </h5>
                      <div className="space-y-1">
                        {step.links.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            {link.text}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {step.troubleshooting && (
                    <div>
                      <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Troubleshooting
                      </h5>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {step.troubleshooting.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-start gap-2">
            <Database className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Current Configuration</p>
              <div className="text-blue-700 dark:text-blue-300 space-y-1">
                <p><strong>Project ID:</strong> {projectId || 'Not configured'}</p>
                <p><strong>Anon Key:</strong> {publicAnonKey ? 'Configured' : 'Not configured'}</p>
                <p><strong>Server URL:</strong> {projectId ? `https://${projectId}.supabase.co/functions/v1/make-server-8669f8c6` : 'Not available'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-700 dark:text-yellow-300">
              <p className="font-medium mb-1">Need Help?</p>
              <p>If you're still experiencing issues after following this guide, check the browser console for error messages and verify your Supabase project settings.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
