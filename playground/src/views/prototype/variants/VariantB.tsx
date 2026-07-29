/**
 * Variant B — Year-stream + Catalogues as a virtual bucket.
 *
 * One continuous stream. Undated sessions end up under a "Catalogues" header
 * styled to match date headers but visually distinct (folder icon, amber tone).
 */
import { useMemo } from 'react'
import { CalendarIcon, FolderIcon } from 'lucide-react'
import { formatDateHeader } from '@/lib/dateFormat'
import { LibraryRow } from '../components/LibraryRow'
import { MOCK_ENTRIES, type MockEntry, TODAY_KEY } from '../data/mockEntries'

export function VariantB() {
  // Single ordered list: today first descending, then sessions as a "virtual date".
  const dated = useMemo(
    () => MOCK_ENTRIES.filter(e => e.kind !== 'session').sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [],
  )
  const sessions = useMemo(
    () => MOCK_ENTRIES.filter(e => e.kind === 'session').sort((a, b) => a.title.localeCompare(b.title)),
    [],
  )

  // Group by date bucket.
  const byDate = useMemo(() => {
    const map = new Map<string, MockEntry[]>()
    for (const e of dated) {
      const list = map.get(e.date!) ?? []
      list.push(e)
      map.set(e.date!, list)
    }
    return Array.from(map.entries())
  }, [dated])

  return (
    <div className="bg-card flex flex-col" data-testid="variant-b">
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

      {/* Virtual "Catalogues" bucket at the bottom of the same stream */}
      <div key="__catalogues" className="flex flex-col mt-2">
        <div className="sticky z-[5] px-6 py-2 bg-amber-500/[0.08] backdrop-blur-sm border-y border-amber-500/30 flex items-center gap-2 top-0">
          <FolderIcon className="size-3 text-amber-500 flex-shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
            Catalogues — undated, static workouts
          </span>
        </div>
        <div className="flex flex-col gap-0 pb-1">
          {sessions.map(entry => (
            <LibraryRow key={entry.id} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  )
}
