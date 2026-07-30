/**
 * Variant C — Visual Statement Builder (Datadog/Grafana style)
 *
 * Structured visual sentence builder mapping 1-to-1 with canonical WQL syntax:
 *   FIND <target> IN <scope> WINDOW <last>
 *   FILTERS { ... }
 *   WHERE <metric_predicate>
 *
 * Space-efficient: 60px low-profile visual statement editor.
 */
import { ClausePill, AddFilterDropdown } from './QueryPalette'
import {
  type QueryClause,
  type ClauseType,
  CLAUSE_META,
  TARGET_OPTIONS,
  SCOPE_OPTIONS,
  TIME_OPTIONS,
} from './queryClauses'

export function VariantC({
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
  const timeClauseIdx = clauses.findIndex(c => c.type === 'time')
  const whereClauseIdx = clauses.findIndex(c => c.type === 'where')

  const targetValue = targetClauseIdx >= 0 ? clauses[targetClauseIdx].value : 'note'
  const scopeValue = scopeClauseIdx >= 0 ? clauses[scopeClauseIdx].value : 'journal'
  const timeValue = timeClauseIdx >= 0 ? clauses[timeClauseIdx].value : 'last 2w'
  const whereClause = whereClauseIdx >= 0 ? clauses[whereClauseIdx] : null

  const filterClauses = clauses.map((c, idx) => ({ clause: c, idx })).filter(item => item.clause.type !== 'target' && item.clause.type !== 'scope' && item.clause.type !== 'time' && item.clause.type !== 'where')

  return (
    <div className="border-b border-border bg-background/95 backdrop-blur px-6 py-3 space-y-2" data-testid="variant-c">
      {/* Statement Row 1: Target, Scope, Time Window */}
      <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
        <span className="font-black text-amber-500 uppercase tracking-widest text-[10px]">FIND</span>
        <select
          value={targetValue}
          onChange={e => {
            if (targetClauseIdx >= 0) {
              updateClause(targetClauseIdx, { value: e.target.value })
            } else {
              onChange([{ id: 'c-target', type: 'target', ...CLAUSE_META.target, value: e.target.value }, ...clauses])
            }
          }}
          className="rounded-md border border-border bg-muted/30 px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          data-testid="variant-c-target-select"
        >
          {TARGET_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.value} ({o.label})</option>
          ))}
        </select>

        <span className="font-black text-amber-500 uppercase tracking-widest text-[10px] ml-1">IN</span>
        <select
          value={scopeValue}
          onChange={e => {
            if (scopeClauseIdx >= 0) {
              updateClause(scopeClauseIdx, { value: e.target.value })
            } else {
              onChange([{ id: 'c-scope', type: 'scope', ...CLAUSE_META.scope, value: e.target.value }, ...clauses])
            }
          }}
          className="rounded-md border border-border bg-muted/30 px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          data-testid="variant-c-scope-select"
        >
          {SCOPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.value} ({o.label})</option>
          ))}
        </select>

        <span className="font-black text-amber-500 uppercase tracking-widest text-[10px] ml-1">TIME</span>
        <select
          value={timeValue}
          onChange={e => {
            if (timeClauseIdx >= 0) {
              updateClause(timeClauseIdx, { value: e.target.value })
            } else {
              onChange([...clauses, { id: 'c-time', type: 'time', ...CLAUSE_META.time, value: e.target.value }])
            }
          }}
          className="rounded-md border border-border bg-muted/30 px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          data-testid="variant-c-time-select"
        >
          {TIME_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Statement Row 2: Filters */}
      <div className="flex items-center gap-1.5 flex-wrap text-xs">
        <span className="font-black text-muted-foreground/60 uppercase tracking-widest text-[10px] select-none">{'{'}</span>
        {filterClauses.length === 0 && (
          <span className="text-[11px] text-muted-foreground/40 italic">no tag filters</span>
        )}
        {filterClauses.map(({ clause, idx }) => (
          <ClausePill
            key={clause.id}
            clause={clause}
            onChange={patch => updateClause(idx, patch)}
            onRemove={() => removeClause(idx)}
            compact
          />
        ))}
        <span className="font-black text-muted-foreground/60 uppercase tracking-widest text-[10px] select-none">{'}'}</span>

        <AddFilterDropdown clauses={clauses} onAdd={addClause} />
      </div>

      {/* Optional Statement Row 3: Where Metric Predicate Join */}
      {whereClause && (
        <div className="flex items-center gap-2 text-xs font-mono pt-1 border-t border-border/40">
          <span className="font-black text-violet-500 uppercase tracking-widest text-[10px]">WHERE JOIN</span>
          <ClausePill
            clause={whereClause}
            onChange={patch => updateClause(whereClauseIdx, patch)}
            onRemove={() => removeClause(whereClauseIdx)}
            compact
          />
        </div>
      )}
    </div>
  )
}
