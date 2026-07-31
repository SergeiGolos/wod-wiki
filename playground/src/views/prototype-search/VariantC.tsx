/**
 * Variant B3 — Omni Command Bar with Quick Keyboard Selection
 *
 * Thin prototype shell around the shared <WqlComposer /> organism
 * (src/components/organisms/wql-composer, issue #829), with live stage
 * counts wired through queryService.runFind (issue #832).
 */
import { WqlComposer, type QueryClause } from '@/components/organisms/wql-composer'
import { queryService, isFindQuery } from '@/services/analytics/query'

export function VariantC({
  clauses,
  onChange,
}: {
  clauses: QueryClause[]
  onChange: (c: QueryClause[]) => void
}) {
  return (
    <div className="border-b border-border bg-background/95 backdrop-blur px-6 py-3" data-testid="variant-b3">
      <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 mb-1.5 flex items-center justify-between">
        <span>B3 — Omni Command Bar with Quick Keyboard Selection</span>
        <span className="text-[9px] font-normal text-muted-foreground/50">Tab / Shift+Tab to jump slots · ↑↓ to choose · Type text + Enter</span>
      </div>

      <div className="max-w-3xl">
        <WqlComposer
          clauses={clauses}
          onClausesChange={onChange}
          execute={ast => (isFindQuery(ast) ? queryService.runFind(ast) : queryService.runQuery(ast.raw))}
        />
      </div>
    </div>
  )
}
