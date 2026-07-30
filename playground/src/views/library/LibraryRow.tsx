/**
 * LibraryRow — one Entry in the Library. Clicking the row body navigates to
 * the Entry's deep-link (Open). The right-hand action stack exposes
 * Run (Session/Post with a content id) and Compare (any row with a content id).
 * The Add-to-today action is a creation flow (not navigation); it lives on
 * `useCreateJournalEntry` and is wired in the Library page, not the row.
 */
import { useNavigate } from 'react-router-dom'
import { FileTextIcon, FolderIcon, CalendarIcon, PlayIcon, BarChart3Icon, PlusIcon } from 'lucide-react'
import type { Entry } from '../../lib/entryMapper'
import { entryOpenHref, entryRunHref, entryCompareHref, entryCanAddToToday } from '../../lib/entryActions'

export interface LibraryRowProps {
  entry: Entry
  /** Optional left-column decoration (e.g. timestamp). */
  leading?: React.ReactNode
  /** Optional right-column action stack (defaults to the wired stack). */
  actions?: React.ReactNode
  /** Visual emphasis — `primary` for today's main row, `secondary` otherwise. */
  tone?: 'primary' | 'secondary'
  /**
   * Optional Add-to-today handler. The row renders the button only when
   * `entryCanAddToToday(entry)` is true; the page passes the actual
   * creation flow (e.g. `useCreateJournalEntry`).
   */
  onAddToToday?: (entry: Entry) => void
}

const KIND_ICON: Record<Entry['kind'], React.FC<{ className?: string }>> = {
  note: FileTextIcon,
  session: FolderIcon,
  post: CalendarIcon,
}

const KIND_LABEL: Record<Entry['kind'], string> = {
  note: 'Note',
  session: 'Session',
  post: 'Post',
}

const KIND_TONE: Record<Entry['kind'], string> = {
  note: 'bg-primary/10 text-primary group-hover:bg-primary/20',
  session: 'bg-amber-500/10 text-amber-600 group-hover:bg-amber-500/20',
  post: 'bg-violet-500/10 text-violet-600 group-hover:bg-violet-500/20',
}

export function LibraryRow({ entry, leading, actions, tone = 'secondary', onAddToToday }: LibraryRowProps) {
  const navigate = useNavigate()
  const Icon = KIND_ICON[entry.kind]
  const isPrimary = tone === 'primary'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(entryOpenHref(entry))}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(entryOpenHref(entry)) } }}
      className={`flex items-center gap-4 px-6 py-3.5 hover:bg-muted/40 transition-colors text-left group w-full cursor-pointer ${
        isPrimary ? 'bg-primary/[0.025]' : ''
      }`}
      data-testid={`library-row-${entry.kind}`}
    >
      {leading ?? <div className="w-14 flex-shrink-0" />}
      <div className={`flex-shrink-0 size-9 rounded-xl flex items-center justify-center transition-colors ${KIND_TONE[entry.kind]}`}>
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-foreground truncate">{entry.title}</h3>
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 border border-border rounded-full px-1.5 py-0.5">
            {KIND_LABEL[entry.kind]}
          </span>
          {entry.subtitle && (
            <span className="text-[10px] text-muted-foreground/60 truncate">{entry.subtitle}</span>
          )}
        </div>
        {entry.detail && (
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{entry.detail}</p>
        )}
      </div>
      {actions ?? <RowActions entry={entry} onAddToToday={onAddToToday} />}
    </div>
  )
}

interface RowActionsProps {
  entry: Entry
  onAddToToday?: (entry: Entry) => void
}

function RowActions({ entry, onAddToToday }: RowActionsProps) {
  const navigate = useNavigate()
  const runHref = entryRunHref(entry)
  const compareHref = entryCompareHref(entry)
  const canAdd = entryCanAddToToday(entry) && !!onAddToToday

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
      <ActionButton title="Open" testId="action-open" onClick={() => navigate(entryOpenHref(entry))}>
        <PlayIcon className="size-3.5" />
      </ActionButton>
      {canAdd && (
        <ActionButton title="Add to today" testId="action-add" onClick={() => onAddToToday?.(entry)}>
          <PlusIcon className="size-3.5" />
        </ActionButton>
      )}
      {runHref && (
        <ActionButton title="Run" testId="action-run" onClick={() => navigate(runHref)}>
          <PlayIcon className="size-3.5" />
        </ActionButton>
      )}
      {compareHref && (
        <ActionButton title="Compare" testId="action-compare" onClick={() => navigate(compareHref)}>
          <BarChart3Icon className="size-3.5" />
        </ActionButton>
      )}
    </div>
  )
}

interface ActionButtonProps {
  title: string
  testId: string
  onClick?: () => void
  children: React.ReactNode
}

function ActionButton({ title, testId, onClick, children }: ActionButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      data-testid={testId}
      className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
    >
      {children}
    </button>
  )
}
