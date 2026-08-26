/**
 * ResultListItem
 *
 * Shared presentational component for displaying a workout result row.
 * Used in both the journal day scroll and the NoteEditor wod-block results.
 */

import React from "react";
import { ClockIcon, CheckCircleIcon } from "lucide-react";

export interface ResultListItemViewModel {
  /** Preformatted time string, e.g. "10:30 AM" */
  timeLabel: string;
  /** Primary row label, e.g. workout name or duration */
  title: string;
  /** Secondary label, e.g. duration or date */
  subtitle?: string;
}

interface ResultListItemProps extends ResultListItemViewModel {
  onClick?: () => void;
}

export const ResultListItem: React.FC<ResultListItemProps> = ({
  timeLabel,
  title,
  subtitle,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="flex items-center gap-4 px-6 py-3 hover:bg-muted/40 transition-colors text-left group w-full"
  >
    {/* Time stamp — left column */}
    <div className="flex-shrink-0 w-14 text-right">
      <div className="flex items-center justify-end gap-1">
        <ClockIcon className="size-2.5 text-muted-foreground/40" />
        <span className="text-[10px] font-black text-muted-foreground/60 tabular-nums">
          {timeLabel}
        </span>
      </div>
    </div>

    {/* Status icon */}
    <div className="flex-shrink-0 size-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
      <CheckCircleIcon className="size-3.5 text-emerald-500" />
    </div>

    {/* Text */}
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
      {subtitle && (
        <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
      )}
    </div>
  </button>
);
