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

  // Reset query when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
    }
  }, [isOpen])

  return (
    <Dialog 
      open={isOpen} 
      onClose={() => {
        onClose()
      }} 
      className="relative z-50"
    >
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-zinc-950/25 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in dark:bg-zinc-950/50"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto p-4 sm:p-6 md:p-20">
        <DialogPanel
          transition
          className="mx-auto max-w-2xl transform divide-y divide-zinc-100 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 transition-all data-closed:scale-95 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in dark:divide-zinc-800 dark:bg-zinc-900 dark:ring-white/10"
        >
          <Headless.Combobox
            onChange={(item: any) => {
              if (item) {
                onSelect(item)
                onClose()
              }
            }}
          >
            <div className="relative">
              <MagnifyingGlassIcon
                data-slot="icon"
                className="pointer-events-none absolute top-3.5 left-4 size-5 text-zinc-400 dark:text-zinc-500"
                aria-hidden="true"
              />
              <Headless.ComboboxInput
                autoFocus
                className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-zinc-900 placeholder:text-zinc-400 focus:ring-0 sm:text-sm dark:text-white dark:placeholder:text-zinc-500"
                placeholder={initialCategory ? `Search in ${initialCategory}...` : "Search workouts..."}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            {(query === '' || filteredItems.length > 0) && (
              <Headless.ComboboxOptions
                static
                className="max-h-80 scroll-py-2 overflow-y-auto py-2 text-sm text-zinc-800 dark:text-zinc-200"
              >
                {filteredItems.length > 0 ? (
                  <>
                    {query === '' && initialCategory && (
                      <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase dark:text-zinc-400">
                        {initialCategory} Collection
                      </div>
                    )}
                    {filteredItems.map((item) => (
                      <ComboboxOption key={item.id} value={item}>
                        <ComboboxLabel>{item.name}</ComboboxLabel>
                        <ComboboxDescription>{item.category}</ComboboxDescription>
                      </ComboboxOption>
                    ))}
                  </>
                ) : query !== '' ? (
                   <div className="px-4 py-14 text-center sm:px-14">
                    <p className="mt-4 text-sm text-zinc-900 dark:text-zinc-100">No workouts found for this search.</p>
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase dark:text-zinc-400">
                      Recent Workouts
                    </div>
                    {items.slice(0, 5).map((item) => (
                      <ComboboxOption key={item.id} value={item}>
                        <ComboboxLabel>{item.name}</ComboboxLabel>
                        <ComboboxDescription>{item.category}</ComboboxDescription>
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
