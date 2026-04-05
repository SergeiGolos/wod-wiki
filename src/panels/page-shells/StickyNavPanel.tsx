/**
 * StickyNavPanel Component
 *
 * Sticky navigation bar that tracks the currently active section
 * via scroll position. Supports two visual variants:
 * - 'hero-follow': floats below a hero banner
 * - 'top-fixed': pinned to the top of the viewport
 */

import { cn } from '@/lib/utils';

export interface StickyNavSection {
  /** Unique section identifier (matches anchor id) */
  id: string;

  /** Display label */
  label: string;
}

export interface StickyNavPanelProps {
  /** Available sections */
  sections: StickyNavSection[];

  /** Currently active section id */
  activeSection: string;

  /** Visual variant */
  variant: 'hero-follow' | 'top-fixed';

  /** Click handler for section navigation */
  onSectionClick?: (id: string) => void;

  /** Additional CSS classes */
  className?: string;
}

/**
 * StickyNavPanel — horizontal section navigation.
 *
 * Renders a row of section buttons with an active-state indicator.
 * Stays fixed at the top of the viewport (top-fixed) or floats
 * below a hero banner (hero-follow).
 */
export function StickyNavPanel({
  sections,
  activeSection,
  variant,
  onSectionClick,
  className,
}: StickyNavPanelProps) {
  const handleClick = (id: string) => {
    onSectionClick?.(id);
    const el = document.getElementById(id);
    if (el) {
      const offset = variant === 'top-fixed' ? 64 : 120;
      const y = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <nav
      className={cn(
        'lg:sticky z-20 flex items-center gap-1 px-4 py-2 bg-background/95 backdrop-blur-sm border-b border-border/50 overflow-x-auto',
        variant === 'top-fixed' ? 'lg:top-0' : 'lg:top-[104px]',
        className,
      )}
    >
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => handleClick(section.id)}
          className={cn(
            'px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.12em] whitespace-nowrap transition-all ring-1',
            activeSection === section.id
              ? 'bg-primary text-primary-foreground ring-primary/30 shadow-md'
              : 'bg-muted/50 text-muted-foreground ring-transparent hover:bg-muted hover:ring-border',
          )}
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}

export default StickyNavPanel;
