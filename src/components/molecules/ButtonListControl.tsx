import * as React from 'react'
import { cn } from '@/lib/utils'
import { executeNavAction, type INavAction, type INavActivation, type NavActionDeps } from '@/nav/navTypes'

export interface ButtonListControlItem extends INavActivation {
  description?: React.ReactNode
  badge?: React.ReactNode
}

export interface ButtonListControlProps {
  items: ButtonListControlItem[]
  selectedId?: string
  defaultSelectedId?: string
  onSelectedIdChange?: (id: string) => void
  onAction?: (action: INavAction, activation: ButtonListControlItem) => void
  deps?: NavActionDeps
  orientation?: 'vertical' | 'horizontal'
  className?: string
  itemClassName?: string
}

function runActivation(
  item: ButtonListControlItem,
  onAction?: ButtonListControlProps['onAction'],
  deps?: NavActionDeps,
): void {
  if (onAction) {
    onAction(item.action, item)
    return
  }

  if (item.action.type === 'call') {
    item.action.handler()
    return
  }

  if (deps) {
    executeNavAction(item.action, deps)
  }
}

export const ButtonListControl: React.FC<ButtonListControlProps> = ({
  items,
  selectedId,
  defaultSelectedId,
  onSelectedIdChange,
  onAction,
  deps,
  orientation = 'vertical',
  className,
  itemClassName,
}) => {
  const [internalSelectedId, setInternalSelectedId] = React.useState<string | undefined>(
    defaultSelectedId ?? items[0]?.id,
  )

  React.useEffect(() => {
    if (selectedId !== undefined) return
    if (!items.some(item => item.id === internalSelectedId)) {
      setInternalSelectedId(defaultSelectedId ?? items[0]?.id)
    }
  }, [defaultSelectedId, internalSelectedId, items, selectedId])

  const activeId = selectedId ?? internalSelectedId

  return (
    <div
      className={cn(
        'flex gap-2',
        orientation === 'vertical' ? 'flex-col' : 'flex-wrap',
        className,
      )}
      role="listbox"
      aria-orientation={orientation}
    >
      {items.map(item => {
        const Icon = item.icon
        const isActive = item.id === activeId

        return (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={isActive}
            onClick={() => {
              if (selectedId === undefined) {
                setInternalSelectedId(item.id)
              }
              onSelectedIdChange?.(item.id)
              runActivation(item, onAction, deps)
            }}
            className={cn(
              'group min-w-0 rounded-xl border px-4 py-3 text-left transition-all',
              orientation === 'horizontal' && 'flex-1 min-w-[14rem]',
              isActive
                ? 'border-primary/40 bg-primary/10 text-foreground shadow-sm'
                : 'border-border/70 bg-background text-foreground hover:border-border hover:bg-muted/60',
              itemClassName,
            )}
          >
            <div className="flex items-start gap-3">
              {Icon && (
                <span
                  className={cn(
                    'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
                    isActive
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border/60 bg-muted/50 text-muted-foreground group-hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.description && (
                  <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </div>
                )}
              </div>

              <span
                className={cn(
                  'mt-1 h-2.5 w-2.5 shrink-0 rounded-full transition-colors',
                  isActive ? 'bg-primary' : 'bg-border group-hover:bg-muted-foreground/40',
                )}
                aria-hidden="true"
              />
            </div>
          </button>
        )
      })}
    </div>
  )
}
