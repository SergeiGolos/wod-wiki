import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

export type AttentionActionType = 'scroll-to-workout' | 'open-search'

export interface AttentionPillar {
  icon: ReactNode
  label: string
  description: string
}

export interface AttentionAction {
  label: string
  action: AttentionActionType
  variant: 'primary' | 'secondary'
}

export interface AttentionWidgetConfig {
  headline: string
  subtitle: string
  pillars: AttentionPillar[]
  actions: AttentionAction[]
}

interface AttentionWidgetProps {
  config: AttentionWidgetConfig
  onAction: (action: AttentionActionType) => void
}

export function AttentionWidget({ config, onAction }: AttentionWidgetProps) {
  if (!config.headline || !config.subtitle || config.pillars.length === 0) {
    return (
      <section className="rounded-3xl border border-amber-400/50 bg-amber-50 p-6 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
        Invalid <code>attention</code> widget config.
      </section>
    )
  }

  return (
    <section className="p-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
        Playground
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-4xl">
        {config.headline}
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
        {config.subtitle}
      </p>

      <div className="mt-7 grid gap-3 md:grid-cols-3">
        {config.pillars.map((pillar) => (
          <div
            key={pillar.label}
            className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70"
          >
            <div className="mb-3 inline-flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              {pillar.icon}
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{pillar.label}</h3>
            <p className="mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{pillar.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-7 flex flex-wrap gap-3">
        {config.actions.map((item) => (
          <button
            key={`${item.action}-${item.label}`}
            type="button"
            onClick={() => onAction(item.action)}
            className={
              item.variant === 'primary'
                ? 'inline-flex items-center gap-2 rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-zinc-50 transition hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900'
                : 'inline-flex items-center gap-2 rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800'
            }
          >
            {item.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  )
}
