import React, { useState, useMemo, useEffect } from 'react'
import * as Headless from '@headlessui/react'
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { ComboboxOption, ComboboxLabel, ComboboxDescription } from './combobox'
import { useCommandPalette } from '../command-palette/CommandContext'
import type { CommandPaletteResult } from '../command-palette/types'
import clsx from 'clsx'

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

  // Default filtering when no strategy is active
  const filteredItems = useMemo(() => {
    if (activeStrategy) return []

    // If there's a search query, filter items by name
    if (query !== '') {
      return items.filter((item) => {
        const matchesQuery = item.name.toLowerCase().includes(query.toLowerCase())
        return matchesQuery
      })
    }
    
    // If no query but initial category is set, show items in that category
    if (initialCategory) {
      return items.filter(item => item.category === initialCategory)
    }

    return []
  }, [query, items, initialCategory, activeStrategy])

  // Fetch results from active strategy
  useEffect(() => {
    if (!activeStrategy) {
      setStrategyResults([])
      return
    }

    let cancelled = false
    const fetchResults = async () => {
      const results = await activeStrategy.getResults(query)
      if (!cancelled) {
        setStrategyResults(results)
      }
    }

    fetchResults()
    return () => { cancelled = true }
  }, [query, activeStrategy])

  // Reset query when dialog is closed to ensure a clean start next time
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setQuery('')
        setStrategyResults([])
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleSelect = (item: any) => {
    if (activeStrategy) {
      activeStrategy.onSelect(item as CommandPaletteResult)
    } else {
      onSelect(item)
    }
    onClose()
  }

  const results = activeStrategy ? strategyResults : filteredItems

  return (
    <Dialog 
      as="div"
      open={isOpen} 
      onClose={onClose} 
      className="relative z-50 focus:outline-none"
    >
      <DialogBackdrop
        className="fixed inset-0 bg-zinc-950/25 backdrop-blur-sm"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto p-4 sm:p-6 md:p-20">
        <DialogPanel
          className="mx-auto max-w-xl transform divide-y divide-border overflow-hidden rounded-xl bg-card shadow-2xl ring-1 ring-border"
        >
          <div className="flex flex-col min-h-0">
            <Headless.Combobox 
              as="div"
              onChange={handleSelect}
            >
            <div className="flex items-center px-4 h-14">
              <MagnifyingGlassIcon
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <Headless.ComboboxInput
                autoFocus
                as="input"
                className="h-full w-full border-0 bg-transparent pl-3 pr-4 text-foreground placeholder:text-muted-foreground focus:ring-0 sm:text-base font-medium outline-hidden"
                placeholder={activeStrategy?.placeholder || (initialCategory ? `Search in ${initialCategory}...` : "Search workouts...")}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(e) => {
                  if (activeStrategy?.onKeyDown) {
                    activeStrategy.onKeyDown(e)
                  }
                }}
              />
            </div>

            {activeStrategy?.renderHeader && (
              <div className="border-b border-border bg-muted/5">
                {activeStrategy.renderHeader()}
              </div>
            )}

            {(query === '' || results.length > 0) && (
              <Headless.ComboboxOptions
                as="div"
                static
                className="max-h-96 scroll-py-2 overflow-y-auto py-4 text-sm text-foreground"
              >
                {activeStrategy ? (
                  // Strategy Results (No Collection Header)
                  results.map((item) => (
                    <ComboboxOption key={item.id} value={item} className="mx-2">
                      <ComboboxLabel className="font-bold">{item.name}</ComboboxLabel>
                      <ComboboxDescription className="font-medium opacity-70 tracking-tight">
                        {(item as CommandPaletteResult).subtitle || item.category}
                      </ComboboxDescription>
                    </ComboboxOption>
                  ))
                ) : results.length > 0 ? (
                  <>
                    {(query === '' && initialCategory) && (
                      <div className="px-4 py-2 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                        {initialCategory} Collection
                      </div>
                    )}
                    {results.map((item) => (
                      <ComboboxOption key={item.id} value={item} className="mx-2">
                        <ComboboxLabel className="font-bold">{item.name}</ComboboxLabel>
                        <ComboboxDescription className="font-medium opacity-70 tracking-tight">
                          {item.category}
                        </ComboboxDescription>
                      </ComboboxOption>
                    ))}
                  </>
                ) : query !== '' ? (
                   <div className="px-4 py-14 text-center sm:px-14">
                    <p className="text-sm font-medium text-muted-foreground">No results found for this search.</p>
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
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
