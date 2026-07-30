/**
 * Variant A — "Source Tabs + Guided Filters"
 *
 * A segmented control at the top picks ONE source (Note / Session / Post).
 * Below it, context-aware controls adapt to the selected source:
 *   Note:    text search + date range + tag chips
 *   Session: text search + catalog dropdown + discipline filter
 *   Post:    text search + date range + feed source
 *
 * The WQL query is composed silently — no syntax visible to the user.
 */
import { useState } from 'react'
import { Search as SearchIcon, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type SearchState,
  type SearchSource,
  SOURCE_META,
} from './shared'

const CATALOGS = [
  { id: 'crossfit-girls', name: 'CrossFit Girls' },
  { id: 'dan-john-40-day', name: 'Dan John 40-Day' },
  { id: 'ZombieFit-org-2009-Dec', name: 'ZombieFit Dec 2009' },
  { id: 'swimming-college', name: 'Swimming College' },
]

const DISCIPLINES = ['Strength', 'Conditioning', 'Endurance', 'Gymnastics', 'Rowing', 'Swimming']
const TAGS = ['PR', 'Benchmark', 'Competition', 'Long', 'Short', 'Heavy']

export function VariantA({ state, onChange }: { state: SearchState; onChange: (s: SearchState) => void }) {
  const source = state.source
  const meta = SOURCE_META[source]

  const setSource = (s: SearchSource) => onChange({ ...state, source: s, filters: [] })
  const setText = (text: string) => onChange({ ...state, text })
  const addFilter = (key: string, label: string, value: string) =>
    onChange({ ...state, filters: [...state.filters, { key, label, value }] })
  const removeFilter = (idx: number) =>
    onChange({ ...state, filters: state.filters.filter((_, i) => i !== idx) })

  return (
    <div className="border-b border-border bg-background" data-testid="variant-a">
      {/* Row 1: Source segmented control */}
      <div className="flex items-center gap-2 px-6 pt-3">
        <div className="inline-flex rounded-lg border border-border overflow-hidden" data-testid="source-segmented">
          {(Object.keys(SOURCE_META) as SearchSource[]).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSource(s)}
              className={cn(
                'px-4 py-1.5 text-sm font-medium transition-colors',
                source === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              {SOURCE_META[s].icon} {SOURCE_META[s].label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground/60">{meta.description}</span>
      </div>

      {/* Row 2: Context-aware controls */}
      <div className="flex flex-wrap items-center gap-2 px-6 py-2.5">
        {/* Text search — always present */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={state.text}
            onChange={e => setText(e.target.value)}
            placeholder={`Search ${meta.label.toLowerCase()}…`}
            className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {/* Source-specific filters */}
        {source === 'note' && (
          <>
            <FilterDropdown
              label="Date"
              options={['Today', 'Past week', 'Past month', 'Past 3 months', 'All time']}
              onSelect={opt => addFilter('last', 'Date', opt)}
            />
            <FilterDropdown
              label="Tag"
              options={TAGS}
              onSelect={opt => addFilter('tags', 'Tag', opt)}
            />
          </>
        )}

        {source === 'session' && (
          <>
            <FilterDropdown
              label="Catalog"
              options={CATALOGS.map(c => c.name)}
              onSelect={opt => addFilter('catalog', 'Catalog', opt)}
            />
            <FilterDropdown
              label="Discipline"
              options={DISCIPLINES}
              onSelect={opt => addFilter('discipline', 'Discipline', opt)}
            />
          </>
        )}

        {source === 'post' && (
          <>
            <FilterDropdown
              label="Date"
              options={['Past week', 'Past month', 'Past 3 months', 'All time']}
              onSelect={opt => addFilter('last', 'Date', opt)}
            />
            <FilterDropdown
              label="Feed"
              options={['CrossFit Programming', 'Dan John 40-Day']}
              onSelect={opt => addFilter('catalog', 'Feed', opt)}
            />
          </>
        )}
      </div>

      {/* Row 3: Active filter chips */}
      {state.filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-6 pb-2">
          {state.filters.map((f, idx) => (
            <button
              key={`${f.key}:${f.value}:${idx}`}
              type="button"
              onClick={() => removeFilter(idx)}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium px-2 py-0.5 hover:bg-primary/20 transition-colors"
            >
              {f.label}: {f.value}
              <X className="size-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function FilterDropdown({ label, options, onSelect }: { label: string; options: string[]; onSelect: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
      >
        {label}
        <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 min-w-[160px] rounded-md border border-border bg-background shadow-lg py-1">
            {options.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => { onSelect(opt); setOpen(false) }}
                className="block w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors"
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
