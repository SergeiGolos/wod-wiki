/**
 * NotePageActions — Standard toolbar shared by note pages.
 *
 * Renders a Search button, Cast button, and Actions menu.
 * `onSearch` is provided by App.tsx (has the full global-search strategy);
 * pages that don't receive it fall back to simply opening the palette.
 */

import type { PageNavLink } from '@/components/playground/PageNavDropdown'
import { CastButtonRpc } from '@/components/cast/CastButtonRpc'
import { ActionsMenu } from './PageToolbar'
import { mapIndexToL3 } from './pageUtils'
import { useCommandPalette } from '@/components/command-palette/CommandContext'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { ShortcutBadge } from '@/components/list/ShortcutBadge'

export interface NotePageActionsProps {
  currentWorkout: { name: string; content: string }
  index: PageNavLink[]
  onSearch?: () => void
}

export function NotePageActions({ currentWorkout, index, onSearch }: NotePageActionsProps) {
  const { setIsOpen } = useCommandPalette()
  const handleSearch = onSearch ?? (() => setIsOpen(true))

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleSearch}
        aria-label="Search"
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <MagnifyingGlassIcon className="size-4 shrink-0" />
        <ShortcutBadge tokens={['meta', '/']} />
      </button>
      <CastButtonRpc />
      <ActionsMenu currentWorkout={currentWorkout} items={mapIndexToL3(index)} />
    </div>
  )
}
