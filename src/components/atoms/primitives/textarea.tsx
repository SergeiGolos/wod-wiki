import * as Headless from '@headlessui/react'
import { cn } from "@/lib/utils"
import React, { forwardRef } from 'react'

export const Textarea = forwardRef<HTMLTextAreaElement, {
  className?: string
  resizable?: boolean
} & Omit<Headless.TextareaProps, 'as' | 'className'>>(
  function Textarea({ className, resizable = true, ...props }, ref) {
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
        <Headless.Textarea
          ref={ref}
          {...props}
          className={cn(
            'relative block h-full w-full appearance-none rounded-lg px-[calc(theme(spacing.3.5)-1px)] py-[calc(theme(spacing.2.5)-1px)]',
            'sm:px-[calc(theme(spacing.3)-1px)] sm:py-[calc(theme(spacing.1.5)-1px)]',
            'text-base/6 text-foreground placeholder:text-muted-foreground sm:text-sm/6',
            'border border-border/60 data-[hover]:border-border dark:border-white/10 dark:data-[hover]:border-white/20',
            'bg-transparent dark:bg-white/5',
            'focus:outline-hidden',
            'data-invalid:border-destructive data-invalid:data-[hover]:border-destructive',
            'disabled:border-border/40 dark:disabled:border-white/15 dark:disabled:bg-white/2.5 dark:data-[hover]:disabled:border-white/15',
            resizable ? 'resize-y' : 'resize-none',
            'dark:scheme-dark',
            className
          )}
        />
      </span>
    )
  }
)
