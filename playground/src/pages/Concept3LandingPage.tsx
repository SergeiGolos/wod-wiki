import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Layers3,
  Moon,
  Play,
  Sparkles,
  Sun,
  Timer,
  TerminalSquare,
} from 'lucide-react'

import { NoteEditor } from '@/components/Editor/NoteEditor'
import type { WodBlock } from '@/components/Editor/types'
import { RuntimeTimerPanel } from '@/components/Editor/overlays/RuntimeTimerPanel'
import { useTheme } from '@/components/theme/ThemeProvider'
import { cn } from '@/lib/utils'

import { MacOSChrome } from '../components/MacOSChrome'

const SAMPLE_SOURCE = `\`\`\`wod
AMRAP 12:00
  10 Kettlebell Swings 24kg
  8 Burpees
  *:30 Rest
\`\`\``

const FEATURES = [
  {
    icon: <Layers3 className="size-4" aria-hidden="true" />,
    title: 'Rounds, timers, loading',
    description: 'One syntax describes the full workout structure without switching modes.',
  },
  {
    icon: <Timer className="size-4" aria-hidden="true" />,
    title: 'Sticky live HUD',
    description: 'The editor stays anchored while the timer takes over on Run.',
  },
  {
    icon: <TerminalSquare className="size-4" aria-hidden="true" />,
    title: 'Parser-first workflow',
    description: 'The output panel explains how the workout is parsed into executable structure.',
  },
] as const

const SYNTAX_REFERENCE = [
  {
    label: 'AMRAP',
    snippet: 'AMRAP 12:00\n  10 Kettlebell Swings 24kg\n  8 Burpees\n  *:30 Rest',
  },
  {
    label: 'Rounds',
    snippet: '(3)\n  10 Front Squats 95lb\n  12 Push-ups\n  *:45 Rest',
  },
  {
    label: 'Ladder',
    snippet: '21,15,9 Thrusters 95lb\n21,15,9 Pull-ups',
  },
] as const

function extractWodContent(source: string): string {
  const fenceMatch = source.match(/```wod\s*\n([\s\S]*?)\n```/i)
  return (fenceMatch?.[1] ?? source).trim()
}

function createSampleBlock(source: string): WodBlock {
  const content = extractWodContent(source)
  const lines = content.split('\n')

  return {
    id: 'concept-3-canvas-landing-sample',
    startLine: 0,
    endLine: Math.max(0, lines.length - 1),
    content,
    state: 'parsed',
    widgetIds: {},
    version: 1,
    createdAt: Date.now(),
  }
}

function estimateMovementCount(source: string): number {
  const lines = extractWodContent(source)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return Math.max(0, lines.length - 1)
}

function useScrollProgressBar() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const doc = document.documentElement
      const max = doc.scrollHeight - doc.clientHeight
      if (max <= 0) {
        setProgress(0)
        return
      }
      setProgress(Math.min(1, Math.max(0, doc.scrollTop / max)))
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return progress
}

