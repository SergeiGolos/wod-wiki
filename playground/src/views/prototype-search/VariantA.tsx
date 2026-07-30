/**
 * Variant A — Ultra-Compact Filter Pill Bar
 *
 * Dense, single-line horizontal filter bar. Target (note/block) & Scope
 * (journal/collections/feeds/all) sit on the left, active filter pills
 * wrap neatly in the middle, and "+ Filter" sits on the right.
 *
 * Space-efficient: 36px vertical footprint, ~80% height reduction.
 */
import { ClausePill, AddFilterDropdown } from './QueryPalette'
import {
  type QueryClause,
  type ClauseType,
  CLAUSE_META,
  TARGET_OPTIONS,
  SCOPE_OPTIONS,
} from './queryClauses'
import { cn } from '@/lib/utils'

export function VariantA({
  clauses,
  onChange,
}: {
  clauses: QueryClause[]
  onChange: (c: QueryClause[]) => void
}) {
  const updateClause = (idx: number, patch: Partial<QueryClause>) => {
    onChange(clauses.map((c, i) => (i === idx ? { ...c, ...patch } : c)))
  }

  const removeClause = (idx: number) => {
    onChange(clauses.filter((_, i) => i !== idx))
  }

  const addClause = (type: ClauseType) => {
    const meta = CLAUSE_META[type]
    const newClause: QueryClause = {
      id: `c-${Date.now()}-${Math.random()}`,
      type,
      label: meta.label,
      value: type === 'time' ? 'last 2w' : type === 'where' ? 'sum:totalVolume{} > 5000' : '',
      inputType: meta.inputType,
      placeholder: meta.placeholder,
    }
    onChange([...clauses, newClause])
  }

  const targetClauseIdx = clauses.findIndex(c => c.type === 'target')
  const scopeClauseIdx = clauses.findIndex(c => c.type === 'scope')

  const targetValue = targetClauseIdx >= 0 ? clauses[targetClauseIdx].value : 'note'
  const scopeValue = scopeClauseIdx >= 0 ? clauses[scopeClauseIdx].value : 'journal'

  const filterClauses = clauses.map((c, idx) => ({ clause: c, idx })).filter(item => item.clause.type !== 'target' && item.clause.type !== 'scope')

  return (
    <div className="border-b border-border bg-background/95 backdrop-blur px-4 py-2" data-testid="variant-a">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
        {/* Left: Target & Scope Pills */}
        <div className="flex items-center gap-1.5 shrink-0 border-r border-border/60 pr-3">
          {/* Target Toggle */}
          <div className="inline-flex rounded-md border border-border bg-muted/30 p-0.5 text-xs">
            {TARGET_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  if (targetClauseIdx >= 0) {
                    updateClause(targetClauseIdx, { value: opt.value })
                  } else {
                    onChange([{ id: 'c-target', type: 'target', ...CLAUSE_META.target, value: opt.value }, ...clauses])
                  }
                }}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] font-medium transition-colors select-none',
                  targetValue === opt.value
                    ? 'bg-background font-bold text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                data-testid={`variant-a-target-${opt.value}`}
              >
                {opt.value === 'note' ? '📝 Notes' : '📦 Blocks'}
              </button>
            ))}
          </div>

          {/* Scope Selector */}
          <div className="inline-flex rounded-md border border-border bg-muted/30 p-0.5 text-xs">
            {SCOPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  if (scopeClauseIdx >= 0) {
                    updateClause(scopeClauseIdx, { value: opt.value })
                  } else {
                    onChange([{ id: 'c-scope', type: 'scope', ...CLAUSE_META.scope, value: opt.value }, ...clauses])
                  }
                }}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] font-medium transition-colors select-none',
                  scopeValue === opt.value
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                data-testid={`variant-a-scope-${opt.value}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Middle: Active Filter Pills */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
          {filterClauses.map(({ clause, idx }) => (
            <ClausePill
              key={clause.id}
              clause={clause}
              onChange={patch => updateClause(idx, patch)}
              onRemove={() => removeClause(idx)}
              compact
            />
          ))}

          {/* Right: Add Filter Dropdown */}
          <AddFilterDropdown clauses={clauses} onAdd={addClause} />
        </div>
      </div>
    </div>
  )
}
