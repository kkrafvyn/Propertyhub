import React from 'react';

export const DebugInfo: React.FC = () => {
  const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR';
  const viewport = typeof window !== 'undefined' ? 
    `${window.innerWidth}x${window.innerHeight}` : 'SSR';

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white text-xs p-2 rounded font-mono z-[9999] max-w-xs">
      <div>PropertyHub Debug</div>
      <div>Viewport: {viewport}</div>
      <div>UA: {userAgent.slice(0, 50)}...</div>
      <div>React: {React.version}</div>
    </div>
  );
};

export default DebugInfo;