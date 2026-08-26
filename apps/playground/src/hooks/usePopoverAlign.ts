/**
 * usePopoverAlign — computes the best Radix align value ('start' | 'end')
 * for a popover/dropdown based on the trigger element's horizontal position
 * relative to the viewport.
 *
 * - Trigger in the right half  → 'end'   (popover extends left, stays in view)
 * - Trigger in the left half   → 'start' (popover extends right, stays in view)
 *
 * Call `recompute` just before opening the popover (e.g. in onOpenChange).
 */

import { useCallback, useRef, useState } from 'react';

export type PopoverAlign = 'start' | 'end';

export function usePopoverAlign(defaultAlign: PopoverAlign = 'end') {
  const triggerRef = useRef<HTMLElement | null>(null);
  const [align, setAlign] = useState<PopoverAlign>(defaultAlign);

  const recompute = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const { left, right } = el.getBoundingClientRect();
    const center = (left + right) / 2;
    setAlign(center > window.innerWidth / 2 ? 'end' : 'start');
  }, []);

  return { triggerRef, align, recompute };
}
