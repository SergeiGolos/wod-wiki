/**
 * SearchNavPanel — L2 context panel for the Search L1 item.
 *
 * Scope radio: All | Collections | Notes | Results
 * Dispatches SET_SEARCH_SCOPE to update navState.searchFilter.scope.
 * The SearchPage reads this scope to filter query results.
 */

import { cn } from '@/lib/utils'
import type { NavPanelProps, SearchFilterState } from '../navTypes'

const SCOPES: { value: SearchFilterState['scope']; label: string }[] = [
  { value: 'all',         label: 'All' },
  { value: 'collections', label: 'Collections' },
  { value: 'notes',       label: 'Notes' },
  { value: 'results',     label: 'Results' },
]

export function SearchNavPanel({ navState, dispatch }: NavPanelProps) {
  const { scope } = navState.searchFilter

  return (
    <div className="flex flex-col gap-1 px-2 py-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
        Search in
      </div>

      {SCOPES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => dispatch({ type: 'SET_SEARCH_SCOPE', scope: value })}
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left',
            scope === value
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {/* Radio indicator */}
          <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full border border-current">
            {scope === value && (
              <span className="size-1.5 rounded-full bg-primary" />
            )}
          </span>
          {label}
        </button>
      ))}
    </div>
  )
}
