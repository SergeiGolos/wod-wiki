import React, { useState, useMemo } from 'react'
import * as Headless from '@headlessui/react'
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { ComboboxOption, ComboboxLabel, ComboboxDescription, Combobox } from './combobox'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  items: { id: string; name: string; category: string; content?: string }[]
  onSelect: (item: { id: string; name: string; category: string; content?: string }) => void
}

export function CommandPalette({ isOpen, onClose, items, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState('')

  return (
    <Dialog 
      open={isOpen} 
      onClose={() => {
        onClose()
        setQuery('')
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
          <Combobox
            options={items}
            displayValue={(item: any) => (item ? item.name : '')}
            onChange={(item: any) => {
              if (item) {
                onSelect(item)
                onClose()
                setQuery('')
              }
            }}
            onClose={() => setQuery('')}
            placeholder="Search workouts..."
            icon={MagnifyingGlassIcon}
            className="border-none before:hidden after:hidden focus:ring-0"
          >
            {(item) => (
              <ComboboxOption key={item.id} value={item}>
                <ComboboxLabel>{item.name}</ComboboxLabel>
                <ComboboxDescription>{item.category}</ComboboxDescription>
              </ComboboxOption>
            )}
          </Combobox>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
