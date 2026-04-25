import React, { createContext, useContext, useEffect, useState } from 'react';

interface PWAProviderState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  installApp: () => void;
}

const PWAContext = createContext<PWAProviderState>({
  isInstallable: false,
  isInstalled: false,
  isOffline: false,
  installApp: () => {},
});

interface PWAProviderProps {
  children: React.ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    try {
      // Check if already installed
      const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches;
      setIsInstalled(isRunningStandalone);

      // Listen for install prompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setIsInstallable(true);
      };

      // Listen for app installed
      const handleAppInstalled = () => {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
      };

      // Listen for offline/online
      const handleOffline = () => setIsOffline(true);
      const handleOnline = () => setIsOffline(false);

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);
      window.addEventListener('offline', handleOffline);
      window.addEventListener('online', handleOnline);

      // Initial offline check
      setIsOffline(!navigator.onLine);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('online', handleOnline);
      };
    } catch (error) {
      console.warn('PWA features not available:', error);
    }
  }, []);

  const installApp = async () => {
    try {
      if (deferredPrompt) {
        const result = await deferredPrompt.prompt();
        if (result.outcome === 'accepted') {
          setIsInstallable(false);
          setDeferredPrompt(null);
        }
      }
    } catch (error) {
      console.warn('Failed to install app:', error);
    }
  };

  return (
    <PWAContext.Provider value={{ isInstallable, isInstalled, isOffline, installApp }}>
      {children}
    </PWAContext.Provider>
  );
}

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};