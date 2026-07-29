/**
 * LibraryRow — the canonical Entry row used by every variant.
 *
 * Variants only rearrange the layout; the row itself is identical so the
 * user can judge placement without row-quality noise.
 */
import { FileTextIcon, FolderIcon, CalendarIcon, PlayIcon, PlusIcon } from 'lucide-react'
import type { MockEntry } from '../data/mockEntries'

export interface LibraryRowProps {
  entry: MockEntry
  /** Optional left-column decoration (e.g. timestamp). */
  leading?: React.ReactNode
  /** Optional right-column action stack (defaults to 2 sensible ones). */
  actions?: React.ReactNode
  /** Visual emphasis — `primary` for today's main row, `secondary` otherwise. */
  tone?: 'primary' | 'secondary'
}

const KIND_ICON: Record<MockEntry['kind'], React.FC<{ className?: string }>> = {
  note: FileTextIcon,
  session: FolderIcon,
  post: CalendarIcon,
}

const KIND_LABEL: Record<MockEntry['kind'], string> = {
  note: 'Note',
  session: 'Session',
  post: 'Post',
}

const KIND_TONE: Record<MockEntry['kind'], string> = {
  note: 'bg-primary/10 text-primary group-hover:bg-primary/20',
  session: 'bg-amber-500/10 text-amber-600 group-hover:bg-amber-500/20',
  post: 'bg-violet-500/10 text-violet-600 group-hover:bg-violet-500/20',
}

export function LibraryRow({ entry, leading, actions, tone = 'secondary' }: LibraryRowProps) {
  const Icon = KIND_ICON[entry.kind]
  const isPrimary = tone === 'primary'
  return (
    <button
      type="button"
      className={`flex items-center gap-4 px-6 py-3.5 hover:bg-muted/40 transition-colors text-left group w-full ${
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
      {actions ?? <DefaultActions />}
    </button>
  )
}

function DefaultActions() {
  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        type="button"
        className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        title="Open"
        onClick={e => e.stopPropagation()}
      >
        <PlayIcon className="size-3.5" />
      </button>
      <button
        type="button"
        className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        title="Add to today"
        onClick={e => e.stopPropagation()}
      >
        <PlusIcon className="size-3.5" />
      </button>
    </div>
  )
}
