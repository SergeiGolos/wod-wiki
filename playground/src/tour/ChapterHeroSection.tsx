/**
 * ChapterHeroSection.tsx — chapter hero section component for syntax chapters.
 *
 * Uses the shared ScrollSection primitive.
 * Sticky view: Runnable first example + Run button.
 * Slide region: Quest cards (lead `<chapter>-run` quest first) + Guide CTA link.
 */

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { telemetry, HOME_EVENTS } from '@/services/telemetry'
import { Check, Play } from 'lucide-react'
import type { Chapter, Quest } from '../canvas/parseCanvasMarkdown'
import { ScrollSection } from './ScrollSection'
import { useChapterProgress } from '../hooks/useChapterProgress'
import { usePageQuests } from '../hooks/usePageQuests'
import { cn } from '@/lib/utils'

export interface ChapterHeroSectionProps {
  chapter: Chapter
  allChapters: Chapter[]
  allQuests: Quest[]
  questLabels?: Record<string, string>
  onRunExample?: (chapterId: string, source: string) => void
  className?: string
}

const CHAPTER_EXAMPLES: Record<string, string[]> = {
  basics: ['```time', '10 Pushups', '15 Air Squats', ':30 Rest', '```'],
  protocols: ['```time (3 Rounds)', '10 Pushups', '15 Air Squats', ':30 Rest', '5:00 Run hard', '```'],
  structure: ['```time (3 Rounds)', '10 Pushups', '15 Air Squats', ':30 Rest', '```'],
  'custom-metrics': ['```time (3 Rounds)', '10 Pushups', '15 Air Squats', ':30 Rest', '5:00 Run hard', '```'],
  dialects: ['```time (3 Rounds)', '5:00 AMRAP', '  5 Pullups', '  10 Pushups', '// Strength', '3 Back Squat 225lb *2:00 Rest', '```'],
  complex: ['```time (3 Rounds)', '5:00 AMRAP', '  5 Pullups', '  10 Pushups', '// Strength', '3 Back Squat 225lb *2:00 Rest', '```'],
}

const CHAPTER_ACCENTS: Record<string, string> = {
  basics: 'hsl(var(--metric-trophy, 45 93% 47%))',
  protocols: 'hsl(var(--metric-time, 199 89% 48%))',
  structure: 'hsl(var(--metric-reps, 142 71% 45%))',
  'custom-metrics': 'hsl(var(--metric-heart-rate, 340 82% 52%))',
  dialects: 'hsl(var(--metric-distance, 271 91% 65%))',
  complex: 'hsl(var(--metric-load, 25 95% 53%))',
}

export function ChapterHeroSection({
  chapter,
  allChapters,
  allQuests,
  questLabels = {},
  onRunExample,
  className,
}: ChapterHeroSectionProps) {
  const [visible, setVisible] = useState(true)
  const { markComplete } = usePageQuests('/', allQuests)
  const { chapters: chapterProgress } = useChapterProgress(allChapters)

  const currentChapterProgress = chapterProgress.find((c) => c.chapter.id === chapter.id)
  const isChapterComplete = currentChapterProgress?.isComplete ?? false

  const lines = CHAPTER_EXAMPLES[chapter.id] ?? ['```time', '10 Pushups', '```']
  const accent = CHAPTER_ACCENTS[chapter.id] ?? 'hsl(var(--primary))'
  const exampleSource = lines.join('\n')

  const leadQuestId = `${chapter.id}-run`

  const handleRun = () => {
    markComplete(leadQuestId)
    onRunExample?.(chapter.id, exampleSource)
  }

  const guidePath = `/guide/syntax/${chapter.id}`

  // Build quest items list
  const questItems = chapter.questIds.map((id) => {
    const rawQuest = allQuests.find((q) => q.id === id)
    const label = rawQuest?.label ?? questLabels[id] ?? id
    const isDone = currentChapterProgress?.quests.find((q) => q.id === id)?.isComplete ?? false
    return { id, label, isDone }
  })

  // Sticky view content: Code example fence + Run button
  const stickyView = (
    <div className="flex flex-col h-full bg-background p-1">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-2 px-1">
        <span className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          {chapter.title} · first example
        </span>
        <button
          type="button"
          onClick={handleRun}
          aria-label={`Run ${chapter.title} example`}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Play className="size-3 fill-current" />
          <span>Run</span>
        </button>
      </div>

      {visible ? (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-muted/20 p-3 font-mono text-[12px] leading-relaxed">
          <div style={{ color: accent }}>{lines[0]}</div>
          {lines.slice(1, -1).map((l, i) => (
            <div key={i} className="text-foreground">
              {l}
            </div>
          ))}
          <div style={{ color: accent }}>{lines[lines.length - 1]}</div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
          Offscreen (unmounted)
        </div>
      )}
    </div>
  )

  // Slides content: quest cards + guide CTA
  const slides = (
    <div className="flex flex-col gap-3">
      {questItems.map((q, idx) => (
        <div
          key={q.id}
          data-testid={`chapter-quest-card-${q.id}`}
          className={cn(
            'flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
            q.isDone
              ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10'
              : 'border-border bg-card',
          )}
        >
          <span
            className={cn(
              'flex size-5 flex-none items-center justify-center rounded-full border text-[10px] font-bold',
              q.isDone
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-border text-muted-foreground',
            )}
          >
            {q.isDone ? <Check className="size-3 stroke-[2.5]" /> : idx + 1}
          </span>
          <span
            className={cn(
              'text-[13px] font-medium',
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
      onVisibilityChange={setVisible}
      className={className}
    />
  )
}
