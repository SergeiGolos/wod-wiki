import React, { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react'
import { Play, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MacOSChrome } from '../components/MacOSChrome'
import type { ParallaxStep } from '../data/parallaxActSteps'

// Height of the standard sticky header (px) — used to offset sticky panels below it
export const STICKY_NAV_HEIGHT = 104

// ── Bullet color map ─────────────────────────────────────────────────────────
const BULLET_LABEL_COLOR: Record<string, string> = {
  green:  'text-green-700 dark:text-green-400',
  blue:   'text-blue-700 dark:text-blue-400',
  orange: 'text-orange-700 dark:text-orange-400',
  purple: 'text-purple-700 dark:text-purple-400',
  cyan:   'text-cyan-700 dark:text-cyan-400',
  red:    'text-red-700 dark:text-red-400',
  pink:   'text-pink-700 dark:text-pink-400',
}

function bulletColorClass(label: string): string {
  const keyword = label.split(/[\s·]/)[0].toLowerCase().trim()
  return BULLET_LABEL_COLOR[keyword] ?? ''
}
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
  /** Content rendered above the step list in the text column */
  headerContent?: ReactNode
  /** Render extra content below the body text for a specific step */
  renderStepExtra?: (stepIdx: number, activeStep: number) => ReactNode | null
  /** Called whenever the active (most-visible) step index changes */
  onStepChange?: (stepIndex: number) => void
}

// ─── Step grouping ────────────────────────────────────────────────────────────

type StepMeta = { step: ParallaxStep; idx: number }
type StepGroup =
  | { kind: 'normal'; item: StepMeta }
  | { kind: 'clear'; item: StepMeta }
  | { kind: 'stickyGroup'; header: StepMeta; subs: StepMeta[] }

