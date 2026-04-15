/**
 * CanvasPage
 *
 * Unified layout shell for all scroll-parallax pages.
 * Consolidates SimplePageShell (title-bar mode) and DocsPageShell
 * (StickyNavPanel mode) into a single component.
 *
 * ## Title-bar mode  (provide `title`)
 * ```
 * ┌──────────────────────────────────────────┐
 * │  [title]               [actions]  (z-30) │ ← lg:sticky, hidden on mobile
 * │  [subheader?]                            │
 * │  <hr>                                    │
 * ├──────────────────────────────────────────┤
 * │  [subheader?] (mobile sticky, z-10)      │ ← block lg:hidden
 * ├──────────────────────────────────────────┤
 * │  children                                │
 * └──────────────────────────────────────────┘
 * ```
 *
 * ## Sections mode  (provide `sections` without `title`)
 * ```
 * ┌──────────────────────────────────────────┐
 * │  [hero?]  (scrolls away)                 │
 * ├──────────────────────────────────────────┤
 * │  StickyNavPanel  (z-20)                  │ ← lg:sticky top-0
 * ├──────────────────────────────────────────┤
 * │  section[]  (ScopedRuntimeProvider opt.) │
 * └──────────────────────────────────────────┘
 * ```
 */

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useQueryState } from 'nuqs';
import { PlayIcon } from '@heroicons/react/20/solid';
import type { PageNavLink } from '@/components/playground/PageNavDropdown';
import type { DocsSection } from './types';
import { PAGE_SHELL_CONTENT_SURFACE_CLASS } from './contentSurface';
import { StickyNavPanel } from './StickyNavPanel';
import { ScopedRuntimeProvider } from './ScopedRuntimeProvider';
import type { NavActionDeps } from '@/nav/navTypes';

export interface CanvasPageProps {
  // ── Title-bar mode ──────────────────────────────────────────────────────
  /** Title shown in the sticky header bar (enables title-bar mode). */
  title?: string;
  /** Right-side actions (e.g. New Entry, Cast, Audio toggle). */
  actions?: ReactNode;
  /**
   * Content rendered below the title row inside the sticky zone.
   * On mobile it becomes its own sticky bar below the SidebarLayout navbar.
   */
  subheader?: ReactNode;
  /** Arbitrary content for title-bar mode. */
  children?: ReactNode;
  /** Page index for the right-side TOC sidebar (visible at 3xl+). */
  index?: PageNavLink[];
  /** Controlled active section (synced to `?s=` query param). */
  activeSectionId?: string;
  /** Callback when a TOC link is clicked. */
  onScrollToSection?: (id: string) => void;

  // ── Sections mode ───────────────────────────────────────────────────────
  /** Hero banner rendered above the sticky nav (scrolls away). */
  hero?: ReactNode;
  /** Typed sections — enables StickyNavPanel mode when `title` is absent. */
  sections?: DocsSection[];

  // ── Shared ──────────────────────────────────────────────────────────────
  /** Additional CSS classes on the outer wrapper. */
  className?: string;
}

