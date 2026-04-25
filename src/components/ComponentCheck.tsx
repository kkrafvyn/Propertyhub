/**
 * Component Check - Validates all imports are working
 * 
 * This component can be used to test if all dependencies are loaded correctly
 */

import React from 'react';

// Test all critical imports
export const ComponentCheck: React.FC = () => {
  const checks = [
    {
      name: 'React',
      status: typeof React !== 'undefined' ? 'OK' : 'FAIL'
    },
    {
      name: 'Motion',
      status: (() => {
        try {
          const { motion } = require('motion/react');
          return motion ? 'OK' : 'FAIL';
        } catch {
          return 'FAIL';
        }
      })()
    },
    {
      name: 'Lucide Icons',
      status: (() => {
        try {
          const { Home } = require('lucide-react');
          return Home ? 'OK' : 'FAIL';
        } catch {
          return 'FAIL';
        }
      })()
    },
    {
      name: 'Browser APIs',
      status: typeof window !== 'undefined' ? 'OK' : 'SSR'
    },
    {
      name: 'LocalStorage',
      status: (() => {
        try {
          return typeof localStorage !== 'undefined' ? 'OK' : 'FAIL';
        } catch {
          return 'FAIL';
        }
      })()
    }
  ];

  return (
    <div className="p-4 bg-card rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">Component Status Check</h3>
      <div className="space-y-2">
        {checks.map((check, index) => (
          <div key={index} className="flex justify-between items-center">
            <span className="text-sm">{check.name}</span>
            <span 
              className={`text-xs px-2 py-1 rounded ${
                check.status === 'OK' 
                  ? 'bg-green-100 text-green-700' 
                  : check.status === 'SSR'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {check.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComponentCheck;