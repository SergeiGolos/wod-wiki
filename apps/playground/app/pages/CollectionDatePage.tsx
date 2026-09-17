import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { JournalPageShell } from '@/panels/page-shells'
import { IndexedDBContentProvider } from '@/services/content/IndexedDBContentProvider'
import { collectionNotePath } from '../lib/routes'
import type { HistoryEntry } from '@/types/history'

const contentProvider = new IndexedDBContentProvider()

export interface CollectionDatePageProps {
  slug: string
  date: string
  theme: string
}

/**
 * /collections/:slug/:date — a date-scoped, journal-style view of one
 * collection: every collection note dated `:date`, listed and linked to its
 * single-note route.
 *
 * Seed corpus items inherit import-time dates until per-note authored dates
 * land (wayfinder P7), so a date may legitimately list nothing.
 */
export function CollectionDatePage({ slug, date }: CollectionDatePageProps) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null)

  useEffect(() => {
    let cancelled = false
    contentProvider
      .getEntries()
      .then((all) => {
        if (cancelled) return
        const dayStart = new Date(`${date}T00:00:00`).getTime()
        const dayEnd = dayStart + 86_400_000
        const inCollection = all.filter((entry) => {
          if (entry.catalog !== slug) return false
          const time = entry.createdAt
          return Number.isFinite(time) && time >= dayStart && time < dayEnd
        })
        setEntries(inCollection.sort((a, b) => b.createdAt - a.createdAt))
      })
      .catch(() => {
        if (!cancelled) setEntries([])
      })
    return () => {
      cancelled = true
    }
  }, [slug, date])

  const body = entries === null
    ? <div className="flex flex-1 items-center justify-center text-zinc-400">Loading…</div>
    : entries.length === 0
      ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            No notes in this collection for {date}.
          </p>
        )
      : (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {entries.map((entry) => (
              <li key={entry.id}>
                <Link
                  to={collectionNotePath(slug, entry.id)}
                  className="flex flex-col gap-0.5 px-4 py-3 hover:bg-muted/50"
                >
                  <span className="font-medium">{entry.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleTimeString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )

  return (
    <JournalPageShell
      title={date}
      subtitle={slug}
      editor={<div className="flex flex-col gap-6 px-4 py-6 sm:px-6">{body}</div>}
    />
  )
}
