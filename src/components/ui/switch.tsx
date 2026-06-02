import * as Headless from '@headlessui/react'
import { cn } from "@/lib/utils"
import type React from 'react'

export function SwitchGroup({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      data-slot="control"
      {...props}
      className={cn(
        className,
        'space-y-3 **:data-[slot=label]:font-normal',
        'has-data-[slot=description]:space-y-6 has-data-[slot=description]:**:data-[slot=label]:font-medium'
      )}
    />
  )
}

export function SwitchField({
  className,
  ...props
}: { className?: string } & Omit<Headless.FieldProps, 'as' | 'className'>) {
  return (
    <Headless.Field
      data-slot="field"
      {...props}
      className={cn(
        className,
        'grid grid-cols-[1fr_auto] gap-x-8 gap-y-1 sm:grid-cols-[1fr_auto]',
        '[&>[data-slot=control]]:col-start-2 [&>[data-slot=control]]:self-start sm:[&>[data-slot=control]]:mt-0.5',
        '[&>[data-slot=label]]:col-start-1 [&>[data-slot=label]]:row-start-1',
        '[&>[data-slot=description]]:col-start-1 [&>[data-slot=description]]:row-start-2',
        'has-data-[slot=description]:**:data-[slot=label]:font-medium'
      )}
    />
  )
}

export function Switch({
  className,
  ...props
}: { className?: string } & Omit<Headless.SwitchProps, 'as' | 'className' | 'children'>) {
  return (
    <Headless.Switch
      data-slot="control"
      {...props}
      className={cn(
        className,
        'group relative isolate inline-flex h-6 w-10 cursor-default rounded-full p-[3px] sm:h-5 sm:w-8',
        'transition duration-0 ease-in-out data-changing:duration-200',
        'forced-colors:outline forced-colors:bg-[Highlight] dark:forced-colors:bg-[Highlight]',
        'bg-muted ring-1 ring-black/5 ring-inset dark:bg-white/5 dark:ring-white/15',
        'data-checked:bg-primary data-checked:ring-primary/90',
        'dark:data-checked:bg-primary dark:data-checked:ring-primary/90',
        'focus:not-data-[focus]:outline-hidden data-[focus]:outline-2 data-[focus]:outline-offset-2 data-[focus]:outline-ring',
        'data-[hover]:ring-black/15 data-[hover]:data-checked:ring-primary/90',
        'dark:data-[hover]:ring-white/25 dark:data-[hover]:data-checked:ring-primary/90',
        'data-[disabled]:bg-muted data-[disabled]:opacity-50 data-[disabled]:data-checked:bg-muted data-[disabled]:data-checked:ring-black/5',
        'dark:data-[disabled]:bg-white/15 dark:data-[disabled]:data-checked:bg-white/15 dark:data-[disabled]:data-checked:ring-white/15'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none relative inline-block size-4.5 rounded-full sm:size-3.5',
          'translate-x-0 transition duration-200 ease-in-out',
          'border border-transparent',
          'bg-background shadow-sm ring-1 ring-black/5',
          'group-data-checked:bg-primary-foreground group-data-checked:shadow-sm group-data-checked:ring-primary/90',
          'group-data-checked:translate-x-4 sm:group-data-checked:translate-x-3',
          'group-data-checked:group-data-[disabled]:bg-background group-data-checked:group-data-[disabled]:shadow-sm group-data-checked:group-data-[disabled]:ring-black/5'
        )}
      />
    </Headless.Switch>
  )
}
