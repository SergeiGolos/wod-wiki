/**
 * LibraryRow — one Entry in the Library. Clicking the row body navigates to
 * the Entry's deep-link (Open). The right-hand action stack exposes
 * Run (Session/Post with a content id) and Compare (any row with a content id).
 * The Add-to-today action is a creation flow (not navigation); it is wired
 * in the Library page, not the row.
 */
import { useNavigate, Link } from 'react-router-dom'
import { FileTextIcon, FolderIcon, CalendarIcon, PlayIcon, BarChart3Icon, PlusIcon, Activity, Trophy, Layers, Dumbbell } from 'lucide-react'
import type { Entry } from '../../lib/entryMapper'
import { entryOpenHref, entryRunHref, entryCompareHref, entryCanAddToToday } from '../../lib/entryActions'

export interface LibraryRowProps {
  entry: Entry
  /** Optional left-column decoration (e.g. timestamp). */
  leading?: React.ReactNode
  /** Optional right-column action stack (defaults to the wired stack). */
  actions?: React.ReactNode
  /** Per-card date label (#861) — survives scrolled-away group headers. */
  dateLabel?: string
  /** Optional projected visible fields. When omitted, all fields are shown by default. */
  visibleFieldIds?: readonly string[]
  /** Visual emphasis — `primary` for today's main row, `secondary` otherwise. */
  tone?: 'primary' | 'secondary'
  /**
   * Optional Add-to-today handler. The row renders the button only when
   * `entryCanAddToToday(entry)` is true; the page passes the actual
   * creation callback.
   */
  onAddToToday?: (entry: Entry) => void
}

const KIND_ICON: Record<Entry['kind'], React.FC<{ className?: string }>> = {
  note: FileTextIcon,
  session: FolderIcon,
  post: CalendarIcon,
  effort: Dumbbell,
  result: Trophy,
  segment: Layers,
  event: Activity,
}

const KIND_LABEL: Record<Entry['kind'], string> = {
  note: 'Note',
  session: 'Session',
  post: 'Post',
  effort: 'Effort',
  result: 'Result',
  segment: 'Segment',
  event: 'Event',
}

const KIND_TONE: Record<Entry['kind'], string> = {
  note: 'bg-primary/10 text-primary group-hover:bg-primary/20',
  session: 'bg-amber-500/10 text-amber-600 group-hover:bg-amber-500/20',
  post: 'bg-violet-500/10 text-violet-600 group-hover:bg-violet-500/20',
  effort: 'bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500/20',
  result: 'bg-sky-500/10 text-sky-600 group-hover:bg-sky-500/20',
  segment: 'bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-500/20',
  event: 'bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-500/20',
}

export function LibraryRow({
  entry,
  leading,
  actions,
  dateLabel,
  visibleFieldIds,
  tone = 'secondary',
  onAddToToday,
}: LibraryRowProps) {
  const navigate = useNavigate()
  const Icon = KIND_ICON[entry.kind]
  const isPrimary = tone === 'primary'
  const visibleSet = visibleFieldIds ? new Set(visibleFieldIds) : null
  const showDate = !visibleSet || visibleSet.has('date')
  const showSubtitle =
    !visibleSet ||
    visibleSet.has('catalog') ||
    visibleSet.has('protocol') ||
    visibleSet.has('elapsedTime') ||
    visibleSet.has('splitDuration') ||
    visibleSet.has('discipline') ||
    visibleSet.has('met') ||
    visibleSet.has('canonicalSlug')
  const showDetail =
    !visibleSet ||
    visibleSet.has('excerpt') ||
    visibleSet.has('movements') ||
    visibleSet.has('tags') ||
    visibleSet.has('aliases')
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
      {leading}
      <div className={`flex-shrink-0 size-9 rounded-xl flex items-center justify-center transition-colors ${KIND_TONE[entry.kind]}`}>
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-foreground truncate">{entry.title}</h3>
          {entry.block && (
            <span
              className="text-[9px] font-black uppercase tracking-widest text-sky-600 border border-sky-500/40 bg-sky-500/10 rounded-full px-1.5 py-0.5"
              data-testid="library-row-block-type"
            >
              {entry.block.dataType}
            </span>
          )}
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 border border-border rounded-full px-1.5 py-0.5">
            {KIND_LABEL[entry.kind]}
          </span>
          {entry.execution?.effortSlug && (
            <Link
              to={`/effort/${encodeURIComponent(entry.execution.effortSlug)}`}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => e.stopPropagation()}
              data-testid="library-row-effort-link"
              className="text-[9px] font-bold tracking-wide text-primary/80 hover:text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-full px-2 py-0.5 transition-colors shrink-0"
              title={`View movement history for ${entry.detail ?? entry.execution.effortSlug}`}
            >
              {entry.detail ?? entry.execution.effortSlug}
            </Link>
          )}
          {entry.subtitle && showSubtitle && (
            <span className="text-[10px] text-muted-foreground/60 truncate">{entry.subtitle}</span>
          )}
        </div>
        {showDetail && (
          entry.block ? (
            <div className="mt-0.5" data-testid="library-row-block-preview">
              {entry.block.preview.map((line, i) => (
                <p key={i} className="text-[11px] text-muted-foreground truncate font-mono">{line}</p>
              ))}
            </div>
          ) : entry.detail ? (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{entry.detail}</p>
          ) : null
        )}
      </div>
      {dateLabel && showDate && (
        <span className="flex-shrink-0 text-[10px] text-muted-foreground/70 tabular-nums" data-testid="library-row-date">
          {dateLabel}
        </span>
      )}
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
