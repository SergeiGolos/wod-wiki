import React from 'react'
import { cn } from '@/lib/utils'

/**
 * A single example tab. `anchor`/`badge` are optional (ADR-0010, Contrast
 * Effect): a tab marked `anchor` is the option the surface recommends. Anchor
 * styling only differentiates *inactive* tabs — an actively-selected tab always
 * wins on the `selected` branch, so the active-vs-anchor hierarchy is preserved.
 */
export interface ExampleTab {
  label: string
  /** Marks this tab as the recommended option (elevated styling when inactive). */
  anchor?: boolean
  /** Optional pill shown on the tab, e.g. "MOST POPULAR". */
  badge?: string
}

interface ExampleTabsProps {
  examples: Array<ExampleTab>
  activeIndex: number
  onSelect: (index: number) => void
}

export const ExampleTabs: React.FC<ExampleTabsProps> = ({
  examples,
  activeIndex,
  onSelect,
}) => {
  if (examples.length === 0) return null

  // The badge is a nudge, not a permanent fixture: once the user has made a
  // selection on a non-default tab, the anchor's badge has done its job. We
  // keep it simple and always render the badge on the anchor tab while it is
  // inactive (an actively-chosen anchor no longer needs the "recommended" hint).
  return (
    <div className="mt-6 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2 px-3 py-3">
        {examples.map((example, index) => {
          const selected = index === activeIndex
          const isAnchor = example.anchor === true && !selected
          const showBadge = Boolean(example.badge) && isAnchor
          return (
            <button
              key={`${example.label}-${index}`}
              type="button"
              onClick={() => onSelect(index)}
              aria-current={selected ? 'true' : undefined}
              className={cn(
                'relative rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition-all active:scale-95',
                selected
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : isAnchor
                    ? 'border border-brand bg-brand/5 text-brand-deep hover:bg-brand/10 dark:text-brand-light'
                    : 'border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {example.label}
              {showBadge ? (
                <span className="ml-2 inline-block rounded-pill bg-brand px-1.5 py-0.5 align-middle text-[8px] font-black leading-none tracking-[0.12em] text-background">
                  {example.badge}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
