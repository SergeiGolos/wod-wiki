import { useEffect, useState } from 'react';

export interface VisualViewportRect {
  /**
   * Visible viewport height in px, or null when the VisualViewport API is
   * unavailable (SSR, older engines). Consumers should fall back to a
   * dynamic-viewport unit (e.g. `100dvh`) in that case.
   */
  height: number | null;
  /** Distance from the layout viewport top to the visual viewport top (pinch-zoom). */
  offsetTop: number;
  /**
   * Distance the visual viewport's bottom edge sits above the layout
   * viewport's bottom edge — i.e. the on-screen keyboard's height (0 when
   * the keyboard is closed).
   */
  offsetBottom: number;
}

function readVisualViewport(): VisualViewportRect {
  if (typeof window === 'undefined' || !window.visualViewport) {
    return { height: null, offsetTop: 0, offsetBottom: 0 };
  }
  const vv = window.visualViewport;
  return {
    height: vv.height,
    offsetTop: vv.offsetTop,
    offsetBottom: Math.max(0, window.innerHeight - vv.height - vv.offsetTop),
  };
}

/**
 * Tracks `window.visualViewport` (resize + scroll). Drives keyboard-aware
 * bottom-anchored UI (dialogs, thumb docks) without keyboard-size guessing
 * or browser sniffing: the platform reports the visible rectangle.
 */
export function useVisualViewportRect(): VisualViewportRect {
  const [rect, setRect] = useState<VisualViewportRect>(readVisualViewport);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setRect(readVisualViewport());
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return rect;
}
