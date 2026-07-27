/**
 * JournalPage — /journal/:id
 *
 * Route-grammar dispatcher for the journal. Notes are stored by UUID, but the
 * user only ever sees the whole date page — a legacy `/journal/:date/:uuid`
 * path (or a UUID/slug alias) redirects to `/journal/:date?note=<uuid>`, where
 * the sub-selection is UI-level state on the date page (see JournalDatePage).
 */
import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { EditorView } from '@codemirror/view'
import { resolveJournalRoute } from '../lib/journalRoute'
import { journalNotePath } from '../lib/routes'
import { journalNotes } from '../services/journalNotes'
import { JournalDatePage } from './JournalDatePage'

export interface JournalPageProps {
  theme: string
  onViewCreated?: (view: EditorView) => void
  onScrollToSection?: (id: string) => void
  onSearch?: () => void
}

function JournalAliasRedirect({ identity }: { identity: string }) {
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    journalNotes.resolve(identity).then((note) => {
      if (!cancelled && note.journalDate) {
        navigate(journalNotePath(note.journalDate, note.id), { replace: true })
      }
    }).catch(() => {
      if (!cancelled) navigate('/journal', { replace: true })
    })
    return () => { cancelled = true }
  }, [identity, navigate])

  return <div className="flex-1 flex items-center justify-center text-zinc-400">Loading…</div>
}

/**
 * Resolves the journal route grammar, then mounts the date projection. Every
 * note-addressed route normalizes to the date page with a ?note= selection.
 */
export function JournalPage(props: JournalPageProps) {
  const pathname = window.location.pathname
  const route = resolveJournalRoute(pathname)

  if (route.kind === 'date') {
    return <JournalDatePage journalDate={route.journalDate} theme={props.theme} onViewCreated={props.onViewCreated} />
  }
  if (route.kind === 'note') {
    return <Navigate to={journalNotePath(route.journalDate, route.noteId)} replace />
  }
  if (route.kind === 'uuid-alias') {
    return <JournalAliasRedirect identity={route.noteId} />
  }
  if (route.kind === 'slug-alias') {
    return <JournalAliasRedirect identity={route.slug} />
  }
  return <div className="flex-1 flex items-center justify-center text-zinc-400">Journal route not found.</div>
}
