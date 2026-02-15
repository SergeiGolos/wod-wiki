/**
 * WodBlockResults
 *
 * Renders a compact results segment below a WOD block.
 * Shows recent workout completions with timestamps and durations,
 * each linking to the review tab for that specific result.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { reviewPath } from '@/lib/routes';
import { useWodBlockResults } from '../../hooks/useWodBlockResults';
import { Clock, ExternalLink } from 'lucide-react';

export interface WodBlockResultsProps {
  /** Note ID (short or full UUID) */
  noteId?: string;
  /** WOD section ID within the note */
  sectionId?: string;
  /** Maximum number of results to show */
  maxResults?: number;
  /** CSS class override */
  className?: string;
}

/** Format milliseconds as M:SS or H:MM:SS */
function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '--:--';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Format a unix timestamp as a relative or absolute date string */
function formatCompletedDate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days === 0) {
    if (hours === 0 && minutes < 1) return 'just now';
    if (hours === 0) return `${minutes}m ago`;
    return `${hours}h ago`;
  }
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;

  // Fall back to absolute date
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: new Date(timestamp).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

export const WodBlockResults: React.FC<WodBlockResultsProps> = ({
  noteId,
  sectionId,
  maxResults = 3,
  className,
}) => {
  const { results, loading } = useWodBlockResults(noteId, sectionId);

  // Don't render anything if no results or missing IDs
  if (!noteId || !sectionId || loading || results.length === 0) {
    return null;
  }

  const visibleResults = results.slice(0, maxResults);
  const hiddenCount = results.length - visibleResults.length;

  return (
    <div
      className={cn(
        'rounded-md border border-border/40 bg-muted/20 overflow-hidden mt-1',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-muted-foreground/70 font-medium border-b border-border/20">
        <Clock className="h-3 w-3" />
        <span>Results</span>
        <span className="text-muted-foreground/50">({results.length})</span>
      </div>

      {/* Result entries */}
      <div className="divide-y divide-border/20">
        {visibleResults.map((result) => {
          const href = `#${reviewPath(noteId, sectionId, result.id)}`;
          return (
            <a
              key={result.id}
              href={href}
              className={cn(
                'flex items-center gap-2 px-2 py-1 text-[11px] transition-colors',
                'hover:bg-accent/50 group cursor-pointer no-underline',
              )}
            >
              {/* Completion indicator */}
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full shrink-0',
                  result.data.completed ? 'bg-green-500' : 'bg-yellow-500',
                )}
              />

              {/* Date */}
              <span className="text-muted-foreground min-w-[60px]">
                {formatCompletedDate(result.completedAt)}
              </span>

              {/* Duration */}
              <span className="font-mono text-foreground/80">
                {formatDuration(result.data.duration)}
              </span>

              {/* Completed / partial indicator */}
              {!result.data.completed && (
                <span className="text-yellow-600 text-[9px]">partial</span>
              )}

              {/* Spacer */}
              <span className="flex-1" />

              {/* Review link icon */}
              <ExternalLink className="h-3 w-3 text-muted-foreground/40 group-hover:text-foreground/60 shrink-0" />
            </a>
          );
        })}
      </div>

      {/* More results indicator */}
      {hiddenCount > 0 && (
        <a
          href={`#${reviewPath(noteId, sectionId)}`}
          className="block px-2 py-1 text-[10px] text-muted-foreground/60 hover:text-foreground/70 text-center border-t border-border/20 no-underline"
        >
          +{hiddenCount} more result{hiddenCount !== 1 ? 's' : ''} — view all
        </a>
      )}
    </div>
  );
};
