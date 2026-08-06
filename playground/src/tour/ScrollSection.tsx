/**
 * ScrollSection.tsx — shared scroll-section primitive for the home page redraw.
 *
 * Powers both the UI tour section and all six chapter hero sections.
 *
 * Form Factors:
 *  - Mobile (lg:hidden): top-sticky window (top 65px, ~50vh height) with cards below.
 *  - Desktop (lg:flex): side-sticky left column (w-[360px]) with cards in the right flow column.
 *  - prefers-reduced-motion: flat static vertical stack of cards (no sticky positioning).
 *
 * Lazy Mount / Memory Budget:
 *  - Uses IntersectionObserver (rootMargin: '200px') to notify parent via `onVisibilityChange`.
 *  - Parent can unmount heavy interior CodeMirror instances when far offscreen.
 */

import React, { useEffect, useRef } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { cn } from '@/lib/utils'

export interface ScrollSectionProps {
  id: string
  title?: string
  stickyView: React.ReactNode
  slides: React.ReactNode
  footer?: React.ReactNode
  onVisibilityChange?: (visible: boolean) => void
  /**
   * Fired with the slide index that currently occupies the reading zone
   * (each slide must carry `data-slide-index="{i}"`). Debounced to index
   * changes. Drives the morphing-window chapter tour.
   */
  onActiveSlideChange?: (index: number) => void
  className?: string
}

export function ScrollSection({
  id,
  title,
  stickyView,
  slides,
  footer,
  onVisibilityChange,
  onActiveSlideChange,
  className,
}: ScrollSectionProps) {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const sectionRef = useRef<HTMLElement | null>(null)
  const activeIndexRef = useRef<number>(-1)

  useEffect(() => {
    if (!onVisibilityChange || !sectionRef.current || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        onVisibilityChange(entry.isIntersecting)
      },
      { rootMargin: '200px' },
    )
    observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [onVisibilityChange])

  // Active-slide tracking: the slide whose slot crosses the vertical reading
  // zone (middle band of the viewport) is reported to the parent. Debounced
  // to index changes so the window morph happens per slide, never per-pixel.
  useEffect(() => {
    if (!onActiveSlideChange || !sectionRef.current || typeof IntersectionObserver === 'undefined') return
    const root = sectionRef.current
    const slots = Array.from(root.querySelectorAll<HTMLElement>('[data-slide-index]'))
    if (slots.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const idx = Number((entry.target as HTMLElement).dataset.slideIndex)
          if (Number.isNaN(idx) || idx === activeIndexRef.current) continue
          activeIndexRef.current = idx
          onActiveSlideChange(idx)
        }
      },
      // Only the middle band of the viewport counts as "in the reading zone".
      { rootMargin: '-45% 0px -45% 0px' },
    )
    slots.forEach((slot) => observer.observe(slot))
    return () => observer.disconnect()
  }, [onActiveSlideChange])

  // Reduced motion: flat static vertical stack without sticky positioning
  if (prefersReducedMotion) {
    return (
      <section
        ref={sectionRef}
        id={id}
        data-testid={`scroll-section-${id}`}
        className={cn('py-8 border-b border-border/60', className)}
      >
        {title && (
          <h2 className="mb-4 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            {title}
          </h2>
        )}
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
            {stickyView}
          </div>
          <div className="flex flex-col gap-4">{slides}</div>
          {footer && <div className="mt-2">{footer}</div>}
        </div>
      </section>
    )
  }

  return (
    <section
      ref={sectionRef}
      id={id}
      data-testid={`scroll-section-${id}`}
      className={cn('relative py-8 border-b border-border/60', className)}
    >
      {title && (
        <h2 className="mb-4 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          {title}
        </h2>
      )}

      {/* Mobile: flat stack (editor block above grouped slides). Desktop: side-sticky 2/3 : 1/3. */}
      <div className="lg:flex lg:items-start lg:gap-6">
        {/* Editor window — flat on mobile (sized to fit, internal scroll), side-sticky on desktop */}
        <div
          data-testid="scroll-section-sticky-window"
          className={cn(
            'overflow-hidden rounded-2xl border border-border bg-background shadow-2xl',
            // Mobile: flat block, horizontal margin + comfortable height that
            // fits the editor (CodeMirror scrolls internally — nothing clipped).
            'mx-4 mb-5 h-[55vh] min-h-[320px] max-h-[75vh]',
            // Desktop: side-sticky, code sample takes 2/3 of the width
            'lg:sticky lg:top-[80px] lg:z-20 lg:mx-0 lg:mb-0 lg:h-auto lg:w-auto lg:flex-[2_1_0%] lg:max-h-[calc(100vh-100px)] lg:p-4',
          )}
        >
          {stickyView}
        </div>

        {/* Slides — grouped list with horizontal padding on mobile, beside the window on desktop */}
        <div className="min-w-0 flex-1 flex flex-col gap-3 px-4 pb-2 lg:px-0 lg:pb-0 lg:py-0">
          {slides}
          {footer && <div className="mt-2">{footer}</div>}
        </div>
      </div>
    </section>
  )
}
