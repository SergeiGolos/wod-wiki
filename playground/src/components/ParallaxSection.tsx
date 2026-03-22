import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MacOSChrome } from '../components/MacOSChrome'
import type { ParallaxStep } from '../data/parallaxActSteps'

// Height of the standard sticky header (px) — used to offset sticky panels below it
export const STICKY_NAV_HEIGHT = 104
// Mobile sticky offset — panels sit closer to the top on smaller screens
export const MOBILE_STICKY_TOP = 65

export function scrollToSection(id: string, behavior: ScrollBehavior = 'smooth') {
  const el = document.getElementById(id)
  if (!el) return
  const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const top = el.getBoundingClientRect().top + window.scrollY - STICKY_NAV_HEIGHT
  window.scrollTo({ top, behavior: motionOk ? behavior : 'auto' })
}

export interface ParallaxSectionProps {
  id: string
  steps: ParallaxStep[]
  stickyContent: (activeStep: number, selectedExample: number) => ReactNode
  stickyAlign?: 'left' | 'right'
  chromeTitle?: string
  className?: string
  onReset?: () => void
  /** Extra actions rendered in the MacOS chrome header bar */
  headerActions?: ReactNode
  /** Content rendered above the step list in the text column.
   * On mobile, this appears below the sticky panel (visible while scrolling). */
  headerContent?: ReactNode
  /** Render extra content below the body text for a specific step */
  renderStepExtra?: (stepIdx: number, activeStep: number) => ReactNode | null
}

export function ParallaxSection({ id, steps, stickyContent, stickyAlign = 'right', chromeTitle = 'WodScript', className, onReset, headerActions, headerContent, renderStepExtra }: ParallaxSectionProps) {
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])
  const [activeStep, setActiveStep] = useState(0)
  const [selectedExamples, setSelectedExamples] = useState<number[]>(() => steps.map(() => 0))

  const selectExample = useCallback((stepIdx: number, exIdx: number) => {
    setSelectedExamples(prev => {
      const next = [...prev]
      next[stepIdx] = exIdx
      return next
    })
  }, [])

  useEffect(() => {
    const ratioMap = new Map<number, number>()
    const isMobile = window.matchMedia('(max-width: 1023px)').matches
    const rootMargin = isMobile
      ? `-${MOBILE_STICKY_TOP + 40}px 0px -20% 0px`
      : '-30% 0px -30% 0px'
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const idx = parseInt(entry.target.getAttribute('data-step') ?? '0')
          if (entry.isIntersecting) {
            ratioMap.set(idx, entry.intersectionRatio)
          } else {
            ratioMap.delete(idx)
          }
        })
        let bestIdx = -1
        let bestRatio = -1
        ratioMap.forEach((ratio, idx) => {
          if (ratio > bestRatio) { bestRatio = ratio; bestIdx = idx }
        })
        if (bestIdx >= 0) setActiveStep(bestIdx)
      },
      { rootMargin, threshold: [0, 0.1, 0.25, 0.5, 0.75] }
    )
    stepRefs.current.forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  const currentExample = selectedExamples[activeStep] ?? 0
  const stickyPanel = stickyContent(activeStep, currentExample)

  // ── Desktop: 60% sticky panel
  const desktopPanelNode = (
    <div
      className="w-[60%] self-start sticky hidden lg:block p-6 pt-8 pb-8"
      style={{ top: `${STICKY_NAV_HEIGHT}px`, height: `calc(100vh - ${STICKY_NAV_HEIGHT}px)` }}
    >
      <MacOSChrome title={chromeTitle} onReset={onReset} headerActions={headerActions}>
        {stickyPanel}
      </MacOSChrome>
    </div>
  )

  // ── Mobile: sticky top panel
  const mobilePanelNode = (
    <div
      className="lg:hidden sticky z-10 shrink-0 px-4 pt-4 pb-3"
      style={{ top: `${MOBILE_STICKY_TOP}px`, height: `calc(40vh - ${MOBILE_STICKY_TOP / 2}px)` }}
    >
      <MacOSChrome title={chromeTitle} onReset={onReset} headerActions={headerActions}>
        {stickyPanel}
      </MacOSChrome>
    </div>
  )

  const textSteps = steps.map((step, idx) => {
    const examples = step.examples ?? []
    const selIdx = selectedExamples[idx] ?? 0

    return (
      <div
        key={idx}
        ref={el => { stepRefs.current[idx] = el }}
        data-step={String(idx)}
        className="min-h-[70vh] lg:min-h-screen flex items-center py-16 lg:py-24 px-6 lg:px-10"
      >
        <div className={cn(
          "max-w-sm transition-all duration-500",
          activeStep === idx ? "opacity-100 translate-y-0" : "opacity-[0.05] translate-y-3"
        )}>
          <div className="text-[10px] font-black tracking-[0.25em] uppercase text-primary mb-4">
            {step.eyebrow}
          </div>
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground uppercase leading-tight mb-5">
            {step.title}
          </h2>
          <p className="text-sm lg:text-[15px] font-medium text-muted-foreground leading-relaxed mb-6">
            {step.body}
          </p>
          {/* Example selector tabs */}
          {examples.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {examples.map((ex, exIdx) => (
                <button
                  key={exIdx}
                  onClick={() => selectExample(idx, exIdx)}
                  className={cn(
                    "text-[10px] font-black uppercase tracking-[0.12em] px-3.5 py-1.5 rounded-full transition-all ring-1",
                    selIdx === exIdx
                      ? "bg-primary text-primary-foreground ring-primary/30 shadow-md"
                      : "bg-muted/50 text-muted-foreground ring-transparent hover:bg-muted hover:ring-border"
                  )}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          )}
          {step.cta && (
            <button
              onClick={() => scrollToSection(step.cta!.target)}
              className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full bg-primary text-primary-foreground font-black text-sm uppercase tracking-wider shadow-lg hover:shadow-primary/30 hover:scale-[1.04] transition-all"
            >
              {step.cta.label}
              <ChevronDown className="size-4" />
            </button>
          )}
          {renderStepExtra?.(idx, activeStep)}
        </div>
      </div>
    )
  })

  return (
    <section id={id} className={cn("relative border-b border-border/50", className)}>
      <div className="lg:flex">
        {stickyAlign === 'left' && desktopPanelNode}
        <div className="w-full lg:w-[40%]">
          {mobilePanelNode}
          {headerContent && (
            <div className="px-6 lg:px-10 pb-4 pt-2 border-b border-border/30">
              {headerContent}
            </div>
          )}
          {textSteps}
        </div>
        {stickyAlign === 'right' && desktopPanelNode}
      </div>
    </section>
  )
}
