import React from 'react';
import { cn } from '@/lib/utils';

export interface TrackViewShellProps {
  readonly isCompact?: boolean;
  readonly leftPanel: React.ReactNode;
  readonly rightPanel: React.ReactNode;
  readonly leftPanelId?: string;
  readonly rightPanelId?: string;
  readonly leftPanelAriaLabel?: string;
  readonly rightPanelAriaLabel?: string;
  readonly rightPanelClassName?: string;
}

/**
 * Shared shell for active workout views used by both browser and Chromecast.
 *
 * Layout behavior:
 * - Compact: vertical split (visual state above timer controls)
 * - Default: horizontal split (visual state left, timer controls right)
 */
const inferPanelLabel = (panelId?: string, fallback = 'Panel') => {
  if (!panelId) return fallback;

  const normalized = panelId.toLowerCase();
  if (normalized.includes('visual')) return 'Visual panel';
  if (normalized.includes('clock')) return 'Clock panel';
  if (normalized.includes('left')) return 'Left panel';
  if (normalized.includes('right')) return 'Right panel';

  return fallback;
};

export const TrackViewShell: React.FC<TrackViewShellProps> = ({
  isCompact = false,
  leftPanel,
  rightPanel,
  leftPanelId,
  rightPanelId,
  leftPanelAriaLabel,
  rightPanelAriaLabel,
  rightPanelClassName,
}) => {
  const hasLeftRegionSemantics = Boolean(leftPanelId || leftPanelAriaLabel);
  const hasRightRegionSemantics = Boolean(rightPanelId || rightPanelAriaLabel);

  return (
    <div className={cn('flex h-full overflow-hidden', isCompact ? 'flex-col' : 'flex-row')}>
      <div
        id={leftPanelId}
        role={hasLeftRegionSemantics ? 'region' : undefined}
        aria-label={leftPanelAriaLabel ?? inferPanelLabel(leftPanelId, 'Left panel')}
        className={cn(
          'bg-secondary/10',
          isCompact
            ? 'flex-1 min-h-0 border-b border-border overflow-hidden'
            : 'w-1/3 min-w-0 border-r border-border',
        )}
      >
        {leftPanel}
      </div>

      <div
        id={rightPanelId}
        role={hasRightRegionSemantics ? 'region' : undefined}
        aria-label={rightPanelAriaLabel ?? inferPanelLabel(rightPanelId, 'Right panel')}
        className={cn(
          'flex flex-col bg-background transition-all duration-300',
          isCompact ? 'shrink-0' : 'w-2/3',
          rightPanelClassName,
        )}
      >
        {rightPanel}
      </div>
    </div>
  );
};
