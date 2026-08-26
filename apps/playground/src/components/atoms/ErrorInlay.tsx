import { ExclamationTriangleIcon } from '@heroicons/react/20/solid'

import { cn } from '@/lib/utils'

export interface ErrorInlayProps {
  message: string
  className?: string
}

export function ErrorInlay({ message, className }: ErrorInlayProps) {
  return (
    <div
      role="alert"
      data-testid="widget-error-inlay"
      className={cn(
        'mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive shadow-sm',
        className,
      )}
    >
      <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium">Widget JSON error</p>
        <p className="font-mono text-xs leading-5 text-destructive/90">{message}</p>
      </div>
    </div>
  )
}
