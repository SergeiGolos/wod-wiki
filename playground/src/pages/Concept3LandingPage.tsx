import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight, Moon, Play, Sun } from 'lucide-react'

import { NoteEditor } from '@/components/organisms/editor/NoteEditor'
import type { WodBlock } from '@/components/Editor/types'
import { RuntimeTimerPanel } from '@/components/organisms/editor/RuntimeTimerPanel'
import { useTheme } from '@/components/theme/ThemeProvider'
import { cn } from '@/lib/utils'

import { MacOSChrome } from '../components/MacOSChrome'

const SAMPLE_SOURCE = `\`\`\`wod
(3 Rounds)
  10 Kettlebell Swings 24kg
  15 Goblet Squats 24kg
  *:30 Rest
\`\`\``

const DIALECT_PILLARS = [
  {
    code: 'wod',
    title: 'Compile and execute',
    description:
      'Type the workout once, launch the runtime, and keep the full movement order visible while the timer is running.',
  },
  {
    code: 'log',
    title: 'Log sessions automatically',
    description:
      'Finished sessions flow back into the journal so the workout history does not become a second capture system.',
  },
  {
    code: 'wiki',
    title: 'Map the fitness graph',
    description:
      'Every workout, note, and movement stays linked so the training library reads like a local knowledge graph.',
  },
] as const

const POWER_USER_CALLOUTS = [
  {
    title: 'Chromecast and big-screen casting',
    description:
      'Keep the coach view on the wall while the keyboard stays in your hands.',
  },
  {
    title: 'Bring your own markdown storage',
    description:
      'Own the files locally instead of pushing workout history into a separate hosted editor silo.',
  },
  {
    title: 'Dialect switching stays explicit',
    description:
      'Move between `wod`, `log`, and `plan` without changing the mental model or the editing surface.',
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

function buildWorkoutPreview(source: string) {
  const lines = extractWodContent(source)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const roundLabel = lines[0]?.replace(/^\((.*)\)$/, '$1') ?? '3 Rounds'
  const activeMovement = lines[1] ?? '10 Kettlebell Swings 24kg'
  const nextUp = lines[2] ?? '15 Goblet Squats 24kg'

  return {
    roundLabel,
    activeMovement,
    nextUp,
  }
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
  const preview = useMemo(() => buildWorkoutPreview(source), [source])

  const handleOpenSandbox = useCallback(() => {
    editorAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleReturnToEditor = useCallback(() => {
    setPanelMode('editor')
    queueMicrotask(() => {
      editorAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  const handleLaunchWorkout = useCallback(() => {
    setPanelMode('timer')
  }, [])

  const handleOpenSyntaxDocs = useCallback(() => {
    navigate('/guide/syntax')
  }, [navigate])

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
        ▶ Live HUD
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
        <section className="mx-auto w-full max-w-5xl rounded-3xl border border-border/60 bg-card/70 px-6 py-10 shadow-sm backdrop-blur sm:px-10 lg:px-14">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-3 text-center">
            <span className="rounded-full border border-border/70 bg-background px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              WOD Wiki playground
            </span>
            <span className="text-sm font-semibold text-muted-foreground">Markdown-native training dashboard</span>
          </div>

          <div className="mx-auto mb-4 max-w-3xl rounded-full bg-[radial-gradient(ellipse_90%_80%_at_50%_0%,rgba(24,226,153,0.18)_0%,transparent_65%)] px-3 pb-8 pt-1" />

          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">WOD Wiki playground</p>
          <h1
            className="mt-3 text-4xl font-black tracking-[-0.08em] text-foreground sm:text-5xl lg:text-6xl"
            style={{ lineHeight: 1.02 }}
          >
            Stop tap-dancing with fitness apps. Just type.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
            WOD Wiki is the markdown-native training dashboard. Write workouts in WhiteboardScript plain text—our live JIT engine instantly compiles your text into interactive garage-gym timers, progression graphs, and offline journals.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleOpenSandbox}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
            >
              Open Sandbox Editor
              <ArrowRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleOpenSyntaxDocs}
              className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Read Syntax Docs
              <ChevronRight className="size-4" />
            </button>
          </div>
        </section>

        <section className="grid gap-8 [@media(min-width:1024px)]:grid-cols-[1.1fr_0.9fr] [@media(min-width:1024px)]:items-start">
          <div className="space-y-6 pb-24">
            <div className="rounded-3xl border border-black/5 bg-background p-6 shadow-sm">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary">Three dialects, one model</p>
              <h2 className="text-xl font-black tracking-[-0.06em] text-foreground sm:text-2xl">One page, three ways to talk about training.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                The landing page keeps the workout, the journal, and the knowledge graph in one loop so users do not have to switch products to finish the job.
              </p>

              <div className="mt-6 space-y-4">
                {DIALECT_PILLARS.map((pillar) => (
                  <div key={pillar.code} className="rounded-2xl border border-border/50 bg-background/80 p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                        {pillar.code}
                      </span>
                      <h3 className="text-sm font-semibold text-foreground">{pillar.title}</h3>
                    </div>
                    <p className="text-xs leading-6 text-muted-foreground">{pillar.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-black/5 bg-background p-6 shadow-sm">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary">Power-user defaults</p>
              <h2 className="text-xl font-black tracking-[-0.06em] text-foreground sm:text-2xl">Built for coaches, developers, and big screens.</h2>
              <div className="mt-6 space-y-4">
                {POWER_USER_CALLOUTS.map((callout) => (
                  <div key={callout.title} className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                    <h3 className="text-sm font-semibold text-foreground">{callout.title}</h3>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">{callout.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div ref={editorAnchorRef} className="scroll-mt-24" data-testid="concept3-editor-panel">
            <div className="[@media(min-width:1024px)]:sticky [@media(min-width:1024px)]:top-20">
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Round</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{preview.roundLabel}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Active movement</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{preview.activeMovement}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Next up</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{preview.nextUp}</p>
                </div>
              </div>

              <MacOSChrome
                title="sandbox.wod"
                headerActions={editorTabs}
                onReset={panelMode === 'editor' ? undefined : handleReturnToEditor}
              >
                <div className="flex h-[calc(100vh-8rem)] min-h-[620px] flex-col overflow-hidden bg-background sm:h-[720px] [@media(max-width:1023px)]:h-auto [@media(max-width:1023px)]:min-h-[560px]">
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
                            {movementCount} movement{movementCount === 1 ? '' : 's'} ready to launch
                          </div>
                          <button
                            type="button"
                            onClick={handleLaunchWorkout}
                            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
                          >
                            <Play className="size-4" />
                            Start workout
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
                          Return to editor
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

      <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 [@media(min-width:1024px)]:hidden">
        <button
          type="button"
          data-testid="concept3-mobile-editor-cta"
          onClick={handleOpenSandbox}
          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/95 px-4 py-3 text-sm font-semibold text-foreground shadow-lg backdrop-blur"
        >
          Open Sandbox Editor
          <ArrowRight className="size-4" />
        </button>
      </div>
    </main>
  )
}
