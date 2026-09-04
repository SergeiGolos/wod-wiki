/**
 * StreamQueryBar — the single-line WQL query bar that lives IN the header
 * (Stitch redesign, `prototypes/header-query-bar/`).
 *
 * One line, three zones:
 *   [data-type ▾]  [query chips … +N]  [⌘K]
 *
 * - The type selector states what kind of data the page returns and pivots
 *   the query's head clause through `pivotSourceQuery` (notes / journal /
 *   collections / feeds / blocks / efforts / rows).
 * - Chips are the committed filters + time window. Chips that don't fit the
 *   bar collapse behind a `+N` chip. ✕ removes a chip in place.
 * - Everything else — crafting, adding filters, overflow detail — opens the
 *   command palette in WQL mode seeded with the current query; Apply writes
 *   the composed WQL back through `onQueryChange` (URL `?q=` follows).
 *
 * `compact` (mobile) renders the bar that portals into the app navbar:
 * type pill + truncated WQL + optional view-settings; tapping opens the
 * same palette dialog.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, Clock3, Command, SlidersHorizontal } from 'lucide-react'
import { parseQuery, type QueryWindow } from '@bitcobblers/wod-wiki-engine'
import { SOURCE_OPTIONS, type WqlExecutor } from '@bitcobblers/wod-wiki-ui'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/atoms/primitives/dropdown-menu'
import { usePaletteStore } from '@/components/organisms/command-palette/palette-store'
import { wqlSearchSource } from '../../services/wqlSearchSource'
import { pivotSourceQuery, sourceOfQuery, withoutFilterIndex, withoutWindow } from '../../lib/wqlEdits'

/** Semantic dot hue per source plane (Mineral Arctic metric hues). */
const SOURCE_DOT: Record<string, string> = {
  notes: '#375f85',
  journal: '#508860',
  collections: '#7C62A0',
  feeds: '#5980A8',
  blocks: '#A87040',
  efforts: '#948030',
  metrics: '#5980A8',
  rows: '#A05858',
}

const SOURCE_LABEL: Record<string, string> = Object.fromEntries(
  SOURCE_OPTIONS.map((o) => [o.value, o.label]),
)

function windowLabel(w: QueryWindow): string {
  if (w.kind === 'relative') return `last ${w.size}${w.unit}`
  return w.end ? `from ${w.start} to ${w.end}` : `from ${w.start}`
}

export interface StreamQueryBarProps {
  /** The controlled WQL string (the composer query state). */
  query: string
  onQueryChange: (wql: string) => void
  /** Source-plane options the type selector offers (wqlEdits vocabulary). */
  options: readonly string[]
  /** Stage-count executor handed to the palette composer. */
  execute: WqlExecutor
  /** Mobile-only view-settings affordance rendered after the summary. */
  onViewSettings?: () => void
  /** Compact (mobile) variant — summary line instead of chips. */
  compact?: boolean
  className?: string
}

