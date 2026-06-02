import * as Headless from '@headlessui/react'
import { cn } from "@/lib/utils"
import React, { forwardRef } from 'react'

export function InputGroup({ children }: React.ComponentPropsWithoutRef<'span'>) {
  return (
    <span
      data-slot="control"
      className={cn(
        'relative isolate block',
        'has-[[data-slot=icon]:first-child]:[&_input]:pl-10 has-[[data-slot=icon]:last-child]:[&_input]:pr-10',
        'sm:has-[[data-slot=icon]:first-child]:[&_input]:pl-8 sm:has-[[data-slot=icon]:last-child]:[&_input]:pr-8',
        '[&>[data-slot=icon]]:pointer-events-none [&>[data-slot=icon]]:absolute [&>[data-slot=icon]]:top-3 [&>[data-slot=icon]]:z-10 [&>[data-slot=icon]]:size-5',
        'sm:[&>[data-slot=icon]]:top-2.5 sm:[&>[data-slot=icon]]:size-4',
        '[&>[data-slot=icon]:first-child]:left-3 sm:[&>[data-slot=icon]:first-child]:left-2.5',
        '[&>[data-slot=icon]:last-child]:right-3 sm:[&>[data-slot=icon]:last-child]:right-2.5',
        '[&>[data-slot=icon]]:text-muted-foreground'
      )}
    >
      {children}
    </span>
  )
}

const dateTypes = ['date', 'datetime-local', 'month', 'time', 'week'] as const
type DateType = (typeof dateTypes)[number]

export const Input = forwardRef<HTMLInputElement, {
  className?: string
  type?: 'email' | 'number' | 'password' | 'search' | 'tel' | 'text' | 'url' | DateType
} & Omit<Headless.InputProps, 'as' | 'className'>>(
  function Input({ className, ...props }, ref) {
    return (
      <span
        data-slot="control"
        className={cn(
          'relative block w-full',
          'before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)] before:bg-background before:shadow-sm',
          'dark:before:hidden',
          'after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset',
          'sm:focus-within:after:ring-2 sm:focus-within:after:ring-ring',
          'has-data-[disabled]:opacity-50 has-data-[disabled]:before:bg-muted/50 has-data-[disabled]:before:shadow-none'
        )}
      >
        <Headless.Input
          ref={ref}
          {...props}
          className={cn(
            props.type && dateTypes.includes(props.type as DateType) && [
              '[&::-webkit-datetime-edit-fields-wrapper]:p-0',
              '[&::-webkit-date-and-time-value]:min-h-[1.5em]',
              '[&::-webkit-datetime-edit]:inline-flex',
              '[&::-webkit-datetime-edit]:p-0',
              '[&::-webkit-datetime-edit-year-field]:p-0',
              '[&::-webkit-datetime-edit-month-field]:p-0',
              '[&::-webkit-datetime-edit-day-field]:p-0',
              '[&::-webkit-datetime-edit-hour-field]:p-0',
              '[&::-webkit-datetime-edit-minute-field]:p-0',
              '[&::-webkit-datetime-edit-second-field]:p-0',
              '[&::-webkit-datetime-edit-millisecond-field]:p-0',
              '[&::-webkit-datetime-edit-meridiem-field]:p-0',
            ],
            'relative block w-full appearance-none rounded-lg px-[calc(theme(spacing.3.5)-1px)] py-[calc(theme(spacing.2.5)-1px)]',
            'sm:px-[calc(theme(spacing.3)-1px)] sm:py-[calc(theme(spacing.1.5)-1px)]',
            'text-base/6 text-foreground placeholder:text-muted-foreground sm:text-sm/6',
            'border border-border/60 hover:border-border data-[hover]:border-border',
            'bg-transparent dark:bg-white/5',
            'focus:outline-hidden',
            'data-invalid:border-destructive data-invalid:data-[hover]:border-destructive',
            'data-[disabled]:border-border/40 dark:data-[disabled]:border-border/30 dark:data-[disabled]:bg-white/2.5',
            'dark:scheme-dark',
            className
          )}
        />
      </span>
    )
  }
)
