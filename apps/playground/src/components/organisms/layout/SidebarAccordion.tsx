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
  /** Pin the header to the top of the shared scroll container while its
   *  section spans the viewport — keeps the collapse control reachable. */
  sticky?: boolean
  /** Separate interactive control (e.g. a Group-by checkbox) rendered beside
   *  the DisclosureButton in a sticky flex row — never inside the button, so
   *  activating it never collapses the section. */
  trailing?: React.ReactNode
  /** Extra classes for the collapsible body (DisclosurePanel). */
  bodyClassName?: string
  /** Extra classes for the DisclosureButton itself — the stable way to
   *  restyle the header when `trailing` wraps it in a row div. */
  buttonClassName?: string
}

const STICKY_HEADER = 'sticky top-0 z-10 bg-card'

export function SidebarAccordion({ title, defaultOpen = false, collapsible = true, children, count, className, sticky, trailing, bodyClassName, buttonClassName }: SidebarAccordionProps) {
  if (!collapsible) {
    return (
      <div className={className}>
        <div className={clsx('group flex w-full items-center gap-1 px-2 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80', sticky && STICKY_HEADER)}>
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

  const button = (
    <DisclosureButton
      className={clsx(
        'group flex items-center gap-1 px-2 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 hover:text-primary transition-colors',
        trailing ? 'min-w-0 flex-1' : 'w-full',
        buttonClassName,
        sticky && !trailing && STICKY_HEADER,
      )}
    >
      <ChevronRightIcon className="size-4 shrink-0 fill-muted-foreground/50 transition-transform duration-300 group-data-[open]:rotate-90 group-hover:fill-primary" />
      <span>{title}</span>
      {count !== undefined && (
        <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-border/50 text-[9px] font-black tabular-nums text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          {count}
        </span>
      )}
    </DisclosureButton>
  )

  return (
    <Disclosure as="div" defaultOpen={defaultOpen} className={className}>
      {trailing ? (
        <div className={clsx('flex w-full items-center bg-card', sticky && STICKY_HEADER)}>
          {button}
          {trailing}
        </div>
      ) : (
        button
      )}
      <DisclosurePanel
        className={clsx('flex flex-col gap-0.5', bodyClassName)}
        transition
      >
        {children}
      </DisclosurePanel>
    </Disclosure>
  )
}
