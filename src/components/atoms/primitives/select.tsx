import * as Headless from '@headlessui/react'
import { cn } from "@/lib/utils"
import { forwardRef } from 'react'

export const Select = forwardRef<HTMLSelectElement, {
  className?: string
} & Omit<Headless.SelectProps, 'as' | 'className'>>(
  function Select({ className, multiple, ...props }, ref) {
    return (
      <span
        data-slot="control"
        className={cn(
          'group relative block w-full',
          'before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)] before:bg-background before:shadow-sm',
          'dark:before:hidden',
          'after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset',
          'has-data-[focus]:after:ring-2 has-data-[focus]:after:ring-ring',
          'has-data-[disabled]:opacity-50 has-data-[disabled]:before:bg-muted/50 has-data-[disabled]:before:shadow-none'
        )}
      >
        <Headless.Select
          ref={ref}
          multiple={multiple}
          {...props}
          className={cn(
            'relative block w-full appearance-none rounded-lg py-[calc(theme(spacing.2.5)-1px)]',
            'sm:py-[calc(theme(spacing.1.5)-1px)]',
            multiple
              ? 'px-[calc(theme(spacing.3.5)-1px)] sm:px-[calc(theme(spacing.3)-1px)]'
              : 'pr-[calc(theme(spacing.10)-1px)] pl-[calc(theme(spacing.3.5)-1px)] sm:pr-[calc(theme(spacing.9)-1px)] sm:pl-[calc(theme(spacing.3)-1px)]',
            '[&_optgroup]:font-semibold',
            'text-base/6 text-foreground placeholder:text-muted-foreground sm:text-sm/6 dark:[&>*]:text-white',
            'border border-border/60 data-[hover]:border-border dark:border-white/10 dark:data-[hover]:border-white/20',
            'bg-transparent dark:bg-white/5 dark:[&>*]:bg-muted',
            'focus:outline-hidden',
            'data-invalid:border-destructive data-invalid:data-[hover]:border-destructive',
            'data-[disabled]:border-border/40 data-[disabled]:opacity-100 dark:data-[disabled]:border-white/15 dark:data-[disabled]:bg-white/2.5 dark:data-[hover]:data-[disabled]:border-white/15',
            'dark:scheme-dark',
            className
          )}
        />
        {!multiple && (
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <svg
              className="size-5 stroke-muted-foreground group-has-data-[disabled]:stroke-muted-foreground/70 sm:size-4 forced-colors:stroke-[CanvasText]"
              viewBox="0 0 16 16"
              aria-hidden="true"
              fill="none"
            >
              <path d="M5.75 10.75L8 13L10.25 10.75" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10.25 5.25L8 3L5.75 5.25" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </span>
    )
  }
)
