/**
 * NavSearchInput — mini search bar molecule.
 *
 * A non-editable text-field-styled button that opens the command palette on
 * click. Replaces the bare icon button + ShortcutBadge pattern that was
 * duplicated across the mobile navbar slot and each page's desktop header.
 *
 * Usage:
 *   <NavSearchInput onOpen={openSearchPalette} />
 */

import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { ShortcutBadge } from '@/components/list/ShortcutBadge'
import { cn } from '@/lib/utils'

export interface NavSearchInputProps {
  /** Called when the user clicks the input or activates the keyboard shortcut. */
  onOpen: () => void
  className?: string
}

export function NavSearchInput({ onOpen, className }: NavSearchInputProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Search"
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg',
        'text-muted-foreground hover:text-foreground',
        'bg-muted/60 hover:bg-muted border border-border/40',
        'text-sm transition-colors',
        className,
      )}
    >
      <MagnifyingGlassIcon className="size-4 shrink-0" />
      <span className="hidden sm:inline text-xs text-muted-foreground/70">Search…</span>
      <ShortcutBadge tokens={['meta', '/']} />
    </button>
  )
}
