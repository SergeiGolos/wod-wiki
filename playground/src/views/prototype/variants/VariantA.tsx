/**
 * Variant A — Dated stream + Static shelf.
 *
 * Built directly on JournalFeed's visual language. The dated stream is a
 * near-clone of the journal's date-grouped list; the static shelf at the
 * bottom is the home for undated Sessions.
 */
import { useMemo, useState } from 'react'
import { CalendarIcon, FolderIcon, ChevronRightIcon, ChevronDownIcon } from 'lucide-react'
import { formatDateHeader } from '@/lib/dateFormat'
import { LibraryRow } from '../components/LibraryRow'
import { MOCK_ENTRIES, type MockEntry, TODAY_KEY } from '../data/mockEntries'

function datedKey(entry: MockEntry): string | null {
  return entry.date
}

export function VariantA() {
  const dated = useMemo(
    () => MOCK_ENTRIES.filter(e => e.kind !== 'session').sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [],
  )
  const sessions = useMemo(
    () => MOCK_ENTRIES.filter(e => e.kind === 'session'),
    [],
  )

  // Group by date, preserving sort
  const byDate = useMemo(() => {
    const map = new Map<string, MockEntry[]>()
    for (const e of dated) {
      const key = datedKey(e)!
      const list = map.get(key) ?? []
      list.push(e)
      map.set(key, list)
    }
    return Array.from(map.entries())
  }, [dated])

  const [shelfOpen, setShelfOpen] = useState(true)

  return (
    <div className="bg-card flex flex-col" data-testid="variant-a">
      {/* Dated stream */}
      {byDate.map(([date, entries]) => {
        const isToday = date === TODAY_KEY
        return (
          <div key={date} className="flex flex-col">
            <div className="sticky z-[5] px-6 py-2 bg-muted/80 backdrop-blur-sm border-y border-border flex items-center gap-2 top-0">
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
      <div className="flex flex-col border-t-2 border-dashed border-amber-500/30 mt-4" data-testid="static-shelf">
        <button
          type="button"
          onClick={() => setShelfOpen(o => !o)}
          className="sticky z-[5] px-6 py-2 bg-amber-500/[0.06] backdrop-blur-sm flex items-center gap-2 top-0 hover:bg-amber-500/[0.1] transition-colors"
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
            {sessions.map(entry => (
              <LibraryRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
