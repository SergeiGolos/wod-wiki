import React, { useState, useMemo, useEffect } from 'react'
import * as Headless from '@headlessui/react'
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { ComboboxOption, ComboboxLabel, ComboboxDescription } from './combobox'
import clsx from 'clsx'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  items: { id: string; name: string; category: string; content?: string }[]
  onSelect: (item: { id: string; name: string; category: string; content?: string }) => void
  initialCategory?: string | null
}

export function CommandPalette({ isOpen, onClose, items, onSelect, initialCategory }: CommandPaletteProps) {
  const [query, setQuery] = useState('')

  const filteredItems = useMemo(() => {
    // If there's a search query, filter items by name
    if (query !== '') {
      return items.filter((item) => {
        const matchesQuery = item.name.toLowerCase().includes(query.toLowerCase())
        // If an initial category is set, prioritize matching within that category or show all matches
        return matchesQuery
      })
    }
    
    // If no query but initial category is set, show items in that category
    if (initialCategory) {
      return items.filter(item => item.category === initialCategory)
    }

    return []
  }, [query, items, initialCategory])

  // Reset query when dialog is closed to ensure a clean start next time
  useEffect(() => {
    if (!isOpen) {
      // Use a small timeout to let the exit animation finish before clearing the results
      const timer = setTimeout(() => setQuery(''), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  return (
    <Dialog 
      open={isOpen} 
      onClose={() => {
        onClose()
      }} 
      transition
      className="relative z-50 focus:outline-none"
    >
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-zinc-950/25 transition-opacity duration-300 ease-out data-closed:opacity-0"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto p-4 sm:p-6 md:p-20">
        <DialogPanel
          transition
          className="mx-auto max-w-xl transform divide-y divide-border overflow-hidden rounded-xl bg-card shadow-2xl ring-1 ring-border transition duration-300 ease-out data-closed:scale-95 data-closed:opacity-0"
        >
          <Headless.Combobox
            onChange={(item: any) => {
              if (item) {
                onSelect(item)
                onClose()
              }
            }}
          >
            <div className="flex items-center px-4">
              <MagnifyingGlassIcon
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <Headless.ComboboxInput
                autoFocus
                className="h-12 w-full border-0 bg-transparent pl-3 pr-4 text-foreground placeholder:text-muted-foreground focus:ring-0 sm:text-sm no-focus-ring"
                placeholder={initialCategory ? `Search in ${initialCategory}...` : "Search workouts..."}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            {(query === '' || filteredItems.length > 0) && (
              <Headless.ComboboxOptions
                static
                className="max-h-96 scroll-py-2 overflow-y-auto py-4 text-sm text-foreground"
              >
                {filteredItems.length > 0 ? (
                  <>
                    {(query === '' && initialCategory) && (
                      <div className="px-4 py-2 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                        {initialCategory} Collection
                      </div>
                    )}
                    {filteredItems.map((item) => (
                      <ComboboxOption key={item.id} value={item} className="mx-2">
                        <ComboboxLabel className="font-bold">{item.name}</ComboboxLabel>
                        <ComboboxDescription className="font-medium opacity-70 tracking-tight">{item.category}</ComboboxDescription>
                      </ComboboxOption>
                    ))}
                  </>
                ) : query !== '' ? (
                   <div className="px-4 py-14 text-center sm:px-14">
                    <p className="text-sm font-medium text-muted-foreground">No workouts found for this search.</p>
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                      Recent Workouts
                    </div>
                    {items.slice(0, 5).map((item) => (
                      <ComboboxOption key={item.id} value={item} className="mx-2">
                        <ComboboxLabel className="font-bold">{item.name}</ComboboxLabel>
                        <ComboboxDescription className="font-medium opacity-70 tracking-tight">{item.category}</ComboboxDescription>
                      </ComboboxOption>
                    ))}
                  </>
                )}
              </Headless.ComboboxOptions>
            )}
          </Headless.Combobox>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
