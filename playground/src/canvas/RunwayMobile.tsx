/**
 * RunwayMobile.tsx — the mobile presentation of a ```scroll runway: a pinned
 * editor window that sticks under the nav and releases after the last caption
 * card. The scrolling caption cards are the track; a card-visibility driver
 * (the mobile Scroll Driver) resolves the active stage through the same
 * `resolveScrollStage` seam the desktop scroll-progress driver uses — mobile
 * just feeds it a discrete card index (mapped to the stage's range midpoint)
 * instead of a continuous scroll progress, so the resolved slice has a discrete
 * `t`. With no continuous `t` to scrub, the demo auto-plays (types) per stage.
 *
 * One branch of the Runway Adapter (#936) — the spec-driven replacement for the
 * tour-coupled `TourMobileRunway` pattern. Validated in the /proto/runway-adapter
 * prototype.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Play } from 'lucide-react'
import type { ScriptBlock } from '@/components/Editor/types'
import type { ScrollSpec } from './parseCanvasMarkdown'
import { resolveSource, MOBILE_STICKY_TOP } from './canvasUtils'
import { resolveScrollStage } from './scrollRunway'
import { ScrollRing } from './ScrollRing'
import { CanvasProse } from './CanvasProse'
import { MacOSChrome } from '../components/atoms/MacOSChrome'
import { NoteEditor } from '@/components/organisms/editor/NoteEditor'

export interface RunwayMobileProps {
  spec: ScrollSpec
  wodFiles: Record<string, string>
  theme: string
  noteTitle?: string
  /** Controlled editor document (with `onDocChange`) — a host that owns the runway's doc (ScrollCanvasPage) passes it; omit for an uncontrolled runway. */
  doc?: string
  onDocChange?: (doc: string) => void
  /** Fired when the compiled blocks change (feeds the host's live block). */
  onBlocksChange?: (blocks: ScriptBlock[]) => void
  /** Fired when the active stage changes (card-visibility driven). */
  onStageEnter?: (stageId: string) => void
  /** Run handler — opens the host's runtime with the current doc + block. */
  onRun?: (doc: string, block: ScriptBlock | null) => void
  className?: string
}

