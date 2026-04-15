/**
 * CloneDateDropdown — Calendar dropdown for clone / "Use Template" actions
 *
 * Shows a compact calendar in a dropdown. When a date is selected,
 * fires onClone(selectedDate) so the caller can clone the entry
 * to that specific target date.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import type { IContentProvider } from '@/types/content-provider';
import { WorkoutActionButton } from '@/components/workout/WorkoutActionButton';

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
  const handleAction = (date: Date) => {
    onClone(date.getTime());
  };

  return (
    <WorkoutActionButton
        mode="clone"
        label={showLabel ? label : ""}
        onAction={handleAction}
        provider={provider}
        variant={variant === 'button' ? 'outline' : 'ghost'}
        className={cn(className, variant === 'list-icon' && "text-muted-foreground/50")}
        title={title}
    />
  );
};
