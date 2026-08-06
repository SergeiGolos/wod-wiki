/**
 * ScrollRunwaySection.tsx — the scroll-runway rendering core, extracted from
 * ScrollCanvasPage so a ```scroll spec can be embedded as a section anywhere
 * (e.g. the home page's chapter tour). Renders the home-tour-style runway:
 * stage bar, typewriter-driven live editor, cross-fading captions, editor
 * ring, transient toasts, playground mode, and a prefers-reduced-motion
 * static-card fallback — driven entirely by the parsed ScrollSpec.
 *
 * Deliberately page-agnostic: no fullscreen runtime, trailing sections, or
 * page-level quest validation (those stay on ScrollCanvasPage). Run and
 * stage-entry are surfaced via callbacks so the host page wires its own
 * actions / quest completion.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { MacOSChrome } from '../components/atoms/MacOSChrome'
import { NoteEditor } from '@/components/organisms/editor/NoteEditor'
import type { ScriptBlock } from '@/components/Editor/types'
import {
  type ScrollSpec,
  type ScrollStage,
} from './parseCanvasMarkdown'
import { resolveSource } from './canvasUtils'
import { clamp01, lerp, quadOut } from './scrollRunway'
import { useScrollRunway } from './useScrollRunway'
import { useScrollTypewriter } from './useScrollTypewriter'
import { ScrollCaption } from './ScrollCaption'
import { ScrollToast } from './ScrollToast'
import { ScrollRing } from './ScrollRing'
import { CanvasProse } from './CanvasProse'

export interface ScrollRunwaySectionProps {
  scroll: ScrollSpec
  wodFiles: Record<string, string>
  theme: string
  /** Window-chrome title (e.g. `chapters.md`). */
  noteTitle?: string
  /** Called when a stage enters (non-interactive). Wire chapter quest completion / telemetry. */
  onStageEnter?: (stageId: string) => void
  /** Run handler — opens the host's playground with the current doc + compiled block. When omitted, Run is hidden. */
  onRun?: (doc: string, block: ScriptBlock | null) => void
  className?: string
}

