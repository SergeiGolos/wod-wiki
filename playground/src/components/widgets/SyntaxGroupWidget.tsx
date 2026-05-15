import { ExternalLink } from 'lucide-react'

export interface SyntaxGroupWidgetConfig {
  category: string
  icon: string
  title: string
  description: string
  example: string
  docsPath: string
}

interface SyntaxGroupWidgetProps {
  config: SyntaxGroupWidgetConfig
  onOpenDocs: (docsPath: string) => void
}

export function SyntaxGroupWidget({ config, onOpenDocs }: SyntaxGroupWidgetProps) {
  if (!config.category || !config.title || !config.docsPath) {
    return (
      <article className="rounded-2xl border border-amber-400/50 bg-amber-50 p-5 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
        Invalid <code>syntax-group</code> widget config.
      </article>
    )
  }

  return (
    <article className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            {config.category}
          </p>
          <h3 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <span className="mr-2" aria-hidden="true">{config.icon}</span>
            {config.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{config.description}</p>
        </div>

        <button
          type="button"
          onClick={() => onOpenDocs(config.docsPath)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Docs
          <ExternalLink className="size-3" aria-hidden="true" />
        </button>
      </div>

      <pre className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-200">
        <code>{config.example}</code>
      </pre>
    </article>
  )
}
