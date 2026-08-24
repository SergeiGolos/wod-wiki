/**
 * TourChapterPicker.tsx — the collapsed Learn-the-Language section.
 *
 * Replaces the old six-slide ```scroll:chapters runway (too long for the
 * page): one sticky slide where every syntax chapter renders as a stylized
 * dual-button row — the primary button loads that chapter's runnable example
 * into the ONE shared editor beside the list (typewriter fill), and a smaller
 * link-out button opens the chapter's guide page for the full walkthrough.
 *
 * Chapter quest badges and lead-quest completion on Run are preserved from
 * the retired ChapterScrollTour (#919/#926 contracts).
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
import { cn } from '@/lib/utils'

const CHAPTER_GUIDE_ROUTES: Record<string, string> = {
  basics: '/guide/syntax/basics',
  protocols: '/guide/syntax/protocols',
  structure: '/guide/syntax/structure',
  'custom-metrics': '/guide/syntax/custom-metrics',
  dialects: '/guide/syntax/dialects',
  complex: '/guide/syntax/complex',
}

/** Chapter id → its home-page example asset (the retired runway's sources). */
const CHAPTER_EXAMPLE_SOURCES: Record<string, string> = {
  basics: 'wods/examples/syntax/single-movement.md',
  protocols: 'wods/examples/syntax/timers-rest.md',
  structure: 'wods/examples/syntax/groups-1.md',
  'custom-metrics': 'wods/syntax/custom-metrics-1.md',
  dialects: 'wods/examples/syntax/dialect-climb-bouldering.md',
  complex: 'wods/examples/syntax/complex-swimming.md',
}

const DEFAULT_CHAPTERS: Chapter[] = [
  { id: 'basics', title: 'Basics', label: 'Basics', source: 'wods/examples/syntax/basics.md', questIds: [] },
  { id: 'protocols', title: 'Protocols', label: 'Protocols', source: 'wods/examples/syntax/protocols.md', questIds: [] },
  { id: 'custom-timers', title: 'Custom Timers', label: 'Custom Timers', source: 'wods/examples/syntax/custom-timers.md', questIds: [] },
  { id: 'intervals', title: 'Intervals', label: 'Intervals', source: 'wods/examples/syntax/intervals.md', questIds: [] },
  { id: 'syntax-formatting', title: 'Formatting', label: 'Formatting', source: 'wods/examples/syntax/formatting.md', questIds: [] },
  { id: 'comments', title: 'Comments', label: 'Comments', source: 'wods/examples/syntax/comments.md', questIds: [] },
] as unknown as Chapter[]

export interface TourChapterPickerProps {
  chapters?: Chapter[]
  allQuests?: Quest[]
  theme: string
  wodFiles?: Record<string, string>
  onRun?: (chapterId: string, block: ScriptBlock | null, doc: string) => void
  onShare?: (doc: string) => void
}

export function TourChapterPicker({
  chapters = [],
  allQuests = [],
  theme,
  wodFiles = {},
  onRun,
  onShare,
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

  // Resolve the newly selected chapter's example into the shared editor with
  // a typewriter fill; an empty pick resets to blank.
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

  const handleShare = useCallback(() => {
    onShare?.(doc)
  }, [doc, onShare])

  return (
    <div data-testid="tour-chapter-picker" className="py-8">
      {/* Section header — "Learn the Language" CTAs + per-chapter badge chips. */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
              Syntax Reference & Examples
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Learn the Language</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Six chapters, each with a runnable example — load one into the editor, or read the full walkthrough in the guides.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/guide/syntax/basics"
              onClick={() => telemetry.record(HOME_EVENTS.lessonStarted)}
              className="inline-flex items-center rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Start Lesson 1
            </Link>
            <Link
              to="/guide/syntax/cheatsheet"
              onClick={() => telemetry.record(HOME_EVENTS.cheatsheetOpened)}
              className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
            >
              Cheat sheet →
            </Link>
          </div>
        </div>
      </div>

      {/* Main content: Responsive Stacked on Mobile, Side-by-Side on Desktop */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          {/* Chapter Dual-Button List */}
          <div
            className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 lg:w-[320px] lg:flex-none lg:grid-cols-1"
            data-testid="chapter-picker-list"
          >
            {languageChapters.map((chapter) => {
              const progress = chapterProgress.find((c) => c.chapter.id === chapter.id)
              const Icon = chapterIcon(chapter.badge)
              const active = chapter.id === selectedId
              return (
                <div
                  key={chapter.id}
                  data-testid={`chapter-picker-row-${chapter.id}`}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border p-2 transition-all',
                    active
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30 shadow-sm dark:bg-primary/10'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30',
                  )}
                >
                  {Icon && (
                    <Icon className={cn('size-4 flex-none ml-1', active ? 'text-primary' : 'text-muted-foreground')} />
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedId(chapter.id)}
                    data-testid={`chapter-picker-select-${chapter.id}`}
                    aria-pressed={active}
                    className={cn(
                      'group inline-flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                        : 'text-foreground hover:bg-muted/80',
                    )}
                  >
                    <span className="truncate text-[13px]">{chapter.title}</span>
                    <Play
                      className={cn('size-3 flex-none', active ? 'opacity-90' : 'opacity-40 group-hover:opacity-100')}
                    />
                  </button>
                  <span
                    className={cn(
                      'font-mono text-[10px] font-bold tabular-nums pr-1',
                      progress?.isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/70',
                    )}
                  >
                    {progress?.isComplete
                      ? 'done ✓'
                      : `${progress?.completedCount ?? 0}/${progress?.totalCount ?? chapter.questIds.length}`}
                  </span>
                  <Link
                    to={CHAPTER_GUIDE_ROUTES[chapter.id] ?? '/guide/syntax'}
                    data-testid={`chapter-picker-guide-${chapter.id}`}
                    aria-label={`Learn more about ${chapter.title}`}
                    title="Learn more in the guides"
                    onClick={() => telemetry.record(HOME_EVENTS.chapterGuideClicked, { chapter: chapter.id })}
                    className="inline-flex size-7 flex-none items-center justify-center rounded-lg border border-border/60 bg-background/60 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-background hover:text-primary"
                  >
                    <BookOpenCheck className="size-3.5" />
                  </Link>
                </div>
              )
            })}
          </div>

          {/* Shared Editor Window: Full width on mobile, responsive height */}
          <div className="w-full flex-1 min-w-0">
            <div className="h-[360px] sm:h-[440px] lg:h-[480px] w-full">
              <MacOSChrome
                title={CHAPTER_GUIDE_ROUTES[selectedId]?.split('/').pop() ?? 'example.md'}
                subtitle="shared example editor"
                className="h-full shadow-xl"
              >
                <TourEditorScreen
                  doc={doc}
                  onDocChange={setDoc}
                  onBlocksChange={handleBlocksChange}
                  onRun={handleRun}
                  onShare={handleShare}
                  theme={theme}
                  withRingTargets={false}
                />
              </MacOSChrome>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
