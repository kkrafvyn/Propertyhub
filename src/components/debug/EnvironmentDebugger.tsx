/**
 * Environment Debugger Component
 * 
 * Displays current environment configuration for debugging purposes
 * Only shown in development mode
 */

import React from 'react';
import { envConfig } from '../../utils/envConfig';
import { Card } from '../ui/card';

export function EnvironmentDebugger(): React.ReactElement | null {
  // Only show in development and if not in production environment
  if (!envConfig.isDevelopment || envConfig.isProduction) {
    return null;
  }

  // Additional check for window location to ensure we're in local development
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('local')) {
      return null;
    }
  }

  return (
    <Card className="fixed bottom-4 left-4 z-50 p-4 max-w-sm bg-background border shadow-lg">
      <h3 className="font-medium mb-2">🔧 Environment Debug</h3>
      <div className="space-y-1 text-xs">
        <div>
          <strong>Environment:</strong> {envConfig.NODE_ENV}
        </div>
        <div>
          <strong>WebSocket:</strong> {envConfig.WEBSOCKET_URL}
        </div>
        <div>
          <strong>API:</strong> {envConfig.API_URL}
        </div>
        <div>
          <strong>VAPID Key:</strong> {envConfig.VAPID_PUBLIC_KEY ? '✅ Set' : '❌ Missing'}
        </div>
        
        <div className="mt-2 pt-2 border-t text-muted-foreground">
          <div><strong>Build Tool:</strong> {typeof import.meta !== 'undefined' ? 'Vite' : 'Other'}</div>
          <div><strong>Browser:</strong> {typeof window !== 'undefined' ? 'Yes' : 'No'}</div>
        </div>
        
        {/* Environment Variables Check */}
        <div className="mt-2 pt-2 border-t">
          <strong>Available Env Vars:</strong>
          <div className="ml-2">
            {typeof import.meta !== 'undefined' && import.meta.env ? (
              Object.keys(import.meta.env)
                .filter(key => key.startsWith('VITE_'))
                .map(key => (
                  <div key={key} className="text-xs">
                    {key}: {import.meta.env[key] ? '✅' : '❌'}
                  </div>
                ))
            ) : (
              <div>No Vite env vars found</div>
            )}
          </div>
        </div>
      </div>
      
      <button 
        onClick={() => {
          const debugEl = document.querySelector('[data-env-debug]');
          if (debugEl) {
            debugEl.remove();
          }
        }}
        className="mt-2 text-xs text-muted-foreground hover:text-foreground"
        data-env-debug
      >
        Hide
      </button>
    </Card>
  );
}