export function RunwayMobile({ spec, wodFiles, theme, noteTitle, doc: controlledDoc, onDocChange, onBlocksChange, onStageEnter, onRun, className }: RunwayMobileProps) {
  const stages = spec.stages
  const sourcesByStageId = useMemo(
    () => Object.fromEntries(stages.map((s) => [s.id, s.source ? resolveSource(s.source, wodFiles) : ''])),
    [stages, wodFiles],
  )

  const [activeIndex, setActiveIndex] = useState(0)
  const cardRefs = useRef<Array<HTMLDivElement | null>>([])
  const ratiosRef = useRef<Map<number, number>>(new Map())

  // Card-visibility driver: the caption card sitting in the reading zone (the
  // band of viewport below the pinned window) is the active stage.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const ratios = ratiosRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = Number((e.target as HTMLElement).dataset.cardIndex)
          ratios.set(i, e.intersectionRatio)
        }
        let best = -1
        let bestRatio = 0
        ratios.forEach((r, i) => {
          if (r > bestRatio) {
            bestRatio = r
            best = i
          }
        })
        if (best >= 0) setActiveIndex(best)
      },
      // Reading zone: a band below the ~46vh pinned window.
      { rootMargin: '-52% 0px -18% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    )
    cardRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [stages.length])

  // One seam: the discrete card index maps to a progress at the stage's range
  // midpoint, then through the same resolver the desktop scroll driver uses.
  const slice = useMemo(() => {
    const stage = stages[activeIndex] ?? stages[0]
    const mid = (stage.range[0] + stage.range[1]) / 2
    return resolveScrollStage(mid, stages)
  }, [activeIndex, stages])

  useEffect(() => {
    onStageEnter?.(slice.stage.id)
  }, [slice.stage.id, onStageEnter])

  // Auto-play the demo per stage (mobile has no continuous t to scrub): type
  // the active stage's source, restarting on each stage crossing.
  const source = sourcesByStageId[slice.stage.id] ?? ''
  // Controlled-or-uncontrolled document (host-owned for the guides).
  const [internalDoc, setInternalDoc] = useState(source)
  const doc = controlledDoc ?? internalDoc
  const setDoc = onDocChange ?? setInternalDoc
  const blocksRef = useRef<ScriptBlock[]>([])
  useEffect(() => {
    // Sourceless stage: HOLD the previous editor content (the desktop typewriter
    // contract — "stages without a source hold the previous editor content"),
    // e.g. a closing "keep playing in the editor above" stage. Don't wipe the demo.
    if (!source) return
    setDoc('')
    let i = 0
    const step = Math.max(1, Math.round(source.length / 48))
    const id = window.setInterval(() => {
      i += step
      setDoc(source.slice(0, i))
      if (i >= source.length) window.clearInterval(id)
    }, 24)
    return () => window.clearInterval(id)
  }, [source, setDoc])

  const handleBlocksChange = useCallback(
    (blocks: ScriptBlock[]) => {
      blocksRef.current = blocks
      onBlocksChange?.(blocks)
    },
    [onBlocksChange],
  )

  const accent = slice.stage.accent ?? 'hsl(var(--foreground))'

  return (
    <section className={className} data-testid="runway-mobile">
      <div className="relative">
        {/* Pinned window — sticks under the nav, releases after the last card. */}
        <div className="sticky z-20 px-4 pt-3" style={{ top: MOBILE_STICKY_TOP }}>
          <div className="relative h-[46vh]">
            <MacOSChrome
              title={noteTitle ?? 'note.md'}
              className="absolute inset-0"
              headerActions={
                onRun ? (
                  <button
                    type="button"
                    title="Run the workout"
                    onClick={() => onRun(doc, blocksRef.current[0] ?? null)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Play size={11} fill="currentColor" />
                    Run
                  </button>
                ) : undefined
              }
            >
              <NoteEditor
                noteId="canvas:runway-mobile"
                value={doc}
                onChange={setDoc}
                onBlocksChange={handleBlocksChange}
                theme={theme}
                readonly
                showLineNumbers={false}
                enableOverlay={false}
                enableInlineRuntime={false}
                className="h-full"
              />
            </MacOSChrome>
            {slice.ring && <ScrollRing tag={slice.ring.tag} accent={accent} />}
          </div>
        </div>

        {/* Caption cards — the scroll track. A modest bottom pad keeps the window
            pinned while the last card is read; the page's following content (trailing
            sections) then scrolls in and the window releases after the last card. */}
        <div className="relative z-10 px-4 pb-[16vh]">
          {stages.map((stage, i) => (
            <div
              key={stage.id}
              ref={(el) => {
                cardRefs.current[i] = el
              }}
              data-card-index={i}
              className="flex min-h-[68vh] items-end pb-6"
            >
              <article
                className="w-full rounded-2xl border bg-card/95 p-5 backdrop-blur transition-all duration-300"
                style={{
                  borderColor: i === activeIndex ? accent : 'hsl(var(--border))',
                  boxShadow: i === activeIndex ? `0 0 0 1px ${accent}` : undefined,
                }}
              >
                <div
                  className="font-mono text-[11px] uppercase tracking-[0.22em]"
                  style={{ color: stage.accent ?? 'hsl(var(--muted-foreground))' }}
                >
                  {String(i + 1).padStart(2, '0')} / {String(stages.length).padStart(2, '0')}
                </div>
                <h3 className="mt-2 text-lg font-bold tracking-tight text-foreground">{stage.id.replace(/-/g, ' ')}</h3>
                {stage.caption && <CanvasProse prose={stage.caption} className="mt-2 text-sm text-muted-foreground" />}
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
