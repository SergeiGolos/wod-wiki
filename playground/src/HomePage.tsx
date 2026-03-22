import { useState, useRef, useCallback, useMemo } from 'react'
import { CommandPalette } from '@/components/playground/CommandPalette'
import type { WodBlock } from '@/components/Editor/types'
import type { IScriptRuntime } from '@/runtime/contracts/IScriptRuntime'
import { getWodCollections } from '@/repositories/wod-collections'
import {
  Zap,
  ChevronDown,
} from 'lucide-react'
import { scrollToSection } from './components/ParallaxSection'
import type { FrozenEditorPanelHandle } from './components/FrozenEditorPanel'
import { SAMPLE_SCRIPT } from './data/parallaxActSteps'

// Section components
import { Act1EditorSection } from './sections/Act1EditorSection'
import { ActBrowseSection } from './sections/ActBrowseSection'
import { CollectionsParallaxSection } from './sections/CollectionsParallaxSection'
import { ChromecastSection } from './sections/ChromecastSection'
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

  // Collections data
  const allCollections = useMemo(() => getWodCollections(), [])

  /** Called by the editor's Run button — creates (or resets) the tracker runtime */
  const launchTracker = useCallback((script: string) => {
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
              <div className="space-y-4">
                <p className="mx-auto max-w-3xl text-lg font-medium text-muted-foreground sm:text-xl leading-relaxed">
                  <button onClick={() => scrollToSection('editor')} className="inline-flex items-baseline px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-black cursor-pointer hover:bg-primary/20 hover:scale-105 transition-all">Plan</button>
                  {' '}your training,{' '}
                  <button onClick={() => scrollToSection('tracker')} className="inline-flex items-baseline px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-black cursor-pointer hover:bg-primary/20 hover:scale-105 transition-all">Track</button>
                  {' '}performance, analyze collected{' '}
                  <button onClick={() => scrollToSection('review')} className="inline-flex items-baseline px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-black cursor-pointer hover:bg-primary/20 hover:scale-105 transition-all">Metrics</button>
                  {' '}for insights — all with the simplicity of a wiki{' '}
                  <button onClick={() => scrollToSection('records')} className="inline-flex items-baseline px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-black cursor-pointer hover:bg-primary/20 hover:scale-105 transition-all">Notebook</button>.
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

      {/* Collections (stickyAlign='right', bg-background) */}
      <CollectionsParallaxSection
        actualTheme={actualTheme}
        collections={allCollections}
        onRun={launchTracker}
      />

      {/* Chromecast (ScrollSection, no sticky) */}
      <ChromecastSection />

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
