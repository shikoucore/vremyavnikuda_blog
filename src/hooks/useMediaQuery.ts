import { useState, useEffect } from 'react';

/**
 * Custom hook for detecting media query matches
 * @param query - CSS media query string (e.g., '(min-width: 768px)')
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  // Initialize with actual value if window exists
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    // Check if window is defined (SSR safety)
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    
    // Set initial value
    setMatches(mediaQuery.matches);

    // Create event listener
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener (using addEventListener for better compatibility)
    mediaQuery.addEventListener('change', handleChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}

/**
 * Predefined breakpoints for the project
 */
export const BREAKPOINTS = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
  tabletAndAbove: '(min-width: 768px)',
  desktopAndAbove: '(min-width: 1024px)',
} as const;

/**
 * Hook for detecting mobile viewport
 */
export function useIsMobile(): boolean {
  return useMediaQuery(BREAKPOINTS.mobile);
}

/**
 * Hook for detecting tablet viewport
 */
export function useIsTablet(): boolean {
  return useMediaQuery(BREAKPOINTS.tablet);
}

/**
 * Hook for detecting desktop viewport
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(BREAKPOINTS.desktop);
}

/**
 * Hook that returns current device type
 */
export function useDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();

  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  if (isDesktop) return 'desktop';
  
  // Fallback to desktop
  return 'desktop';
}
