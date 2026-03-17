import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { ChevronRightIcon } from '@heroicons/react/20/solid'
import clsx from 'clsx'
import React from 'react'

interface SidebarAccordionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  count?: number
}

export function SidebarAccordion({ title, defaultOpen = false, children, count }: SidebarAccordionProps) {
  return (
    <Disclosure as="div" defaultOpen={defaultOpen}>
      <DisclosureButton className="group flex w-full items-center gap-1 px-2 py-1.5 text-xs/6 font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
        <ChevronRightIcon className="size-4 shrink-0 fill-zinc-400 transition-transform duration-200 group-data-[open]:rotate-90 dark:fill-zinc-500" />
        <span>{title}</span>
        {count !== undefined && (
          <span className="ml-auto text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500">
            {count}
          </span>
        )}
      </DisclosureButton>
      <DisclosurePanel
        className={clsx('flex flex-col gap-0.5')}
        transition
      >
        {children}
      </DisclosurePanel>
    </Disclosure>
  )
}
