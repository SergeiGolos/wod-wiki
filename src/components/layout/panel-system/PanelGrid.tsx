/**
 * PanelGrid Component
 *
 * Flex container that adapts panel layout based on screen mode.
 * Handles responsive transitions between desktop, tablet, and mobile layouts.
 */

import { cn } from '@/lib/utils';
import type { PanelDescriptor, PanelLayoutState, ScreenMode } from './types';
import { PanelShell } from './PanelShell';
import { useScreenMode } from './useScreenMode';

export interface PanelGridProps {
  /** Panels to render */
  panels: PanelDescriptor[];

  /** Current layout state */
  layoutState: PanelLayoutState;

  /** Callback to expand a panel */
  onExpandPanel: (panelId: string) => void;

  /** Callback to collapse the expanded panel */
  onCollapsePanel: () => void;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Get flex value for a panel based on screen mode and current span
 */
function getPanelFlexValue(
  span: number,
  screenMode: ScreenMode,
  isExpanded: boolean
): string {
  // If expanded, take full space
  if (isExpanded) {
    return '0 0 100%';
  }

  // Screen mode overrides
  switch (screenMode) {
    case 'desktop':
      // Desktop: Use default span (1, 2, or 3 units)
      return `${span} 1 0%`;

    case 'tablet':
      // Tablet: Equal width (50/50 split for 2 panels)
      return '1 1 0%';

    case 'mobile':
      // Mobile: Full width stacked (handled by flex-direction: column)
      return '0 0 auto';

    default:
      return `${span} 1 0%`;
  }
}

/**
 * PanelGrid - Responsive flex container for panels
 *
 * Layout behavior:
 * - Desktop (≥1024px): flex-row, panels at defaultSpan ratios (1/3, 2/3, full)
 * - Tablet (768-1023px): flex-row, panels at equal width (50/50)
 * - Mobile (<768px): flex-column, panels stacked with min-height: 50vh
 *
 * When a panel is expanded:
 * - Expanded panel: flex: 0 0 100%
 * - Other panels: display: none with opacity transition
 */
export function PanelGrid({
  panels,
  layoutState,
  onExpandPanel,
  onCollapsePanel,
  className,
}: PanelGridProps) {
  const screenMode = useScreenMode();
  const { panelSpans, expandedPanelId } = layoutState;

  // Filter out panels that should be hidden on mobile
  const visiblePanels = panels.filter((panel) => {
    if (screenMode === 'mobile' && panel.hideOnMobile) {
      return false;
    }
    return true;
  });

  return (
    <div
      className={cn(
        'flex h-full w-full',
        // Flex direction based on screen mode
        screenMode === 'mobile' ? 'flex-col overflow-y-auto' : 'flex-row overflow-hidden',
        className
      )}
      data-screen-mode={screenMode}
    >
      {visiblePanels.map((panel) => {
        const currentSpan = panelSpans[panel.id] ?? panel.defaultSpan;
        const isExpanded = expandedPanelId === panel.id;
        const isHidden = expandedPanelId !== null && !isExpanded;

        // Calculate flex value
        const flexValue = getPanelFlexValue(currentSpan, screenMode, isExpanded);

        // Hide the PanelShell header when this is the only panel in view
        // (expand/collapse has no meaning and title is redundant with the view tab)
        const isSolePanel = visiblePanels.length === 1;

        return (
          <div
            key={panel.id}
            className={cn(
              // Only transition flex changes (panel expand/collapse), not layout-breaking properties
              'transition-[flex,opacity] duration-300 ease-in-out',
              // Mobile-specific styles
              screenMode === 'mobile' && 'min-h-[50vh] w-full',
              // Hide siblings when one panel is expanded
              isHidden && 'hidden opacity-0'
            )}
            style={{
              flex: flexValue,
            }}
          >
            <PanelShell
              id={panel.id}
              title={panel.title}
              icon={panel.icon}
              span={currentSpan}
              isExpanded={isExpanded}
              onExpand={() => onExpandPanel(panel.id)}
              onCollapse={onCollapsePanel}
              className="h-full"
              hideHeader={isSolePanel}
            >
              {panel.content}
            </PanelShell>
          </div>
        );
      })}
    </div>
  );
}
