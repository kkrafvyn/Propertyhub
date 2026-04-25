import { useState, useEffect } from 'react';

/**
 * Safe mobile detection with comprehensive error handling
 */

const MOBILE_BREAKPOINT = 768;

/**
 * Safe window access with fallbacks
 */
const safeWindow = {
  get innerWidth() {
    try {
      return typeof window !== 'undefined' ? window.innerWidth : 1024;
    } catch (error) {
      console.warn('⚠️ Window innerWidth not available:', error);
      return 1024; // Desktop fallback
    }
  },
  
  get matchMedia() {
    try {
      return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia.bind(window) : null;
    } catch (error) {
      console.warn('⚠️ Window matchMedia not available:', error);
      return null;
    }
  },

  addEventListener(event: string, handler: () => void) {
    try {
      if (typeof window !== 'undefined') {
        window.addEventListener(event, handler);
      }
    } catch (error) {
      console.warn('⚠️ Window addEventListener not available:', error);
    }
  },

  removeEventListener(event: string, handler: () => void) {
    try {
      if (typeof window !== 'undefined') {
        window.removeEventListener(event, handler);
      }
    } catch (error) {
      console.warn('⚠️ Window removeEventListener not available:', error);
    }
  }
};

export function useMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    try {
      // Server-side rendering safe initial value
      if (typeof window === 'undefined') {
        return false;
      }
      return safeWindow.innerWidth < MOBILE_BREAKPOINT;
    } catch (error) {
      console.warn('⚠️ Error in useMobile initial state:', error);
      return false;
    }
  });

  useEffect(() => {
    try {
      const checkIsMobile = () => {
        try {
          const newIsMobile = safeWindow.innerWidth < MOBILE_BREAKPOINT;
          setIsMobile(newIsMobile);
        } catch (error) {
          console.warn('⚠️ Error checking mobile state:', error);
        }
      };
      
      // Check on mount
      checkIsMobile();
      
      // Use modern matchMedia for better performance if available
      const matchMedia = safeWindow.matchMedia;
      if (matchMedia) {
        try {
          const mql = matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
          const onChange = () => {
            try {
              setIsMobile(safeWindow.innerWidth < MOBILE_BREAKPOINT);
            } catch (error) {
              console.warn('⚠️ Error in media query change handler:', error);
            }
          };
          
          // Modern browsers
          if ('addEventListener' in mql) {
            mql.addEventListener('change', onChange);
            return () => {
              try {
                mql.removeEventListener('change', onChange);
              } catch (error) {
                console.warn('⚠️ Error removing media query listener:', error);
              }
            };
          }
          // Legacy browsers
          else if ('addListener' in mql) {
            (mql as any).addListener(onChange);
            return () => {
              try {
                (mql as any).removeListener(onChange);
              } catch (error) {
                console.warn('⚠️ Error removing legacy media query listener:', error);
              }
            };
          }
        } catch (error) {
          console.warn('⚠️ Error setting up media query listener:', error);
        }
      }
      
      // Fallback to resize listener
      const handleResize = () => {
        try {
          setIsMobile(safeWindow.innerWidth < MOBILE_BREAKPOINT);
        } catch (error) {
          console.warn('⚠️ Error in resize handler:', error);
        }
      };
      
      safeWindow.addEventListener('resize', handleResize);
      return () => {
        try {
          safeWindow.removeEventListener('resize', handleResize);
        } catch (error) {
          console.warn('⚠️ Error removing resize listener:', error);
        }
      };
    } catch (error) {
      console.error('❌ Error in useMobile useEffect:', error);
      return () => {}; // Safe cleanup function
    }
  }, []);

  return isMobile;
}

// Export alias for compatibility with UI components
export const useIsMobile = useMobile;

/**
 * Hook for responsive breakpoints with error handling
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<'sm' | 'md' | 'lg' | 'xl' | '2xl'>(() => {
    try {
      if (typeof window === 'undefined') return 'lg';
      
      const width = safeWindow.innerWidth;
      if (width < 640) return 'sm';
      if (width < 768) return 'md';
      if (width < 1024) return 'lg';
      if (width < 1280) return 'xl';
      return '2xl';
    } catch (error) {
      console.warn('⚠️ Error in useBreakpoint initial state:', error);
      return 'lg';
    }
  });

  useEffect(() => {
    try {
      const updateBreakpoint = () => {
        try {
          const width = safeWindow.innerWidth;
          let newBreakpoint: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
          
          if (width < 640) newBreakpoint = 'sm';
          else if (width < 768) newBreakpoint = 'md';
          else if (width < 1024) newBreakpoint = 'lg';
          else if (width < 1280) newBreakpoint = 'xl';
          else newBreakpoint = '2xl';
          
          setBreakpoint(newBreakpoint);
        } catch (error) {
          console.warn('⚠️ Error updating breakpoint:', error);
        }
      };

      updateBreakpoint();
      
      const handleResize = () => {
        try {
          updateBreakpoint();
        } catch (error) {
          console.warn('⚠️ Error in breakpoint resize handler:', error);
        }
      };

      safeWindow.addEventListener('resize', handleResize);
      return () => {
        try {
          safeWindow.removeEventListener('resize', handleResize);
        } catch (error) {
          console.warn('⚠️ Error removing breakpoint resize listener:', error);
        }
      };
    } catch (error) {
      console.error('❌ Error in useBreakpoint useEffect:', error);
      return () => {};
    }
  }, []);

  return breakpoint;
}

/**
 * Hook for device type detection with error handling
 */
export function useDeviceType() {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>(() => {
    try {
      if (typeof window === 'undefined') return 'desktop';
      
      const width = safeWindow.innerWidth;
      if (width < 768) return 'mobile';
      if (width < 1024) return 'tablet';
      return 'desktop';
    } catch (error) {
      console.warn('⚠️ Error in useDeviceType initial state:', error);
      return 'desktop';
    }
  });

  useEffect(() => {
    try {
      const updateDeviceType = () => {
        try {
          const width = safeWindow.innerWidth;
          let newDeviceType: 'mobile' | 'tablet' | 'desktop';
          
          if (width < 768) newDeviceType = 'mobile';
          else if (width < 1024) newDeviceType = 'tablet';
          else newDeviceType = 'desktop';
          
          setDeviceType(newDeviceType);
        } catch (error) {
          console.warn('⚠️ Error updating device type:', error);
        }
      };

      updateDeviceType();
      
      const handleResize = () => {
        try {
          updateDeviceType();
        } catch (error) {
          console.warn('⚠️ Error in device type resize handler:', error);
        }
      };

      safeWindow.addEventListener('resize', handleResize);
      return () => {
        try {
          safeWindow.removeEventListener('resize', handleResize);
        } catch (error) {
          console.warn('⚠️ Error removing device type resize listener:', error);
        }
      };
    } catch (error) {
      console.error('❌ Error in useDeviceType useEffect:', error);
      return () => {};
    }
  }, []);

  return deviceType;
}

export default useMobile;