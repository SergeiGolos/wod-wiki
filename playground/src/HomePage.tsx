import { useState, useRef, useCallback } from 'react'
import { CommandPalette } from '@/components/playground/CommandPalette'
import type { WodBlock } from '@/components/Editor/types'
import type { IScriptRuntime } from '@/runtime/contracts/IScriptRuntime'
import {
  Zap,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PenLine,
  Timer,
  BarChart2,
} from 'lucide-react'
import { scrollToSection } from './components/ParallaxSection'
import type { FrozenEditorPanelHandle } from './components/FrozenEditorPanel'
import { SAMPLE_SCRIPT } from './data/parallaxActSteps'

// Section components
import { Act1EditorSection } from './sections/Act1EditorSection'
import { ActBrowseSection } from './sections/ActBrowseSection'
import { DeepDiveSection } from './sections/DeepDiveSection'

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
  const paletteSourceRef = useRef<'editor' | 'tracker' | 'browse'>('editor')
  const [liveRuntime, setLiveRuntime] = useState<IScriptRuntime | null>(null)
  const editorRef = useRef<FrozenEditorPanelHandle>(null)
  const browseRef = useRef<FrozenEditorPanelHandle>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const scrollScroller = (direction: 'left' | 'right') => {
    if (scrollerRef.current) {
      const scrollAmount = scrollerRef.current.clientWidth * 0.8
      scrollerRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' })
    }
  }


  /** Called by the editor's Run button — creates (or resets) the tracker runtime */
  const launchTracker = useCallback((script: string) => {
    // If the script is markdown with an embedded ```wod block, extract the wod content.
    // This handles the SAMPLE_SCRIPT and any user-edited markdown documents.
    let content: string
    const embeddedWod = script.match(/```(?:wod|log|plan)\n([\s\S]*?)(?:\n```|$)/)
    if (embeddedWod) {
      content = embeddedWod[1].trim()
    } else {
      // Bare ```wod...``` fence at the document root (e.g. from CollectionRun)
      content = script.replace(/^```\w*\n/, '').replace(/\n```$/, '').trim()
    }
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
    // Scroll to the tracker phase (step 3 within the #editor section)
    requestAnimationFrame(() => {
      const el = document.querySelector('#editor [data-step="3"]')
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 110
        window.scrollTo({ top, behavior: 'smooth' })
      }
    })
  }, [])

  /** Reset: clear runtime state without scrolling (panel transitions in-place) */
  const resetDemo = useCallback(() => {
    setTrackerBlock(null)
    setLiveRuntime(null)
  }, [])

  /** Extract wod blocks from selected workout content and load into frozen editor */
  const handleWorkoutSelect = useCallback((item: { id: string; name: string; category: string; content?: string }) => {
    if (!item.content) return
    const wodBlocks: string[] = []
    const regex = /```wod\n([\s\S]*?)\n```/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(item.content)) !== null) {
      wodBlocks.push('```wod\n' + match[1] + '\n```')
    }
    const script = wodBlocks.length > 0 ? wodBlocks.join('\n\n') : item.content
    editorRef.current?.loadScript(script)
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
            <div className="space-y-6 max-w-4xl">
              <h1 className="text-4xl font-black tracking-tighter sm:text-6xl lg:text-7xl text-foreground uppercase drop-shadow-sm leading-tight">
                Your workout — written once, run forever.
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                WOD Wiki is a workout studio for coaches, trainers, and home gym enthusiasts. 
                Write your session in a simple notation, hit play, and let the timer do the rest. 
                Every rep, every round, tracked automatically.
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                <button
                  onClick={() => scrollToSection('editor')}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
                >
                  <Play className="size-4 fill-current" />
                  Try it Now
                </button>
                <button
                  onClick={() => navigate('/journal')}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background px-8 text-sm font-black uppercase tracking-widest text-foreground hover:bg-muted transition-all"
                >
                  Open Journal →
                </button>
              </div>

              {/* Value Pillars / Card Scroller */}
              <div className="relative mt-12 max-w-5xl mx-auto w-full group/scroller">
                <button
                  onClick={() => scrollScroller('left')}
                  className="absolute -left-12 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-muted transition-all opacity-0 group-hover/scroller:opacity-100 hidden lg:flex text-muted-foreground hover:text-foreground"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  onClick={() => scrollScroller('right')}
                  className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-muted transition-all opacity-0 group-hover/scroller:opacity-100 hidden lg:flex text-muted-foreground hover:text-foreground"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="size-6" />
                </button>
                <div
                  ref={scrollerRef}
                  className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-6 pb-8 -mx-6 px-6 sm:mx-0 sm:px-0 sm:pb-0 scroll-smooth"
                >
                  {[
                    {
                      id: 'editor',
                      icon: <PenLine className="size-6" />,
                      label: 'Write Like a Coach',
                      tagline: 'Plan sessions in plain text',
                      copy: 'Exactly the way coaches whiteboard workouts — reps, rounds, distances, rest. No forms, no dropdowns.',
                      color: 'text-blue-600 dark:text-blue-400',
                      ring: 'hover:border-blue-400/50',
                      bg: 'bg-blue-500/10',
                    },
                    {
                      id: 'tracker',
                      icon: <Timer className="size-6" />,
                      label: 'Smart Timer Runs the Show',
                      tagline: 'Hit play and follow along',
                      copy: "The timer knows when each round ends, when to rest, and what's coming next.",
                      color: 'text-orange-600 dark:text-orange-400',
                      ring: 'hover:border-orange-400/50',
                      bg: 'bg-orange-500/10',
                    },
                    {
                      id: 'review',
                      icon: <BarChart2 className="size-6" />,
                      label: 'Analytics That Make Sense',
                      tagline: 'See your work calculated',
                      copy: 'Total volume, time under load, intensity. Pre-workout estimates, post-workout totals.',
                      color: 'text-purple-600 dark:text-purple-400',
                      ring: 'hover:border-purple-400/50',
                      bg: 'bg-purple-500/10',
                    },
                  ].map((card) => (
                    <button
                      key={card.id}
                      onClick={() => scrollToSection('editor')}
                      className={`
                        snap-center shrink-0 w-[85vw] sm:w-auto sm:flex-1 sm:min-w-[300px]
                        group flex flex-col items-start rounded-xl border border-border p-6 text-left transition-all ${
                        card.ring
                      } hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5
                      `}
                    >
                      <div className={`flex size-12 items-center justify-center rounded-xl ${card.bg} ${card.color} mb-4 transition-colors`}>
                        {card.icon}
                      </div>
                      <div>
                        <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${card.color} mb-1`}>
                          {card.label}
                        </div>
                        <div className="text-base font-black uppercase tracking-tight text-foreground mb-3 leading-tight">
                          {card.tagline}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                        {card.copy}
                      </p>
                      <div className="w-full pt-4 border-t border-border/50 mt-auto">
                        <div className={`inline-flex items-center gap-1 text-[10px] font-bold ${card.color}`}>
                          See it in action
                          <ChevronDown className="size-3 rotate-[-90deg]" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Act 1 — Editor (stickyAlign='right', bg-background) */}
      <Act1EditorSection
        actualTheme={actualTheme}
        onRun={launchTracker}
        onSearch={() => { paletteSourceRef.current = 'editor'; setHomePaletteOpen(true) }}
        editorRef={editorRef}
        trackerBlock={trackerBlock}
        trackerPreview={trackerPreview}
        onReset={resetDemo}
        onStartPreview={(script) => { setTrackerPreview(null); launchTracker(script) }}
        onClearPreview={() => { paletteSourceRef.current = 'tracker'; setTrackerPreview(null); setHomePaletteOpen(true) }}
        onRuntimeReady={setLiveRuntime}
        liveRuntime={liveRuntime}
        onAutoStart={() => { if (!trackerBlock) launchTracker(SAMPLE_SCRIPT) }}
      />

      {/* Features Spotlight */}
      <section id="features" className="px-6 py-24 bg-muted/30 border-y border-border/50">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter">Everything you need to train</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Key capabilities at a glance.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Timer className="size-6" />,
                title: 'Smart Timer',
                bullets: ['Counts up / down / interval', 'Automatic advance', 'Audio and visual cues', 'Full-screen mode'],
                color: 'text-orange-600 dark:text-orange-400',
                bg: 'bg-orange-500/10'
              },
              {
                icon: <BarChart2 className="size-6" />,
                title: 'Pre & Post Analytics',
                bullets: ['Estimated time and reps', 'Projected volume', 'Actual vs. estimated', 'Intensity graphs'],
                color: 'text-purple-600 dark:text-purple-400',
                bg: 'bg-purple-500/10'
              },
              {
                icon: <Tv className="size-6" />,
                title: 'Chromecast Ready',
                bullets: ['Cast to any gym TV', 'Readable across room', 'No TV app required', 'One-click cast'],
                color: 'text-blue-600 dark:text-blue-400',
                bg: 'bg-blue-500/10'
              },
              {
                icon: <RectangleStackIcon className="size-6" />,
                title: 'Collections & Library',
                bullets: ['Organize into collections', 'Browse by category', 'One-click load', 'Inline search'],
                color: 'text-emerald-600 dark:text-emerald-400',
                bg: 'bg-emerald-500/10'
              }
            ].map(f => (
              <div key={f.title} className="flex flex-col items-start gap-4">
                <div className={`flex size-12 items-center justify-center rounded-xl ${f.bg} ${f.color}`}>
                  {f.icon}
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider">{f.title}</h3>
                <ul className="space-y-2">
                  {f.bullets.map(b => (
                    <li key={b} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={`size-1 rounded-full ${f.bg} ${f.color} bg-current`} />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Explore — follows the main act so it doesn't interrupt the Plan→Track flow */}
      <section id="explore" className="px-6 py-24 bg-background">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter">Browse the Library</h2>
            <p className="text-muted-foreground max-w-2xl leading-relaxed">
              Hundreds of ready-to-run workouts across every discipline. 
              Click any card to load it in the editor and run immediately.
            </p>
          </div>
          <div className="h-[600px] flex flex-col rounded-3xl border border-border bg-muted/10 overflow-hidden shadow-2xl shadow-black/5">
             <ActBrowseSection
                actualTheme={actualTheme}
                onRun={launchTracker}
                onSearch={() => { paletteSourceRef.current = 'browse'; setHomePaletteOpen(true) }}
                browseRef={browseRef}
              />
          </div>
        </div>
      </section>

      {/* Resources / Deep Dive (ScrollSection, no sticky) */}
      <DeepDiveSection />

      {/* Journal CTA */}
      <section className="px-6 py-24 bg-primary text-primary-foreground overflow-hidden relative">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="relative mx-auto max-w-4xl text-center space-y-8">
          <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter">
            Start your training journal.
          </h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto leading-relaxed">
            Every workout you run is automatically logged. Open today's journal entry and add your notes, load records, and session intentions — all in the same syntax.
          </p>
          <div className="flex flex-col items-center gap-4 pt-4">
            <button
              onClick={() => navigate('/journal/' + new Date().toISOString().slice(0, 10))}
              className="inline-flex h-14 items-center justify-center rounded-xl bg-primary-foreground px-10 text-sm font-black uppercase tracking-widest text-primary shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              Open Today's Journal →
            </button>
            <p className="text-xs opacity-70 font-bold uppercase tracking-widest">
              No cloud required. Your data stays on your device.
            </p>
          </div>
        </div>
      </section>

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
            if (paletteSourceRef.current === 'browse') {
              if (!item.content) return
              const wodBlocks: string[] = []
              const regex = /```wod\n([\s\S]*?)\n```/g
              let match: RegExpExecArray | null
              while ((match = regex.exec(item.content)) !== null) {
                wodBlocks.push('```wod\n' + match[1] + '\n```')
              }
              const script = wodBlocks.length > 0 ? wodBlocks.join('\n\n') : item.content
              browseRef.current?.loadScript(script)
              setHomePaletteOpen(false)
            } else if (paletteSourceRef.current === 'tracker') {
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
