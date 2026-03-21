/**
 * ParallaxSection Component
 *
 * Scroll-driven section with IntersectionObserver step detection.
 * Extracted from playground/src/HomePage.tsx parallax logic.
 *
 * Uses position:sticky for overlay content and fires onStepChange
 * as each step enters the viewport. Respects prefers-reduced-motion.
 */

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** A single parallax step descriptor */
export interface ParallaxStepDescriptor {
  /** Content rendered for this step */
  content: ReactNode;
}

export interface ParallaxSectionProps {
  /** One element per step — observed by IntersectionObserver */
  steps: ParallaxStepDescriptor[];

  /** Callback fired when the most-visible step changes */
  onStepChange?: (step: number) => void;

  /** Minimum height per step element (default '100vh') */
  minHeight?: string;

  /** Sticky overlay content (nav, timer, preview panel, etc.) */
  children?: ReactNode;

  /** Additional CSS class for the outer section */
  className?: string;

  /** Section id for anchor navigation */
  id?: string;
}

/**
 * ParallaxSection
 *
 * Renders a scrollable list of steps with an IntersectionObserver that
 * selects the most-visible step.  A sticky child panel can overlay the
 * viewport alongside the steps.
 *
 * Accessibility: when `prefers-reduced-motion` is active, steps render
 * as a simple vertical list without parallax transitions.
 */
export function ParallaxSection({
  steps,
  onStepChange,
  minHeight = '100vh',
  children,
  className,
  id,
}: ParallaxSectionProps) {
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // IntersectionObserver step detection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (prefersReducedMotion) return; // skip observer when motion reduced

    const ratioMap = new Map<number, number>();
    const isMobile = window.matchMedia('(max-width: 1023px)').matches;
    const rootMargin = isMobile
      ? '-65px 0px -20% 0px'
      : '-30% 0px -30% 0px';

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = parseInt(entry.target.getAttribute('data-step') ?? '0', 10);
          if (entry.isIntersecting) {
            ratioMap.set(idx, entry.intersectionRatio);
          } else {
            ratioMap.delete(idx);
          }
        });

        let bestIdx = -1;
        let bestRatio = -1;
        ratioMap.forEach((ratio, idx) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIdx = idx;
          }
        });
        if (bestIdx >= 0) {
          setActiveStep(bestIdx);
        }
      },
      { rootMargin, threshold: [0, 0.1, 0.25, 0.5, 0.75] },
    );

    stepRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  // Notify parent when active step changes
  const onStepChangeRef = useRef(onStepChange);
  onStepChangeRef.current = onStepChange;

  useEffect(() => {
    onStepChangeRef.current?.(activeStep);
  }, [activeStep]);

  // Assign ref callback
  const setStepRef = useCallback(
    (idx: number) => (el: HTMLDivElement | null) => {
      stepRefs.current[idx] = el;
    },
    [],
  );

  // Reduced-motion fallback: simple stacked layout
  if (prefersReducedMotion) {
    return (
      <section id={id} className={cn('relative', className)}>
        {children && <div className="mb-6">{children}</div>}
        <div className="flex flex-col gap-8">
          {steps.map((step, idx) => (
            <div key={idx}>{step.content}</div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section id={id} className={cn('relative', className)}>
      <div className="lg:flex">
        {/* Sticky overlay panel (desktop: side, mobile: top) */}
        {children && (
          <div
            className="lg:w-[60%] self-start sticky hidden lg:block p-6 pt-8 pb-8"
            style={{ top: '104px', height: 'calc(100vh - 104px)' }}
          >
            {children}
          </div>
        )}

        {/* Step list */}
        <div className={cn('w-full', children && 'lg:w-[40%]')}>
          {steps.map((step, idx) => (
            <div
              key={idx}
              ref={setStepRef(idx)}
              data-step={String(idx)}
              className="flex items-center py-16 lg:py-24 px-6 lg:px-10"
              style={{ minHeight }}
            >
              <div
                className={cn(
                  'transition-all duration-500',
                  activeStep === idx
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-[0.05] translate-y-3',
                )}
              >
                {step.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ParallaxSection;
