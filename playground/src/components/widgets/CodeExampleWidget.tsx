import { useEffect, useMemo, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { Play } from 'lucide-react'

export interface CodeExampleLine {
  code: string
  annotation: string
}

export interface CodeExampleWidgetConfig {
  lines: CodeExampleLine[]
  cta: string
}

interface CodeExampleWidgetProps {
  config: CodeExampleWidgetConfig
  isDarkMode: boolean
  onRun: (script: string) => void
}

export function CodeExampleWidget({ config, isDarkMode, onRun }: CodeExampleWidgetProps) {
  const editorHostRef = useRef<HTMLDivElement | null>(null)
  const editorViewRef = useRef<EditorView | null>(null)

  const script = useMemo(() => config.lines.map((line) => line.code).join('\n'), [config.lines])

  useEffect(() => {
    if (!editorHostRef.current) return

    editorViewRef.current?.destroy()

    editorViewRef.current = new EditorView({
      state: EditorState.create({
        doc: script,
        extensions: [
          lineNumbers(),
          markdown(),
          EditorState.readOnly.of(false),
          EditorView.theme({
            '&': {
              fontSize: '13px',
              borderRadius: '12px',
              border: '1px solid var(--cm-border)',
            },
            '.cm-scroller': {
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              lineHeight: '1.6',
              minHeight: '180px',
            },
            '.cm-content': {
              padding: '14px 0',
            },
            '.cm-gutters': {
              backgroundColor: 'transparent',
              borderRight: '1px solid var(--cm-border)',
            },
          }),
          EditorView.theme(
            {
              '&': {
                '--cm-border': isDarkMode ? 'rgba(82, 82, 91, 0.7)' : 'rgba(212, 212, 216, 0.9)',
              },
            },
            { dark: isDarkMode },
          ),
          ...(isDarkMode ? [oneDark] : []),
        ],
      }),
      parent: editorHostRef.current,
    })

    return () => {
      editorViewRef.current?.destroy()
      editorViewRef.current = null
    }
  }, [isDarkMode, script])

  if (config.lines.length === 0) {
    return (
      <section className="rounded-2xl border border-amber-400/50 bg-amber-50 p-6 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
        Invalid <code>code-example</code> widget config.
      </section>
    )
  }

  return (
    <section className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Code example</h2>
        <button
          type="button"
          onClick={() => onRun(editorViewRef.current?.state.doc.toString() ?? script)}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
        >
          <Play className="size-3.5" aria-hidden="true" />
          {config.cta}
        </button>
      </div>

      <div ref={editorHostRef} />

      <ul className="mt-4 space-y-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
        {config.lines.map((line, index) => (
          <li key={`${line.code}-${index}`} className="flex gap-2">
            <span className="mt-1 inline-block size-1.5 rounded-full bg-zinc-400" aria-hidden="true" />
            <span>
              <code className="rounded bg-zinc-200/70 px-1 py-0.5 text-[12px] dark:bg-zinc-800">{line.code}</code> — {line.annotation}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
