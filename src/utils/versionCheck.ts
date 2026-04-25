// Version compatibility check utility
export const VERSION_INFO = {
  app: '1.0.0',
  react: '18+',
  node: '18+',
  lastUpdated: '2024-12-09'
};

export const checkCompatibility = () => {
  const checks = {
    react: typeof window !== 'undefined' && typeof document !== 'undefined',
    localStorage: typeof localStorage !== 'undefined',
    serviceWorker: 'serviceWorker' in navigator,
    geolocation: 'geolocation' in navigator,
    notifications: 'Notification' in window,
    webShare: 'share' in navigator
  };

  const warnings = [];
  
  if (!checks.localStorage) {
    warnings.push('localStorage not available - some features may not work offline');
  }
  
  if (!checks.serviceWorker) {
    warnings.push('Service Worker not supported - offline features disabled');
  }
  
  if (!checks.geolocation) {
    warnings.push('Geolocation not available - location features disabled');
  }

  return {
    compatible: checks.react && checks.localStorage,
    features: checks,
    warnings
  };
};

export const getSystemInfo = () => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    hardwareConcurrency: navigator.hardwareConcurrency,
    ...checkCompatibility()
  };
};