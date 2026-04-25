import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from "sonner";
import { Property, PropertyFilters, User as UserType, AppState, Notification } from '../types';
import { mockProperties, getDefaultFilters } from '../data/mockData';
import { useMobile } from './useMobile';

// Extended app state type for internal use
type ExtendedAppState = AppState | 'splash' | 'auth-landing' | 'mobile-demo';

export const useAppCore = () => {
  // Initialize state with safe defaults
  const [appState, setAppState] = useState<ExtendedAppState>('splash');
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [properties] = useState(() => {
    try {
      return mockProperties;
    } catch (error) {
      console.error('Error loading mock properties:', error);
      return [];
    }
  });
  const [filters, setFilters] = useState<PropertyFilters>((): PropertyFilters => {
    try {
      return getDefaultFilters();
    } catch (error) {
      console.warn('Error getting default filters, using fallback:', error);
      // Fallback filters with more defensive programming
      return {
        type: [],
        priceRange: [0, 1000000] as [number, number],
        location: [],
        bedrooms: [],
        bathrooms: [],
        areaRange: [0, 10000] as [number, number],
        amenities: [],
        availability: []
      };
    }
  });
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isMobileMode, setIsMobileMode] = useState(false);
  
  // Safe mobile hook call
  const isMobile = useMobile();

  // Error handling wrapper for handlers
  const safeHandler = useCallback((handler: () => void, errorMessage: string) => {
    try {
      handler();
    } catch (error) {
      console.error(errorMessage, error);
      toast.error(`An error occurred: ${errorMessage}`);
    }
  }, []);

  // Memoized user data for performance
  const memoizedUserData = useMemo(() => {
    try {
      return {
        currentUser,
        userInitials: currentUser?.name?.charAt(0)?.toUpperCase() || '',
        isAdminOrManager: currentUser?.role === 'admin' || currentUser?.role === 'manager'
      };
    } catch (error) {
      console.warn('Error creating memoized user data:', error);
      return {
        currentUser: null,
        userInitials: '',
        isAdminOrManager: false
      };
    }
  }, [currentUser]);

  // Auto-detect mobile mode with error handling
  useEffect(() => {
    try {
      setIsMobileMode(isMobile);
    } catch (error) {
      console.warn('Error setting mobile mode:', error);
    }
  }, [isMobile]);

  // PWA installation prompt with error handling
  useEffect(() => {
    let deferredPrompt: any;

    const handleBeforeInstallPrompt = (e: Event) => {
      try {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show install notification after user is logged in
        if (currentUser) {
          toast.info('Install PropertyHub app for better experience!', {
            action: {
              label: 'Install',
              onClick: () => {
                safeHandler(() => {
                  if (deferredPrompt) {
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then((choiceResult: any) => {
                      if (choiceResult.outcome === 'accepted') {
                        toast.success('App installed successfully!');
                      }
                      deferredPrompt = null;
                    });
                  }
                }, 'Failed to install app');
              },
            },
          });
        }
      } catch (error) {
        console.warn('Error handling install prompt:', error);
      }
    };

    try {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    } catch (error) {
      console.warn('PWA install prompt not available:', error);
    }

    return () => {
      try {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      } catch (error) {
        console.warn('Error removing install prompt listener:', error);
      }
    };
  }, [currentUser, safeHandler]);

  // Service Worker registration with better error handling
  useEffect(() => {
    // Service worker registration disabled in preview environment
    console.log('Service worker registration disabled in preview environment');
    /*
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  toast.info('New version available!', {
                    action: {
                      label: 'Refresh',
                      onClick: () => window.location.reload()
                    }
                  });
                }
              });
            }
          });
        })
        .catch((error) => {
          console.log('SW registration failed: ', error);
        });
    }
    */
  }, []);

  const handleLogin = useCallback((user: UserType) => {
    safeHandler(() => {
      setCurrentUser(user);
      setAppState('main');
      toast.success(`Welcome back, ${user.name}! 🎉`);
      
      // Add welcome notification
      const welcomeNotification: Notification = {
        id: Date.now().toString(),
        userId: user.id,
        title: 'Welcome Back!',
        message: `Hello ${user.name}, you're successfully logged in.`,
        type: 'success',
        read: false,
        timestamp: new Date().toISOString(),
        priority: 'normal',
        category: 'system'
      };
      
      setNotifications(prev => [...prev, welcomeNotification]);
    }, 'Failed to log in user');
  }, [safeHandler]);

  const handleLogout = useCallback(() => {
    safeHandler(() => {
      setCurrentUser(null);
      setAppState('auth-landing');
      setSelectedProperty(null);
      setNotifications([]);
      toast.info('Logged out successfully');
    }, 'Failed to log out user');
  }, [safeHandler]);

  const handlePropertySelect = useCallback((property: Property) => {
    safeHandler(() => {
      setSelectedProperty(property);
    }, 'Failed to select property');
  }, [safeHandler]);

  const handleNavigation = useCallback((newState: ExtendedAppState) => {
    safeHandler(() => {
      setAppState(newState);
      setSelectedProperty(null);
      setShowMobileNav(false);
    }, 'Failed to navigate');
  }, [safeHandler]);

  const handleNotificationRead = useCallback((id: string) => {
    safeHandler(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 'Failed to mark notification as read');
  }, [safeHandler]);

  const handleToggleMobileNav = useCallback(() => {
    safeHandler(() => {
      setShowMobileNav(!showMobileNav);
    }, 'Failed to toggle mobile navigation');
  }, [showMobileNav, safeHandler]);

  return {
    // State
    appState,
    setAppState,
    currentUser,
    properties,
    filters,
    setFilters,
    selectedProperty,
    setSelectedProperty,
    showMobileNav,
    notifications,
    isMobileMode,
    memoizedUserData,
    
    // Handlers
    handleLogin,
    handleLogout,
    handlePropertySelect,
    handleNavigation,
    handleNotificationRead,
    handleToggleMobileNav
  };
};