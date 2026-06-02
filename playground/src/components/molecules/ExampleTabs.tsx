import React from 'react'
import { cn } from '@/lib/utils'

interface ExampleTabsProps {
  examples: Array<{ label: string }>
  activeIndex: number
  onSelect: (index: number) => void
}

export const ExampleTabs: React.FC<ExampleTabsProps> = ({
  examples,
  activeIndex,
  onSelect,
}) => {
  if (examples.length === 0) return null

  return (
    <div className="mt-6 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2 px-3 py-3">
        {examples.map((example, index) => {
          const selected = index === activeIndex
          return (
            <button
              key={`${example.label}-${index}`}
              type="button"
              onClick={() => onSelect(index)}
              className={cn(
                'rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition-all active:scale-95',
                selected
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : 'border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {example.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
