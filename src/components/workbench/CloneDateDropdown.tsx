/**
 * CloneDateDropdown — Calendar dropdown for clone / "Use Template" actions
 *
 * Shows a compact calendar in a dropdown. When a date is selected,
 * fires onClone(selectedDate) so the caller can clone the entry
 * to that specific target date.
 */

import React, { useState, useEffect } from 'react';
import { Copy, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  const handleMainAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClone(Date.now());
  };

  const menuContent = (
    <DropdownMenuContent align="end" className="w-64" onClick={(e) => e.stopPropagation()}>
      <DropdownMenuLabel className="flex items-center gap-2">
        <Calendar className="h-3.5 w-3.5" />
        {label === 'Use Template' ? 'Clone to Date' : label}
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
  );

  if (variant === 'button') {
    return (
      <div className={cn("flex items-center", className)} onClick={(e) => e.stopPropagation()}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMainAction}
          className="rounded-r-none gap-2 px-3 h-8 border-r-0 font-medium whitespace-nowrap"
          title="Use Template (clone to today)"
        >
          <Copy className="h-3.5 w-3.5 text-primary" />
          {showLabel && <span>{label}</span>}
        </Button>

        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="rounded-l-none px-2 h-8 border-l border-primary/10"
              title={title}
            >
              <Calendar className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
            </Button>
          </DropdownMenuTrigger>
          {menuContent}
        </DropdownMenu>
      </div>
    );
  }

  // Handle icon-only variants (list-icon, icon) as split buttons
  // Left part: Clone to today, Right part: Calendar dropdown
  return (
    <div className={cn("flex items-center", className)} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleMainAction}
        className={cn(
          "flex items-center justify-center rounded-l transition-colors",
          variant === 'list-icon'
            ? "h-8 w-8 hover:bg-muted text-muted-foreground/50 hover:text-blue-500"
            : "h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground"
        )}
        title="Clone to today"
      >
        <Copy className="h-4 w-4" />
      </button>

      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center justify-center rounded-r border-l border-border/10 transition-colors",
              variant === 'list-icon'
                ? "h-8 w-7 hover:bg-muted text-muted-foreground/30 hover:text-blue-400"
                : "h-8 w-7 hover:bg-muted text-muted-foreground/50 hover:text-foreground"
            )}
            title={title}
          >
            <Calendar className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        {menuContent}
      </DropdownMenu>
    </div>
  );
};
