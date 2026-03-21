/**
 * DocsPageShell Component
 *
 * Layout shell for documentation and tutorial pages.
 * Composes HeroBanner, StickyNavPanel, and ScrollSection primitives.
 * Sections with a runtimeFactory are wrapped in ScopedRuntimeProvider
 * for isolated interactive demos.
 */

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { DocsSection } from './types';
import { StickyNavPanel } from './StickyNavPanel';
import { ScopedRuntimeProvider } from './ScopedRuntimeProvider';

export interface DocsPageShellProps {
  /** Optional hero banner content */
  hero?: ReactNode;

  /** Page sections — each rendered as an anchor-navigable block */
  sections: DocsSection[];

  /** Additional CSS classes */
  className?: string;
}

/**
 * DocsPageShell
 *
 * ```
 * ┌──────────────────────────────────────────────────────┐
 * │  HeroBanner (optional)                               │
 * ├──────────────────────────────────────────────────────┤
 * │  StickyNavPanel (top-fixed)                          │
 * ├──────────────────────────────────────────────────────┤
 * │  Section[]  (each may have a ScopedRuntimeProvider)  │
 * └──────────────────────────────────────────────────────┘
 * ```
 *
 * Nav automatically tracks the active section via IntersectionObserver.
 */
export function DocsPageShell({
  hero,
  sections,
  className,
}: DocsPageShellProps) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? '');
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Track active section via IntersectionObserver
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          const id = visible[0].target.getAttribute('data-section-id');
          if (id) setActiveSection(id);
        }
      },
      { rootMargin: '-20% 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75] },
    );

    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const navSections = sections.map((s) => ({ id: s.id, label: s.label }));

  return (
    <div className={cn('flex flex-col min-h-screen bg-background', className)}>
      {/* Hero banner */}
      {hero}

      {/* Sticky navigation */}
      <StickyNavPanel
        sections={navSections}
        activeSection={activeSection}
        variant="top-fixed"
      />

      {/* Content sections */}
      <div className="flex-1">
        {sections.map((section) => {
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

          // Wrap in scoped runtime when a factory is provided
          if (section.runtimeFactory) {
            return (
              <ScopedRuntimeProvider
                key={section.id}
                factory={section.runtimeFactory}
              >
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

export default DocsPageShell;
