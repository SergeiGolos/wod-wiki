/**
 * PostWorkoutRpePrompt — dismissible 0–10 RPE capture banner.
 *
 * Prompts the user once after a workout review surface mounts. Answering writes
 * a user-origin SessionRPE segment statement to the result logs; skipping or
 * dismissing hides the banner for this mount without side effects.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/atoms/primitives/button';
import type { StoredOutputStatement } from '@/components/Editor/types';
import { captureSessionRpe } from '@/services/analytics/captureSessionRpe';
import { MetricType } from '@/core/models/Metric';
import { cn } from '@/lib/utils';

export interface PostWorkoutRpePromptProps {
  /** Stored workout result id to write the RPE into. */
  resultId: string;
  /** Current canonical result logs — used to detect an existing answer. */
  logs: StoredOutputStatement[];
  /** Optional callback fired after a successful capture. */
  onCaptured?: (rpe: number) => void;
  /** Optional className for the banner container. */
  className?: string;
}

export const PostWorkoutRpePrompt: React.FC<PostWorkoutRpePromptProps> = ({
  resultId,
  logs,
  onCaptured,
  className,
}) => {
  const [dismissed, setDismissed] = useState(false);

  const alreadyAnswered = useMemo(() => {
    return logs.some((statement) =>
      statement.outputType === 'segment' &&
      statement.metrics.some((m) => m.type === MetricType.SessionRPE && m.origin === 'user'),
    );
  }, [logs]);

  const handleCapture = useCallback(
    async (rpe: number) => {
      setDismissed(true);
      await captureSessionRpe(resultId, rpe);
      onCaptured?.(rpe);
    },
    [resultId, onCaptured],
  );

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  if (alreadyAnswered || dismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative flex flex-col gap-3 rounded-lg border border-border bg-muted/50 p-4 shadow-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-foreground">How hard was that?</h3>
          <p className="text-xs text-muted-foreground">
            Rate your session effort from 0 (rest) to 10 (maximal).
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          aria-label="Close"
          className="h-7 w-7 shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 flex-wrap gap-1">
          {Array.from({ length: 11 }, (_, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              onClick={() => handleCapture(i)}
              aria-label={`RPE ${i}`}
              className={cn(
                'h-8 min-w-[2rem] px-2 text-xs font-medium',
                i <= 3 && 'hover:bg-green-100 hover:text-green-900',
                i > 3 && i <= 6 && 'hover:bg-yellow-100 hover:text-yellow-900',
                i > 6 && i <= 8 && 'hover:bg-orange-100 hover:text-orange-900',
                i > 8 && 'hover:bg-red-100 hover:text-red-900',
              )}
            >
              {i}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Skip
        </Button>
      </div>
    </div>
  );
};
