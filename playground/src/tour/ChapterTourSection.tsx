/**
 * ChapterTourSection.tsx — the chapter tour: a single shared sticky window
 * with six chapter slides (one per syntax chapter). Scrolling to a chapter
 * slide morphs the window: the editor's doc swaps to that chapter's first
 * example and the chapter's `focus` lines highlight. Each slide is a prose
 * blurb (title + desc) with the chapter's badge + live progress inline —
 * replacing the per-quest `<li>` rows and the standalone "Learn the
 * Language" strip.
 *
 * Reuses the shared ScrollSection primitive (active-slide tracking) and the
 * real TourEditorScreen (same live editor as the hero/runway). The CodeMirror
 * window mounts once and stays mounted (fast-scroll churn workaround); the
 * doc/focus swap is debounced to slide boundaries by ScrollSection.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import type { Chapter, Quest } from '../canvas/parseCanvasMarkdown'
import type { ScriptBlock } from '@/components/Editor/types'
import { ScrollSection } from './ScrollSection'
import { TourEditorScreen } from './screens/TourEditorScreen'
import { CHAPTER_EXAMPLES } from './ChapterHeroSection'
import { useChapterProgress } from '../hooks/useChapterProgress'
import { usePageQuests } from '../hooks/usePageQuests'
import { telemetry, HOME_EVENTS } from '@/services/telemetry'
import { chapterIcon } from '../components/ChallengeBadges'
import { cn } from '@/lib/utils'

export interface ChapterTourSectionProps {
  chapters: Chapter[]
  allQuests: Quest[]
  theme: string
  questLabels?: Record<string, string>
  /** Chapter Run: opens the playground with this chapter's parsed block + doc. */
  onRun?: (chapterId: string, block: ScriptBlock | null, doc: string) => void
  onShare?: (doc: string) => void
  onOpenInEditor?: (doc: string) => void
  className?: string
}

const CHAPTER_GUIDE_ROUTES: Record<string, string> = {
  basics: '/guide/syntax/basics',
  protocols: '/guide/syntax/protocols',
  structure: '/guide/syntax/structure',
  'custom-metrics': '/guide/syntax/custom-metrics',
  dialects: '/guide/syntax/dialects',
  complex: '/guide/syntax/complex',
}

