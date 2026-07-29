import { Play } from 'lucide-react';
import { detectScriptBlocks } from '@/components/Editor/utils/blockDetection';
import { cn } from '@/lib/utils';

export interface StartHereWorkout {
  id: string;
  name: string;
  description: string;
  category: string;
  categoryLabel: string;
  content: string;
}

export interface StartHereShelfProps {
  workouts: StartHereWorkout[];
  onPlay: (workout: StartHereWorkout) => void;
  isPlaying?: string | null;
}

export function StartHereShelf({ workouts, onPlay, isPlaying }: StartHereShelfProps) {
  return (
    <div className="px-6 py-8 lg:px-10 lg:py-10 border-b border-border/60 bg-muted/20">
      <div className="max-w-4xl">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">
          Start here
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {workouts.map(workout => {
            const runnable = detectScriptBlocks(workout.content).length > 0;
            const playing = isPlaying === workout.id;
            return (
              <div
                key={workout.id}
                className="rounded-lg border border-border bg-card p-5 shadow-sm"
              >
                <h3 className="text-base font-bold text-foreground uppercase tracking-tight">
                  {workout.name}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                  {workout.description}
                </p>
                <button
                  type="button"
                  disabled={!runnable || playing}
                  onClick={() => onPlay(workout)}
                  className={cn(
                    'mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors',
                    runnable && !playing
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-muted text-muted-foreground cursor-not-allowed',
                  )}
                >
                  <Play className="size-3.5 fill-current" aria-hidden="true" />
                  {playing ? 'Starting…' : 'Play'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
