/**
 * ExplorerCommandBar — the Metric Explorer's single command bar (issue #897,
 * prototype variant C): the examples combo box and the WQL composer (Run
 * lives in the composer's own custom slot) in one wrapping row. On narrow
 * screens the row wraps with the combo above the input.
 *
 * Stateless presentational shell — all state stays in the page. The combo is
 * hydrated from the canonical `EXAMPLE_QUERIES` catalog; the page tells it
 * which example (if any) the live draft still matches, so the label falls
 * back to "Examples…" as soon as the user edits the query manually.
 *
 * Hand-rolled popover (same idiom as ExplorerOptionsMenu) — Radix layers
 * misfire in this repo's jsdom env.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EXAMPLE_QUERIES, type ExampleQuery } from '@/utils/analytics/explorerQueries'

export interface ExplorerCommandBarProps {
  /** The example the live draft still matches — labels the combo and marks
   * it in the menu. Undefined shows the "Examples…" placeholder (initially,
   * and again after any manual edit). Derived in the page: clause
   * round-tripping normalizes the catalog WQL (empty `{}` braces drop), so
   * raw string equality against the draft misfires.
   */
  active?: ExampleQuery
  /** Hydrate the composer from an example and run it. */
  onRunExample: (wql: string) => void
  /** The query input — the shared WqlComposer with Run in its custom slot. */
  children: ReactNode
}

export function ExplorerCommandBar({ active, onRunExample, children }: ExplorerCommandBarProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="flex flex-wrap items-start gap-2">
      <div ref={rootRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          data-testid="explorer-examples"
          aria-expanded={open}
          className={cn(
            'flex items-center gap-1.5 min-h-[46px] rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors',
            open
              ? 'border-primary/60 text-primary bg-primary/10'
              : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          <Sparkles className="size-3.5" />
          {active?.label ?? 'Examples…'}
          <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div
            className="absolute left-0 top-full z-40 mt-1 w-72 rounded-xl border border-border bg-card shadow-xl p-1.5"
            data-testid="explorer-examples-menu"
          >
            <div className="max-h-72 overflow-y-auto">
              {EXAMPLE_QUERIES.map(ex => (
                <button
                  key={ex.query}
                  type="button"
                  title={ex.question}
                  onClick={() => {
                    onRunExample(ex.query)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                    active?.query === ex.query
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-foreground hover:bg-muted',
                  )}
                >
                  <span className="w-3.5 shrink-0 text-primary">
                    {active?.query === ex.query ? <Check className="size-3.5" /> : null}
                  </span>
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-[280px]">{children}</div>
    </div>
  )
}
