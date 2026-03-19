import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react'
import { UnifiedEditor } from '@/components/Editor/UnifiedEditor'
import { CommandPalette } from '@/components/playground/CommandPalette'
import { ReviewGrid } from '@/components/review-grid/ReviewGrid'
import type { Segment } from '@/core/models/AnalyticsModels'
import { RuntimeTimerPanel } from '@/components/Editor/overlays/RuntimeTimerPanel'
import type { WodBlock } from '@/components/Editor/types'
import type { WodCommand } from '@/components/Editor/overlays/WodCommand'
import type { IScriptRuntime } from '@/runtime/contracts/IScriptRuntime'
import { getAnalyticsFromRuntime } from '@/services/AnalyticsTransformer'
import {
  Zap,
  Play,
  ChevronDown,
  Search,
  RotateCcw,
  BookOpen,
  TerminalSquare,
  Command,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Height of the standard sticky header (px) — used to offset sticky panels below it
// Standard header: pt-8 (32px) + h-10 accent (40px) + mt-8 hr (32px) ≈ ~104px on desktop
const STICKY_NAV_HEIGHT = 104
// Mobile sticky offset — panels sit closer to the top on smaller screens
const MOBILE_STICKY_TOP = 65

// ── Data ─────────────────────────────────────────────────────────────

const SAMPLE_SEGMENTS: Segment[] = [
  { id: 1, name: 'Deadlifts', type: 'exercise', startTime: 0, endTime: 45, elapsed: 45, total: 45, parentId: null, depth: 1, metric: { reps: 5, weight_lb: 225 }, lane: 0 },
  { id: 2, name: 'Box Jumps', type: 'exercise', startTime: 46, endTime: 118, elapsed: 72, total: 72, parentId: null, depth: 1, metric: { reps: 10, height_in: 24 }, lane: 0 },
  { id: 3, name: 'Push-ups', type: 'exercise', startTime: 119, endTime: 177, elapsed: 58, total: 58, parentId: null, depth: 1, metric: { reps: 15 }, lane: 0 },
  { id: 4, name: 'Deadlifts', type: 'exercise', startTime: 180, endTime: 226, elapsed: 46, total: 46, parentId: null, depth: 1, metric: { reps: 5, weight_lb: 225 }, lane: 0 },
  { id: 5, name: 'Box Jumps', type: 'exercise', startTime: 227, endTime: 302, elapsed: 75, total: 75, parentId: null, depth: 1, metric: { reps: 10, height_in: 24 }, lane: 0 },
  { id: 6, name: 'Push-ups', type: 'exercise', startTime: 303, endTime: 360, elapsed: 57, total: 57, parentId: null, depth: 1, metric: { reps: 15 }, lane: 0 },
]

interface WodExample {
  label: string
  wodScript: string
}

interface ParallaxStep {
  eyebrow: string
  title: string
  body: string
  examples?: WodExample[]
  cta?: { label: string; target: string }
}

const EDITOR_STEPS: ParallaxStep[] = [
  {
    eyebrow: 'Step 1 · Plan',
    title: 'Write Like You Think',
    body: 'WodScript is plain text with a workout superpower. No menus, no drag-and-drop. Type a round, a rep count, or a timer and the editor understands it instantly.',
    examples: [
      { label: 'For Time', wodScript: '```wod\n(3) Rounds For Time\n  - 10 Deadlifts 225 lb\n  - 15 Box Jumps 24 in\n  - 20 Push-ups\n```' },
      { label: 'AMRAP', wodScript: '```wod\nAMRAP 20:00\n  - 5 Pull-ups\n  - 10 Push-ups\n  - 15 Air Squats\n```' },
      { label: 'EMOM', wodScript: '```wod\nEMOM 12:00\n  - 3 Power Cleans 135 lb\n  - 6 Burpees\n```' },
    ],
  },
  {
    eyebrow: 'Step 1 · Plan',
    title: 'Weights, Distances, Everything.',
    body: 'Specify loads, distances, and units on any line. The parser handles them automatically — 225lb, 24kg, 400m, 0:90 rest. It just works.',
    examples: [
      { label: 'Pounds', wodScript: '```wod\n5x\n  - 5 Back Squats 185 lb\n  - 15 Ring Dips\n  - [ ] 50m Sled Push 90 lb\n```' },
      { label: 'Kilos', wodScript: '```wod\n5x\n  - 5 Back Squats 84 kg\n  - 10 Kettlebell Swings 24 kg\n  - 400m Run\n```' },
      { label: 'Intervals', wodScript: '```wod\n(4) Rounds\n  - 0:30 Max Effort Row\n  - 0:90 Rest\n  - 0:30 Max Effort Bike\n  - 0:90 Rest\n```' },
    ],
  },
  {
    eyebrow: 'Step 1 · Plan',
    title: 'Nest Any Structure Inside Any Other.',
    body: 'An EMOM inside a For Time? A rest interval inside an AMRAP? Trivial in WodScript. The runtime tracks every nesting level and transitions automatically.',
    examples: [
      { label: 'Nested AMRAP', wodScript: '```wod\nAMRAP 20:00\n  - (4)\n    - 0:40 Max Effort Row\n    - 0:20 Rest\n  - 2:00 Rest\n  - 10 Thrusters 95 lb\n```' },
      { label: 'EMOM in For Time', wodScript: '```wod\nFor Time\n  - EMOM 10:00\n    - 5 Deadlifts 275 lb\n    - 7 Burpee Box Jumps 24 in\n  - 50 Wall Balls 20 lb\n```' },
    ],
  },
  {
    eyebrow: 'Step 2 · Track',
    title: 'Ready? One Click Changes Everything.',
    body: 'Pick a workout from the collection or write your own, then hit the Run button in the editor toolbar. The full-screen tracker takes over — hands-free guidance through every rep, rest, and transition.',
  },
]

const TRACKER_STEPS: ParallaxStep[] = [
  {
    eyebrow: 'Step 2 · Track',
    title: 'Zero Distractions. Maximum Focus.',
    body: "The tracker strips away everything except the current movement, your countdown, and what's coming next. Full-screen, full-focus.",
  },
  {
    eyebrow: 'Step 2 · Track',
    title: 'Auto-Advance. Hands-Free.',
    body: 'Every timed block advances automatically. Rest periods count down on their own. Stay in the flow without touching the screen.',
  },
  {
    eyebrow: 'Step 2 · Track',
    title: 'Cast to the Big Screen.',
    body: 'Stream your workout live to any TV via Chromecast — perfect for group training. The display syncs in real-time with your phone.',
  },
  {
    eyebrow: 'Step 3 · Review',
    title: 'Workout Done. Instantly Logged.',
    body: 'Every rep, rest, and elapsed time is captured the moment you finish. Hit End and see your full breakdown immediately.',
    cta: { label: 'See the Review', target: 'review' },
  },
]

const REVIEW_STEPS: ParallaxStep[] = [
  {
    eyebrow: 'Step 3 · Review',
    title: 'Nothing Falls Through the Cracks.',
    body: 'Every block, rep, and rest period — all timestamped and saved to your local device the moment the workout ends. Nothing gets lost.',
  },
  {
    eyebrow: 'Step 3 · Review',
    title: 'Per-Exercise Volume at a Glance.',
    body: 'The review grid pivots your log into a clear table — reps per exercise, total volume, per-set timing, and intensity data all in one view.',
  },
  {
    eyebrow: 'Step 3 · Review',
    title: 'Your Full Training History.',
    body: "Every session ever logged is stored on your device, fully queryable. Compare today's deadlift total to last week's. All private, all offline.",
  },
]

const NOTEBOOK_STEPS: ParallaxStep[] = [
  {
    eyebrow: 'Step 4 · Notebook',
    title: 'Volume Charts',
    body: 'Weekly and monthly rep counts per movement — embedded directly in your training log.',
    examples: [
      { label: 'Weekly', wodScript: '```wod\n# Monday — Lower Body\n\n5x5 Back Squat 225 lb\n3x10 Romanian Deadlift 135 lb\n4x8 Walking Lunges 95 lb\n\n// Total Volume: 14,375 lb\n// Weekly Trend: ↑ 8%\n```' },
      { label: 'Monthly', wodScript: '```wod\n# January Volume Report\n\nBack Squat — 45,000 lb\nDeadlift — 38,500 lb\nBench Press — 32,000 lb\nOverhead Press — 18,000 lb\n\n// Monthly Total: 133,500 lb\n// vs December: +12%\n```' },
    ],
  },
  {
    eyebrow: 'Step 4 · Notebook',
    title: 'PR Trackers',
    body: 'Auto-updated personal records for each lift or distance. Hit a new max and your notes know instantly.',
    examples: [
      { label: 'Lift PRs', wodScript: '```wod\n# PR Day — Deadlift\n\n1x1 Deadlift 405 lb ★ NEW PR\n  Previous: 395 lb (Jan 15)\n  Goal: 425 lb\n\n1x1 Bench Press 265 lb\n  PR: 275 lb (Dec 3)\n  96% of best\n```' },
      { label: 'Metcon PRs', wodScript: '```wod\n# Benchmark — Fran\n\n21-15-9\n  Thrusters 95 lb\n  Pull-ups\n\nTime: 3:42 ★ NEW PR\n  Previous: 4:15 (Nov 8)\n  Improvement: -33s\n```' },
    ],
  },
  {
    eyebrow: 'Step 4 · Notebook',
    title: 'Progress Trends',
    body: 'E1RM estimations and intensity curves over time — see your strength trajectory at a glance.',
    examples: [
      { label: '12 Week', wodScript: '# Back Squat — 12 Week Block\n\n```wod\nWeek 1:  5x5 @ 185 lb\nWeek 4:  5x5 @ 205 lb\nWeek 8:  5x3 @ 225 lb\nWeek 12: 5x1 @ 265 lb\n\n// Est. 1RM: 280 → 310 lb\n// +10.7% improvement\n```' },
    ],
  },
  {
    eyebrow: 'Step 4 · Notebook',
    title: 'Checklist Blocks',
    body: 'Checked off during your workout, persisted to history. Mix actionable checklists with training content.',
    examples: [
      { label: 'Competition', wodScript: '```wod\n# Compe tine\n\n- [x] 10 min Mobility\n- [x] Band Pull-Aparts 3x15\n- [ ] Foam Roll Quads & Lats\n- [ ] Deep Squat Hold 2:00\n- [ ] Log bodyweight\n```' },
    ],
  },
  {
    eyebrow: 'Step 4 · Notebook',
    title: 'Metric Snapshots',
    body: 'Inline weight, reps, or split time values. Capture the numbers that matter alongside your training notes.',
    examples: [
      { label: 'Session', wodScript: '```wod\n# Today\'s Session\n\nBodyweight: 185 lb\nSleep: 7.5 hrs | HRV: 68\n\n3x5 Front Squat 205 lb\n  RPE: 8 | Volume: 3,075 lb\n\n5x3 Power Clean 185 lb\n  RPE: 7.5 | Volume: 2,775 lb\n```' },
    ],
  },
  {
    eyebrow: 'Step 4 · Notebook',
    title: 'Session Archive',
    body: 'Embed a recent sessions table inside any note. Your full training history, queryable and inline.',
    examples: [
      { label: 'Weekly Log', wodScript: '```wod\n# Training Log — January 2024\n\nJan 2:  Push Day — 12,400 lb\nJan 4:  Pull Day — 14,200 lb\nJan 6:  Legs — 18,500 lb\nJan 9:  Push Day — 13,100 lb\nJan 11: Pull Day — 15,000 lb\n\n// Monthly: 73,200 lb\n// Sessions: 5 of 12 planned\n```' },
    ],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (el) {
    const y = el.getBoundingClientRect().top + window.scrollY - STICKY_NAV_HEIGHT
    window.scrollTo({ top: y, behavior: 'smooth' })
  }
}

// ── MacOS Chrome Wrapper ───────────────────────────────────────────────

function MacOSChrome({ title, children, onReset, headerActions }: { title: string; children: ReactNode; onReset?: () => void; headerActions?: ReactNode }) {
  return (
    <div className="flex flex-col w-full h-full rounded-2xl lg:rounded-3xl overflow-hidden border border-border shadow-2xl bg-background">
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-b border-border/60 shrink-0">
        <div className="flex gap-1.5">
          <div className="size-2.5 rounded-full bg-red-500/50" />
          <div className="size-2.5 rounded-full bg-amber-500/50" />
          <div className="size-2.5 rounded-full bg-emerald-500/50" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">{title}</span>
          {headerActions}
          {onReset && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted border border-transparent hover:border-border/60 transition-all"
            >
              <RotateCcw className="size-2.5" />
              Reset
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

// ── ParallaxSection ───────────────────────────────────────────────────

interface ParallaxSectionProps {
  id: string
  steps: ParallaxStep[]
  stickyContent: (activeStep: number, selectedExample: number) => ReactNode
  stickyAlign?: 'left' | 'right'
  chromeTitle?: string
  className?: string
  onReset?: () => void
  /** Extra actions rendered in the MacOS chrome header bar */
  headerActions?: ReactNode
  /** Render extra content below the body text for a specific step */
  renderStepExtra?: (stepIdx: number, activeStep: number) => ReactNode | null
}

function ParallaxSection({ id, steps, stickyContent, stickyAlign = 'right', chromeTitle = 'WodScript', className, onReset, headerActions, renderStepExtra }: ParallaxSectionProps) {
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
    // Track cumulative visibility so scroll-back picks the correct step
    const ratioMap = new Map<number, number>()
    // On mobile the sticky panel covers the top ~40 vh, so shrink the top
    // dead-zone to just the panel height and keep a smaller bottom margin.
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

  // ── Desktop: 60% sticky panel ────────────────
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

  // ── Mobile: sticky top panel ─
  // Opaque backdrop fills the gap between the very top and the panel so
  // scrolling text never shows through behind transparent areas.
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
      {/* Single layout: text steps rendered once so refs always point to
          the visible DOM elements (fixes IntersectionObserver on mobile). */}
      <div className="lg:flex">
        {stickyAlign === 'left' && desktopPanelNode}
        <div className="w-full lg:w-[40%]">
          {mobilePanelNode}
          {textSteps}
        </div>
        {stickyAlign === 'right' && desktopPanelNode}
      </div>
    </section>
  )
}

// Module-level ref so HomePageContent can push scripts into FrozenEditorPanel
let frozenEditorLoadRef: { current: ((script: string) => void) | null } = { current: null }

// ── FrozenEditorPanel ─────────────────────────────────────────────────

function FrozenEditorPanel({ activeStep, selectedExample, actualTheme, onRun }: { activeStep: number; selectedExample: number; actualTheme: string; onRun: (script: string) => void }) {
  const [displayScript, setDisplayScript] = useState(
    EDITOR_STEPS[0]?.examples?.[0]?.wodScript ?? ''
  )
  const [opacity, setOpacity] = useState(1)
  const prevKey = useRef('0-0')
  const scriptRef = useRef(displayScript)

  // Determine the last editor step index (the one with a CTA to tracker)
  const isLastStep = activeStep === EDITOR_STEPS.length - 1

  /** Load an external script (e.g. from command palette) */
  const loadScript = useCallback((script: string) => {
    setDisplayScript(script)
    scriptRef.current = script
    prevKey.current = `ext-${Date.now()}`
    setOpacity(1)
  }, [])

  // Expose loadScript via ref so parent can call it
  const loadScriptRef = useRef(loadScript)
  loadScriptRef.current = loadScript

  // Store the ref on a module-level so HomePageContent can reach it
  useEffect(() => {
    frozenEditorLoadRef.current = loadScriptRef.current
    return () => { frozenEditorLoadRef.current = null }
  }, [])

  useEffect(() => {
    const step = EDITOR_STEPS[Math.min(activeStep, EDITOR_STEPS.length - 1)]
    const examples = step.examples ?? []
    const exIdx = Math.min(selectedExample, Math.max(0, examples.length - 1))
    const target = examples[exIdx]?.wodScript ?? scriptRef.current
    const key = `${activeStep}-${exIdx}`
    if (key === prevKey.current) return
    prevKey.current = key
    // If content is unchanged (e.g. rapid scroll back), just restore visibility
    if (target === scriptRef.current) {
      setOpacity(1)
      return
    }
    setOpacity(0)
    const t = setTimeout(() => {
      setDisplayScript(target)
      scriptRef.current = target
      setOpacity(1)
    }, 200)
    return () => clearTimeout(t)
  }, [activeStep, selectedExample])

  // On the last step, show a Run button that launches the tracker with the current script.
  // On all other steps, no buttons at all.
  const commands: WodCommand[] = isLastStep
    ? [{
        id: 'run-to-tracker',
        label: 'Run',
        icon: <Play className="h-3 w-3 fill-current" />,
        primary: true,
        onClick: () => {
          onRun(scriptRef.current)
          scrollToSection('tracker')
        },
      }]
    : []

  return (
    <div className="w-full h-full overflow-hidden">
      <div
        className="w-full h-full"
        style={{ opacity, transition: 'opacity 200ms ease' }}
      >
        <UnifiedEditor
          value={displayScript}
          onChange={(v) => { setDisplayScript(v); scriptRef.current = v }}
          theme={actualTheme}
          readonly={false}
          showLineNumbers={false}
          enableOverlay={true}
          enableInlineRuntime={false}
          commands={commands}
          className="h-full"
        />
      </div>
    </div>
  )
}

// ── LiveTrackerPanel (real runtime) ───────────────────────────────────

function LiveTrackerPanel({ block, onSearch, preview, actualTheme, onRuntimeReady }: { block: WodBlock | null; onSearch: () => void; preview: string | null; actualTheme: string; onRuntimeReady?: (runtime: IScriptRuntime) => void }) {
  // Stop just keeps the panel visible (no-op close) — only Reset clears the engine
  const handleClose = useCallback(() => {}, [])

  // Preview mode: show loaded workout (browse/run buttons are now in the header)
  if (!block && preview) {
    return (
      <div className="flex flex-col w-full h-full overflow-hidden">
        <div className="flex-1 min-h-0">
          <UnifiedEditor
            value={preview}
            onChange={() => {}}
            theme={actualTheme}
            readonly={true}
            showLineNumbers={false}
            enableOverlay={true}
            enableInlineRuntime={false}
            commands={[]}
            className="h-full"
          />
        </div>
      </div>
    )
  }

  if (!block) {
    return (
      <button
        onClick={onSearch}
        className="w-full h-full flex flex-col items-center justify-center gap-4 bg-background text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors"
      >
        <Search className="size-10 text-muted-foreground/30" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground/50">Browse Collections</p>
      </button>
    )
  }

  return (
    <div className="w-full h-full overflow-hidden">
      <RuntimeTimerPanel
        key={block.id}
        block={block}
        onClose={handleClose}
        autoStart={true}
        onRuntimeReady={onRuntimeReady}
      />
    </div>
  )
}

// ── FrozenReviewPanel ─────────────────────────────────────────────────

function FrozenReviewPanel({ runtime }: { runtime: IScriptRuntime | null }) {
  const [revision, setRevision] = useState(0)

  // Subscribe to runtime output events to trigger re-renders
  useEffect(() => {
    if (!runtime) { setRevision(0); return }
    const unsub = runtime.subscribeToOutput(() => {
      setRevision(r => r + 1)
    })
    return unsub
  }, [runtime])

  const { segments, groups } = useMemo(() => {
    if (!runtime) return { segments: SAMPLE_SEGMENTS, groups: [] }
    const result = getAnalyticsFromRuntime(runtime)
    return result.segments.length > 0 ? result : { segments: SAMPLE_SEGMENTS, groups: [] }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, revision])

  return (
    <div className="w-full h-full overflow-hidden bg-background">
      <div className="w-full h-full pointer-events-none">
        <ReviewGrid
          runtime={null}
          segments={segments}
          selectedSegmentIds={new Set()}
          onSelectSegment={() => {}}
          groups={groups}
        />
      </div>
    </div>
  )
}

// ── Section wrappers ──────────────────────────────────────────────────

function EditorParallaxSection({ actualTheme, onRun, onSearch }: { actualTheme: string; onRun: (script: string) => void; onSearch: () => void }) {
  return (
    <ParallaxSection
      id="editor"
      steps={EDITOR_STEPS}
      stickyAlign="right"
      chromeTitle="WodScript Editor"
      stickyContent={(activeStep, selectedExample) => (
        <FrozenEditorPanel activeStep={activeStep} selectedExample={selectedExample} actualTheme={actualTheme} onRun={onRun} />
      )}
      renderStepExtra={(stepIdx, _activeStep) => {
        if (stepIdx !== EDITOR_STEPS.length - 1) return null
        return (
          <div className="flex flex-col gap-3 mt-2">
            <button
              onClick={onSearch}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-muted/60 text-foreground text-xs font-black uppercase tracking-wider border border-border/60 shadow-sm hover:bg-muted hover:scale-[1.03] transition-all w-fit"
            >
              <Search className="size-3.5" />
              Browse Workouts
            </button>
            <button
              onClick={() => {
                // Trigger Run via the frozen editor’s current script
                if (frozenEditorLoadRef.current) {
                  // The editor already has content — just run it
                }
                // Get script from the editor ref and run
                const editorEl = document.querySelector('#editor .cm-content')
                const script = editorEl?.textContent ?? ''
                if (script.trim()) {
                  onRun('```wod\n' + script + '\n```')
                  scrollToSection('tracker')
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider shadow-lg hover:shadow-primary/30 hover:scale-[1.04] transition-all w-fit"
            >
              <Play className="h-3 w-3 fill-current" />
              Run
            </button>
          </div>
        )
      }}
      className="bg-background"
    />
  )
}

function TrackerParallaxSection({ block, onReset, onSearch, preview, onStartPreview, onClearPreview, actualTheme, onRuntimeReady }: { block: WodBlock | null; onReset: () => void; onSearch: () => void; preview: string | null; onStartPreview: (script: string) => void; onClearPreview: () => void; actualTheme: string; onRuntimeReady?: (runtime: IScriptRuntime) => void }) {
  // Build header actions: Browse + Run (when preview is loaded)
  const headerActions = (
    <>
      {!block && preview && (
        <button
          onClick={() => onStartPreview(preview)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-primary-foreground bg-primary hover:bg-primary/90 transition-all"
        >
          <Play className="size-2.5 fill-current" />
          Run
        </button>
      )}
      <button
        onClick={onClearPreview}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted border border-transparent hover:border-border/60 transition-all"
      >
        <Search className="size-2.5" />
        Browse
      </button>
    </>
  )

  return (
    <ParallaxSection
      id="tracker"
      steps={TRACKER_STEPS}
      stickyAlign="left"
      chromeTitle="Live Tracker"
      onReset={onReset}
      headerActions={headerActions}
      stickyContent={() => <LiveTrackerPanel block={block} onSearch={onSearch} preview={preview} actualTheme={actualTheme} onRuntimeReady={onRuntimeReady} />}
      className="bg-zinc-950/[0.03] dark:bg-zinc-900/20"
    />
  )
}

function ReviewParallaxSection({ onReset, runtime }: { onReset: () => void; runtime: IScriptRuntime | null }) {
  return (
    <ParallaxSection
      id="review"
      steps={REVIEW_STEPS}
      stickyAlign="right"
      chromeTitle="Review"
      onReset={onReset}
      stickyContent={() => <FrozenReviewPanel runtime={runtime} />}
      className="bg-background"
    />
  )
}

// ── FrozenNotebookPanel ───────────────────────────────────────────────

function FrozenNotebookPanel({ activeStep, selectedExample, actualTheme }: { activeStep: number; selectedExample: number; actualTheme: string }) {
  const [displayScript, setDisplayScript] = useState(
    NOTEBOOK_STEPS[0]?.examples?.[0]?.wodScript ?? ''
  )
  const [opacity, setOpacity] = useState(1)
  const prevKey = useRef('0-0')
  const scriptRef = useRef(displayScript)

  useEffect(() => {
    const step = NOTEBOOK_STEPS[Math.min(activeStep, NOTEBOOK_STEPS.length - 1)]
    const examples = step.examples ?? []
    const exIdx = Math.min(selectedExample, Math.max(0, examples.length - 1))
    const target = examples[exIdx]?.wodScript ?? scriptRef.current
    const key = `${activeStep}-${exIdx}`
    if (key === prevKey.current) return
    prevKey.current = key
    if (target === scriptRef.current) {
      setOpacity(1)
      return
    }
    setOpacity(0)
    const t = setTimeout(() => {
      setDisplayScript(target)
      scriptRef.current = target
      setOpacity(1)
    }, 200)
    return () => clearTimeout(t)
  }, [activeStep, selectedExample])

  return (
    <div
      className="w-full h-full overflow-hidden"
      style={{ opacity, transition: 'opacity 200ms ease' }}
    >
      <UnifiedEditor
        value={displayScript}
        onChange={() => {}}
        theme={actualTheme}
        readonly={true}
        showLineNumbers={false}
        enableOverlay={true}
        enableInlineRuntime={false}
        commands={[]}
        className="h-full"
      />
    </div>
  )
}

// ── Section wrappers (Notebook) ───────────────────────────────────────

function NotebookParallaxSection({ actualTheme }: { actualTheme: string }) {
  return (
    <ParallaxSection
      id="notebook"
      steps={NOTEBOOK_STEPS}
      stickyAlign="left"
      chromeTitle="Training Notebook"
      stickyContent={(activeStep, selectedExample) => (
        <FrozenNotebookPanel activeStep={activeStep} selectedExample={selectedExample} actualTheme={actualTheme} />
      )}
      className="bg-zinc-950/[0.03] dark:bg-zinc-900/20"
    />
  )
}

// ── NextStepsSection ──────────────────────────────────────────────────

function NextStepsSection({ onSearch }: { onSearch: () => void }) {
  return (
    <section id="next-steps" className="relative border-b border-border/50 overflow-hidden">
      <div className="py-24 lg:py-32 bg-primary/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50 pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-foreground uppercase">
              Next Steps
            </h2>
            <p className="mt-4 text-lg text-muted-foreground font-medium">
              Pick your path.
            </p>
          </div>

          <div className="flex flex-col gap-5">
            {/* Zero To Hero */}
            <a
              href="#/getting-started"
              className="group flex items-start gap-5 p-6 rounded-2xl border border-border/60 bg-background hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <BookOpen className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-foreground">
                  Zero to Hero
                </h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Get up and running with wod.lang — or take a deep dive into the{' '}
                  <span
                    className="inline text-primary font-bold cursor-pointer hover:underline"
                    onClick={(e) => { e.preventDefault(); window.location.hash = '#/syntax' }}
                  >
                    Syntax
                  </span>.
                </p>
              </div>
            </a>

            {/* New Playground */}
            <a
              href="#/playground"
              className="group flex items-start gap-5 p-6 rounded-2xl border border-border/60 bg-background hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <TerminalSquare className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-foreground">
                  New Playground
                </h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Throwaway scratch space — experiment freely, nothing is saved unless you want it to be.
                </p>
              </div>
            </a>

            {/* Command Palette */}
            <button
              onClick={onSearch}
              className="group flex items-start gap-5 p-6 rounded-2xl border border-border/60 bg-background hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all text-left w-full"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Command className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-foreground">
                  <kbd className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs font-mono font-bold text-muted-foreground border border-border/60 mr-2 align-middle">Ctrl K</kbd>
                  Command Palette
                </h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Search pre-built content from the workout collections — WODs, benchmarks, and templates.
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}



// ── HomePageContent ───────────────────────────────────────────────────

export interface HomePageContentProps {
  actualTheme: string
  workoutItems: Array<{ id: string; name: string; category: string; content: string }>
  onSelectWorkout: (item: any) => void
  isCommandPaletteOpen: boolean
  setIsCommandPaletteOpen: (open: boolean) => void
  activeCategory: string | null
  setActiveCategory: (cat: string | null) => void
}

export function HomePageContent({
  actualTheme,
  workoutItems,
  onSelectWorkout,
  isCommandPaletteOpen,
  setIsCommandPaletteOpen,
  activeCategory,
  setActiveCategory,
}: HomePageContentProps) {
  const [trackerBlock, setTrackerBlock] = useState<WodBlock | null>(null)
  const runIdRef = useRef(0)
  const [homePaletteOpen, setHomePaletteOpen] = useState(false)
  const [trackerPreview, setTrackerPreview] = useState<string | null>(null)
  const paletteSourceRef = useRef<'editor' | 'tracker'>('editor')
  const [liveRuntime, setLiveRuntime] = useState<IScriptRuntime | null>(null)

  /** Called by the editor's Run button — creates (or resets) the tracker runtime */
  const launchTracker = useCallback((script: string) => {
    // Strip markdown fences if present
    const content = script.replace(/^```\w*\n/, '').replace(/\n```$/, '')
    runIdRef.current += 1
    setTrackerBlock({
      id: `home-tracker-${runIdRef.current}`,
      startLine: 0,
      endLine: content.split('\n').length,
      content,
      state: 'idle',
      widgetIds: {},
      version: 1,
      createdAt: Date.now(),
    })
  }, [])

  /** Reset: clear runtime, scroll back to the editor's last (Track) step */
  const resetDemo = useCallback(() => {
    setTrackerBlock(null)
    setLiveRuntime(null)
    // Scroll to the last editor step which is the "Ready? One Click" slide
    // Use requestAnimationFrame to ensure DOM has updated after state clear
    requestAnimationFrame(() => {
      const lastStepEl = document.querySelector('#editor [data-step="' + (EDITOR_STEPS.length - 1) + '"]')
      if (lastStepEl) {
        const rect = lastStepEl.getBoundingClientRect()
        const scrollTop = window.scrollY + rect.top - STICKY_NAV_HEIGHT - 20
        window.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' })
      } else {
        scrollToSection('editor')
      }
    })
  }, [])

  /** Extract wod blocks from selected workout content and load into frozen editor */
  const handleWorkoutSelect = useCallback((item: { id: string; name: string; category: string; content?: string }) => {
    if (!item.content) return
    // Extract only ```wod ... ``` blocks
    const wodBlocks: string[] = []
    const regex = /```wod\n([\s\S]*?)\n```/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(item.content)) !== null) {
      wodBlocks.push('```wod\n' + match[1] + '\n```')
    }
    const script = wodBlocks.length > 0 ? wodBlocks.join('\n\n') : item.content
    // Load into the frozen editor panel
    if (frozenEditorLoadRef.current) {
      frozenEditorLoadRef.current(script)
    }
    setHomePaletteOpen(false)
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero */}
      <section className="relative px-6 pt-24 pb-16 lg:pt-36 lg:pb-24 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-20 dark:opacity-30"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 50%, hsl(var(--primary) / 0.15) 0%, transparent 80%)',
          }}
        />
        <div className="relative mx-auto max-w-6xl">
          <div className="flex flex-col items-center text-center gap-8">
            <div className="flex size-24 items-center justify-center rounded-[2rem] bg-primary text-primary-foreground shadow-2xl shadow-primary/30 rotate-3 animate-in zoom-in duration-500">
              <Zap className="size-12 fill-current" />
            </div>
            <div className="space-y-6">
              <h1 className="text-6xl font-black tracking-tighter sm:text-8xl lg:text-9xl text-foreground uppercase drop-shadow-sm">
                WOD.WIKI
              </h1>
              <div className="space-y-4">
                <p className="mx-auto max-w-3xl text-lg font-medium text-muted-foreground sm:text-xl leading-relaxed">
                  <button onClick={() => scrollToSection('editor')} className="inline-flex items-baseline px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-black cursor-pointer hover:bg-primary/20 hover:scale-105 transition-all">Plan</button>
                  {' '}your training,{' '}
                  <button onClick={() => { const el = document.querySelector('#editor [data-step="' + (EDITOR_STEPS.length - 1) + '"]'); if (el) { const rect = el.getBoundingClientRect(); window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - STICKY_NAV_HEIGHT - 20), behavior: 'smooth' }); } else { scrollToSection('tracker'); } }} className="inline-flex items-baseline px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-black cursor-pointer hover:bg-primary/20 hover:scale-105 transition-all">Track</button>
                  {' '}performance, analyze collected{' '}
                  <button onClick={() => scrollToSection('review')} className="inline-flex items-baseline px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-black cursor-pointer hover:bg-primary/20 hover:scale-105 transition-all">Metrics</button>
                  {' '}for insights — all with the simplicity of a wiki{' '}
                  <button onClick={() => scrollToSection('notebook')} className="inline-flex items-baseline px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-black cursor-pointer hover:bg-primary/20 hover:scale-105 transition-all">Notebook</button>.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 mt-4 text-muted-foreground/40">
              <span className="text-[9px] font-black uppercase tracking-[0.35em]">Scroll to explore</span>
              <ChevronDown className="size-4 animate-bounce" />
            </div>
          </div>
        </div>
      </section>

      {/* Act 1 — Editor */}
      <EditorParallaxSection actualTheme={actualTheme} onRun={launchTracker} onSearch={() => { paletteSourceRef.current = 'editor'; setHomePaletteOpen(true) }} />

      {/* Act 2 — Tracker */}
      <TrackerParallaxSection
        block={trackerBlock}
        onReset={resetDemo}
        onSearch={() => { paletteSourceRef.current = 'tracker'; setHomePaletteOpen(true) }}
        preview={trackerPreview}
        onStartPreview={(script) => { setTrackerPreview(null); launchTracker(script) }}
        onClearPreview={() => { paletteSourceRef.current = 'tracker'; setTrackerPreview(null); setHomePaletteOpen(true) }}
        actualTheme={actualTheme}
        onRuntimeReady={setLiveRuntime}
      />

      {/* Act 3 — Review */}
      <ReviewParallaxSection onReset={resetDemo} runtime={liveRuntime} />

      {/* Act 4 — Notebook */}
      <NotebookParallaxSection actualTheme={actualTheme} />

      {/* Next Steps */}
      <NextStepsSection onSearch={() => { paletteSourceRef.current = 'editor'; setHomePaletteOpen(true) }} />

      <CommandPalette
        isOpen={isCommandPaletteOpen || homePaletteOpen}
        onClose={() => {
          setIsCommandPaletteOpen(false)
          setHomePaletteOpen(false)
          setActiveCategory(null)
        }}
        items={workoutItems}
        onSelect={(item) => {
          if (homePaletteOpen) {
            if (paletteSourceRef.current === 'tracker') {
              // From tracker: extract wod blocks and show preview
              if (!item.content) return
              const wodBlocks: string[] = []
              const regex = /```wod\n([\s\S]*?)\n```/g
              let match: RegExpExecArray | null
              while ((match = regex.exec(item.content)) !== null) {
                wodBlocks.push('```wod\n' + match[1] + '\n```')
              }
              const script = wodBlocks.length > 0 ? wodBlocks.join('\n\n') : item.content
              setTrackerPreview(script)
              setHomePaletteOpen(false)
            } else {
              handleWorkoutSelect(item)
            }
          } else {
            onSelectWorkout(item)
          }
        }}
        initialCategory={activeCategory}
      />
    </div>
  )
}