export function Concept3LandingPage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const editorAnchorRef = useRef<HTMLDivElement | null>(null)
  const [source, setSource] = useState(SAMPLE_SOURCE)
  const [panelMode, setPanelMode] = useState<'editor' | 'timer'>('editor')
  const [parsedBlock, setParsedBlock] = useState<WodBlock | null>(null)
  const progress = useScrollProgressBar()

  const isDarkMode = useMemo(() => {
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  const activeBlock = useMemo(() => parsedBlock ?? createSampleBlock(source), [parsedBlock, source])
  const movementCount = useMemo(() => {
    return parsedBlock?.statements?.length ?? estimateMovementCount(source)
  }, [parsedBlock, source])

  const handleEditorScroll = useCallback(() => {
    editorAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleReturnToEditor = useCallback(() => {
    setPanelMode('editor')
    queueMicrotask(() => {
      editorAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  const handleRunWorkout = useCallback(() => {
    setPanelMode('timer')
  }, [])

  const editorTabs = (
    <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.22em]">
      <button
        type="button"
        className={cn(
          'rounded-full px-3 py-1.5 transition-colors',
          panelMode === 'editor'
            ? 'bg-primary/12 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
        onClick={() => setPanelMode('editor')}
      >
        ✏️ Editor
      </button>
      <button
        type="button"
        className={cn(
          'rounded-full px-3 py-1.5 transition-colors',
          panelMode === 'timer'
            ? 'bg-primary/12 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
        onClick={() => setPanelMode('timer')}
      >
        ▶ Timer
      </button>
    </div>
  )

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div
        data-testid="concept3-scroll-progress"
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px] bg-gradient-to-r from-primary via-emerald-400 to-emerald-300"
        style={{ width: `${progress * 100}%` }}
      />

      <div className="fixed right-4 top-4 z-40 flex items-center gap-2 rounded-2xl border border-border/70 bg-background/85 px-4 py-2.5 shadow-sm backdrop-blur">
        <Sun className="size-4 text-muted-foreground" aria-hidden="true" />
        <button
          type="button"
          className="relative h-5 w-10 rounded-full bg-muted transition-colors"
          onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
          aria-label="Toggle dark mode"
        >
          <span
            className={cn(
              'absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform',
              isDarkMode ? 'translate-x-5' : 'translate-x-0.5',
            )}
          />
        </button>
        <Moon className="size-4 text-muted-foreground" aria-hidden="true" />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="mx-auto w-full max-w-4xl rounded-3xl border border-border/60 bg-card/70 px-6 py-10 text-center shadow-sm backdrop-blur sm:px-10 lg:px-14">
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="rounded-full border border-border/70 bg-background px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              Concept 3
            </span>
            <span className="text-sm font-semibold text-muted-foreground">Canvas Two-Column Scroll-Driven</span>
          </div>

          <div className="mx-auto mb-4 max-w-3xl rounded-full bg-[radial-gradient(ellipse_90%_80%_at_50%_0%,rgba(24,226,153,0.18)_0%,transparent_65%)] px-3 pb-8 pt-1" />

          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">WOD Wiki playground</p>
          <h1
            className="mt-3 text-4xl font-black tracking-[-0.08em] text-foreground sm:text-5xl lg:text-6xl"
            style={{ lineHeight: 1.02 }}
          >
            Workouts that explain themselves.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            Scroll the guide, keep the editor pinned, and flip to the timer without losing your place.
            The page is a working prototype of the new home canvas.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleEditorScroll}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
            >
              Open editor
              <ArrowRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/legacy')}
              className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Legacy playground
              <ChevronRight className="size-4" />
            </button>
          </div>
        </section>

        <section className="grid gap-8 [@media(min-width:900px)]:grid-cols-[2fr_3fr] [@media(min-width:900px)]:items-start">
          <div className="space-y-6 pb-24">
            <div className="rounded-2xl border border-black/5 bg-background p-6 shadow-sm">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary">↓ Scroll to explore</p>
              <h2 className="text-xl font-black tracking-[-0.06em] text-foreground sm:text-2xl">One syntax. Any workout.</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
                WOD syntax is written like a coach would describe the session: clear, structured, and ready to become a runtime.
              </p>

              <div className="mt-6 space-y-4">
                {FEATURES.map((feature) => (
                  <div key={feature.title} className="flex gap-4 rounded-2xl border border-border/50 bg-background/80 p-4">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
                      <p className="mt-1 text-xs leading-6 text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-black/5 bg-background p-6 shadow-sm">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary">The HUD</p>
              <h2 className="text-xl font-black tracking-[-0.06em] text-foreground sm:text-2xl">Parser → structure → timer.</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
                Press Run and the parser output becomes the live timer panel: round tracker, active movement, and next-up queue.
              </p>

              <div className="mt-5 overflow-hidden rounded-2xl border border-border/70 bg-muted/20 p-4 font-mono text-xs leading-6 text-muted-foreground">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80"># Parser output (simplified)</div>
                <div><span className="text-foreground">block</span>: AMRAP, 12:00</div>
                <div className="pl-4"><span className="text-foreground">step[0]</span>: KB Swings, 10 reps, 24kg</div>
                <div className="pl-4"><span className="text-foreground">step[1]</span>: Burpees, 8 reps</div>
                <div className="pl-4"><span className="text-foreground">step[2]</span>: Rest, :30</div>
              </div>
            </div>

            <div className="rounded-2xl border border-black/5 bg-background p-6 shadow-sm">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary">Fullscreen mode</p>
              <h2 className="text-xl font-black tracking-[-0.06em] text-foreground sm:text-2xl">Take it to the floor.</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
                The fullscreen timer is the distraction-free version: bigger timer, stronger contrast, and a simple next step.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  FullscreenTimer
                </span>
                <span className="text-xs text-muted-foreground">Dialog-based immersive timer experience</span>
              </div>
            </div>

            <div className="rounded-2xl border border-black/5 bg-background p-6 shadow-sm">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary">Syntax reference</p>
              <h2 className="text-xl font-black tracking-[-0.06em] text-foreground sm:text-2xl">Three compact examples.</h2>
              <div className="mt-5 grid gap-3">
                {SYNTAX_REFERENCE.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground">{item.label}</span>
                      <span className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                        Example
                      </span>
                    </div>
                    <pre className="overflow-x-auto font-mono text-xs leading-6 text-muted-foreground">
                      {item.snippet}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div ref={editorAnchorRef} className="scroll-mt-24" data-testid="concept3-editor-panel">
            <div className="[@media(min-width:900px)]:sticky [@media(min-width:900px)]:top-20">
              <MacOSChrome
                title="concept-3-home.wod"
                headerActions={editorTabs}
                onReset={panelMode === 'editor' ? undefined : handleReturnToEditor}
              >
                <div className="flex h-[calc(100vh-8rem)] min-h-[620px] flex-col overflow-hidden bg-background sm:h-[720px] [@media(max-width:899px)]:h-auto [@media(max-width:899px)]:min-h-[560px]">
                  {panelMode === 'editor' ? (
                    <>
                      <div className="min-h-0 flex-1 overflow-hidden">
                        <NoteEditor
                          value={source}
                          onChange={setSource}
                          theme={isDarkMode ? 'dark' : 'vs'}
                          className="h-full"
                          readonly={false}
                          enablePreview={false}
                          enableLinting
                          enableOverlay={false}
                          enableInlineRuntime={false}
                          onBlocksChange={(blocks) => {
                            setParsedBlock(blocks[0] ?? null)
                          }}
                        />
                      </div>

                      <div className="shrink-0 border-t border-border/70 bg-muted/20 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-xs text-muted-foreground">
                            {movementCount} movement{movementCount === 1 ? '' : 's'} ready to run
                          </div>
                          <button
                            type="button"
                            onClick={handleRunWorkout}
                            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
                          >
                            <Play className="size-4" />
                            Run Workout Timer
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-muted/15 px-4 py-3">
                        <button
                          type="button"
                          onClick={handleReturnToEditor}
                          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <ChevronLeft className="size-4" />
                          Back to editor
                        </button>
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-primary">
                          {movementCount} movement{movementCount === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="min-h-0 flex-1 overflow-hidden">
                        <RuntimeTimerPanel
                          block={activeBlock}
                          autoStart
                          onClose={handleReturnToEditor}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </MacOSChrome>
            </div>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 [@media(min-width:900px)]:hidden">
        <button
          type="button"
          data-testid="concept3-mobile-editor-cta"
          onClick={handleEditorScroll}
          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/95 px-4 py-3 text-sm font-semibold text-foreground shadow-lg backdrop-blur"
        >
          Open editor
          <ArrowRight className="size-4" />
        </button>
      </div>
    </main>
  )
}
