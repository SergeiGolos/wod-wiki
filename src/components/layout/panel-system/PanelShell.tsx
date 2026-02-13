/**
 * PanelShell Component
 *
 * Wrapper component for individual panels in the panel system.
 * Provides expand/collapse functionality and smooth transitions.
 */

import React from 'react';

import { cn } from '@/lib/utils';
import type { PanelSpan } from './types';
import { PanelSizeProvider } from './PanelSizeContext';

export interface PanelShellProps {
  /** Unique panel identifier */
  id: string;

  /** Current span (1, 2, or 3) */
  span: PanelSpan;

  /** Whether this panel is currently expanded */
  isExpanded: boolean;

  /** Panel content */
  children: React.ReactNode;

  /** Additional CSS classes */
  className?: string;
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
  span,
  isExpanded,
  children,
  className,
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
      {/* Panel Content — wrapped in PanelSizeProvider for container-aware sizing */}
      <div className="flex-1 overflow-hidden">
        <PanelSizeProvider>
          {children}
        </PanelSizeProvider>
      </div>
    </div>
  );
}
