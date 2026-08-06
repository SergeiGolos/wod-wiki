/**
 * ChapterScrollTour.tsx — the home-page chapter tour, driven by the
 * ```scroll:chapters markdown spec (the same ```scroll format the hero and
 * the chapter guide pages use) rendered by the shared ScrollRunwaySection.
 *
 * Scrolling morphs a single runway window through the six chapter examples
 * (typewriter in, cross-fading blurb captions, ring focus). Per-chapter
 * badges (icon + live count) sit in the section header — folded in from the
 * retired "Learn the Language" strip — alongside the Start Lesson / Cheat
 * sheet CTAs. Stage entry completes the chapter's lead quest + telemetry;
 * Run opens the host's playground with the chapter example.
 */

import { useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { Chapter, Quest, ScrollSpec } from '../canvas/parseCanvasMarkdown'
import type { ScriptBlock } from '@/components/Editor/types'
import { ScrollRunwaySection } from '../canvas/ScrollRunwaySection'
import { useChapterProgress } from '../hooks/useChapterProgress'
import { usePageQuests } from '../hooks/usePageQuests'
import { telemetry, HOME_EVENTS } from '@/services/telemetry'
import { chapterIcon } from '../components/ChallengeBadges'
import { cn } from '@/lib/utils'

export interface ChapterScrollTourProps {
  scroll: ScrollSpec
  chapters: Chapter[]
  allQuests: Quest[]
  theme: string
  wodFiles: Record<string, string>
  onRun?: (chapterId: string, block: ScriptBlock | null, doc: string) => void
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

export function ChapterScrollTour({
  scroll,
  chapters,
  allQuests,
  theme,
  wodFiles,
  onRun,
  className,
}: ChapterScrollTourProps) {
  const languageChapters = chapters.filter((c) => c.id !== 'home-tour')
  const { markComplete } = usePageQuests('/', allQuests)
  const { chapters: chapterProgress } = useChapterProgress(chapters)
  const activeChapterIdRef = useRef<string>(scroll.stages[0]?.id ?? languageChapters[0]?.id ?? 'basics')

  // Stage entry only tracks the active chapter (for Run). Run quests are
  // completed on Run click — never on scroll — and run telemetry is recorded
  // by the host's handleChapterRun, so stage entry has no side effects.
  const handleStageEnter = useCallback(
    (chapterId: string) => {
      activeChapterIdRef.current = chapterId
    },
    [],
  )

  const handleRun = useCallback(
    (doc: string, block: ScriptBlock | null) => {
      markComplete(`${activeChapterIdRef.current}-run`)
      onRun?.(activeChapterIdRef.current, block, doc)
    },
    [markComplete, onRun],
  )

  return (
    <div className={className} data-testid="chapter-scroll-tour">
      {/* Section header — "Learn the Language" CTAs + per-chapter badge chips. */}
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

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {languageChapters.map((chapter) => {
            const progress = chapterProgress.find((c) => c.chapter.id === chapter.id)
            const Icon = chapterIcon(chapter.badge)
            const route = CHAPTER_GUIDE_ROUTES[chapter.id] ?? '/guide/syntax'
            return (
              <Link
                key={chapter.id}
                to={route}
                data-testid={`chapter-badge-${chapter.id}`}
                onClick={() => telemetry.record(HOME_EVENTS.chapterGuideClicked, { chapter: chapter.id })}
                className={cn(
                  'group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors hover:border-primary/40',
                  progress?.isComplete ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-card',
                )}
              >
                {Icon && <Icon className="size-3.5 text-muted-foreground" />}
                <span className="text-[12px] font-semibold text-foreground">{chapter.title}</span>
                <span
                  className={cn(
                    'font-mono text-[10px] font-bold tabular-nums',
                    progress?.isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
                  )}
                >
                  {progress?.isComplete ? 'done ✓' : `${progress?.completedCount ?? 0}/${progress?.totalCount ?? chapter.questIds.length}`}
                </span>
              </Link>
            )
          })}
        </div>
      </div>

      <ScrollRunwaySection
        scroll={scroll}
        wodFiles={wodFiles}
        theme={theme}
        noteTitle="chapters.md"
        onStageEnter={handleStageEnter}
        onRun={handleRun}
      />
    </div>
  )
}
