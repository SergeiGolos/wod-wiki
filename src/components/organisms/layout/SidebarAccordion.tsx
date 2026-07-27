import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { ChevronRightIcon } from '@heroicons/react/20/solid'
import clsx from 'clsx'
import React from 'react'

interface SidebarAccordionProps {
  title: string
  defaultOpen?: boolean
  collapsible?: boolean
  children: React.ReactNode
  count?: number
  className?: string
}

export function SidebarAccordion({ title, defaultOpen = false, collapsible = true, children, count, className }: SidebarAccordionProps) {
  if (!collapsible) {
    return (
      <div className={className}>
        <div className="group flex w-full items-center gap-1 px-2 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">
          <div className="size-4 shrink-0" />
          <span>{title}</span>
          {count !== undefined && (
            <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-border/50 text-[9px] font-black tabular-nums text-muted-foreground">
              {count}
            </span>
          )}
        </div>
        <div className={clsx('flex flex-col gap-0.5')}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <Disclosure as="div" defaultOpen={defaultOpen} className={className}>
      <DisclosureButton className="group flex w-full items-center gap-1 px-2 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 hover:text-primary transition-colors">
        <ChevronRightIcon className="size-4 shrink-0 fill-muted-foreground/50 transition-transform duration-300 group-data-[open]:rotate-90 group-hover:fill-primary" />
        <span>{title}</span>
        {count !== undefined && (
          <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-border/50 text-[9px] font-black tabular-nums text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
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
