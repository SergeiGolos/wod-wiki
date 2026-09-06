import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePageQuests, type Quest } from '../hooks/usePageQuests';
import { findCanvasPage } from '../canvas/canvasRoutes';
import { ChallengeCard } from '../components/molecules/ChallengeCard';

/**
 * Section mapping for home page tour challenges.
 */
export const HOME_CHALLENGE_SECTION_MAP: Record<string, string> = {
  'qs-arrive': 'tour-hero',
  'qs-edit': 'tour-hero',
  'qs-tour-timer': 'run',
  'qs-run': 'run',
  'qs-tour-analytics': 'explore',
};
export const HOME_DEFAULT_QUESTS: Quest[] = [
  { id: 'qs-arrive', label: 'Welcome to WOD Wiki', desc: 'You landed on the playground dashboard.' },
  { id: 'qs-edit', label: 'Change the workout', desc: 'Make any edit to the demo script.' },
  { id: 'qs-tour-timer', label: 'See the timer run it', desc: 'Let the demo timer reach a running state in the Clock stage.' },
  { id: 'qs-run', label: 'Run it to the finish', desc: 'Press Run and let the workout complete.' },
  { id: 'qs-tour-analytics', label: 'Review the session', desc: 'Scroll through the analytics stage of the home tour.' },
];


export function HomeChallengesNav() {
  const page = findCanvasPage('/');
  const quests = useMemo(() => {
    const fromPage = page?.quests.filter((q) => q.id.startsWith('qs-')) ?? [];
    return fromPage.length > 0 ? fromPage : HOME_DEFAULT_QUESTS;
  }, [page]);
  const { quests: questsWithStatus, stepsComplete, totalSteps, isComplete } = usePageQuests('/', quests);

  const handleScrollToChallenge = (questId: string) => {
    const sectionId = HOME_CHALLENGE_SECTION_MAP[questId];
    if (sectionId) {
      const el =
        document.getElementById(sectionId) ||
        document.querySelector(`[data-section-id="${sectionId}"]`) ||
        document.querySelector(`[data-testid="${sectionId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  if (totalSteps === 0) return null;

  return (
    <div className="flex flex-col gap-3 px-3 py-4" data-testid="home-challenges-nav">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-foreground">
            Challenges
          </span>
        </div>
        <span
          data-testid="home-challenges-progress"
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums border',
            isComplete
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border-border/70 bg-muted/50 text-muted-foreground',
          )}
        >
          {stepsComplete}/{totalSteps}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {questsWithStatus.map((q) => (
          <ChallengeCard
            key={q.id}
            quest={q}
            onClick={() => handleScrollToChallenge(q.id)}
            compact
            className="border border-border/40 bg-card/60 hover:bg-card hover:border-border transition-colors cursor-pointer"
          />
        ))}
      </div>
    </div>
  );
}