export function StreamQueryBar({
  query,
  onQueryChange,
  options,
  execute,
  onViewSettings,
  compact = false,
  className,
}: StreamQueryBarProps) {
  const [typeMenuOpen, setTypeMenuOpen] = useState(false)
  const parsed = useMemo(() => parseQuery(query), [query])
  const sourceValue = sourceOfQuery(query)

  const openEditor = useCallback(() => {
    void usePaletteStore.getState().open({
      placeholder: 'Craft the query…',
      wql: { initialQuery: query, execute, onApply: onQueryChange },
      sources: [wqlSearchSource()],
    })
  }, [query, execute, onQueryChange])

  const typeMenu = (
    <DropdownMenu open={typeMenuOpen} onOpenChange={setTypeMenuOpen}>
      <DropdownMenuTrigger
        data-testid="stream-query-type"
        className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-xs hover:border-border"
      >
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ background: SOURCE_DOT[sourceValue] ?? 'var(--primary)' }}
        />
        <span className="max-w-28 truncate">{SOURCE_LABEL[sourceValue] ?? sourceValue}</span>
        <ChevronDown className="size-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()} className="min-w-44">
        {options.map((value) => (
          <DropdownMenuItem
            key={value}
            data-testid={`stream-query-type-${value}`}
            onClick={() => {
              setTypeMenuOpen(false)
              onQueryChange(pivotSourceQuery(query, value))
            }}
            className={cn('gap-2 text-xs', value === sourceValue && 'font-semibold text-primary')}
          >
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ background: SOURCE_DOT[value] ?? 'var(--primary)' }}
            />
            {SOURCE_LABEL[value] ?? value}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  if (compact) {
    return (
      <div
        data-testid="stream-query-bar"
        onClick={openEditor}
        className={cn('flex min-w-0 flex-1 cursor-text items-center gap-1.5', className)}
      >
        {typeMenu}
        <span
          data-testid="stream-query-summary"
          className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground"
        >
          {query}
        </span>
        {onViewSettings && (
          <button
            type="button"
            data-testid="stream-query-view-settings"
            title="View Settings"
            onClick={(e) => {
              e.stopPropagation()
              onViewSettings()
            }}
            className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <SlidersHorizontal className="size-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <DesktopBar
      query={query}
      parsed={parsed}
      onQueryChange={onQueryChange}
      openEditor={openEditor}
      typeMenu={typeMenu}
      className={className}
    />
  )
}

interface Chip {
  key: string
  label: string
  remove: () => void
}

function DesktopBar({
  query,
  parsed,
  onQueryChange,
  openEditor,
  typeMenu,
  className,
}: {
  query: string
  parsed: ReturnType<typeof parseQuery>
  onQueryChange: (wql: string) => void
  openEditor: () => void
  typeMenu: ReactNode
  className?: string
}) {
  const chipsRef = useRef<HTMLDivElement>(null)
  const [hiddenCount, setHiddenCount] = useState(0)

  const chips = useMemo<Chip[]>(() => {
    if (parsed.error) return []
    const out: Chip[] = parsed.filters.map((f, index) => ({
      key: `f${index}`,
      label: `${f.negate ? '!' : ''}${f.key}:${f.values.map((v) => v.value).join('|')}`,
      remove: () => onQueryChange(withoutFilterIndex(query, index)),
    }))
    if (parsed.window) {
      out.push({
        key: 'window',
        label: windowLabel(parsed.window),
        remove: () => onQueryChange(withoutWindow(query)),
      })
    }
    return out
  }, [parsed, query, onQueryChange])

  // Overflow: hide right-most chips that don't fit behind a +N chip.
  // Single deterministic pass over accumulated chip widths (scrollWidth
  // races font loading; offsets are stable once fonts settle, so re-measure
  // on document.fonts.ready too).
  useEffect(() => {
    const el = chipsRef.current
    if (!el) return
    const measure = () => {
      const kids = Array.from(el.querySelectorAll<HTMLElement>('[data-chip]'))
      kids.forEach((k) => (k.style.display = ''))
      const gap = 4
      const moreReserve = 44 // room for the +N chip whenever something hides
      let used = 0
      let hidden = 0
      for (let i = 0; i < kids.length; i++) {
        const w = kids[i].offsetWidth
        const projected = used + (used > 0 ? gap : 0) + w + (i < kids.length - 1 ? moreReserve : 0)
        // The first chip always stays visible — an empty bar tells nothing.
        if (i > 0 && projected > el.clientWidth) {
          for (let j = i; j < kids.length; j++) {
            kids[j].style.display = 'none'
            hidden++
          }
          break
        }
        used = projected
      }
      setHiddenCount(hidden)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    document.fonts?.ready.then(measure).catch(() => {})
    return () => ro.disconnect()
  }, [chips])

  return (
    <div
      data-testid="stream-query-bar"
      onClick={openEditor}
      className={cn(
        'flex h-9 min-w-0 flex-1 cursor-text items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-1 text-xs',
        className,
      )}
    >
      {typeMenu}

      <div ref={chipsRef} className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden px-0.5">
        {parsed.error ? (
          <span
            className="min-w-0 flex-1 truncate px-1 font-mono text-[11px] text-destructive"
            data-testid="stream-query-raw"
          >
            {query}
          </span>
        ) : (
          chips.map((chip) => (
            <span
              key={chip.key}
              data-chip
              data-testid="stream-query-chip"
              className="flex shrink-0 items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
            >
              {chip.key === 'window' && <Clock3 className="size-3 shrink-0" />}
              {chip.label}
              <button
                type="button"
                title="Remove filter"
                onClick={(e) => {
                  e.stopPropagation()
                  chip.remove()
                }}
                className="ml-0.5 rounded-full p-px text-muted-foreground/60 hover:bg-muted hover:text-foreground"
              >
                <svg viewBox="0 0 24 24" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))
        )}
        {hiddenCount > 0 && (
          <button
            type="button"
            data-testid="stream-query-overflow"
            title="Show hidden query details"
            onClick={(e) => {
              e.stopPropagation()
              openEditor()
            }}
            className="shrink-0 rounded-full border border-dashed border-primary/50 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary"
          >
            +{hiddenCount}
          </button>
        )}
      </div>

      <button
        type="button"
        title="Edit query (⌘K)"
        onClick={(e) => {
          e.stopPropagation()
          openEditor()
        }}
        className="mr-0.5 flex shrink-0 items-center gap-1 rounded-full bg-background/80 px-2 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
      >
        <Command className="size-3" />
        K
      </button>
    </div>
  )
}
