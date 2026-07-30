/**
 * Variant A — "Horizontal compact rows"
 *
 * The palette is always visible as a horizontal compact row of clauses.
 * Each clause is a small, inline-editable row. Click to expand, click
 * another row to collapse. Up/Down navigates between rows.
 *
 * Structurally different from B and C: short, dense, fits in one
 * line of header height. Each clause row is a single line; the active
 * row expands to show its suggestion dropdown.
 */
import { QueryPalette } from './QueryPalette'
import type { QueryClause } from './queryClauses'

export function VariantA({ clauses, onChange }: { clauses: QueryClause[]; onChange: (c: QueryClause[]) => void }) {
  return (
    <div className="border-b border-border bg-background px-6 py-2" data-testid="variant-a">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">A — Vertical stack</span>
        <span className="text-[10px] text-muted-foreground/40">click to edit · ↑↓ to navigate</span>
      </div>
      <QueryPalette clauses={clauses} onChange={onChange} />
    </div>
  )
}
