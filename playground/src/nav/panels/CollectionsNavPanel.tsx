/**
 * CollectionsNavPanel — L2 context panel for collection browsing.
 *
 * Route modes:
 *   - /collections                  → category filter toggles
 *   - /collections/:slug            → this collection's category links
 *   - /workout/:category/:name      → parent collection + sibling workouts
 */

import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { NavPanelProps } from '../navTypes'
import { useCollectionsQueryState } from '../../hooks/useCollectionsQueryState'
import { getCategoryGroups } from '../../config/collectionGroups'
import { getWodCollection } from '@/repositories/wod-collections'
import { NON_COLLECTION_CATEGORIES } from '../../pages/shared/pageUtils'

export function CollectionsNavPanel(_props: NavPanelProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { selectedCategories, toggleCategory, clearCategories } = useCollectionsQueryState()
  const collectionMatch = location.pathname.match(/^\/collections\/([^/]+)$/)
  const workoutMatch = location.pathname.match(/^\/workout\/([^/]+)\/([^/]+)$/)

  const collectionSlug = collectionMatch ? decodeURIComponent(collectionMatch[1]) : null
  const workoutCategory = workoutMatch ? decodeURIComponent(workoutMatch[1]) : null
  const workoutName = workoutMatch ? decodeURIComponent(workoutMatch[2]) : null

  const isListPage = location.pathname === '/collections'
  const detailCollection = collectionSlug ? getWodCollection(collectionSlug) : null
  const workoutCollection = workoutCategory && !NON_COLLECTION_CATEGORIES.has(workoutCategory)
    ? getWodCollection(workoutCategory)
    : null
  const workoutItems = workoutCollection?.items ?? []

  const categories = Object.keys(getCategoryGroups())

  if (!isListPage && !detailCollection && !workoutCollection) return null

  if (workoutCollection) {
    return (
      <div className="flex flex-col gap-2 px-2 py-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          Collection
        </div>

        <div className="flex flex-col gap-1">
          <button
            onClick={() => navigate(`/collections/${encodeURIComponent(workoutCollection.id)}`)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-left text-primary bg-primary/10 hover:bg-primary/15 transition-colors"
          >
            <span className="size-2 rounded-full shrink-0 bg-primary" />
            {workoutCollection.name}
          </button>

          {workoutItems.map(item => {
            const isActive = item.id === workoutName
            return (
              <button
                key={item.id}
                onClick={() => navigate(`/workout/${encodeURIComponent(workoutCollection.id)}/${encodeURIComponent(item.id)}`)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span
                  className={cn(
                    'size-2 rounded-full shrink-0',
                    isActive ? 'bg-primary' : 'bg-border'
                  )}
                />
                {item.name}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (detailCollection) {
    return (
      <div className="flex flex-col gap-2 px-2 py-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          Categories
        </div>

        <div className="flex flex-col gap-1">
          {categories.map(category => {
            const isActive = detailCollection.categories.includes(category)
            return (
              <button
                key={category}
                onClick={() => navigate(`/collections?categories=${encodeURIComponent(category)}`)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span
                  className={cn(
                    'size-2 rounded-full shrink-0',
                    isActive ? 'bg-primary' : 'bg-border'
                  )}
                />
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

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
