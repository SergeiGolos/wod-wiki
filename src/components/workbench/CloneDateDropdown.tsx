/**
 * CloneDateDropdown — Calendar dropdown for clone / "Use Template" actions
 *
 * Shows a compact calendar in a dropdown. When a date is selected,
 * fires onClone(selectedDate) so the caller can clone the entry
 * to that specific target date.
 */

import React, { useState, useEffect } from 'react';
import { Copy, Calendar, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { CalendarDatePicker } from '@/components/ui/CalendarDatePicker';
import { cn } from '@/lib/utils';
import type { IContentProvider } from '@/types/content-provider';

export interface CloneDateDropdownProps {
  /** Callback when a date is selected. Receives the target date timestamp. */
  onClone: (targetDate: number) => void;
  /** Content provider to load entry dates for calendar highlights */
  provider?: IContentProvider;
  /** Button variant */
  variant?: 'icon' | 'button' | 'list-icon';
  /** Show label text next to icon */
  showLabel?: boolean;
  /** Label text (defaults to "Use Template") */
  label?: string;
  /** Additional class names */
  className?: string;
  /** Title tooltip */
  title?: string;
}

export const CloneDateDropdown: React.FC<CloneDateDropdownProps> = ({
  onClone,
  provider,
  variant = 'button',
  showLabel = true,
  label = 'Use Template',
  className,
  title = 'Clone to date...',
}) => {
  const [open, setOpen] = useState(false);
  const [entryDates, setEntryDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Load entry dates when dropdown opens
  useEffect(() => {
    if (!open || !provider) return;

    const loadEntryDates = async () => {
      setLoading(true);
      try {
        const entries = await provider.getEntries();
        const dates = new Set(
          entries
            .filter(e => e.type !== 'template')
            .map(e => new Date(e.targetDate).toISOString().split('T')[0])
        );
        setEntryDates(dates);
      } catch (err) {
        console.error('Failed to load entry dates:', err);
      } finally {
        setLoading(false);
      }
    };

    loadEntryDates();
  }, [open, provider]);

  const handleDateSelect = (date: Date) => {
    // Set to noon to avoid timezone edge cases
    date.setHours(12, 0, 0, 0);
    onClone(date.getTime());
    setOpen(false);
  };

  const triggerButton = variant === 'list-icon' ? (
    <button
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-muted-foreground/50 hover:text-blue-500 transition-colors',
        className
      )}
      title={title}
    >
      <Copy className="w-4 h-4" />
    </button>
  ) : variant === 'icon' ? (
    <button
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'h-8 w-8 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
        className
      )}
      title={title}
    >
      <Copy className="h-4 w-4" />
    </button>
  ) : (
    <button
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors',
        className
      )}
      title={title}
    >
      <Copy className="h-4 w-4" />
      {showLabel && <span>{label}</span>}
    </button>
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {triggerButton}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" />
          Clone to Date
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <CalendarDatePicker
            onDateSelect={handleDateSelect}
            entryDates={entryDates}
          />
        )}

        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-[10px] text-muted-foreground text-center">
          Select a date to clone this workout to
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
