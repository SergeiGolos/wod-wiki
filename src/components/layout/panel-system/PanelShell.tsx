/**
 * PanelShell Component
 *
 * Wrapper component for individual panels in the panel system.
 * Provides expand/collapse functionality and smooth transitions.
 */

import React from 'react';
import { Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PanelSpan } from './types';
import { PanelSizeProvider } from './PanelSizeContext';

export interface PanelShellProps {
  /** Unique panel identifier */
  id: string;

  /** Panel title for header */
  title: string;

  /** Optional icon for header */
  icon?: React.ReactNode;

  /** Current span (1, 2, or 3) */
  span: PanelSpan;

  /** Whether this panel is currently expanded */
  isExpanded: boolean;

  /** Callback to expand this panel */
  onExpand?: () => void;

  /** Callback to collapse/close this panel */
  onCollapse?: () => void;

  /** Panel content */
  children: React.ReactNode;

  /** Additional CSS classes */
  className?: string;

  /** Whether to hide the header (for panels that manage their own headers) */
  hideHeader?: boolean;
}

/**
 * PanelShell - Wrapper for individual panels
 *
 * Features:
 * - Thin header bar with title, icon, and expand/collapse buttons
 * - Smooth transitions on span changes
 * - Expand button (maximize icon) when not expanded
 * - Close button (X icon) when expanded (span === 3)
 */
export function PanelShell({
  id,
  title,
  icon,
  span,
  isExpanded,
  onExpand,
  onCollapse,
  children,
  className,
  hideHeader = false,
}: PanelShellProps) {
  return (
    <div
      className={cn(
        'flex flex-col h-full',
        'transition-all duration-300 ease-in-out',
        className
      )}
      data-panel-id={id}
      data-panel-span={span}
      data-panel-expanded={isExpanded}
    >
      {/* Panel Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background/50 backdrop-blur-sm min-h-[28px]">
          {/* Left: Icon + Title */}
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            {icon && <span className="w-4 h-4 flex items-center justify-center">{icon}</span>}
            <span>{title}</span>
          </div>

          {/* Right: Expand/Collapse Button */}
          <div className="flex items-center gap-1">
            {isExpanded ? (
              // Close button when expanded
              <button
                onClick={onCollapse}
                className={cn(
                  'p-1 rounded hover:bg-accent transition-colors',
                  'text-muted-foreground hover:text-foreground'
                )}
                aria-label="Close panel"
                title="Close panel"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              // Expand button when not expanded
              <button
                onClick={onExpand}
                className={cn(
                  'p-1 rounded hover:bg-accent transition-colors',
                  'text-muted-foreground hover:text-foreground'
                )}
                aria-label="Expand panel"
                title="Expand panel"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Panel Content — wrapped in PanelSizeProvider for container-aware sizing */}
      <div className="flex-1 overflow-hidden">
        <PanelSizeProvider>
          {children}
        </PanelSizeProvider>
      </div>
    </div>
  );
}
