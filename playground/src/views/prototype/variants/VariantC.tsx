/**
 * Variant C — Mode strip + Undated pinned shelf.
 *
 * Carries the full Journal mode set (history/today/plan/all) into the
 * Library, and pins the undated Sessions shelf between the strip and the
 * date stream so the affordance is always visible.
 */
import { useMemo, useState } from 'react'
import { CalendarIcon, FolderIcon, ChevronDownIcon } from 'lucide-react'
import { formatDateHeader } from '@/lib/dateFormat'
import { LibraryRow } from '../components/LibraryRow'
import { MOCK_ENTRIES, type MockEntry, TODAY_KEY } from '../data/mockEntries'

type Mode = 'history' | 'today' | 'plan' | 'all'

const MODES: { key: Mode; label: string; hint: string }[] = [
  { key: 'history', label: 'History', hint: 'Past + today' },
  { key: 'today', label: 'Today', hint: 'Just today' },
  { key: 'plan', label: 'Plan', hint: 'Today + future' },
  { key: 'all', label: 'All', hint: 'Today + past' },
]

export function VariantC() {
  const [mode, setMode] = useState<Mode>('history')
  const [shelfOpen, setShelfOpen] = useState(false)

  // Apply the mode to derive which entries to show.
  const visibleEntries = useMemo(() => {
    const dated = MOCK_ENTRIES.filter(e => e.kind !== 'session')
    const today = TODAY_KEY
    switch (mode) {
      case 'today':
        return dated.filter(e => e.date === today)
      case 'history':
        return dated.filter(e => (e.date ?? '') <= today)
      case 'plan':
        return dated.filter(e => (e.date ?? '') >= today)
      case 'all':
      default:
        return dated
    }
  }, [mode])

  const sessions = useMemo(() => MOCK_ENTRIES.filter(e => e.kind === 'session'), [])

  const byDate = useMemo(() => {
    const map = new Map<string, MockEntry[]>()
    for (const e of visibleEntries) {
      const list = map.get(e.date!) ?? []
      list.push(e)
      map.set(e.date!, list)
    }
    if (mode === 'history') {
      return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
    }
    if (mode === 'plan') {
      return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    }
    if (mode === 'all') {
      return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
    }
    return Array.from(map.entries())
  }, [visibleEntries, mode])

  return (
    <div className="bg-card flex flex-col" data-testid="variant-c">
      {/* Mode strip */}
      <div className="sticky z-[10] px-6 py-3 bg-zinc-50 border-b border-border top-0" data-testid="mode-strip">
        <div className="flex items-center gap-1 rounded-full bg-muted p-1 max-w-md">
          {MODES.map(m => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              title={m.hint}
              className={`flex-1 rounded-full py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                mode === m.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pinned undated shelf */}
      <div className="sticky z-[9] px-6 py-2 bg-amber-500/[0.06] border-b border-amber-500/30 top-[58px] flex items-center gap-2" data-testid="pinned-shelf">
        <FolderIcon className="size-3 text-amber-500 flex-shrink-0" />
        <button
          type="button"
          onClick={() => setShelfOpen(o => !o)}
          className="text-[10px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1"
        >
          <span>{sessions.length} Sessions</span>
          <ChevronDownIcon className={`size-3 transition-transform ${shelfOpen ? 'rotate-180' : ''}`} />
        </button>
        <span className="text-[10px] text-muted-foreground/60">— static, undated</span>
      </div>
      {shelfOpen && (
        <div className="border-b border-amber-500/20 bg-amber-500/[0.02]">
          {sessions.map(entry => (
            <LibraryRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {/* Dated stream */}
      {byDate.length === 0 && (
        <div className="px-6 py-12 text-center text-muted-foreground/50 text-sm">
          No entries match this mode.
        </div>
      )}
      {byDate.map(([date, entries]) => {
        const isToday = date === TODAY_KEY
        return (
          <div key={date} className="flex flex-col">
            <div className="sticky z-[6] px-6 py-2 bg-muted/80 backdrop-blur-sm border-y border-border flex items-center gap-2 top-[96px]">
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
    </div>
  )
}