export function ChapterTourSection({
  chapters,
  allQuests,
  theme,
  questLabels = {},
  onRun,
  onShare,
  onOpenInEditor,
  className,
}: ChapterTourSectionProps) {
  const languageChapters = chapters.filter((c) => c.id !== 'home-tour')
  const { markComplete } = usePageQuests('/', allQuests)
  const { chapters: chapterProgress } = useChapterProgress(chapters)
  const progressFor = (id: string) => chapterProgress.find((c) => c.chapter.id === id)

  // Mount-once: the editor stays mounted once the section is on-screen.
  const [everVisible, setEverVisible] = useState(false)
  const handleVisibilityChange = useCallback((visible: boolean) => {
    if (visible) setEverVisible(true)
  }, [])

  // Active chapter drives the window doc + focus.
  const [activeIndex, setActiveIndex] = useState(0)
  const activeChapter = languageChapters[activeIndex] ?? languageChapters[0]
  const activeId = activeChapter?.id ?? 'basics'

  const [doc, setDoc] = useState<string>(CHAPTER_EXAMPLES[activeId] ?? CHAPTER_EXAMPLES.basics)
  const blocksRef = useRef<ScriptBlock[]>([])

  // Swap the window's doc when the active chapter changes (debounced to
  // slide boundaries by ScrollSection's active-slide tracking).
  useEffect(() => {
    setDoc(CHAPTER_EXAMPLES[activeId] ?? CHAPTER_EXAMPLES.basics)
  }, [activeId])

  const handleActiveSlideChange = useCallback(
    (index: number) => {
      const idx = Math.max(0, Math.min(languageChapters.length - 1, index))
      setActiveIndex(idx)
    },
    [languageChapters.length],
  )

  const handleRun = useCallback(() => {
    markComplete(`${activeId}-run`)
    telemetry.record(HOME_EVENTS.chapterExampleRun, { chapter: activeId })
    onRun?.(activeId, blocksRef.current[0] ?? null, doc)
  }, [markComplete, activeId, onRun, doc])

  const activeProgress = progressFor(activeId)
  const ActiveIcon = activeChapter ? chapterIcon(activeChapter.badge) : undefined

  // Sticky window: real editor, header shows the active chapter's badge + progress.
  const stickyView = (
    <div className="flex h-full flex-col bg-background" data-testid="chapter-tour-window">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="inline-flex items-center gap-2 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          {ActiveIcon && <ActiveIcon className="size-3.5" />}
          {activeChapter?.title} · first example
        </span>
        {activeProgress && (
          <span
            data-testid={`chapter-badge-${activeId}`}
            className={cn(
              'rounded-full px-2 py-0.5 font-mono text-[9px] font-bold tabular-nums',
              activeProgress.isComplete
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {activeProgress.isComplete
              ? 'done ✓'
              : `${activeProgress.completedCount}/${activeProgress.totalCount}`}
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1">
        {everVisible ? (
          <TourEditorScreen
            doc={doc}
            focus={activeChapter?.focus}
            onDocChange={setDoc}
            onBlocksChange={(b) => {
              blocksRef.current = b
            }}
            onRun={handleRun}
            onShare={() => onShare?.(doc)}
            onOpenInEditor={() => onOpenInEditor?.(doc)}
            theme={theme}
          />
        ) : (
          <div className="h-full bg-muted/20" aria-hidden />
        )}
      </div>
    </div>
  )

  // Slides: one blurb per chapter (title + desc + first-quest label + badge),
  // each tagged with data-slide-index so ScrollSection reports the active one.
  const slides = (
    <div className="flex flex-col gap-4">
      {languageChapters.map((chapter, idx) => {
        const progress = progressFor(chapter.id)
        const Icon = chapterIcon(chapter.badge)
        const leadQuestId = chapter.questIds[0]
        const leadQuestLabel = leadQuestId
          ? allQuests.find((q) => q.id === leadQuestId)?.label ?? questLabels[leadQuestId]
          : undefined
        const route = CHAPTER_GUIDE_ROUTES[chapter.id] ?? '/guide/syntax'
        const isActive = idx === activeIndex
        return (
          <div
            key={chapter.id}
            data-slide-index={idx}
            data-testid={`chapter-slide-${chapter.id}`}
            className={cn(
              'min-h-[40vh] rounded-xl border px-5 py-4 transition-colors',
              isActive ? 'border-primary/50 bg-primary/5' : 'border-border bg-card',
            )}
          >
            <div className="flex items-center gap-3">
              {Icon && (
                <span
                  className={cn(
                    'flex size-8 flex-none items-center justify-center rounded-lg',
                    progress?.isComplete ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon className="size-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Chapter · {chapter.title}
                  </span>
                  {progress && (
                    <span
                      data-testid={`chapter-slide-badge-${chapter.id}`}
                      className={cn(
                        'rounded-full px-2 py-0.5 font-mono text-[9px] font-bold tabular-nums',
                        progress.isComplete
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {progress.isComplete ? 'done ✓' : `${progress.completedCount}/${progress.totalCount}`}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm font-medium leading-relaxed text-foreground">
                  {chapter.desc ?? leadQuestLabel ?? chapter.title}
                </p>
                {progress?.isComplete && (
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <Check className="size-3 stroke-[2.5]" /> complete
                  </span>
                )}
              </div>
            </div>
            <Link
              to={route}
              onClick={() => telemetry.record(HOME_EVENTS.chapterGuideClicked, { chapter: chapter.id })}
              className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-primary hover:underline underline-offset-4"
            >
              Open the {chapter.title} guide →
            </Link>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className={className} data-testid="chapter-tour-section">
      {/* "Learn the Language" header — CTAs folded in from the retired strip. */}
      <div className="mx-auto max-w-5xl px-6 pb-8 pt-2">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Learn the Language</h2>
            <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
              Six chapters, each with a runnable example and quests to earn — scroll and the window follows.
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

      <ScrollSection
        id="chapter-tour"
        stickyView={stickyView}
        slides={slides}
        onVisibilityChange={handleVisibilityChange}
        onActiveSlideChange={handleActiveSlideChange}
      />
    </div>
  )
}