export function CanvasPage({
  title,
  actions,
  subheader,
  children,
  index = [],
  activeSectionId,
  onScrollToSection,
  hero,
  sections,
  className,
}: CanvasPageProps) {
  const hasSections = !!(sections && sections.length > 0);
  const useStickyNavMode = hasSections && !title;

  // ── Title-bar mode: URL-synced active section ──────────────────────────
  // shallow:true avoids full router re-renders on scroll-driven updates.
  // Observer-driven writes use 'replace' (no history entry per scroll step);
  // explicit TOC clicks use 'push' (preserves browser Back navigation).
  const [activeId, setActiveId] = useQueryState('s', {
    defaultValue: activeSectionId ?? index[0]?.id ?? '',
    shallow: true,
    history: 'replace',
  });

  // Ref set during programmatic smooth-scroll; suppresses observer-driven
  // active-section updates until the target section actually becomes visible.
  // Cleared by a timeout (smooth scroll typically finishes within 800 ms).
  const programmaticScrollTargetRef = useRef<string | null>(null);
  const programmaticScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending programmatic-scroll timeout on unmount to avoid stray timers.
  useEffect(() => {
    return () => {
      if (programmaticScrollTimeoutRef.current !== null)
        clearTimeout(programmaticScrollTimeoutRef.current);
    };
  }, []);

  // ── Sections mode: local active section tracking ───────────────────────
  const [activeSection, setActiveSection] = useState(sections?.[0]?.id ?? '');
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // IntersectionObserver — title-bar mode (tracks index links by element id).
  // Uses a persistent ratioMap so the winner is the most-visible of ALL currently
  // intersecting sections, not just the batch in the current callback — prevents
  // oscillation when multiple threshold crossings fire in quick succession.
  // Observer-driven writes are suppressed during programmatic smooth-scroll until
  // the target section becomes most-visible (prevents nav flicker mid-animation).
  useEffect(() => {
    if (useStickyNavMode || index.length === 0) return;
    const ratioMap = new Map<string, number>();
    const lastActiveRef = { current: '' };
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) ratioMap.set(e.target.id, e.intersectionRatio);
          else ratioMap.delete(e.target.id);
        });
        let bestId = '';
        let bestRatio = -1;
        ratioMap.forEach((ratio, id) => {
          if (ratio > bestRatio) { bestRatio = ratio; bestId = id; }
        });
        if (!bestId || bestId === lastActiveRef.current) return;
        // During programmatic scroll, only allow the target section to win.
        const target = programmaticScrollTargetRef.current;
        if (target && bestId !== target) return;
        lastActiveRef.current = bestId;
        setActiveId(bestId);
      },
      { rootMargin: '-10% 0px -40% 0px', threshold: [0, 0.3, 1.0] },
    );
    index.forEach((link) => {
      const el = document.getElementById(link.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [index, setActiveId, useStickyNavMode]);

  // IntersectionObserver — sections mode (tracks section divs via refs).
  // Same ratioMap pattern to prevent oscillation.
  useEffect(() => {
    if (!useStickyNavMode) return;
    const ratioMap = new Map<string, number>();
    const lastActiveRef = { current: '' };
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const id = e.target.getAttribute('data-section-id') ?? '';
          if (e.isIntersecting) ratioMap.set(id, e.intersectionRatio);
          else ratioMap.delete(id);
        });
        let bestId = '';
        let bestRatio = -1;
        ratioMap.forEach((ratio, id) => {
          if (ratio > bestRatio) { bestRatio = ratio; bestId = id; }
        });
        if (bestId && bestId !== lastActiveRef.current) {
          lastActiveRef.current = bestId;
          setActiveSection(bestId);
        }
      },
      { rootMargin: '-20% 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75] },
    );
    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections, useStickyNavMode]);

  const scrollToSection = (id: string) => {
    onScrollToSection?.(id);
    // Push history for explicit user clicks (preserves browser Back navigation).
    setActiveId(id, { history: 'push' });
    // Suppress observer-driven updates until smooth scroll completes so the nav
    // highlight doesn't flicker through intermediate sections during animation.
    if (programmaticScrollTimeoutRef.current !== null)
      clearTimeout(programmaticScrollTimeoutRef.current);
    programmaticScrollTargetRef.current = id;
    programmaticScrollTimeoutRef.current = setTimeout(() => {
      programmaticScrollTargetRef.current = null;
    }, 900);
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // ── Sections mode render ───────────────────────────────────────────────
  if (useStickyNavMode) {
    const stickyActivations = sections!.map((s) => ({
      id: s.id,
      label: s.label,
      action: { type: 'scroll' as const, sectionId: s.id },
    }))

    const stickyDeps: NavActionDeps = {
      navigate: () => { /* sections mode doesn't navigate */ },
      setQueryParam: () => { /* sections mode doesn't update query */ },
      scrollToSection: (id: string) => {
        const el = document.getElementById(id)
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 64
          window.scrollTo({ top: y, behavior: 'smooth' })
        }
      },
    }

    return (
      <div className={cn('flex flex-col min-h-screen bg-background', className)}>
        {hero}
        <StickyNavPanel
          activations={stickyActivations}
          activeSection={activeSection}
          variant="top-fixed"
          deps={stickyDeps}
        />
        <div className="flex-1">
          {sections!.map((section) => {
            const content = (
              <div
                key={section.id}
                id={section.id}
                data-section-id={section.id}
                ref={(el) => {
                  if (el) sectionRefs.current.set(section.id, el);
                }}
                className="py-12 lg:py-16 px-6 lg:px-10 border-b border-border/30"
              >
                {section.content}
              </div>
            );
            if (section.runtimeFactory) {
              return (
                <ScopedRuntimeProvider key={section.id} factory={section.runtimeFactory}>
                  {content}
                </ScopedRuntimeProvider>
              );
            }
            return content;
          })}
        </div>
      </div>
    );
  }

  // ── Title-bar mode render ──────────────────────────────────────────────
  return (
    <div className={cn('relative flex w-full min-h-screen justify-start items-start', className)}>
      <div className={cn(
        'flex flex-col flex-1 min-w-0 3xl:max-w-7xl min-h-screen lg:rounded-[2.5rem]',
        PAGE_SHELL_CONTENT_SURFACE_CLASS,
      )}>
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
          <div className="block lg:hidden sticky top-[60px] sm:top-14 z-10 bg-background/95 backdrop-blur-md border-b border-border/50 py-2">
            {subheader}
          </div>
        )}

        <div className="flex-1">
          {children}
        </div>
      </div>

      {/* TOC Sidebar — outside the content card, visible at Desktop XL+ */}
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
                    onClick={(e) => { e.stopPropagation(); link.onRun?.(); }}
                    title="View workout"
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
    </div>
  );
}

export default CanvasPage;
