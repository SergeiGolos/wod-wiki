/**
 * SearchFab — mobile floating search button (Gmail-style circle).
 *
 * Replaces the mobile-navbar search input: a fixed 56px circular button in the
 * bottom thumb zone, right or left per the "Search button position" appearance
 * preference (`fabAlignment`). Mobile only (`lg:hidden`) — on desktop the icon
 * rail and page headers own search.
 */
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { cn } from '@/lib/utils'
import { useFabAlignment } from '../lib/fabAlignment'

export interface SearchFabProps {
  /** Opens the global search palette. */
  onOpen: () => void
}

export function SearchFab({ onOpen }: SearchFabProps) {
  const [alignment] = useFabAlignment()

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Search"
      data-testid="search-fab"
      className={cn(
        'lg:hidden fixed z-40 bottom-[calc(1rem+env(safe-area-inset-bottom))]',
        alignment === 'left' ? 'left-4' : 'right-4',
        'size-14 rounded-full flex items-center justify-center',
        'bg-primary text-primary-foreground shadow-lg',
        'hover:bg-primary/90 active:scale-95 transition-all',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
      )}
    >
      <MagnifyingGlassIcon className="size-6" />
    </button>
  )
}
