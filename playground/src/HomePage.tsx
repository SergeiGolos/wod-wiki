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
            <div className="space-y-6">
              <h1 className="text-6xl font-black tracking-tighter sm:text-8xl lg:text-9xl text-foreground uppercase drop-shadow-sm">
                WOD.WIKI
              </h1>
              {/* Card Scroller / Spotlight */}
              <div className="relative mt-2 max-w-5xl mx-auto w-full group/scroller">
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
                      label: 'Editor',
                      tagline: 'Plan your training',
                      color: 'text-blue-600 dark:text-blue-400',
                      ring: 'hover:border-blue-400/50',
                      bg: 'bg-blue-500/10',
                      bullets: [
                        'Write workouts in plain markdown',
                        'Syntax highlights every metric type',
                        'Live parse feedback as you type',
                        'Load from your workout library',
                      ],
                    },
                    {
                      id: 'tracker',
                      icon: <Timer className="size-6" />,
                      label: 'Timer',
                      tagline: 'Track performance',
                      color: 'text-orange-600 dark:text-orange-400',
                      ring: 'hover:border-orange-400/50',
                      bg: 'bg-orange-500/10',
                      bullets: [
                        'Smart lap timer built from your script',
                        'Countdown or count-up per block',
                        'Collects reps, rest, and effort',
                        'Advance manually or automatically',
                      ],
                    },
                    {
                      id: 'review',
                      icon: <BarChart2 className="size-6" />,
                      label: 'Review',
                      tagline: 'Analyze your metrics',
                      color: 'text-purple-600 dark:text-purple-400',
                      ring: 'hover:border-purple-400/50',
                      bg: 'bg-purple-500/10',
                      bullets: [
                        'Per-set performance breakdown',
                        'Volume, load & distance projections',
                        'Records written inline in your notebook',
                        'Historical session comparison',
                      ],
                    },
                  ].map((card) => (
                    <button
                      key={card.id}
                      onClick={() => scrollToSection(card.id)}
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
                      <ul className="text-left space-y-1.5 mb-5 flex-1">
                        {card.bullets.map((b) => (
                          <li key={b} className="flex items-start gap-1.5 text-[12px] text-muted-foreground leading-snug">
                            <span className={`mt-0.5 text-[8px] shrink-0 ${card.color}`}>▸</span>
                            {b}
                          </li>
                        ))}
                      </ul>
                      <div className="w-full pt-4 border-t border-border/50 mt-auto">
                        <div className={`inline-flex items-center gap-1 text-[10px] font-bold ${card.color}`}>
                          Explore {card.label}
                          <ChevronDown className="size-3 rotate-[-90deg]" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 mt-4 text-muted-foreground/40">
              <span className="text-[9px] font-black uppercase tracking-[0.35em]">Scroll to explore</span>
              <ChevronDown className="size-4 animate-bounce" />
            </div>
          </div>
        </div>
      </section>

      {/* Act 1 — Editor (stickyAlign='right', bg-background) */}
      {/* Act 1b — Browse Collections (stickyAlign='right', bg-muted/[0.03]) */}
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

      {/* Browse — follows the main act so it doesn't interrupt the Plan→Track flow */}
      <ActBrowseSection
        actualTheme={actualTheme}
        onRun={launchTracker}
        onSearch={() => { paletteSourceRef.current = 'browse'; setHomePaletteOpen(true) }}
        browseRef={browseRef}
      />

      {/* Resources / Deep Dive (ScrollSection, no sticky) */}
      <DeepDiveSection />

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
