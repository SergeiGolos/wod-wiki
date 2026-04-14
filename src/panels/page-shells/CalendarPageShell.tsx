/**
 * CalendarPageShell Component
 *
 * Layout shell for calendar / collection pages.
 * Renders a date-selection sidebar alongside a tabbed detail area.
 * No runtime lives in the shell itself — runtime is scoped to the
 * embedded plan-panel detail tab.
 *
 * Mobile: calendar collapses to a compact week-strip at the top.
 */

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useScreenMode } from '@/panels/panel-system/useScreenMode';
import type { CalendarTab } from './types';
import { PAGE_SHELL_CONTENT_SURFACE_CLASS } from './contentSurface';

export interface CalendarPageShellProps {
  /** Calendar / date-selection widget */
  calendar: ReactNode;

  /** Tabs rendered in the detail area */
  tabs: CalendarTab[];

  /** Initially active tab id (defaults to first tab) */
  defaultTab?: string;

  /** Additional CSS classes */
  className?: string;
}

/**
 * CalendarPageShell
 *
 * ```
 * Desktop:
 * ┌────────────────────────┬─────────────────────────────┐
 * │  CalendarWidget        │  Detail area (tabs):        │
 * │  (date selection)      │  - Overview tab             │
 * │                        │  - Editor tab (plan-panel)  │
 * │                        │  - Analytics tab            │
 * └────────────────────────┴─────────────────────────────┘
 *
 * Mobile:
 * ┌──────────────────────────────────────────────────────┐
 * │  Compact week-strip calendar                         │
 * ├──────────────────────────────────────────────────────┤
 * │  Detail area (tabs, full width)                      │
 * └──────────────────────────────────────────────────────┘
 * ```
 */
export function CalendarPageShell({
  calendar,
  tabs,
  defaultTab,
  className,
}: CalendarPageShellProps) {
  const screenMode = useScreenMode();
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id ?? '');
  const activeContent = tabs.find((t) => t.id === activeTab)?.content ?? null;

  const isMobile = screenMode === 'mobile';

  return (
    <div
      className={cn(
        'flex min-h-screen bg-background',
        isMobile ? 'flex-col' : 'flex-row',
        className,
      )}
    >
      {/* Calendar sidebar / compact strip */}
      <div
        className={cn(
          isMobile
            ? 'w-full border-b border-border/50'
            : 'w-[320px] shrink-0 border-r border-border/50',
        )}
      >
        {calendar}
      </div>

      {/* Detail area */}
      <div
        className={cn(
          'flex-1 flex flex-col min-h-0',
          !isMobile && 'lg:rounded-[2rem]',
          !isMobile && PAGE_SHELL_CONTENT_SURFACE_CLASS,
        )}
      >
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border/50 bg-muted/20 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold whitespace-nowrap transition-colors',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active tab content */}
        <div className="flex-1 min-h-0 overflow-auto">
          {activeContent}
        </div>
      </div>
    </div>
  );
}

export default CalendarPageShell;
