import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;
const XL_BREAKPOINT = 1280;

const getViewportWidth = () => (typeof window === 'undefined' ? XL_BREAKPOINT : window.innerWidth);

const getBreakpoint = (width: number): 'sm' | 'md' | 'lg' | 'xl' | '2xl' => {
  if (width < 640) return 'sm';
  if (width < MOBILE_BREAKPOINT) return 'md';
  if (width < TABLET_BREAKPOINT) return 'lg';
  if (width < XL_BREAKPOINT) return 'xl';
  return '2xl';
};

const getDeviceType = (width: number): 'mobile' | 'tablet' | 'desktop' => {
  if (width < MOBILE_BREAKPOINT) return 'mobile';
  if (width < TABLET_BREAKPOINT) return 'tablet';
  return 'desktop';
};

function useViewportWidth() {
  const [width, setWidth] = useState(() => getViewportWidth());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const updateWidth = () => {
      setWidth(window.innerWidth);
    };

    updateWidth();

    window.addEventListener('resize', updateWidth, { passive: true });
    mediaQuery.addEventListener('change', updateWidth);

    return () => {
      window.removeEventListener('resize', updateWidth);
      mediaQuery.removeEventListener('change', updateWidth);
    };
  }, []);

  return width;
}

export function useMobile() {
  const width = useViewportWidth();
  return width < MOBILE_BREAKPOINT;
}

export const useIsMobile = useMobile;

export function useBreakpoint() {
  const width = useViewportWidth();
  return getBreakpoint(width);
}

export function useDeviceType() {
  const width = useViewportWidth();
  return getDeviceType(width);
}

export default useMobile;
