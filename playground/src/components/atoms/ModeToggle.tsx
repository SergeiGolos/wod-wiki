import { cn } from '@/lib/utils';
import {
  CalendarIcon,
  CalendarDaysIcon,
  ClockIcon,
  ListIcon,
} from 'lucide-react';
import type { JournalViewMode } from '../../hooks/useJournalQueryState';

export interface ModeToggleProps {
  /** Currently selected mode. */
  value: JournalViewMode;
  /** Called when a new mode is picked. */
  onChange: (mode: JournalViewMode) => void;
  /** Aria label for the segmented control. */
  ariaLabel?: string;
  className?: string;
}

interface ModeOption {
  value: JournalViewMode;
  label: string;
  Icon: typeof CalendarIcon;
}

const MODE_OPTIONS: readonly ModeOption[] = [
  { value: 'history', label: 'History', Icon: ClockIcon },
  { value: 'today',   label: 'Today',   Icon: CalendarIcon },
  { value: 'plan',    label: 'Plan',    Icon: CalendarDaysIcon },
  { value: 'all',     label: 'All',     Icon: ListIcon },
]

/**
 * ModeToggle — segmented control for the unified Journal page's visible
 * window mode (History / Today / Plan / All). The visible state is a single
 * selected option out of four; the active option is highlighted with the
 * brand token so users can locate the current view at a glance.
 * Sits inside the JournalNavPanel L2 panel between the focused-date badge
 * and the mini calendar. Each option is a real `<button>` so keyboard
 * activation and screen-reader semantics work without extra ARIA wiring
 * beyond a single `role="group"` on the container.
 */
export function ModeToggle({
  value,
  onChange,
  ariaLabel = 'Journal view mode',
  className,
}: ModeToggleProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-testid="journal-mode-toggle"
      className={cn(
        'mx-2 inline-flex items-center gap-0.5 rounded-md border border-border bg-background/40 p-0.5 text-[11px]',
        className,
      )}
    >
      {MODE_OPTIONS.map(({ value: optValue, label, Icon }) => {
        const isActive = optValue === value
        return (
          <button
            key={optValue}
            type="button"
            aria-pressed={isActive}
            aria-label={label}
            title={label}
            data-testid={`journal-mode-${optValue}`}
            onClick={() => onChange(optValue)}
            className={cn(
              'inline-flex items-center gap-1 rounded px-2 py-1 font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'bg-brand text-background shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="size-3" />
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
