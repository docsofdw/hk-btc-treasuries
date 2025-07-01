'use client';

import { useState, useEffect } from 'react';

// Breakpoint constants for consistency
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export function useIsMobile(breakpoint: number = BREAKPOINTS.sm): boolean {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Avoid hydration mismatch by checking if we're in the browser
    if (typeof window === 'undefined') return;

    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
      setIsLoaded(true);
    };

    // Set initial value
    checkIsMobile();

    // Add event listener
    window.addEventListener('resize', checkIsMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile);
  }, [breakpoint]);

  // Return false during SSR to prevent hydration issues
  return isLoaded && isMobile;
}

export function useBreakpoint() {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<keyof typeof BREAKPOINTS | 'xs'>('xs');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width >= BREAKPOINTS['2xl']) {
        setCurrentBreakpoint('2xl');
      } else if (width >= BREAKPOINTS.xl) {
        setCurrentBreakpoint('xl');
      } else if (width >= BREAKPOINTS.lg) {
        setCurrentBreakpoint('lg');
      } else if (width >= BREAKPOINTS.md) {
        setCurrentBreakpoint('md');
      } else if (width >= BREAKPOINTS.sm) {
        setCurrentBreakpoint('sm');
      } else {
        setCurrentBreakpoint('xs');
      }
      
      setIsLoaded(true);
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);

    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  return {
    current: isLoaded ? currentBreakpoint : 'xs',
    isMobile: isLoaded && currentBreakpoint === 'xs',
    isTablet: isLoaded && (currentBreakpoint === 'sm' || currentBreakpoint === 'md'),
    isDesktop: isLoaded && ['lg', 'xl', '2xl'].includes(currentBreakpoint),
    isLoaded,
  };
}
