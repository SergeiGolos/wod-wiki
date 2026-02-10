/**
 * useScreenMode Hook
 *
 * Detects the current screen mode based on viewport width.
 * Uses window.matchMedia for efficient responsive detection.
 */

import { useEffect, useState } from 'react';
import type { ScreenMode } from './types';

/**
 * Breakpoint definitions (matches Tailwind CSS defaults)
 * - mobile: < 768px
 * - tablet: 768px - 1023px
 * - desktop: ≥ 1024px
 */
const BREAKPOINTS = {
  mobile: 768,
  desktop: 1024,
} as const;

/**
 * Determine screen mode from window width
 */
function getScreenMode(width: number): ScreenMode {
  if (width < BREAKPOINTS.mobile) {
    return 'mobile';
  }
  if (width < BREAKPOINTS.desktop) {
    return 'tablet';
  }
  return 'desktop';
}

/**
 * Hook to detect and track the current screen mode
 *
 * Returns 'desktop' | 'tablet' | 'mobile' based on viewport width.
 * Automatically updates when the viewport is resized.
 *
 * @example
 * ```tsx
 * const screenMode = useScreenMode();
 *
 * if (screenMode === 'mobile') {
 *   return <MobileLayout />;
 * }
 * return <DesktopLayout />;
 * ```
 */
export function useScreenMode(): ScreenMode {
  // Initialize with current screen mode (SSR-safe)
  const [screenMode, setScreenMode] = useState<ScreenMode>(() => {
    if (typeof window === 'undefined') {
      return 'desktop'; // Default for SSR
    }
    return getScreenMode(window.innerWidth);
  });

  useEffect(() => {
    // Use ResizeObserver for better performance than window.addEventListener('resize')
    // Falls back to matchMedia if ResizeObserver is not available
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      const newMode = getScreenMode(window.innerWidth);
      setScreenMode((currentMode) => {
        // Only update if mode actually changed
        if (currentMode !== newMode) {
          return newMode;
        }
        return currentMode;
      });
    };

    // Initial check
    handleResize();

    // Set up resize listener
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return screenMode;
}

/**
 * Hook to check if current screen mode matches a specific mode
 *
 * @example
 * ```tsx
 * const isMobile = useIsScreenMode('mobile');
 * const isDesktop = useIsScreenMode('desktop');
 * ```
 */
export function useIsScreenMode(mode: ScreenMode): boolean {
  const currentMode = useScreenMode();
  return currentMode === mode;
}

/**
 * Hook to get viewport width (for advanced responsive logic)
 */
export function useViewportWidth(): number {
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === 'undefined') {
      return 1024; // Default for SSR
    }
    return window.innerWidth;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      setWidth(window.innerWidth);
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return width;
}
