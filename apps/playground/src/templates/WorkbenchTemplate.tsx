import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface WorkbenchTemplateProps {
  /** Header bar rendered at the top (sticky/fixed) */
  header: ReactNode;

  /** Main content area — typically ResponsiveViewport */
  children: ReactNode;

  /** Optional drag-and-drop overlay rendered above everything */
  dragOverlay?: ReactNode;

  /** Optional side/detail panel (e.g. NoteDetailsPanel) */
  sidePanel?: ReactNode;

  /** Additional CSS classes on the root element */
  className?: string;
}

/**
 * WorkbenchTemplate
 *
 * Full-screen application shell with a header bar and a scrollable/overflow-hidden
 * content well. Used by the workbench (Plan → Track → Review) and any other
 * fullscreen tool layout.
 *
 * ```
 * ┌─────────────────────────────────────────┐
 * │  Header                                 │
 * ├─────────────────────────────────────────┤
 * │                                         │
 * │  Content (flex-1, overflow-hidden)      │
 * │                                         │
 * │  ┌─────────────────────────────────┐    │
 * │  │  Side panel (absolute/overlay)  │    │
 * │  └─────────────────────────────────┘    │
 * └─────────────────────────────────────────┘
 * ```
 */
export function WorkbenchTemplate({
  header,
  children,
  dragOverlay,
  sidePanel,
  className,
}: WorkbenchTemplateProps) {
  return (
    <div
      className={cn(
        'h-screen w-screen flex flex-col overflow-hidden bg-background relative',
        className,
      )}
    >
      {dragOverlay}
      {header}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {children}
        {sidePanel}
      </div>
    </div>
  );
}

