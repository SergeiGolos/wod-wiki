/**
 * StreamQueryBar — the single-line WQL query bar that lives IN the header
 * (Stitch redesign, `prototypes/header-query-bar/`).
 *
 * Desktop: the shared WqlComposer in compact mode IS the bar — kind, target
 * and Where-stored scope chips with one searchable picker; favorites
 * (`scopeOptions`) prioritize choices without ever defining validity. There
 * is no header-local parser, draft text or separate scope dropdown. The full
 * query dialog stays reachable through the View menu and the global
 * ⌘K palette; Apply writes the composed WQL back through `onQueryChange`
 * (URL `?q=` follows).
 *
 * `compact` (mobile) renders the summary row that portals into the app
 * navbar: tapping opens the shared palette dialog (view settings lives in
 * the mobile dock, owned by ResponsiveActions).
 */

import { useCallback } from 'react'
import { ChevronUp, Search } from 'lucide-react'
import { WqlComposer, type WqlExecutor } from '@bitcobblers/wod-wiki-ui'
import { cn } from '@/lib/utils'
import { usePaletteStore } from '@/components/organisms/command-palette/palette-store'
import { wqlSearchSource } from '../../services/wqlSearchSource'

export interface StreamQueryBarProps {
  /** The controlled WQL string (the composer query state). */
  query: string
  onQueryChange: (wql: string) => void
  /** Where-stored scope favorites for this route (streamProfile.scopeOptions)
   *  — picker sort priority only, never a validity filter. */
  scopeOptions: readonly string[]
  /** Stage-count executor handed to the palette composer. */
  execute: WqlExecutor
  /** The route's default WQL — composer guidance and the compact dock's
   *  summary when the draft is empty (actual profile default, not a slogan). */
  defaultQuery?: string
  /** Compact (mobile) variant — summary line instead of the composer. */
  compact?: boolean
  className?: string
}

/** Open the shared query dialog (palette WQL mode) on `query`; Apply writes
 *  the composed WQL through `onApply`. Also the ViewSettingsDialog "Edit
 *  query" action. */
export function openStreamQueryEditor(
  query: string,
  execute: WqlExecutor,
  onApply: (wql: string) => void,
): void {
  void usePaletteStore.getState().open({
    placeholder: 'Craft the query…',
    wql: { initialQuery: query, execute, onApply },
    sources: [wqlSearchSource()],
  })
}

export function StreamQueryBar({
  query,
  onQueryChange,
  scopeOptions,
  execute,
  defaultQuery,
  compact = false,
  className,
}: StreamQueryBarProps) {
  const openEditor = useCallback(
    () => openStreamQueryEditor(query, execute, onQueryChange),
    [query, execute, onQueryChange],
  )

  if (compact) {
    // Mobile thumb-footer button row — one native button control (48px
    // target) that opens the WQL palette. Same border token as the desktop
    // composer box so both variants read as one chrome. An empty draft
    // summarizes the route's actual default query.
    return (
      <button
        type="button"
        data-testid="stream-query-bar"
        onClick={openEditor}
        className={cn(
          'flex min-h-12 w-full cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3 text-left shadow-xs transition-colors hover:bg-muted/70',
          className,
        )}
      >
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span
          data-testid="stream-query-summary"
          className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground"
        >
          {query || defaultQuery || 'Filter or search…'}
        </span>
        <ChevronUp className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    )
  }

  return (
    <div
      data-testid="stream-query-bar"
      className={cn('flex min-w-0 flex-1 items-center gap-1 text-xs', className)}
    >
      {/* Shared composer — same parsing, catalog and searchable picker as the
          dialog; the header has no separate draft text or scope menu. No
          defaultQuery here: the route default would render the composer's
          "Example WQL" line in the sticky header. The mobile compact summary
          below still uses it when the draft is empty. */}
      <WqlComposer
        query={query}
        onQueryChange={onQueryChange}
        compact
        showDiagnostics={false}
        preferredChoices={scopeOptions}
        placeholder="Filter or search…"
        className="min-w-0 flex-1"
      />
    </div>
  )
}
