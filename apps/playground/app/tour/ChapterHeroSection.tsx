/**
 * ChapterHeroSection.tsx — chapter hero section for the six syntax chapters.
 *
 * Uses the shared ScrollSection primitive.
 *  - Sticky view: a REAL TourEditorScreen (same live editor as the greeting
 *    hero & tour), lazy-mounted while the section is on-screen. Run opens the
 *    fullscreen playground bound to this chapter's own example and completes
 *    the chapter's lead `<chapter>-run` quest (per-chapter scoped, #919).
 *  - Slides: the chapter's quest cards. On mobile each is a tall slot that
 *    scrolls through the reading zone below the pinned window (tour idiom);
 *    on desktop they compact into a list beside the side-sticky window.
 */

import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import type { Chapter, Quest } from '../canvas/parseCanvasMarkdown'
import type { ScriptBlock } from '@/components/Editor/types'
import { ScrollSection } from './ScrollSection'
import { TourEditorScreen } from './screens/TourEditorScreen'
import { useChapterProgress } from '../hooks/useChapterProgress'
import { usePageQuests } from '../hooks/usePageQuests'
import { telemetry, HOME_EVENTS } from '@/services/telemetry'
import { cn } from '@/lib/utils'

export interface ChapterHeroSectionProps {
  chapter: Chapter
  allChapters: Chapter[]
  allQuests: Quest[]
  theme: string
  questLabels?: Record<string, string>
  /** Chapter Run: opens the playground with this chapter's parsed block + doc. */
  onRun?: (chapterId: string, block: ScriptBlock | null, doc: string) => void
  onShare?: (doc: string) => void
  className?: string
}

/** First-example source per chapter (mirrors each guide's opening ```time block). */
export const CHAPTER_EXAMPLES: Record<string, string> = {
  basics: '```time\n10 Pushups\n15 Air Squats\n:30 Rest\n```',
  protocols: '```time (3 Rounds)\n10 Pushups\n15 Air Squats\n:30 Rest\n5:00 Run hard\n```',
  structure: '```time (3 Rounds)\n10 Pushups\n15 Air Squats\n:30 Rest\n```',
  'custom-metrics': '```time (3 Rounds)\n10 Pushups\n15 Air Squats\n:30 Rest\n5:00 Run hard\n```',
  dialects:
    '```time (3 Rounds)\n5:00 AMRAP\n  5 Pullups\n  10 Pushups\n// Strength\n3 Back Squat 225lb *2:00 Rest\n```',
  complex:
    '```time (3 Rounds)\n5:00 AMRAP\n  5 Pullups\n  10 Pushups\n// Strength\n3 Back Squat 225lb *2:00 Rest\n```',
}

export function ChapterHeroSection({
  chapter,
  allChapters,
  allQuests,
  theme,
  questLabels = {},
  onRun,
  onShare,
  className,
}: ChapterHeroSectionProps) {
  // Mount-once (#dogfood: fast scroll-jumps churned CodeMirror mount/unmount
  // cycles, leaving cards blank until the main thread settled). The sticky
  // window keeps its size whether or not the editor has mounted, so the
  // placeholder is a blank panel, not layout shift.
  const [everVisible, setEverVisible] = useState(false)
  const handleVisibilityChange = useCallback((visible: boolean) => {
    if (visible) setEverVisible(true)
  }, [])
  const { markComplete } = usePageQuests('/', allQuests)
  const { chapters: chapterProgress } = useChapterProgress(allChapters)

  const exampleSource = CHAPTER_EXAMPLES[chapter.id] ?? CHAPTER_EXAMPLES.basics
  const [doc, setDoc] = useState(exampleSource)
  const blocksRef = useRef<ScriptBlock[]>([])

  const currentChapterProgress = chapterProgress.find((c) => c.chapter.id === chapter.id)
  const leadQuestId = `${chapter.id}-run`
  const guidePath = `/guide/syntax/${chapter.id}`

  const handleRun = () => {
    markComplete(leadQuestId)
    telemetry.record(HOME_EVENTS.chapterExampleRun, { chapter: chapter.id })
    onRun?.(chapter.id, blocksRef.current[0] ?? null, doc)
  }

  const questItems = chapter.questIds.map((id) => {
    const label = allQuests.find((q) => q.id === id)?.label ?? questLabels[id] ?? id
    const isDone = currentChapterProgress?.quests.find((q) => q.id === id)?.isComplete ?? false
    return { id, label, isDone }
  })

  // Sticky view: real editor, mounted on first visibility and kept (churn
  // from unmounting on exit was the fast-scroll blank-card bug).
  const stickyView = (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          {chapter.title} · first example
        </span>
        {currentChapterProgress && (
          <span
            data-testid={`chapter-progress-${chapter.id}`}
            className={cn(
              'rounded-full px-2 py-0.5 font-mono text-[9px] font-bold tabular-nums',
              currentChapterProgress.isComplete
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {currentChapterProgress.isComplete
              ? 'done ✓'
              : `${currentChapterProgress.completedCount}/${currentChapterProgress.totalCount}`}
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1">
        {everVisible ? (
          <TourEditorScreen
            doc={doc}
            onDocChange={setDoc}
            onBlocksChange={(b) => {
              blocksRef.current = b
            }}
            onRun={handleRun}
            onShare={() => onShare?.(doc)}
            theme={theme}
          />
        ) : (
          <div className="h-full bg-muted/20" aria-hidden />
        )}
      </div>
    </div>
  )

  // Slides: the chapter's quest cards as a grouped list (mobile below the
  // editor block, desktop beside the side-sticky window).
  const slides = (
    <div className="flex flex-col gap-1">
      {questItems.map((q, idx) => (
        <div
          key={q.id}
          data-testid={`chapter-quest-card-${q.id}`}
          className={cn(
            'flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors',
            q.isDone
              ? 'bg-emerald-500/5 dark:bg-emerald-500/10'
              : 'bg-transparent',
          )}
        >
          <span
            className={cn(
              'flex size-4 flex-none items-center justify-center rounded-full border text-[9px] font-bold',
              q.isDone
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-border text-muted-foreground',
            )}
          >
            {q.isDone ? <Check className="size-2.5 stroke-[2.5]" /> : idx + 1}
          </span>
          <span
            className={cn(
              'truncate text-[12px] font-medium',
              q.isDone ? 'text-muted-foreground line-through' : 'text-foreground',
            )}
          >
            {q.label}
          </span>
          {q.isDone && (
            <span className="ml-auto font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              done
            </span>
          )}
        </div>
      ))}
    </div>
  )

  const footer = (
    <div className="pt-2">
      <Link
        to={guidePath}
        onClick={() => telemetry.record(HOME_EVENTS.chapterGuideClicked, { chapter: chapter.id })}
        className="inline-flex items-center gap-1 text-[13px] font-bold text-primary hover:underline underline-offset-4"
      >
        Open the {chapter.title} guide →
      </Link>
    </div>
  )

  return (
    <ScrollSection
      id={`chapter-${chapter.id}`}
      title={`Chapter · ${chapter.title}`}
      stickyView={stickyView}
      slides={slides}
      footer={footer}
      onVisibilityChange={handleVisibilityChange}
      className={className}
    />
  )
}
