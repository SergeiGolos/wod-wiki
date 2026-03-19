import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { UnifiedEditor } from '@/components/Editor/UnifiedEditor'
import { CommandPalette } from '@/components/playground/CommandPalette'
import { PLAYGROUND_CONTENT } from '@/constants/defaultContent'
import { ReviewGrid } from '@/components/review-grid/ReviewGrid'
import type { Segment } from '@/core/models/AnalyticsModels'
import { RuntimeTimerPanel } from '@/components/Editor/overlays/RuntimeTimerPanel'
import type { WodBlock } from '@/components/Editor/types'
import {
  Zap,
  ChevronDown,
  BarChart2,
  Database,
  Timer,
  ListChecks,
  LineChart,
  Archive,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Height of the StickyNav bar (px) — used to offset sticky panels below it
const STICKY_NAV_HEIGHT = 52

// ── Data ─────────────────────────────────────────────────────────────

const SAMPLE_SEGMENTS: Segment[] = [
  { id: 1, name: 'Deadlifts', type: 'exercise', startTime: 0, endTime: 45, elapsed: 45, total: 45, parentId: null, depth: 1, metric: { reps: 5, weight_lb: 225 }, lane: 0 },
  { id: 2, name: 'Box Jumps', type: 'exercise', startTime: 46, endTime: 118, elapsed: 72, total: 72, parentId: null, depth: 1, metric: { reps: 10, height_in: 24 }, lane: 0 },
  { id: 3, name: 'Push-ups', type: 'exercise', startTime: 119, endTime: 177, elapsed: 58, total: 58, parentId: null, depth: 1, metric: { reps: 15 }, lane: 0 },
  { id: 4, name: 'Deadlifts', type: 'exercise', startTime: 180, endTime: 226, elapsed: 46, total: 46, parentId: null, depth: 1, metric: { reps: 5, weight_lb: 225 }, lane: 0 },
  { id: 5, name: 'Box Jumps', type: 'exercise', startTime: 227, endTime: 302, elapsed: 75, total: 75, parentId: null, depth: 1, metric: { reps: 10, height_in: 24 }, lane: 0 },
  { id: 6, name: 'Push-ups', type: 'exercise', startTime: 303, endTime: 360, elapsed: 57, total: 57, parentId: null, depth: 1, metric: { reps: 15 }, lane: 0 },
]

interface ParallaxStep {
  eyebrow: string
  title: string
  body: string
  wodScript?: string
  cta?: { label: string; target: string }
}

const EDITOR_STEPS: ParallaxStep[] = [
  {
    eyebrow: 'Step 1 · Plan',
    title: 'Write Like You Think',
    body: 'WodScript is plain text with a workout superpower. No menus, no drag-and-drop. Type a round, a rep count, or a timer and the editor understands it instantly.',
    wodScript: '```wod\n(3) Rounds For Time\n  - 10 Deadlifts 225 lb\n  - 15 Box Jumps 24 in\n  - 20 Push-ups\n```',
  },
  {
    eyebrow: 'Step 1 · Plan',
    title: 'Weights, Distances, Everything.',
    body: 'Specify loads, distances, and units on any line. The parser handles them automatically — 225lb, 24kg, 400m, 0:90 rest. It just works.',
    wodScript: '```wod\n5x\n  - 5 Back Squats 185 lb\n  - 15 Ring Dips\n  - [ ] 50m Sled Push 90 lb\n```',
  },
  {
    eyebrow: 'Step 1 · Plan',
    title: 'Nest Any Structure Inside Any Other.',
    body: 'An EMOM inside a For Time? A rest interval inside an AMRAP? Trivial in WodScript. The runtime tracks every nesting level and transitions automatically.',
    wodScript: '```wod\nAMRAP 20:00\n  - (4)\n    - 0:40 Max Effort Row\n    - 0:20 Rest\n  - 2:00 Rest\n  - 10 Thrusters 95 lb\n```',
  },
  {
    eyebrow: 'Step 2 · Track',
    title: 'Ready? One Click Changes Everything.',
    body: 'Hit Run. The full-screen tracker takes over — hands-free guidance through every rep, rest, and transition.',
    cta: { label: 'See the Tracker', target: 'tracker' },
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

const NOTES_EMBED_TYPES = [
  { icon: BarChart2, label: 'Volume Charts', desc: 'Weekly and monthly rep counts per movement' },
  { icon: Timer, label: 'PR Trackers', desc: 'Auto-updated personal records for each lift or distance' },
  { icon: LineChart, label: 'Progress Trends', desc: 'E1RM estimations and intensity curves over time' },
  { icon: ListChecks, label: 'Checklist Blocks', desc: 'Checked off during workout, persisted to history' },
  { icon: Database, label: 'Metric Snapshots', desc: 'Inline weight, reps, or split time values' },
  { icon: Archive, label: 'Session Archive', desc: 'Embed a recent sessions table inside any note' },
]

const NAV_LINKS = [
  { id: 'editor', label: 'Editor' },
  { id: 'tracker', label: 'Tracker' },
  { id: 'review', label: 'Review' },
  { id: 'reporting', label: 'Reporting' },
]

// ── Helpers ───────────────────────────────────────────────────────────

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (el) {
    const y = el.getBoundingClientRect().top + window.scrollY - 60
    window.scrollTo({ top: y, behavior: 'smooth' })
  }
}

// ── StickyNav ─────────────────────────────────────────────────────────

function StickyNav() {
  const [activeId, setActiveId] = useState('editor');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -50% 0px', threshold: [0, 0.3, 1.0] }
    );

    NAV_LINKS.forEach(link => {
      const el = document.getElementById(link.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/50 shadow-sm transition-all">
      <div className="mx-auto max-w-6xl px-6 flex items-center justify-start lg:justify-center gap-2 sm:gap-6 overflow-x-auto py-4 no-scrollbar scroll-smooth">
        {NAV_LINKS.map(link => (
          <a
            key={link.id}
            href={`#${link.id}`}
            onClick={(e) => {
              e.preventDefault()
              scrollToSection(link.id)
            }}
            className={cn(
              "text-[11px] sm:text-xs font-black uppercase tracking-[0.1em] whitespace-nowrap px-4 py-2 rounded-full transition-all ring-1 ring-transparent",
              activeId === link.id
                ? "bg-primary text-primary-foreground shadow-md ring-primary/20 scale-105"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground hover:ring-border"
            )}
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  )
}

// ── MacOS Chrome Wrapper ───────────────────────────────────────────────

function MacOSChrome({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col w-full h-full rounded-2xl lg:rounded-3xl overflow-hidden border border-border shadow-2xl bg-background">
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-b border-border/60 shrink-0">
        <div className="flex gap-1.5">
          <div className="size-2.5 rounded-full bg-red-500/50" />
          <div className="size-2.5 rounded-full bg-amber-500/50" />
          <div className="size-2.5 rounded-full bg-emerald-500/50" />
        </div>
        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">{title}</span>
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
  stickyContent: (activeStep: number) => ReactNode
  stickyAlign?: 'left' | 'right'
  chromeTitle?: string
  className?: string
}

function ParallaxSection({ id, steps, stickyContent, stickyAlign = 'right', chromeTitle = 'WodScript', className }: ParallaxSectionProps) {
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            if (!best || entry.intersectionRatio > best.intersectionRatio) best = entry
          }
        })
        if (best) {
          const idx = parseInt((best as IntersectionObserverEntry).target.getAttribute('data-step') ?? '0')
          setActiveStep(idx)
        }
      },
      { rootMargin: '-30% 0px -30% 0px', threshold: [0, 0.25, 0.5] }
    )
    stepRefs.current.forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  const stickyPanel = stickyContent(activeStep)

  // ── Desktop: side-by-side with sticky panel ────────────────
  const desktopPanelNode = (
    <div
      className="w-1/2 self-start sticky hidden lg:block p-6 pt-8 pb-8"
      style={{ top: `${STICKY_NAV_HEIGHT}px`, height: `calc(100vh - ${STICKY_NAV_HEIGHT}px)` }}
    >
      <MacOSChrome title={chromeTitle}>
        {stickyPanel}
      </MacOSChrome>
    </div>
  )

  // ── Mobile: sticky top panel, text below ─
  const mobilePanelNode = (
    <div
      className="lg:hidden sticky z-10 shrink-0 px-4 pt-4 pb-3"
      style={{ top: `${STICKY_NAV_HEIGHT}px`, height: `calc(40vh - ${STICKY_NAV_HEIGHT / 2}px)` }}
    >
      <MacOSChrome title={chromeTitle}>
        {stickyPanel}
      </MacOSChrome>
    </div>
  )

  const textSteps = steps.map((step, idx) => (
    <div
      key={idx}
      ref={el => { stepRefs.current[idx] = el }}
      data-step={String(idx)}
      className="min-h-[70vh] lg:min-h-screen flex items-center py-16 lg:py-24 px-6 lg:px-16"
    >
      <div className={cn(
        "max-w-md transition-all duration-500",
        activeStep === idx ? "opacity-100 translate-y-0" : "opacity-30 translate-y-3"
      )}>
        <div className="text-[10px] font-black tracking-[0.25em] uppercase text-primary mb-4">
          {step.eyebrow}
        </div>
        <h2 className="text-2xl lg:text-4xl font-black tracking-tight text-foreground uppercase leading-tight mb-5">
          {step.title}
        </h2>
        <p className="text-sm lg:text-[17px] font-medium text-muted-foreground leading-relaxed mb-8">
          {step.body}
        </p>
        {step.cta && (
          <button
            onClick={() => scrollToSection(step.cta!.target)}
            className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full bg-primary text-primary-foreground font-black text-sm uppercase tracking-wider shadow-lg hover:shadow-primary/30 hover:scale-[1.04] transition-all"
          >
            {step.cta.label}
            <ChevronDown className="size-4" />
          </button>
        )}
      </div>
    </div>
  ))

  return (
    <section id={id} className={cn("relative border-b border-border/50", className)}>
      {/* Mobile: vertical stack — sticky panel on top, text below */}
      <div className="lg:hidden">
        {mobilePanelNode}
        <div>{textSteps}</div>
      </div>
      {/* Desktop: side-by-side with sticky panel */}
      <div className="hidden lg:flex">
        {stickyAlign === 'left' ? (
          <>
            {desktopPanelNode}
            <div className="w-1/2">{textSteps}</div>
          </>
        ) : (
          <>
            <div className="w-1/2">{textSteps}</div>
            {desktopPanelNode}
          </>
        )}
      </div>
    </section>
  )
}

// ── FrozenEditorPanel ─────────────────────────────────────────────────

function FrozenEditorPanel({ activeStep, actualTheme }: { activeStep: number; actualTheme: string }) {
  const wodScripts = EDITOR_STEPS.filter(s => s.wodScript).map(s => s.wodScript!)
  const [displayScript, setDisplayScript] = useState(wodScripts[0])
  const [opacity, setOpacity] = useState(1)
  const prevStep = useRef(-1)

  useEffect(() => {
    if (activeStep === prevStep.current) return
    prevStep.current = activeStep
    const target = wodScripts[Math.min(activeStep, wodScripts.length - 1)]
    setOpacity(0)
    const t = setTimeout(() => {
      setDisplayScript(target)
      setOpacity(1)
    }, 200)
    return () => clearTimeout(t)
  }, [activeStep]) // wodScripts derives from module constant, safe to omit

  return (
    <div
      className="w-full h-full pointer-events-none overflow-hidden"
      style={{ opacity, transition: 'opacity 200ms ease' }}
    >
      <UnifiedEditor
        value={displayScript}
        onChange={() => {}}
        theme={actualTheme}
        showLineNumbers={false}
        enableOverlay={true}
        enableInlineRuntime={true}
        className="h-full"
      />
    </div>
  )
}

// ── LiveTrackerPanel (real runtime) ───────────────────────────────────

const TRACKER_WOD_SCRIPT = `(3) Rounds For Time
  - 10 Deadlifts 225 lb
  - 15 Box Jumps 24 in
  - 20 Push-ups`

function LiveTrackerPanel() {
  const [block] = useState<WodBlock>(() => ({
    id: 'home-tracker-demo',
    startLine: 0,
    endLine: TRACKER_WOD_SCRIPT.split('\n').length,
    content: TRACKER_WOD_SCRIPT,
    state: 'idle',
    widgetIds: {},
    version: 1,
    createdAt: Date.now(),
  }))

  const handleClose = useCallback(() => {
    // no-op on the home page — panel stays visible
  }, [])

  return (
    <div className="w-full h-full overflow-hidden">
      <RuntimeTimerPanel
        block={block}
        onClose={handleClose}
        autoStart={false}
      />
    </div>
  )
}

// ── FrozenReviewPanel ─────────────────────────────────────────────────

function FrozenReviewPanel() {
  return (
    <div className="w-full h-full pointer-events-none overflow-hidden bg-background">
      <ReviewGrid
        runtime={null}
        segments={SAMPLE_SEGMENTS}
        selectedSegmentIds={new Set()}
        onSelectSegment={() => {}}
        groups={[]}
      />
    </div>
  )
}

// ── Section wrappers ──────────────────────────────────────────────────

function EditorParallaxSection({ actualTheme }: { actualTheme: string }) {
  return (
    <ParallaxSection
      id="editor"
      steps={EDITOR_STEPS}
      stickyAlign="right"
      chromeTitle="WodScript Editor"
      stickyContent={(activeStep) => <FrozenEditorPanel activeStep={activeStep} actualTheme={actualTheme} />}
      className="bg-background"
    />
  )
}

function TrackerParallaxSection() {
  return (
    <ParallaxSection
      id="tracker"
      steps={TRACKER_STEPS}
      stickyAlign="left"
      chromeTitle="Live Tracker"
      stickyContent={() => <LiveTrackerPanel />}
      className="bg-zinc-950/[0.03] dark:bg-zinc-900/20"
    />
  )
}

function ReviewParallaxSection() {
  return (
    <ParallaxSection
      id="review"
      steps={REVIEW_STEPS}
      stickyAlign="right"
      chromeTitle="Review"
      stickyContent={() => <FrozenReviewPanel />}
      className="bg-background"
    />
  )
}

// ── NotesReportingSection ─────────────────────────────────────────────

function NotesReportingSection() {
  return (
    <section id="reporting" className="relative border-b border-border/50 overflow-hidden">
      {/* Notes subsection */}
      <div className="py-24 lg:py-32 bg-muted/[0.12]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-start">
            <div className="lg:w-80 shrink-0">
              <div className="text-[10px] font-black tracking-[0.25em] uppercase text-primary mb-4">Notes & Data</div>
              <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-foreground uppercase leading-tight mb-6">
                Your Notes Can Talk Back.
              </h2>
              <p className="text-base font-medium text-muted-foreground leading-relaxed">
                Embed live data widgets directly into your training notes. PR trackers, volume charts, and session logs that update automatically as you train.
              </p>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {NOTES_EMBED_TYPES.map((type, i) => {
                const Icon = type.icon
                return (
                  <div key={i} className="flex flex-col gap-3 p-5 rounded-2xl bg-card border border-border/60 shadow-sm">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-foreground uppercase tracking-wide">{type.label}</div>
                      <div className="text-xs text-muted-foreground font-medium mt-1 leading-relaxed">{type.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      {/* Reporting placeholder */}
      <div className="py-24 lg:py-32 bg-primary/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50 pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <ClipboardList className="size-20 text-muted-foreground/20" />
              <div className="absolute -top-2 -right-2 bg-background rounded-full p-1 border border-border shadow-sm">
                <div className="size-3 bg-amber-500 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-foreground uppercase opacity-50">Custom Reports</h2>
          <div className="mt-8 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black tracking-[0.2em] uppercase shadow-sm">
            Coming Soon
          </div>
          <p className="mt-8 text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
            Weekly, monthly, and yearly reports showing exactly where you're improving. Full analytics engine coming in the next release.
          </p>
          <div className="flex flex-wrap justify-center mt-10 gap-6 text-sm text-muted-foreground/60 font-medium">
            <div className="flex items-center gap-2"><BarChart2 className="size-4" /> Volume trends</div>
            <div className="flex items-center gap-2"><LineChart className="size-4" /> Strength curves</div>
            <div className="flex items-center gap-2"><Archive className="size-4" /> Session history</div>
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
                <p className="text-2xl font-black text-primary uppercase tracking-tight sm:text-3xl">
                  Master your Training.
                </p>
                <p className="mx-auto max-w-3xl text-lg font-medium text-muted-foreground sm:text-xl leading-relaxed">
                  A unified ecosystem for athletes who want{' '}
                  <span className="text-foreground">precision, privacy, and performance insight</span>{' '}
                  with the simplicity of a <span className="text-foreground">whiteboard.</span>
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

      {/* Sticky Nav */}
      <StickyNav />

      {/* Act 1 — Editor */}
      <EditorParallaxSection actualTheme={actualTheme} />

      {/* Act 2 — Tracker */}
      <TrackerParallaxSection />

      {/* Act 3 — Review */}
      <ReviewParallaxSection />

      {/* Act 4 — Notes & Reporting */}
      <NotesReportingSection />

      {/* Main Playground Editor */}
      <section id="full-editor" className="flex flex-1 flex-col min-h-[700px] border-t border-border">
        <div className="flex items-center justify-between px-6 py-4 bg-muted/40 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="size-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--primary)]" />
            <h2 className="text-xs font-black uppercase tracking-[0.15em] text-foreground">Main Playground</h2>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground font-bold uppercase tracking-tighter bg-muted/50 px-3 py-1.5 rounded-md border border-border/50">
            Storage: Local IndexedDB // Persistence: Active
          </div>
        </div>
        <UnifiedEditor
          key="home-playground"
          value={localStorage.getItem('playground-content') || PLAYGROUND_CONTENT}
          onChange={(val) => localStorage.setItem('playground-content', val)}
          className="flex-1 min-h-0 w-full"
          theme={actualTheme}
        />
      </section>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => {
          setIsCommandPaletteOpen(false)
          setActiveCategory(null)
        }}
        items={workoutItems}
        onSelect={onSelectWorkout}
        initialCategory={activeCategory}
      />
    </div>
  )
}
