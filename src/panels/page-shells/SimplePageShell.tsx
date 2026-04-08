/**
 * SimplePageShell Component
 *
 * A basic layout shell for non-note pages (Home, Search, Calendar, etc.).
 * Provides the standard sticky header with title and actions.
 */

import React, { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useQueryState } from 'nuqs';

export interface SimplePageShellProps {
  /** Main content */
  children: ReactNode;

  /** Title shown in the sticky header */
  title: string;

  /** Page index links for navigation */
  index?: PageNavLink[];

  /** Active section ID in the index */
  activeSectionId?: string;

  /** Callback to scroll to a section */
  onScrollToSection?: (id: string) => void;

  /** Right-side actions (e.g. New Entry, Cast, etc.) */
  actions?: ReactNode;

  /**
   * Optional content rendered below the title row, inside the sticky header zone.
   * Useful for page-level controls like a week calendar strip.
   * On desktop it's part of the sticky header. On mobile it renders as its own sticky bar.
   */
  subheader?: ReactNode;

  /** Additional CSS classes */
  className?: string;
}

export function SimplePageShell({
  children,
  title,
  index = [],
  activeSectionId,
  onScrollToSection,
  actions,
  subheader,
  className,
}: SimplePageShellProps) {
  const [activeId, setActiveId] = useQueryState('s', {
    defaultValue: activeSectionId ?? index[0]?.id ?? '',
    shallow: false,
    history: 'push',
  });

  // Internal scroll tracking
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
    setActiveId(id);
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className={cn('relative flex w-full min-h-screen justify-start items-start', className)}>
      <div className="flex flex-col flex-1 min-w-0 3xl:max-w-7xl bg-background shadow-xl dark:shadow-none ring-1 ring-zinc-950/5 dark:ring-white/10 min-h-screen lg:rounded-[2.5rem]">
        {/* Sticky header — hidden on mobile (SidebarLayout navbar covers it), sticky on desktop */}
        <div className="hidden lg:block lg:sticky lg:top-0 lg:z-30 lg:bg-background/80 lg:backdrop-blur-md lg:pt-8">
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
          {subheader && <div className="mt-4">{subheader}</div>}
          <hr role="presentation" className="mt-4 md:mt-6 w-full border-t border-border opacity-50" />
        </div>

        {/* Subheader — mobile only: sticky bar below the SidebarLayout mobile navbar */}
        {subheader && (
          <div className="block lg:hidden sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50 py-2">
            {subheader}
          </div>
        )}

        <div className="flex-1">
          {children}
        </div>
      </div>

      {/* Index Sidebar Column — Outside the content card, visible on Desktop XL */}
      {index.length > 0 && (
        <aside className="hidden 3xl:block w-80 shrink-0 sticky top-0 self-start max-h-screen overflow-y-auto p-10">
          <div className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 mb-6">
            On this page
          </div>
          <nav className="flex flex-col gap-1 border-l border-border/40 ml-1">
            {index.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className={cn(
                  'text-left px-4 py-2 text-sm transition-all border-l -ml-px',
                  activeId === link.id
                    ? 'font-bold text-foreground border-primary'
                    : 'text-muted-foreground hover:text-foreground border-transparent hover:border-border'
                )}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </aside>
      )}
    </div>
  );
}

export default SimplePageShell;
