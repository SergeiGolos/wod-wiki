import * as React from 'react'
import { ArrowUturnLeftIcon, CheckIcon, PencilSquareIcon } from '@heroicons/react/20/solid'

import { cn } from '@/lib/utils'

export type WidgetEditButtonMode = 'view' | 'editing' | 'error'

export interface WidgetEditButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'title' | 'children'> {
  mode: WidgetEditButtonMode
  enterEditMode: () => void
  onSave: () => void
  onUndo: () => void
}

export const WIDGET_EDIT_BUTTON_LABELS: Record<WidgetEditButtonMode, string> = {
  view: 'Edit widget',
  editing: 'Save widget',
  error: 'Undo changes',
}

function getModeClickHandler(
  mode: WidgetEditButtonMode,
  enterEditMode: () => void,
  onSave: () => void,
  onUndo: () => void,
): () => void {
  if (mode === 'editing') return onSave
  if (mode === 'error') return onUndo
  return enterEditMode
}

function iconVisibilityClass(isVisible: boolean): string {
  return isVisible
    ? 'opacity-100 scale-100 rotate-0'
    : 'pointer-events-none opacity-0 scale-75 -rotate-12'
}

export const WidgetEditButton = React.forwardRef<HTMLButtonElement, WidgetEditButtonProps>(
  ({ mode, enterEditMode, onSave, onUndo, className, type = 'button', ...props }, ref) => {
    const label = WIDGET_EDIT_BUTTON_LABELS[mode]
    const onClick = getModeClickHandler(mode, enterEditMode, onSave, onUndo)

    return (
      <button
        {...props}
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        data-mode={mode}
        onClick={onClick}
        className={cn(
          'absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/80 bg-background/90 shadow-sm backdrop-blur-sm transition-all duration-200 ease-out hover:bg-muted/80 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer',
          mode === 'view' && 'text-muted-foreground hover:text-foreground',
          mode === 'editing' && 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300',
          mode === 'error' && 'text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300',
          className,
        )}
      >
        <span className="relative h-4 w-4" aria-hidden="true">
          <PencilSquareIcon
            data-icon-state="view"
            className={cn(
              'absolute inset-0 h-4 w-4 transition-all duration-200 ease-out',
              iconVisibilityClass(mode === 'view'),
            )}
          />
          <CheckIcon
            data-icon-state="editing"
            className={cn(
              'absolute inset-0 h-4 w-4 transition-all duration-200 ease-out',
              iconVisibilityClass(mode === 'editing'),
            )}
          />
          <ArrowUturnLeftIcon
            data-icon-state="error"
            className={cn(
              'absolute inset-0 h-4 w-4 transition-all duration-200 ease-out',
              iconVisibilityClass(mode === 'error'),
            )}
          />
        </span>
      </button>
    )
  },
)

WidgetEditButton.displayName = 'WidgetEditButton'
