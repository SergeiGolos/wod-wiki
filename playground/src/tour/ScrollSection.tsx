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
  className?: string
}

export function ScrollSection({
  id,
  title,
  stickyView,
  slides,
  footer,
  onVisibilityChange,
  className,
}: ScrollSectionProps) {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const sectionRef = useRef<HTMLElement | null>(null)

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
      className={cn('relative px-4 py-6 border-b border-border/60 lg:px-0', className)}
    >
      {title && (
        <h2 className="mb-3 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          {title}
        </h2>
      )}

      {/* Mobile: top-sticky window pins while quest cards scroll below, releases after the last card. Desktop: side-sticky 2/3 : 1/3. */}
      <div className="lg:flex lg:items-start lg:gap-6">
        {/* Editor window — top-sticky on mobile (content-height, no dead whitespace), side-sticky on desktop */}
        <div
          data-testid="scroll-section-sticky-window"
          className={cn(
            'overflow-hidden rounded-2xl border border-border bg-background shadow-2xl',
            // Mobile: top-sticky at the mobile header (65px). Content-height
            // (~250px, the longest chapter example) so short examples leave no
            // dead whitespace — pins while the quest cards scroll below and
            // releases after the last card (#923/#924; replaces flat block).
            'sticky top-[65px] z-20 mb-4 h-[250px]',
            // Desktop: side-sticky, code sample takes 2/3 of the width
            'lg:sticky lg:top-[80px] lg:z-20 lg:mx-0 lg:mb-0 lg:h-auto lg:w-auto lg:flex-[2_1_0%] lg:max-h-[calc(100vh-100px)] lg:p-4',
          )}
        >
          {stickyView}
        </div>

        {/* Slides — grouped list with horizontal padding on mobile, beside the window on desktop */}
        <div className="min-w-0 flex-1 flex flex-col gap-2 pb-1 lg:px-0 lg:pb-0 lg:py-0">
          {slides}
          {footer && <div className="mt-2">{footer}</div>}
        </div>
      </div>
    </section>
  )
}
