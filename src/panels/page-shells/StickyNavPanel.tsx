/**
 * StickyNavPanel Component
 *
 * Sticky navigation bar that tracks the currently active section
 * via scroll position. Supports two visual variants:
 * - 'hero-follow': floats below a hero banner
 * - 'top-fixed': pinned to the top of the viewport
 *
 * Each button is an INavActivation — the click is dispatched through
 * executeNavAction so all surfaces share the same action model.
 */

import { cn } from '@/lib/utils';
import { executeNavAction } from '@/nav/navTypes';
import type { INavActivation, NavActionDeps } from '@/nav/navTypes';

export type { INavActivation as StickyNavSection };

export interface StickyNavPanelProps {
  /** Activatable section items — id, label, and action to dispatch on click. */
  activations: INavActivation[];

  /** Currently active section id */
  activeSection: string;

  /** Visual variant */
  variant: 'hero-follow' | 'top-fixed';

  /**
   * Dependencies injected by the host page.
   * `scrollToSection` should handle any viewport offset required by the variant.
   */
  deps: NavActionDeps;

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
  activations,
  activeSection,
  variant,
  deps,
  className,
}: StickyNavPanelProps) {
  return (
    <nav
      className={cn(
        'lg:sticky z-20 flex items-center gap-1 px-4 py-2 bg-background/95 backdrop-blur-sm border-b border-border/50 overflow-x-auto',
        variant === 'top-fixed' ? 'lg:top-0' : 'lg:top-[104px]',
        className,
      )}
    >
      {activations.map((activation) => (
        <button
          key={activation.id}
          onClick={() => executeNavAction(activation.action, deps)}
          className={cn(
            'px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.12em] whitespace-nowrap transition-all ring-1',
            activeSection === activation.id
              ? 'bg-primary text-primary-foreground ring-primary/30 shadow-md'
              : 'bg-muted/50 text-muted-foreground ring-transparent hover:bg-muted hover:ring-border',
          )}
        >
          {activation.label}
        </button>
      ))}
    </nav>
  );
}

export default StickyNavPanel;
