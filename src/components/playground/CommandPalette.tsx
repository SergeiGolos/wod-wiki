import { useState, useEffect } from 'react'
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { useCommandPalette } from '../command-palette/CommandContext'
import type { CommandPaletteResult } from '../command-palette/types'
import { CommandListView, paletteResultToListItem } from '@/components/list'
import type { IListItem } from '@/components/list'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  items: { id: string; name: string; category: string; content?: string }[]
  onSelect: (item: { id: string; name: string; category: string; content?: string }) => void
  initialCategory?: string | null
}

export function CommandPalette({ isOpen, onClose, items, onSelect, initialCategory }: CommandPaletteProps) {
  const { search: query, setSearch: setQuery, activeStrategy } = useCommandPalette()
  const [strategyResults, setStrategyResults] = useState<CommandPaletteResult[]>([])

  // Fetch results from active strategy
  useEffect(() => {
    if (!activeStrategy) {
      setStrategyResults([])
      return
    }
    let cancelled = false
    const fetchResults = async () => {
      const results = await Promise.resolve(activeStrategy.getResults(query))
      if (!cancelled) setStrategyResults(results)
    }
    fetchResults()
    return () => { cancelled = true }
  }, [query, activeStrategy])

  // Reset query when dialog closes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => { setQuery(''); setStrategyResults([]) }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen, setQuery])

  // Build list items from whichever source is active
  const listItems = activeStrategy
    ? strategyResults.map(paletteResultToListItem)
    : items
        .filter(item => {
          if (query) return item.name.toLowerCase().includes(query.toLowerCase())
          if (initialCategory) return item.category === initialCategory
          return false
        })
        .map(item => paletteResultToListItem({ ...item, type: 'workout' as const }))

  const handleSelect = (listItem: IListItem<CommandPaletteResult>) => {
    if (activeStrategy) {
      activeStrategy.onSelect(listItem.payload)
    } else {
      onSelect(listItem.payload)
    }
    onClose()
  }

  return (
    <Dialog
      as="div"
      open={isOpen}
      onClose={onClose}
      className="relative z-50 focus:outline-none"
    >
      <DialogBackdrop className="fixed inset-0 bg-zinc-950/25 backdrop-blur-sm" />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto p-4 sm:p-6 md:p-20">
        <DialogPanel className="mx-auto max-w-xl transform overflow-hidden rounded-xl bg-card shadow-2xl ring-1 ring-border">
          <CommandListView
            items={listItems}
            query={query}
            onQueryChange={setQuery}
            onSelect={handleSelect}
            isOpen={true}
            onClose={onClose}
            placeholder={activeStrategy?.placeholder ?? (initialCategory ? `Search in ${initialCategory}…` : 'Search workouts…')}
            header={activeStrategy?.renderHeader ? activeStrategy.renderHeader() : undefined}
          />
        </DialogPanel>
      </div>
    </Dialog>
  )
}
