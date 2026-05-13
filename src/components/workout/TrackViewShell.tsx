import React from 'react';
import { cn } from '@/lib/utils';

export interface TrackViewShellProps {
  readonly isCompact?: boolean;
  readonly leftPanel: React.ReactNode;
  readonly rightPanel: React.ReactNode;
  readonly leftPanelId?: string;
  readonly rightPanelId?: string;
  readonly rightPanelClassName?: string;
}

/**
 * Shared shell for active workout views used by both browser and Chromecast.
 *
 * Layout behavior:
 * - Compact: vertical split (visual state above timer controls)
 * - Default: horizontal split (visual state left, timer controls right)
 */
export const TrackViewShell: React.FC<TrackViewShellProps> = ({
  isCompact = false,
  leftPanel,
  rightPanel,
  leftPanelId,
  rightPanelId,
  rightPanelClassName,
}) => {
  return (
    <div className={cn('flex h-full overflow-hidden', isCompact ? 'flex-col' : 'flex-row')}>
      <div
        id={leftPanelId}
        className={cn(
          'bg-secondary/10',
          isCompact
            ? 'flex-1 min-h-0 border-b border-border overflow-hidden'
            : 'flex-1 min-w-0 border-r border-border',
        )}
      >
        {leftPanel}
      </div>

      <div
        id={rightPanelId}
        className={cn(
          'flex flex-col bg-background transition-all duration-300',
          isCompact ? 'shrink-0' : 'w-1/2',
          rightPanelClassName,
        )}
      >
        {rightPanel}
      </div>
    </div>
  );
};
