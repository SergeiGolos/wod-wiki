/**
 * TourChapterPicker.tsx — Learning with Examples / Learn the Language.
 *
 * Sticky editor runway with one scroll section per chapter / lesson group.
 * As each chapter section scrolls into view:
 *   - The sticky editor window updates with the runnable example code
 *   - The caption rail displays the chapter's title, explanation, badge progress,
 *     and action links (Start Lesson, Guide, Try/Run).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpenCheck, Play } from 'lucide-react'
import type { Chapter, Quest } from '../canvas/parseCanvasMarkdown'
import type { ScriptBlock } from '@/components/Editor/types'
import { resolveSource } from '../canvas/canvasUtils'
import { useChapterProgress } from '../hooks/useChapterProgress'
import { usePageQuests } from '../hooks/usePageQuests'
import { telemetry, HOME_EVENTS } from '@/services/telemetry'
import { chapterIcon } from '../components/ChallengeBadges'
import { MacOSChrome } from '../components/atoms/MacOSChrome'
import { TourEditorScreen } from './screens/TourEditorScreen'
import { CHAPTER_GUIDE_ROUTES, CHAPTER_GUIDE_DEFAULT_ROUTE } from './tourConstants'
import { TaglineHeader } from './HomeTour'
import { cn } from '@/lib/utils'

/** Chapter id → its home-page example asset (the canonical syntax examples). */
const CHAPTER_EXAMPLE_SOURCES: Record<string, string> = {
  basics: 'wods/examples/syntax/single-movement.md',
  protocols: 'wods/examples/syntax/timers-rest.md',
  structure: 'wods/examples/syntax/groups-1.md',
  'custom-metrics': 'wods/syntax/custom-metrics-1.md',
  dialects: 'wods/examples/syntax/dialect-climb-bouldering.md',
  complex: 'wods/examples/syntax/complex-swimming.md',
}

const CHAPTER_DESCRIPTIONS: Record<string, { summary: string; bullets: string[] }> = {
  basics: {
    summary: 'Statements and metrics — how a workout line reads, from movement names to reps, loads, and timed rests.',
    bullets: ['Freeform Markdown + fenced ```time blocks', 'Single movements: 10 Pushups, 15 Air Squats', 'Inline resistance: 225lb, 100kg, 24kg'],
  },
  protocols: {
    summary: 'Time-capped and paced protocols: AMRAP, EMOM, Tabata intervals, and required rest that paces the room.',
    bullets: ['20:00 AMRAP (As Many Rounds As Possible)', '(10) :60 EMOM (Every Minute on the Minute)', '*:30 Rest (required, unskippable recovery)'],
  },
  structure: {
    summary: 'Rounds, rep ladders, and nested grouping — how blocks compose into multi-part workout schemes.',
    bullets: ['(3 Rounds) and (5 Sets) block repetition', 'Ladders & schemes: 21-15-9, 10-8-6-4-2', 'Section labels: (Warmup) and // Strength'],
  },
  'custom-metrics': {
    summary: 'Capture typed data points right inline: effort intensity, heart rate, RPE, and custom JSON metrics.',
    bullets: ['Inline JSON metrics: {"intensity": 80}', 'Capture prompts: :? time, ? reps, ?lb load', 'Session-level RPE & custom dimensions'],
  },
  dialects: {
    summary: 'Dialect fences for specialized domains: workout, log, plan, and climbing session notes.',
    bullets: ['```time for workouts, ```log for recorded efforts', 'Sport dialect suffixes like ```log:climbing', 'Discipline tags and session intent'],
  },
  complex: {
    summary: 'Multi-set training sessions that chain intervals, strength, and conditioning into one complete program.',
    bullets: ['Multi-set swimming and track intervals', 'Strength blocks paired with conditioned finishers', 'Full training session flow'],
  },
}

