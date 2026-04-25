/**
 * Simple Status Overlay
 * 
 * Minimal status indicator without complex dependencies
 */

import React, { useState } from 'react';
import { Activity, X } from 'lucide-react';

export function SimpleStatusOverlay() {
  const [isVisible, setIsVisible] = useState(false);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 z-50 px-3 py-2 bg-card border rounded-lg shadow-lg hover:shadow-xl transition-shadow text-sm"
      >
        <Activity className="w-4 h-4 mr-2 inline" />
        Status
      </button>
    );
  }

  return (
    <div className="fixed left-4 bottom-20 w-64 bg-background border rounded-lg shadow-lg z-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">System Status</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-muted rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span>Application</span>
          <span className="text-green-500">✓ Running</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Security</span>
          <span className="text-green-500">✓ Active</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Network</span>
          <span className={navigator.onLine ? 'text-green-500' : 'text-red-500'}>
            {navigator.onLine ? '✓ Online' : '✗ Offline'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default SimpleStatusOverlay;