export function ScrollRunwaySection({
  scroll,
  wodFiles,
  theme,
  noteTitle = 'note.md',
  onStageEnter,
  onRun,
  className,
}: ScrollRunwaySectionProps) {
  const stages = scroll.stages

  const [prefersReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const runwayRef = useRef<HTMLElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const toastRef = useRef<HTMLDivElement | null>(null)
  const touchedEffectsRef = useRef<Set<string>>(new Set())

  const sourcesByStageId = useMemo(
    () =>
      Object.fromEntries(
        stages.map((s) => [s.id, s.source ? resolveSource(s.source, wodFiles) : '']),
      ),
    [stages, wodFiles],
  )
  const [doc, setDoc] = useState(() => sourcesByStageId[stages[0]?.id] ?? '')
  const blocksRef = useRef<ScriptBlock[]>([])

  const [interactive, setInteractive] = useState(false)

  const { slice, subscribe, resync } = useScrollRunway(runwayRef, interactive, stages)

  // Only report stage entry once the runway is actually on-screen — the
  // section may be embedded far down a page, so resolving stage 0 at mount
  // must not fire the host's stage-enter side effects before the user
  // scrolls the runway into view.
  const [runwayVisible, setRunwayVisible] = useState(false)
  useEffect(() => {
    const el = runwayRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setRunwayVisible(true) },
      { rootMargin: '100px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { userDiverged } = useScrollTypewriter({
    sourcesByStageId,
    doc,
    setDoc,
    subscribe,
    enabled: !interactive && scroll.typewriter && !prefersReducedMotion,
  })

  const stageId = slice.stage.id
  useEffect(() => {
    if (!interactive && runwayVisible) onStageEnter?.(stageId)
  }, [interactive, stageId, runwayVisible, onStageEnter])

  // Re-sync after exiting playground mode and on stage change so newly-mounted
  // visuals get their first imperative frame immediately.
  useEffect(() => {
    if (!interactive) {
      const id = requestAnimationFrame(resync)
      return () => cancelAnimationFrame(id)
    }
  }, [interactive, resync])
  useEffect(() => {
    const id = requestAnimationFrame(resync)
    return () => cancelAnimationFrame(id)
  }, [stageId, resync])

  // Typing diverges from the typewriter trace → playground mode.
  useEffect(() => {
    if (userDiverged) setInteractive(true)
  }, [userDiverged])

  // Imperative scrub: toast fade + author-declared effects.
  useEffect(() => {
    const allEffects = stages.flatMap((s) => s.effects ?? [])
    return subscribe((s) => {
      const toast = toastRef.current
      if (toast) {
        const tIn = clamp01((s.t - 0.04) / 0.12)
        const tOut = clamp01((s.t - 0.5) / 0.2)
        toast.style.opacity = String(Math.max(0, tIn - tOut))
        toast.style.transform = `translateX(-50%) translateY(${lerp(-14, 0, tIn)}px)`
      }
      const root = rootRef.current
      if (!root) return
      const touched = new Set<string>()
      for (const fx of allEffects) {
        if (!fx.stages.includes(s.stage.id)) continue
        touched.add(fx.target)
        const [inStart, inEnd] = fx.in ?? [0, 1]
        const k = inEnd > inStart ? clamp01((s.t - inStart) / (inEnd - inStart)) : 1
        const e = fx.ease === 'linear' ? k : quadOut(k)
        root.querySelectorAll<HTMLElement>(`[data-effect-target="${fx.target}"]`).forEach((el) => {
          if (fx.opacity) el.style.opacity = String(lerp(fx.opacity[0], fx.opacity[1], e))
          if (fx.translateY) el.style.transform = `translateY(${lerp(fx.translateY[0], fx.translateY[1], e)}px)`
        })
      }
      for (const target of touchedEffectsRef.current) {
        if (touched.has(target)) continue
        root.querySelectorAll<HTMLElement>(`[data-effect-target="${target}"]`).forEach((el) => {
          el.style.opacity = ''
          el.style.transform = ''
        })
      }
      touchedEffectsRef.current = touched
    })
  }, [subscribe, stages])

  const handleBlocksChange = useCallback((blocks: ScriptBlock[]) => {
    blocksRef.current = blocks
  }, [])

  const handleRun = useCallback(() => {
    onRun?.(doc, blocksRef.current[0] ?? null)
  }, [onRun, doc])

  const activeAccent = slice.stage.accent ?? 'hsl(var(--foreground))'

  // ── Reduced-motion fallback: static cards + IO quest firing ──
  const cardsRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!prefersReducedMotion || typeof IntersectionObserver === 'undefined') return
    const list = cardsRef.current
    if (!list) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const sid = (entry.target as HTMLElement).dataset.cardId
          if (sid) {
            onStageEnter?.(sid)
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.4 },
    )
    list.querySelectorAll('[data-card-id]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [prefersReducedMotion, onStageEnter])

  return (
    <div ref={rootRef} className={className} data-testid="scroll-runway-section">
      {prefersReducedMotion ? (
        <section className="px-6 pt-4 pb-24" data-testid="scroll-static-cards">
          <div ref={cardsRef} className="mx-auto max-w-2xl">
            {stages.map((stage, i) => (
              <article
                key={stage.id}
                data-card-id={stage.id}
                className="mb-6 rounded-2xl border border-border bg-card p-7"
              >
                <div
                  className="font-mono text-[11px] uppercase tracking-[0.22em]"
                  style={{ color: stage.accent ?? 'hsl(var(--muted-foreground))' }}
                >
                  {String(i + 1).padStart(2, '0')} / {String(stages.length).padStart(2, '0')}
                </div>
                <h3 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                  {stage.id.replace(/-/g, ' ')}
                </h3>
                {stage.caption && (
                  <CanvasProse prose={stage.caption} className="mt-3 text-sm text-muted-foreground" />
                )}
                {sourcesByStageId[stage.id] && (
                  <pre className="mt-5 overflow-x-auto rounded-lg bg-background px-4 py-4 font-mono text-[12px] tracking-[0.04em] text-muted-foreground">
                    {sourcesByStageId[stage.id]}
                  </pre>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section ref={runwayRef} className="relative" style={{ height: scroll.runway }}>
          <div className="sticky top-[104px] flex h-[calc(100vh-104px)] flex-col overflow-hidden">
            {/* stage bar */}
            <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-6 pt-6 pb-2 lg:px-12">
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                {interactive ? 'Playground mode' : slice.stage.id.replace(/-/g, ' ')}
              </div>
              <div className="flex items-center gap-1.5">
                {stages.map((seg: ScrollStage, i: number) => {
                  const live = slice.index === i
                  const done = slice.index > i
                  return (
                    <span
                      key={seg.id}
                      className="h-1 rounded-full transition-all duration-300"
                      style={{
                        width: live ? 30 : 10,
                        background: live
                          ? (seg.accent ?? 'hsl(var(--foreground))')
                          : done
                            ? 'hsl(var(--foreground))'
                            : 'hsl(var(--foreground) / 0.15)',
                      }}
                    />
                  )
                })}
              </div>
            </div>

            {/* stage main */}
            <div className="mx-auto flex w-full max-w-[1500px] min-h-0 flex-1 items-center justify-center gap-[clamp(24px,3.5vw,56px)] px-6 pb-5 max-lg:flex-col max-lg:justify-start lg:px-12">
              {/* editor canvas */}
              <div className="relative aspect-[1200/720] w-[min(920px,calc(100%-400px))] max-w-full flex-none max-lg:aspect-auto max-lg:h-[50vh] max-lg:w-full">
                <MacOSChrome
                  title={noteTitle}
                  className="absolute inset-x-2 top-2 bottom-2"
                  headerActions={
                    onRun ? (
                      <button
                        type="button"
                        title="Run the workout"
                        onClick={handleRun}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        <Play size={11} fill="currentColor" />
                        Run
                      </button>
                    ) : undefined
                  }
                >
                  <div className="relative h-full">
                    <NoteEditor
                      noteId="canvas:scroll-runway"
                      value={doc}
                      onChange={setDoc}
                      onBlocksChange={handleBlocksChange}
                      theme={theme}
                      readonly={false}
                      showLineNumbers={false}
                      enableOverlay={false}
                      enableInlineRuntime={false}
                      forceFullscreenReview
                      className="h-full"
                    />
                    {slice.stage.toast && (
                      <ScrollToast ref={toastRef} text={slice.stage.toast} accent={activeAccent} />
                    )}
                  </div>
                </MacOSChrome>
                {slice.ring && !interactive && (
                  <ScrollRing tag={slice.ring.tag} accent={activeAccent} />
                )}
              </div>

              <ScrollCaption stages={stages} activeIndex={slice.index} />
            </div>

            {/* playground-mode exit pill */}
            {interactive && (
              <button
                type="button"
                onClick={() => setInteractive(false)}
                className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-5 py-2.5 font-mono text-[10px] tracking-[0.06em] text-background opacity-95 transition-opacity hover:opacity-100"
              >
                ▶ Playground mode — {userDiverged ? 'your edits are kept' : 'editing'} · tap here to return to the tour
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
