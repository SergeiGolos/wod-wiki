/**
 * SourceScopeRadio — the Library's "what are we searching" selector.
 *
 * Owns the `source` head clause's UI so the WqlComposer doesn't have to
 * (the composer keeps the clause in its model for WQL compile and
 * diagnostics, but hides the pill via `hiddenClauseTypes`).
 *
 * Vocabulary mapping (WQL sources, decision #836):
 *   All         → 'notes'       (find:note in all — every source)
 *   Collections → 'collections'
 *   Feeds       → 'feeds'
 *   Notes       → 'journal'     (your training log)
 *
 * Sources outside the four scopes (blocks, metrics — reachable via a typed
 * URL query) select nothing; picking a scope re-bases the clause list.
 */
import { cn } from '@/lib/utils'

export type LibraryScope = 'all' | 'collections' | 'feeds' | 'notes'

/** Scope → WQL source value. */
export const SOURCE_BY_SCOPE: Record<LibraryScope, string> = {
  all: 'notes',
  collections: 'collections',
  feeds: 'feeds',
  notes: 'journal',
}

/** WQL source value → scope; exotic sources (blocks/metrics) have no scope. */
export const SCOPE_BY_SOURCE: Record<string, LibraryScope> = {
  notes: 'all',
  collections: 'collections',
  feeds: 'feeds',
  journal: 'notes',
}

const SCOPE_LABELS: Record<LibraryScope, string> = {
  all: 'All',
  collections: 'Collections',
  feeds: 'Feeds',
  notes: 'Notes',
}

const SCOPE_ORDER: LibraryScope[] = ['all', 'collections', 'feeds', 'notes']

export interface SourceScopeRadioProps {
  /** Currently selected scope; undefined when the source is exotic. */
  scope: LibraryScope | undefined
  onChange: (scope: LibraryScope) => void
}

export function SourceScopeRadio({ scope, onChange }: SourceScopeRadioProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Search scope"
      data-testid="library-source-scope"
      className="flex items-center gap-1"
    >
      {SCOPE_ORDER.map(option => {
        const selected = scope === option
        return (
          <label
            key={option}
            data-testid={`library-scope-${option}`}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer transition-colors select-none',
              selected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <input
              type="radio"
              name="library-source-scope"
              value={option}
              checked={selected}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {SCOPE_LABELS[option]}
          </label>
        )
      })}
    </div>
  )
}