function buildGroups(steps: ParallaxStep[]): StepGroup[] {
  const groups: StepGroup[] = []
  let current: Extract<StepGroup, { kind: 'stickyGroup' }> | null = null

  steps.forEach((step, idx) => {
    if (step.sticky) {
      if (current) groups.push(current)
      current = { kind: 'stickyGroup', header: { step, idx }, subs: [] }
    } else if (step.subsection && current) {
      current.subs.push({ step, idx })
    } else if (step.clear) {
      if (current) { groups.push(current); current = null }
      groups.push({ kind: 'clear', item: { step, idx } })
    } else {
      if (current) { groups.push(current); current = null }
      groups.push({ kind: 'normal', item: { step, idx } })
    }
  })

  if (current) groups.push(current)
  return groups
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ParallaxSection({
  id,
  steps,
  stickyContent,
  stickyAlign = 'right',
  chromeTitle = 'WodScript',
  className,
  onReset,
  headerActions,
  headerContent,
  renderStepExtra,
  onStepChange,
}: ParallaxSectionProps) {
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])
  const [activeStep, setActiveStep] = useState(0)
  const [selectedExamples, setSelectedExamples] = useState<number[]>(() => steps.map(() => 0))

  const groups = useMemo(() => buildGroups(steps), [steps])

  // Notify parent when active step changes
  useEffect(() => {
    onStepChange?.(activeStep)
  }, [activeStep, onStepChange])

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

    let lastScrollY = window.scrollY
    let scrollDir: 1 | -1 = 1
    const trackScroll = () => {
      const y = window.scrollY
      if (y !== lastScrollY) scrollDir = y > lastScrollY ? 1 : -1
      lastScrollY = y
    }
    window.addEventListener('scroll', trackScroll, { passive: true })

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
        if (ratioMap.size === 0) return
        let bestIdx = -1
        if (scrollDir === -1) {
          // Scrolling up: activate the topmost (lowest-index) intersecting step
          ratioMap.forEach((_, idx) => {
            if (bestIdx < 0 || idx < bestIdx) bestIdx = idx
          })
        } else {
          // Scrolling down: activate the step with the highest intersection ratio
          let bestRatio = -1
          ratioMap.forEach((ratio, idx) => {
            if (ratio > bestRatio) { bestRatio = ratio; bestIdx = idx }
          })
        }
        if (bestIdx >= 0) setActiveStep(bestIdx)
      },
      { rootMargin, threshold: [0, 0.1, 0.25, 0.5, 0.75] }
    )
    stepRefs.current.forEach(el => { if (el) observer.observe(el) })
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', trackScroll)
    }
  }, [])

  const currentExample = selectedExamples[activeStep] ?? 0
  const stickyPanel = stickyContent(activeStep, currentExample)

  // ── Inline markdown parser (bold + code only, no HTML injection) ─────────
  function parseInlineMarkdown(text: string): React.ReactNode[] {
    const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let key = 0
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
      const m = match[0]
      if (m.startsWith('**')) {
        parts.push(<strong key={key++} className="font-bold text-foreground/90">{m.slice(2, -2)}</strong>)
      } else {
        parts.push(<code key={key++} className="font-mono text-[0.85em] bg-muted px-1 rounded">{m.slice(1, -1)}</code>)
      }
      lastIndex = match.index + m.length
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex))
    return parts
  }

  // ── Shared step body renderer ────────────────────────────────────────────
  function renderStepBody(
    item: StepMeta,
    variant: 'normal' | 'sub' | 'clear',
  ) {
    const { step, idx } = item
    const selIdx = selectedExamples[idx] ?? 0
    const isActive = activeStep === idx
    const examples = step.examples ?? []

    return (
      <div className={cn(
        'transition-all duration-500',
        isActive ? 'opacity-100 translate-y-0' : 'opacity-60',
        variant === 'clear' ? 'text-center max-w-md w-full' : 'max-w-sm',
      )}>
        {variant === 'clear' && <div className="w-12 h-px bg-border/50 mx-auto mb-6" />}
        {variant !== 'sub' && (
          <div className="text-[10px] font-black tracking-[0.25em] uppercase text-primary mb-4">
            {step.eyebrow}
          </div>
        )}
        {variant === 'sub' ? (
          <h3 className="text-base lg:text-lg font-black tracking-tight text-foreground uppercase leading-tight mb-4">
            {step.title}
          </h3>
        ) : (
          <h2 className={cn(
            'font-black tracking-tight text-foreground uppercase leading-tight mb-5',
            variant === 'normal' ? 'text-2xl lg:text-3xl' : 'text-xl lg:text-2xl',
          )}>
            {step.title}
          </h2>
        )}
        <p className="text-sm lg:text-[15px] font-medium text-muted-foreground leading-relaxed mb-6">
          {parseInlineMarkdown(step.body)}
        </p>
        {step.bullets && step.bullets.length > 0 && (
          <ul className="space-y-3 mb-6">
            {step.bullets.map((b, i) => {
              const colorCls = bulletColorClass(b.label)
              return (
                <li key={i} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-[10px] font-black tracking-[0.1em] uppercase', colorCls || 'text-foreground/80')}>{b.label}</span>
                    {b.example && (
                      <code className={cn('text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded', colorCls || 'text-muted-foreground')}>{b.example}</code>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground leading-snug">{b.detail}</span>
                </li>
              )
            })}
          </ul>
        )}
        {examples.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {examples.map((ex, exIdx) => (
              <button
                key={exIdx}
                onClick={() => selectExample(idx, exIdx)}
                className={cn(
                  'text-[10px] font-black uppercase tracking-[0.12em] px-3.5 py-1.5 rounded-full transition-all ring-1',
                  selIdx === exIdx
                    ? 'bg-primary text-primary-foreground ring-primary/30 shadow-md'
                    : 'bg-muted/50 text-muted-foreground ring-transparent hover:bg-muted hover:ring-border',
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
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-primary text-primary-foreground text-[10px] font-medium shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Play className="h-3 w-3 fill-current" />
            {step.cta.label}
          </button>
        )}
        {renderStepExtra?.(idx, activeStep)}
      </div>
    )
  }

  // ── Normal step ──────────────────────────────────────────────────────────
  function renderNormal(item: StepMeta) {
    return (
      <div
        key={item.idx}
        ref={el => { stepRefs.current[item.idx] = el }}
        data-step={String(item.idx)}
        className="min-h-[70vh] lg:min-h-screen flex items-center py-16 lg:py-24 px-6 lg:px-10"
      >
        {renderStepBody(item, 'normal')}
      </div>
    )
  }

  // ── Clear (section-break) step ───────────────────────────────────────────
  function renderClear(item: StepMeta) {
    return (
      <div
        key={item.idx}
        ref={el => { stepRefs.current[item.idx] = el }}
        data-step={String(item.idx)}
        className="min-h-[35vh] flex items-center justify-center py-12 lg:py-16 px-6 lg:px-10"
      >
        {renderStepBody(item, 'clear')}
      </div>
    )
  }

  // ── Sticky group ─────────────────────────────────────────────────────────
  function renderStickyGroup(group: Extract<StepGroup, { kind: 'stickyGroup' }>) {
    const { header, subs } = group
    const groupIndices = [header.idx, ...subs.map(s => s.idx)]
    const isGroupActive = groupIndices.includes(activeStep)

    return (
      <div key={header.idx}>
        {/* Visual sticky header — CSS position:sticky within this group container */}
        {/* On mobile, top must clear the sticky panel (65px + calc(50vh - 32.5px) = calc(50vh + 32.5px)).
            On desktop, the panel is side-by-side so top: 104px (STICKY_NAV_HEIGHT) is correct. */}
        <div
          className="sticky z-10 px-6 lg:px-10 py-5 bg-background border-b border-border/25 top-[calc(50vh_+_32.5px)] lg:top-[104px]"
        >
          <div className={cn(
            'max-w-sm transition-all duration-500',
            isGroupActive ? 'opacity-100' : 'opacity-60',
          )}>
            <div className="text-[10px] font-black tracking-[0.25em] uppercase text-primary mb-2">
              {header.step.eyebrow}
            </div>
            <h2 className="text-xl lg:text-2xl font-black tracking-tight text-foreground uppercase leading-tight">
              {header.step.title}
            </h2>
            {header.step.body && (
              <p className="text-sm font-medium text-muted-foreground leading-relaxed mt-2">
                {parseInlineMarkdown(header.step.body)}
              </p>
            )}
            {header.step.subsectionHint && (
              <div className="flex items-center gap-1.5 mt-3 text-muted-foreground/40">
                <span className="text-[8px] font-black uppercase tracking-[0.3em]">{header.step.subsectionHint}</span>
                <ChevronDown className="size-3 animate-bounce" />
              </div>
            )}
          </div>
        </div>

        {/* Invisible spacer observed for the header step index */}
        <div
          ref={el => { stepRefs.current[header.idx] = el }}
          data-step={String(header.idx)}
          className={header.step.subsectionHint ? 'min-h-[15vh]' : 'min-h-[25vh]'}
        />

        {/* Subsection steps scroll under the sticky header */}
        {subs.map(subItem => (
          <div
            key={subItem.idx}
            ref={el => { stepRefs.current[subItem.idx] = el }}
            data-step={String(subItem.idx)}
            className="min-h-[55vh] lg:min-h-[65vh] flex items-center py-12 lg:py-16 px-8 lg:px-14 border-t border-border/10"
          >
            {renderStepBody(subItem, 'sub')}
          </div>
        ))}
      </div>
    )
  }

  // ── Full text column ─────────────────────────────────────────────────────
  const textContent = groups.map(group => {
    if (group.kind === 'normal') return renderNormal(group.item)
    if (group.kind === 'clear') return renderClear(group.item)
    return renderStickyGroup(group)
  })

  // ── Sticky panel (right/left) ────────────────────────────────────────────
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

  const mobilePanelNode = (
    <div
      className="lg:hidden sticky z-20 shrink-0 px-4 pt-[2px] pb-3"
      style={{ top: `${MOBILE_STICKY_TOP}px`, height: `calc(50vh - ${MOBILE_STICKY_TOP / 2}px)` }}
    >
      <MacOSChrome title={chromeTitle} onReset={onReset} headerActions={headerActions}>
        {stickyPanel}
      </MacOSChrome>
    </div>
  )

  return (
    <section id={id} className={cn('relative border-b border-border/50', className)}>
      <div className="lg:flex">
        {stickyAlign === 'left' && desktopPanelNode}
        <div className="w-full lg:w-[40%]">
          {mobilePanelNode}
          {headerContent && (
            <div className="px-6 lg:px-10 pb-4 pt-2 border-b border-border/30">
              {headerContent}
            </div>
          )}
          {textContent}
        </div>
        {stickyAlign === 'right' && desktopPanelNode}
      </div>
    </section>
  )
}

