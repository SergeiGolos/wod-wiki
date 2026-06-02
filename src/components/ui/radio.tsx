import * as Headless from '@headlessui/react'
import { cn } from "@/lib/utils"
import type React from 'react'

export function RadioGroup({
  className,
  ...props
}: { className?: string } & Omit<Headless.RadioGroupProps, 'as' | 'className'>) {
  return (
    <Headless.RadioGroup
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

export function RadioField({
  className,
  ...props
}: { className?: string } & Omit<Headless.FieldProps, 'as' | 'className'>) {
  return (
    <Headless.Field
      data-slot="field"
      {...props}
      className={cn(
        className,
        'grid grid-cols-[1.125rem_1fr] gap-x-4 gap-y-1 sm:grid-cols-[1rem_1fr]',
        '[&>[data-slot=control]]:col-start-1 [&>[data-slot=control]]:row-start-1 [&>[data-slot=control]]:mt-0.75 sm:[&>[data-slot=control]]:mt-1',
        '[&>[data-slot=label]]:col-start-2 [&>[data-slot=label]]:row-start-1',
        '[&>[data-slot=description]]:col-start-2 [&>[data-slot=description]]:row-start-2',
        'has-data-[slot=description]:**:data-[slot=label]:font-medium'
      )}
    />
  )
}

const base = [
  'relative isolate flex size-4.75 shrink-0 rounded-full sm:size-4.25',
  'before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-background before:shadow-sm',
  'group-data-checked:before:bg-primary',
  'dark:before:hidden',
  'dark:bg-white/5 dark:group-data-checked:bg-primary',
  'border border-border/60 group-data-checked:border-transparent',
  'group-data-[hover]:group-data-checked:border-transparent group-data-[hover]:border-border',
  'dark:border-white/15 dark:group-data-checked:border-white/5 dark:group-data-[hover]:group-data-checked:border-white/5 dark:group-data-[hover]:border-white/30',
  'after:absolute after:inset-0 after:rounded-full after:shadow-[inset_0_1px_theme(colors.white/15%)]',
  'dark:after:-inset-px dark:after:hidden dark:after:rounded-full dark:group-data-checked:after:block',
  'group-data-[focus]:outline group-data-[focus]:outline-2 group-data-[focus]:outline-offset-2 group-data-[focus]:outline-ring',
  'group-data-[disabled]:opacity-50',
  'group-data-[disabled]:border-border/40 group-data-[disabled]:bg-muted/30 group-data-[disabled]:before:bg-transparent',
  'dark:group-data-[disabled]:border-white/20 dark:group-data-[disabled]:bg-white/2.5 dark:group-data-checked:group-data-[disabled]:after:hidden',
] as const

export function Radio({
  className,
  ...props
}: { className?: string } & Omit<Headless.RadioProps, 'as' | 'className' | 'children'>) {
  return (
    <Headless.Radio
      data-slot="control"
      {...props}
      className={cn(className, 'group inline-flex focus:outline-hidden')}
    >
      <span className={cn(base)}>
        <span
          className={cn(
            'size-full rounded-full border-[4.5px] border-transparent bg-primary bg-clip-padding',
            'opacity-0 group-data-checked:opacity-100',
            'forced-colors:border-[Canvas] forced-colors:group-data-checked:border-[Highlight]'
          )}
        />
      </span>
    </Headless.Radio>
  )
}
