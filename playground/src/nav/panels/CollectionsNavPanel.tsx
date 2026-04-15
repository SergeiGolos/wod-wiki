/**
 * CollectionsNavPanel — L2 context panel for the Collections L1 item.
 *
 * Renders category chip toggles derived from collection front matter.
 * Only visible on the /collections list page — hidden on /collections/:slug.
 * Reads and writes the `categories` URL param via useCollectionsQueryState
 * so CollectionsPage stays in sync without prop-drilling.
 */

import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { NavPanelProps } from '../navTypes'
import { useCollectionsQueryState } from '../../hooks/useCollectionsQueryState'
import { getCategoryGroups } from '../../config/collectionGroups'

export function CollectionsNavPanel(_props: NavPanelProps) {
  const location = useLocation()
  const { selectedCategories, toggleCategory, clearCategories } = useCollectionsQueryState()

  // Only show on the collections list page, not on individual collection pages
  const isListPage = location.pathname === '/collections'
  if (!isListPage) return null

  // Derive category list from front matter data — alphabetically sorted
  const categories = Object.keys(getCategoryGroups())

  return (
    <div className="flex flex-col gap-2 px-2 py-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          Category
        </div>
        {selectedCategories.length > 0 && (
          <button
            onClick={clearCategories}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {categories.map(cat => {
          const active = selectedCategories.includes(cat)
          const label = cat.charAt(0).toUpperCase() + cat.slice(1)
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <span
                className={cn(
                  'size-2 rounded-full shrink-0',
                  active ? 'bg-primary' : 'bg-border'
                )}
              />
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
