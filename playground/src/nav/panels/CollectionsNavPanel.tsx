/**
 * CollectionsNavPanel — L2 context panel for the Collections L1 item.
 *
 * Renders category chip toggles (Kettlebell, Crossfit, Swimming, Other).
 * Dispatches SET_COLLECTIONS_CATEGORIES to update navState.
 * The CollectionsPage reads navState.collectionsFilter.categories to filter.
 */

import { cn } from '@/lib/utils'
import type { NavPanelProps } from '../navTypes'

const GROUPS = ['Kettlebell', 'Crossfit', 'Swimming', 'Other']

export function CollectionsNavPanel({ navState, dispatch }: NavPanelProps) {
  const { categories } = navState.collectionsFilter

  const toggle = (group: string) => {
    const slug = group.toLowerCase()
    const next = categories.includes(slug)
      ? categories.filter(c => c !== slug)
      : [...categories, slug]
    dispatch({ type: 'SET_COLLECTIONS_CATEGORIES', categories: next })
  }

  const clearAll = () => dispatch({ type: 'SET_COLLECTIONS_CATEGORIES', categories: [] })

  return (
    <div className="flex flex-col gap-2 px-2 py-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          Category
        </div>
        {categories.length > 0 && (
          <button
            onClick={clearAll}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {GROUPS.map(group => {
          const slug = group.toLowerCase()
          const active = categories.includes(slug)
          return (
            <button
              key={group}
              onClick={() => toggle(group)}
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
              {group}
            </button>
          )
        })}
      </div>
    </div>
  )
}
