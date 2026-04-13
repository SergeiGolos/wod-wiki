/**
 * JournalPageShell Component
 *
 * Layout shell for stored-note / journal pages (Configuration 3).
 * Renders a reactive 3-column view:
 * 1. Nav Panel (Sidebar) - Handled by SidebarLayout parent
 * 2. Note Column (Main) - Card-like container with Header + Editor
 * 3. Page Index (TOC) - Combo box on mobile/desktop, outside sidebar on Desktop XL
 *
 * Uses useWorkbenchRuntime for workout lifecycle + analytics.
 */

import React, { useState, useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useQueryState } from 'nuqs';
import { PlayIcon } from '@heroicons/react/20/solid';

export interface JournalPageShellProps {
  /** Editor panel content — typically a PlanPanel with stored note */
  editor: ReactNode;

  /** Page index links for navigation */
  index?: PageNavLink[];

  /** Active section ID in the index */
  activeSectionId?: string;

  /** Callback to scroll to a section */
  onScrollToSection?: (id: string) => void;

  /** Title shown in the sticky header */
  title?: string;

  /** Right-side actions (e.g. New Entry, Cast, etc.) */
  actions?: ReactNode;

  /** Optional timer overlay (dialog-based, rendered over editor) */
  timerOverlay?: ReactNode;

  /** Optional review overlay (dialog-based, rendered over editor) */
  reviewOverlay?: ReactNode;

  /** Whether the timer dialog is currently open */
  isTimerOpen?: boolean;

  /** Whether the review dialog is currently open */
  isReviewOpen?: boolean;

  /** Callback to close the timer dialog */
  onCloseTimer?: () => void;

  /** Callback to close the review dialog */
  onCloseReview?: () => void;

  /** Additional CSS classes */
  className?: string;
}

/**
 * JournalPageShell
 *
 * Implements the universal reactive display for notes/canvas:
 * - mobile: nav collapsed, editor full, index in header combo box.
 * - desktop: nav visible, editor full up to 3xl, margin grows to right.
 * - desktop xl: Note column is constrained, Index sidebar appears outside to the right.
 */
export function JournalPageShell({
  editor,
  index = [],
  activeSectionId,
  onScrollToSection,
  title,
  actions,
  timerOverlay,
  reviewOverlay,
  isTimerOpen = false,
  isReviewOpen = false,
  onCloseTimer,
  onCloseReview,
  className,
}: JournalPageShellProps) {
  // Use shallow:true + replace so scroll-driven IO updates don't trigger
  // full router re-renders (same fix as CanvasPage.tsx).
  const [activeId, setActiveId] = useQueryState('s', {
    defaultValue: activeSectionId ?? index[0]?.id ?? '',
    shallow: true,
    history: 'replace',
  });

  // Internal scroll tracking if not controlled
  useEffect(() => {
    if (index.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-10% 0px -40% 0px', threshold: [0, 0.3, 1.0] }
    );
    index.forEach(link => {
      const el = document.getElementById(link.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [index, setActiveId]);

  const scrollToSection = (id: string) => {
    onScrollToSection?.(id);
    setActiveId(id, { history: 'push' });
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className={cn('relative flex w-full min-h-screen justify-start items-start', className)}>
      {/* 
        Note Column — Constrained to 3xl max-width on large screens.
        Everything inside (Header + Editor) has the background and shadow.
      */}
      <div className="flex flex-col flex-1 min-w-0 3xl:max-w-7xl bg-background shadow-xl dark:shadow-none ring-1 ring-zinc-950/5 dark:ring-white/10 min-h-screen lg:rounded-[2.5rem]">
        {/* Sticky header — only sticky on desktop where main navbar is hidden */}
        <div className="lg:sticky lg:top-0 lg:z-30 lg:bg-background/80 lg:backdrop-blur-md pt-4 lg:pt-8">
          <div className="flex items-center justify-between px-6 lg:px-10">
            <div className="flex items-center gap-4 truncate">
              <div className="h-10 w-2 shrink-0 rounded-full bg-primary" />
              <h1 className="text-2xl md:text-4xl font-black tracking-tight text-foreground leading-none truncate">
                {title}
              </h1>
            </div>
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
              {actions}
            </div>
          </div>
          <hr role="presentation" className="mt-6 md:mt-8 w-full border-t border-border opacity-50" />
        </div>

        {/* Main Editor Content */}
        <main className="flex-1">
          {editor}
        </main>
      </div>

      {/* Index Sidebar Column — Outside the Note card, visible on Desktop XL */}
      {index.length > 0 && (
        <aside className="hidden 3xl:block w-80 shrink-0 sticky top-0 self-start max-h-screen overflow-y-auto p-10">
          <div className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 mb-6">
            On this page
          </div>
          <nav className="flex flex-col gap-1 border-l border-border/40 ml-1">
            {index.map((link) => (
              <div key={link.id} className="flex items-center group -ml-px">
                <button
                  onClick={() => { if (link.type !== 'wod') scrollToSection(link.id) }}
                  className={cn(
                    'flex-1 text-left px-4 py-2 text-sm transition-all border-l',
                    link.type === 'wod'
                      ? 'text-muted-foreground/70 border-transparent pl-6 text-xs cursor-default'
                      : activeId === link.id
                        ? 'font-bold text-foreground border-primary'
                        : 'text-muted-foreground hover:text-foreground border-transparent hover:border-border'
                  )}
                >
                  {link.label}
                </button>
                {link.onRun && (
                  <button
                    onClick={link.onRun}
                    title="Start workout"
                    className="opacity-0 group-hover:opacity-100 mr-2 flex items-center justify-center size-6 rounded text-primary hover:bg-primary/10 transition-all"
                  >
                    <PlayIcon className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          </nav>
        </aside>
      )}

      {/* Timer dialog overlay */}
      {isTimerOpen && timerOverlay && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
          <div className="w-full h-full flex flex-col">
            <div className="flex justify-end p-4">
              <button
                onClick={onCloseTimer}
                className="px-3 py-1.5 rounded-md text-sm font-bold text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted transition-colors"
              >
                Close
              </button>
            </div>
            <div className="flex-1 min-h-0">
              {timerOverlay}
            </div>
          </div>
        </div>
      )}

      {/* Review dialog overlay */}
      {isReviewOpen && reviewOverlay && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
          <div className="w-full h-full flex flex-col">
            <div className="flex justify-end p-4">
              <button
                onClick={onCloseReview}
                className="px-3 py-1.5 rounded-md text-sm font-bold text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted transition-colors"
              >
                Close
              </button>
            </div>
            <div className="flex-1 min-h-0">
              {reviewOverlay}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default JournalPageShell;
