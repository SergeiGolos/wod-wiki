/**
 * Variant A — Dated stream + Static shelf + WQL composer panel.
 *
 * The sticky WQL composer panel (top) composes a `find:block{...}` query
 * from UI controls. Its state drives the filters applied to the dated stream
 * below. Undated Sessions live in a collapsible shelf at the page bottom.
 *
 * Filter rules (mirrors the composed WQL preview):
 *   - Source tri-state: include shows, hide drops, neutral leaves implicit.
 *   - Text: substring match against title/detail.
 *   - Time range: applies to dated entries only (Notes + Posts).
 *   - Catalog filter: applies to Sessions + Posts by source catalog id.
 */
import { useMemo, useState } from 'react'
import { CalendarIcon, FolderIcon, ChevronRightIcon, ChevronDownIcon } from 'lucide-react'
import { formatDateHeader } from '@/lib/dateFormat'
import { LibraryRow } from '../components/LibraryRow'
import {
  WqlComposerPanel,
  DEFAULT_PANEL_STATE,
  type PanelState,
  type SourceKey,
} from '../components/WqlComposerPanel'
import { MOCK_ENTRIES, MOCK_CATALOGS, TODAY_KEY, type MockEntry } from '../data/mockEntries'

const SOURCE_TO_KIND: Record<SourceKey, MockEntry['kind']> = {
  note: 'note',
  session: 'session',
  post: 'post',
}

export function VariantA() {
  const [panel, setPanel] = useState<PanelState>(DEFAULT_PANEL_STATE)
  const [shelfOpen, setShelfOpen] = useState(true)

  // Apply panel filters
  const filtered = useMemo(() => applyFilters(MOCK_ENTRIES, panel), [panel])

  const dated = useMemo(
    () => filtered.filter(e => e.kind !== 'session').sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [filtered],
  )
  const sessions = useMemo(
    () => filtered.filter(e => e.kind === 'session'),
    [filtered],
  )

  const byDate = useMemo(() => {
    const map = new Map<string, MockEntry[]>()
    for (const e of dated) {
      const list = map.get(e.date!) ?? []
      list.push(e)
      map.set(e.date!, list)
    }
    return Array.from(map.entries())
  }, [dated])

  // Show the shelf only when Sessions aren't hidden
  const sessionVisible = panel.sources.session !== 'hide'

  return (
    <div className="bg-card flex flex-col" data-testid="variant-a">
      <WqlComposerPanel
        state={panel}
        onChange={setPanel}
        catalogs={MOCK_CATALOGS.filter(c => c.kind === 'session')}
      />

      {/* Dated stream */}
      {byDate.length === 0 && (
        <div className="px-6 py-12 text-center text-muted-foreground/50 text-sm">
          No entries match this query.
        </div>
      )}
      {byDate.map(([date, entries]) => {
        const isToday = date === TODAY_KEY
        return (
          <div key={date} className="flex flex-col">
            <div className="sticky z-[5] px-6 py-2 bg-muted/80 backdrop-blur-sm border-y border-border flex items-center gap-2 top-[104px]">
              <CalendarIcon className="size-3 text-muted-foreground flex-shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {formatDateHeader(new Date(date + 'T00:00:00'))}
                {isToday && <span className="ml-2 text-primary">— Today</span>}
              </span>
            </div>
            <div className="flex flex-col gap-0 pb-1">
              {entries.map(entry => (
                <LibraryRow
                  key={entry.id}
                  entry={entry}
                  tone={isToday && entry.kind === 'note' ? 'primary' : 'secondary'}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Static shelf — undated Sessions */}
      {sessionVisible && (
        <div className="flex flex-col border-t-2 border-dashed border-amber-500/30 mt-4" data-testid="static-shelf">
          <button
            type="button"
            onClick={() => setShelfOpen(o => !o)}
            className="sticky z-[5] px-6 py-2 bg-amber-500/[0.06] backdrop-blur-sm flex items-center gap-2 top-[104px] hover:bg-amber-500/[0.1] transition-colors"
          >
            <FolderIcon className="size-3 text-amber-500 flex-shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
              Catalogues — Static, undated
            </span>
            <span className="text-[10px] font-bold text-muted-foreground/60 tabular-nums">
              {sessions.length}
            </span>
            <span className="ml-auto">
              {shelfOpen ? <ChevronDownIcon className="size-3.5 text-muted-foreground" /> : <ChevronRightIcon className="size-3.5 text-muted-foreground" />}
            </span>
          </button>
          {shelfOpen && (
            <div className="flex flex-col gap-0 pb-1">
              {sessions.length === 0 && (
                <div className="px-6 py-3 text-xs text-muted-foreground/50">No sessions match.</div>
              )}
              {sessions.map(entry => (
                <LibraryRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Filter logic ───────────────────────────────────────────────────────────

function applyFilters(entries: MockEntry[], panel: PanelState): MockEntry[] {
  return entries.filter(e => {
    // Source tri-state
    const srcKey = (e.kind === 'note' ? 'note' : e.kind === 'session' ? 'session' : 'post') as SourceKey
    if (panel.sources[srcKey] === 'hide') return false

    // Text — substring against title or detail
    const q = panel.text.trim().toLowerCase()
    if (q) {
      const hay = `${e.title} ${e.detail ?? ''} ${e.subtitle ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }

    // Time range — dated entries only
    if (e.date && panel.timePreset !== 'all') {
      const { start, end } = resolveWindow(panel)
      const d = new Date(e.date + 'T00:00:00')
      if (d < start || d > end) return false
    }

    // Catalog filter — applies to Sessions + Posts by source catalog
    const catalogFilters = panel.filters.filter(f => f.key === 'catalog')
    if (catalogFilters.length > 0 && (e.kind === 'session' || e.kind === 'post')) {
      if (!catalogFilters.some(f => f.value === e.sourceCatalog)) return false
    }

    // Other filters — stubbed as no-op (would hit WQL engine in real build)
    return true
  })
}

function resolveWindow(panel: PanelState): { start: Date; end: Date } {
  const now = new Date()
  if (panel.timePreset === 'custom' && panel.customStart && panel.customEnd) {
    return {
      start: new Date(panel.customStart + 'T00:00:00'),
      end: new Date(panel.customEnd + 'T23:59:59'),
    }
  }
  const days: Partial<Record<PanelState['timePreset'], number>> = {
    '1d': 1, '3d': 3, '1w': 7, '2w': 14, '4w': 28, '12w': 84, '26w': 182, '52w': 364,
  }
  const d = days[panel.timePreset]
  if (d !== undefined) {
    const start = new Date(now)
    start.setDate(start.getDate() - d)
    return { start, end: now }
  }
  return { start: new Date(2000, 0, 1), end: now }
}