const DEFAULT_CHAPTERS: Chapter[] = [
  { id: 'basics', title: 'Basics', label: 'Basics', source: 'wods/examples/syntax/basics.md', questIds: [] },
  { id: 'protocols', title: 'Protocols', label: 'Protocols', source: 'wods/examples/syntax/protocols.md', questIds: [] },
  { id: 'structure', title: 'Structure', label: 'Structure', source: 'wods/examples/syntax/structure.md', questIds: [] },
  { id: 'custom-metrics', title: 'Custom Metrics', label: 'Custom Metrics', source: 'wods/syntax/custom-metrics.md', questIds: [] },
  { id: 'dialects', title: 'Dialects', label: 'Dialects', source: 'wods/examples/syntax/dialects.md', questIds: [] },
  { id: 'complex', title: 'Complex Workouts', label: 'Complex Workouts', source: 'wods/examples/syntax/complex.md', questIds: [] },
] as unknown as Chapter[]

export interface TourChapterPickerProps {
  chapters?: Chapter[]
  allQuests?: Quest[]
  theme: string
  wodFiles?: Record<string, string>
  onRun?: (chapterId: string, block: ScriptBlock | null, doc: string) => void
}

export function TourChapterPicker({
  chapters = [],
  allQuests = [],
  theme,
  wodFiles = {},
  onRun,
}: TourChapterPickerProps) {
  const languageChapters = useMemo(() => {
    const list = (chapters ?? []).filter((c) => c.id !== 'home-tour')
    return list.length > 0 ? list : DEFAULT_CHAPTERS
  }, [chapters])

  const { markComplete } = usePageQuests('/', allQuests)
  const { chapters: chapterProgress } = useChapterProgress(languageChapters)

  const [selectedId, setSelectedId] = useState<string>(
    () => languageChapters[0]?.id ?? 'basics',
  )
  const [doc, setDoc] = useState('')
  const blocksRef = useRef<ScriptBlock[]>([])
  const reduceMotion = useRef(false)
  useEffect(() => {
    reduceMotion.current =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')?.matches ?? false
        : false
  }, [])

  // Resolve chapter source into editor
  const selectedIdRef = useRef(selectedId)
  useEffect(() => {
    selectedIdRef.current = selectedId
    const source = CHAPTER_EXAMPLE_SOURCES[selectedId]
    const target = resolveSource(source, wodFiles)
    if (reduceMotion.current) {
      setDoc(target)
      return
    }
    let cancelled = false
    let i = 0
    const step = Math.max(3, Math.round(target.length / 90))
    const tick = () => {
      if (cancelled || selectedIdRef.current !== selectedId) return
      i = Math.min(target.length, i + step)
      setDoc(target.slice(0, i))
      if (i < target.length) window.setTimeout(tick, 12)
    }
    tick()
    return () => {
      cancelled = true
    }
  }, [selectedId, wodFiles])

  const handleBlocksChange = useCallback((blocks: ScriptBlock[]) => {
    blocksRef.current = blocks
  }, [])

  const handleRun = useCallback(() => {
    const chapterId = selectedIdRef.current
    markComplete(`${chapterId}-run`)
    onRun?.(chapterId, blocksRef.current[0] ?? null, doc)
  }, [doc, markComplete, onRun])

  // Observer to update active chapter as the user scrolls into each lesson section
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-chapter-id')
            if (id) {
              setSelectedId(id)
            }
          }
        }
      },
      { rootMargin: '-20% 0px -40% 0px', threshold: 0.2 },
    )

    itemRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [languageChapters])

  return (
    <section id="tour-chapter-picker" data-testid="tour-chapter-picker" className="flex flex-col">
      {/* Tagline header for section 05 */}
      <TaglineHeader
        index="05"
        before="Learning with "
        accentText="Examples"
        after=""
        accent="hsl(var(--primary))"
        blurb="Six chapters on the syntax, each with a runnable example and quests to earn. Scroll into each section to load its example code into the editor."
      />

      {/* Sticky runway container */}
      <div className="relative mx-auto w-full max-w-[1500px] 2xl:max-w-[1720px] px-6 py-8 lg:px-12 xl:px-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12 xl:gap-16">
          {/* Left Column: Sticky macOS Chrome Editor */}
          <div className="w-full lg:w-[58%] xl:w-[60%] lg:sticky lg:top-[110px] z-10 flex-none">
            <div className="h-[420px] sm:h-[480px] lg:h-[calc(100dvh-150px)] max-h-[700px] w-full rounded-2xl border border-border shadow-2xl overflow-hidden bg-background">
              <MacOSChrome
                title={CHAPTER_GUIDE_ROUTES[selectedId]?.split('/').pop() ?? 'example.md'}
                subtitle={`Lesson: ${languageChapters.find((c) => c.id === selectedId)?.title ?? selectedId}`}
                className="h-full"
              >
                <TourEditorScreen
                  doc={doc}
                  onDocChange={setDoc}
                  onBlocksChange={handleBlocksChange}
                  onRun={handleRun}
                  theme={theme}
                  withRingTargets={false}
                />
              </MacOSChrome>
            </div>
          </div>

          {/* Right Column: Scrolling Chapters / Lesson Explanations */}
          <div
            className="w-full lg:w-[42%] xl:w-[40%] flex flex-col gap-16 lg:py-6"
            data-testid="chapter-picker-list"
          >
            {languageChapters.map((chapter, idx) => {
              const progress = chapterProgress.find((c) => c.chapter.id === chapter.id)
              const Icon = chapterIcon(chapter.badge)
              const active = chapter.id === selectedId
              const desc = CHAPTER_DESCRIPTIONS[chapter.id]

              return (
                <div
                  key={chapter.id}
                  data-chapter-id={chapter.id}
                  ref={(el) => {
                    if (el) itemRefs.current.set(chapter.id, el)
                    else itemRefs.current.delete(chapter.id)
                  }}
                  data-testid={`chapter-picker-row-${chapter.id}`}
                  className={cn(
                    'rounded-2xl border p-6 sm:p-8 transition-all duration-300 min-h-[340px] flex flex-col justify-between',
                    active
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30 shadow-lg dark:bg-primary/10'
                      : 'border-border/70 bg-card hover:border-primary/40',
                  )}
                >
                  <div>
                    {/* Step badge & icon */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                          Chapter 0{idx + 1}
                        </span>
                        {Icon && <Icon className="size-4 text-primary" />}
                      </div>
                      <span
                        className={cn(
                          'font-mono text-xs font-semibold tabular-nums',
                          progress?.isComplete ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-muted-foreground',
                        )}
                      >
                        {progress?.isComplete
                          ? 'done ✓'
                          : `${progress?.completedCount ?? 0}/${progress?.totalCount ?? chapter.questIds.length}`}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                      {chapter.title}
                    </h3>

                    {/* Body explanation */}
                    <p className="mt-3 text-sm sm:text-base leading-relaxed text-muted-foreground">
                      {desc?.summary ?? chapter.label}
                    </p>

                    {/* Bullet breakdown */}
                    {desc?.bullets && (
                      <ul className="mt-4 space-y-1.5 text-xs sm:text-sm text-foreground/80 font-mono">
                        {desc.bullets.map((b, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-primary font-bold">›</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Action controls */}
                  <div className="mt-6 flex flex-wrap items-center gap-3 pt-4 border-t border-border/50">
                    <button
                      type="button"
                      onClick={() => setSelectedId(chapter.id)}
                      data-testid={`chapter-picker-select-${chapter.id}`}
                      aria-pressed={active}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-colors shadow-xs',
                        active
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'border border-border bg-background text-foreground hover:bg-muted',
                      )}
                    >
                      <Play className="size-3.5 fill-current" />
                      <span>{active ? 'Loaded in editor' : 'Load example'}</span>
                    </button>

                    <Link
                      to={CHAPTER_GUIDE_ROUTES[chapter.id] ?? CHAPTER_GUIDE_DEFAULT_ROUTE}
                      data-testid={`chapter-picker-guide-${chapter.id}`}
                      aria-label={`Read guide for ${chapter.title}`}
                      onClick={() => telemetry.record(HOME_EVENTS.chapterGuideClicked, { chapter: chapter.id })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3.5 py-2 text-xs sm:text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-background hover:text-primary"
                    >
                      <BookOpenCheck className="size-3.5" />
                      <span>Read guide →</span>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

