/**
 * TourQuests.tsx — the quest list section at the foot of the homepage.
 *
 * Replaces the old "What's Next" link farm: the syntax-guide links and the
 * header chapter quests were always the same idea, so the outro now shows
 * the quests themselves with live progress from the localStorage ledger.
 *
 * Chapter order follows markdown/canvas/home/README.md — the `home-tour`
 * chapter comes first and represents what the visitor learns by scrolling
 * the page (each tour stage fires a `qs-tour-*` quest). Its quest rows are
 * buttons that scroll the runway back to the matching stage. The remaining
 * chapters link out to their syntax-guide page.
 */

import { Link } from 'react-router-dom'
import { ArrowRight, Check, CheckCircle2, Circle } from 'lucide-react'
import type { Chapter, Quest } from '../canvas/parseCanvasMarkdown'
import { useChapterProgress, type ChapterProgress } from '../hooks/useChapterProgress'
import { chapterIcon } from '../components/ChallengeBadges'
import { cn } from '@/lib/utils'

const HOME_CHAPTER_ID = 'home-tour'

/** Chapter id → owning guide page. Chapters without a route render without a link. */
const CHAPTER_ROUTES: Record<string, string> = {
  basics: '/guide/syntax/basics',
  structure: '/guide/syntax/structure',
  protocols: '/guide/syntax/protocols',
  complex: '/guide/syntax/complex',
  'custom-metrics': '/guide/syntax/custom-metrics',
  dialects: '/guide/syntax/dialects',
}

export interface TourQuestsProps {
  /** The home page's own quests (source of labels for the home chapter). */
  quests: Quest[]
  /** Page-level chapters, home-tour first. */
  chapters: Chapter[]
  /** Cross-page quest id → label, collected from every canvas route. */
  questLabels?: Record<string, string>
  /** Home-chapter quest click — scrolls the tour runway to the stage. */
  onHomeQuestClick?: (questId: string) => void
}

/** Fallback label for quest ids with no declared label: 'basics-movement' → 'Movement'. */
function humanize(id: string): string {
  const tail = id.split('-').slice(1).join(' ') || id
  return tail.charAt(0).toUpperCase() + tail.slice(1)
}

function ChapterHeader({ progress }: { progress: ChapterProgress }) {
  const { chapter, completedCount, totalCount, isComplete } = progress
  const Icon = chapterIcon(chapter.badge)
  const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  return (
    <header>
      <div className="flex items-center gap-3.5">
        <span
          className={cn(
            'flex size-10 flex-none items-center justify-center rounded-xl border transition-colors',
            isComplete
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500'
              : 'border-border bg-background text-muted-foreground',
          )}
        >
          {isComplete ? <Check className="size-5" /> : <Icon className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <h4 className="truncate text-[15px] font-bold tracking-[-0.01em]">{chapter.title}</h4>
            <span
              className={cn(
                'font-mono text-[10px] font-black uppercase tracking-wider',
                isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
              )}
            >
              {completedCount}/{totalCount}
            </span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-foreground/10">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-500',
                isComplete ? 'bg-emerald-500' : 'bg-primary',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </header>
  )
}

export function TourQuests({ quests, chapters, questLabels = {}, onHomeQuestClick }: TourQuestsProps) {
  const { chapters: chapterProgress } = useChapterProgress(chapters)

  const labelFor = (id: string): string =>
    quests.find((q) => q.id === id)?.label ?? questLabels[id] ?? humanize(id)

  const totalDone = chapterProgress.reduce((n, c) => n + c.completedCount, 0)
  const totalAll = chapterProgress.reduce((n, c) => n + c.totalCount, 0)
  const allComplete = totalAll > 0 && totalDone === totalAll

  return (
    <section className="border-t border-border px-6 py-20" data-testid="tour-quests">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h3 className="text-[clamp(22px,3vw,34px)] font-extrabold tracking-[-0.03em]">
            Your quests
          </h3>
          <p className="mx-auto mt-3 max-w-lg text-[14px] leading-[1.7] text-muted-foreground">
            You&apos;ve been completing these as you scroll. Keep going — run the demo,
            then work through the syntax guides. Progress saves as you go.
          </p>
          <p
            className={cn(
              'mt-4 font-mono text-[10px] font-black uppercase tracking-[0.18em]',
              allComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
            )}
          >
            {allComplete ? `All ${totalAll} quests complete` : `${totalDone}/${totalAll} quests complete`}
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-4">
          {chapterProgress.map((progress) => {
            const isHome = progress.chapter.id === HOME_CHAPTER_ID
            const route = CHAPTER_ROUTES[progress.chapter.id]

            const questList = (
              <ul className="mt-5 flex flex-col gap-1">
                {progress.quests.map(({ id, isComplete }) => {
                  const label = labelFor(id)
                  const row = (
                    <>
                      {isComplete ? (
                        <CheckCircle2 className="size-4 flex-none text-emerald-500" />
                      ) : (
                        <Circle className="size-4 flex-none text-muted-foreground/40 transition-colors group-hover:text-primary" />
                      )}
                      <span
                        className={cn(
                          'text-[13px] leading-[1.5]',
                          isComplete ? 'text-muted-foreground' : 'text-foreground',
                        )}
                      >
                        {label}
                      </span>
                    </>
                  )
                  return (
                    <li key={id}>
                      {isHome ? (
                        <button
                          type="button"
                          onClick={() => onHomeQuestClick?.(id)}
                          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/50"
                        >
                          {row}
                        </button>
                      ) : (
                        <span className="group flex items-center gap-3 px-3 py-2">{row}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )

            if (isHome || !route) {
              return (
                <div key={progress.chapter.id} className="rounded-2xl border border-border bg-card p-6">
                  <ChapterHeader progress={progress} />
                  {questList}
                </div>
              )
            }

            return (
              <Link
                key={progress.chapter.id}
                to={route}
                className="group block rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
              >
                <div className="relative">
                  <ChapterHeader progress={progress} />
                  <ArrowRight className="absolute top-2 right-0 size-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                {questList}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
