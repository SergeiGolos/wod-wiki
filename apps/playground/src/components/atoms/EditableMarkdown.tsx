import * as React from 'react'

import { cn } from '@/lib/utils'

export interface EditableMarkdownProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'children'> {
  hasError?: boolean
}

export const EditableMarkdown = React.forwardRef<HTMLTextAreaElement, EditableMarkdownProps>(
  ({ className, hasError = false, spellCheck = false, ...props }, ref) => {
    return (
      <textarea
        {...props}
        ref={ref}
        spellCheck={spellCheck}
        className={cn(
          'min-h-[160px] w-full rounded-xl border bg-background px-4 py-3 font-mono text-sm leading-6 text-foreground shadow-sm outline-none transition-colors duration-200 ease-out placeholder:text-muted-foreground/70',
          'focus:border-ring focus:ring-2 focus:ring-ring/20',
          hasError
            ? 'border-destructive/70 focus:border-destructive focus:ring-destructive/20'
            : 'border-border/70',
          className,
        )}
      />
    )
  },
)

EditableMarkdown.displayName = 'EditableMarkdown'
