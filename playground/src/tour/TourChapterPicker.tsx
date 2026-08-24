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

export interface TourChapterPickerProps {
  chapters: Chapter[]
  allQuests: Quest[]
  theme: string
  wodFiles: Record<string, string>
  onRun?: (chapterId: string, block: ScriptBlock | null, doc: string) => void
  onShare?: (doc: string) => void
}

export function TourChapterPicker({
  chapters,
  allQuests,
  theme,
  wodFiles,
  onRun,
  onShare,
}: TourChapterPickerProps) {
  const languageChapters = useMemo(
    () => chapters.filter((c) => c.id !== 'home-tour'),
    [chapters],
  )
  const { markComplete } = usePageQuests('/', allQuests)
  const { chapters: chapterProgress } = useChapterProgress(chapters)

  const [selectedId, setSelectedId] = useState<string>(
    () => languageChapters[0]?.id ?? 'basics',
  )
  const [doc, setDoc] = useState('')
  const blocksRef = useRef<ScriptBlock[]>([])
  const reduceMotion = useRef(false)
  useEffect(() => {
    reduceMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
    <div data-testid="tour-chapter-picker">
      {/* Section header — "Learn the Language" CTAs + per-chapter badge chips. */}
      <div className="mx-auto max-w-5xl px-6 pb-8 pt-2">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Learn the Language</h2>
            <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
              Six chapters, each with a runnable example and quests to earn — load one into the editor, or read the full walkthrough in the guides.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/guide/syntax/basics"
              onClick={() => telemetry.record(HOME_EVENTS.lessonStarted)}
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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

      {/* The single slide: chapter list + shared editor window. */}
      <section className="relative" style={{ height: '210vh' }}>
        <div className="sticky top-[104px] flex h-[calc(100vh-104px)] flex-col overflow-hidden">
          <div className="mx-auto flex w-full max-w-[1500px] min-h-0 flex-1 items-center justify-center gap-[clamp(24px,3.5vw,56px)] px-6 pb-5 lg:px-12">
            {/* chapter dual-button list */}
            <div className="flex w-[min(360px,32vw)] flex-none flex-col gap-2" data-testid="chapter-picker-list">
              {languageChapters.map((chapter) => {
                const progress = chapterProgress.find((c) => c.chapter.id === chapter.id)
                const Icon = chapterIcon(chapter.badge)
                const active = chapter.id === selectedId
                return (
                  <div
                    key={chapter.id}
                    data-testid={`chapter-picker-row-${chapter.id}`}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border p-2.5 transition-colors',
                      active ? 'border-primary/50 bg-muted/40' : 'border-border bg-card hover:border-primary/30',
                    )}
                  >
                    {Icon && <Icon className="size-4 flex-none text-muted-foreground" />}
                    <button
                      type="button"
                      onClick={() => setSelectedId(chapter.id)}
                      data-testid={`chapter-picker-select-${chapter.id}`}
                      aria-pressed={active}
                      className={cn(
                        'group inline-flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-muted',
                      )}
                    >
                      <span className="truncate text-[13px] font-semibold">{chapter.title}</span>
                      <Play className="size-3.5 flex-none opacity-60 transition-opacity group-hover:opacity-100" />
                    </button>
                    <span
                      className={cn(
                        'font-mono text-[10px] font-bold tabular-nums',
                        progress?.isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
                      )}
                    >
                      {progress?.isComplete ? 'done ✓' : `${progress?.completedCount ?? 0}/${progress?.totalCount ?? chapter.questIds.length}`}
                    </span>
                    <Link
                      to={CHAPTER_GUIDE_ROUTES[chapter.id] ?? '/guide/syntax'}
                      data-testid={`chapter-picker-guide-${chapter.id}`}
                      aria-label={`Learn more about ${chapter.title}`}
                      title="Learn more in the guides"
                      onClick={() => telemetry.record(HOME_EVENTS.chapterGuideClicked, { chapter: chapter.id })}
                      className="inline-flex size-7 flex-none items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-border hover:text-primary"
                    >
                      <BookOpenCheck className="size-3.5" />
                    </Link>
                  </div>
                )
              })}
            </div>

            {/* the one shared editor */}
            <div className="relative aspect-[1200/720] w-[min(920px,calc(100vw-480px))] min-w-0 shrink">
              <MacOSChrome
                title={CHAPTER_GUIDE_ROUTES[selectedId]?.split('/').pop() ?? 'example.md'}
                subtitle="shared example editor"
                className="absolute inset-x-2 top-2 bottom-2"
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
      </section>
    </div>
  )
}
