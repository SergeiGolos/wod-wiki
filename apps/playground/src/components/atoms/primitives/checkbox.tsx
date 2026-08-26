import * as Headless from '@headlessui/react'
import { cn } from "@/lib/utils"
import type React from 'react'

export function CheckboxGroup({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      {...props}
      className={cn(
        className,
        '[&>*+[data-slot=control]]:mt-3 [&>[data-slot=label]]:font-medium'
      )}
    />
  )
}

export function CheckboxField({
  className,
  ...props
}: { className?: string } & Omit<Headless.FieldProps, 'as' | 'className'>) {
  return (
    <Headless.Field
      {...props}
      className={cn(
        className,
        '[&>[data-slot=label]]:font-normal'
      )}
    />
  )
}

const base = [
  'relative isolate flex size-4.5 items-center justify-center rounded-[0.3125rem] sm:size-4',
  'before:absolute before:inset-0 before:-z-10 before:rounded-[calc(0.3125rem-1px)] before:bg-background before:shadow-sm',
  'group-data-checked:before:bg-primary',
  'dark:before:hidden',
  'dark:bg-white/5 dark:group-data-checked:bg-primary',
  'border border-border/60 group-data-checked:border-transparent',
  'group-data-[hover]:group-data-checked:border-transparent group-data-[hover]:border-border',
  'dark:border-white/15 dark:group-data-checked:border-white/5 dark:group-data-[hover]:group-data-checked:border-white/5 dark:group-data-[hover]:border-white/30',
  'after:absolute after:inset-0 after:rounded-[calc(0.3125rem-1px)] after:shadow-[inset_0_1px_theme(colors.white/15%)]',
  'dark:after:-inset-px dark:after:hidden dark:after:rounded-[0.3125rem] dark:group-data-checked:after:block',
  'group-data-[focus]:outline-2 group-data-[focus]:outline-offset-2 group-data-[focus]:outline-ring',
  'group-data-[disabled]:opacity-50',
  'group-data-[disabled]:border-border/40 group-data-[disabled]:bg-muted/30 group-data-[disabled]:before:bg-transparent',
  'dark:group-data-[disabled]:border-white/20 dark:group-data-[disabled]:bg-white/2.5 dark:group-data-checked:group-data-[disabled]:after:hidden',
  'forced-colors:[--checkbox-check:HighlightText] forced-colors:[--checkbox-checked-bg:Highlight] forced-colors:group-data-[disabled]:[--checkbox-check:Highlight]',
  'dark:forced-colors:[--checkbox-checked-bg:Highlight]',
] as const

export function Checkbox({
  className,
  ...props
}: { className?: string } & Omit<Headless.CheckboxProps, 'as' | 'className'>) {
  return (
    <Headless.Checkbox
      data-slot="control"
      {...props}
      className={cn(className, 'group inline-flex focus:outline-hidden')}
    >
      <span className={cn(base)}>
        <svg
          className="size-4 stroke-[var(--checkbox-check)] opacity-0 group-data-checked:opacity-100 sm:h-3.5 sm:w-3.5"
          viewBox="0 0 14 14"
          fill="none"
        >
          <path
            className="opacity-100 group-data-indeterminate:opacity-0"
            d="M3 8L6 11L11 3.5"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            className="opacity-0 group-data-indeterminate:opacity-100"
            d="M3 7H11"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </Headless.Checkbox>
  )
}
