import { Link } from 'react-router-dom'
import { telemetry, HOME_EVENTS } from '@/services/telemetry'
import { CONSTRUCT_GRID_CELLS, getConstructByGridCell } from '../services/constructSource'
import { cn } from '@/lib/utils'

export function TourReferenceSection() {
  // Opens the global search palette via the same keyboard path App.tsx
  // listens for (⌘/Ctrl + '/'), so there is exactly one palette wiring.
  const openPalette = () => {
    telemetry.record(HOME_EVENTS.referenceOpened)
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: '/', metaKey: true, cancelable: true }),
    )
  }

  return (
    <section
      data-testid="tour-reference"
      className="mx-auto max-w-5xl px-6 py-16"
    >
      <h2 className="text-2xl font-bold tracking-tight">Quick Reference</h2>
      <p className="mt-3 text-lg text-muted-foreground">
        Look it up in seconds.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border font-mono text-xs md:grid-cols-4">
        {CONSTRUCT_GRID_CELLS.map((c, i) => {
          const item = getConstructByGridCell(c)
          // 15 cells in a 2-/4-col grid leave one trailing slot; spanning the
          // last cell fills both layouts so the grid border can't show through
          // as an empty shaded cell.
          const isLast = i === CONSTRUCT_GRID_CELLS.length - 1
          return (
            <Link
              key={c}
              to={item?.gridRoute ?? '/guide/syntax/cheatsheet'}
              onClick={() => telemetry.record(HOME_EVENTS.referenceOpened)}
              className={cn(
                'bg-card px-3 py-2 transition-colors hover:bg-muted hover:text-primary',
                isLast && 'col-span-2',
              )}
            >
              {c}
            </Link>
          )
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={openPalette}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Search everything (&#8984;/)
        </button>
        <Link
          to="/guide/syntax/cheatsheet"
          onClick={() => telemetry.record(HOME_EVENTS.referenceOpened)}
          className="text-sm text-primary underline-offset-2 hover:underline"
        >
          Open the cheat sheet
        </Link>
      </div>
    </section>
  )
}
