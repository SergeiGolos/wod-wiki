import { useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Moon, Sun, Sparkles, PanelTop, LayoutGrid } from 'lucide-react'
import { useTheme } from '@/components/theme/ThemeProvider'
import { Switch } from '@/components/playground/switch'
import { usePaletteStore } from '@/components/command-palette/palette-store'
import { canvasRoutes } from '../canvas/canvasRoutes'
import { globalSearchSource } from '../services/paletteDataSources'
import { createPlaygroundPage } from '../services/createPlaygroundPage'
import { AttentionWidget, type AttentionActionType, type AttentionWidgetConfig } from '../components/widgets/AttentionWidget'
import { CodeExampleWidget, type CodeExampleWidgetConfig } from '../components/widgets/CodeExampleWidget'
import { SyntaxGroupWidget, type SyntaxGroupWidgetConfig } from '../components/widgets/SyntaxGroupWidget'
import { playgroundPath, reviewPath, workoutPath } from '../lib/routes'

const ATTENTION_CONFIG: AttentionWidgetConfig = {
  headline: 'Build and preview widget-driven workout pages.',
  subtitle:
    'Phase 2.2 integrates the attention, code-example, and syntax-group widgets into one interactive playground surface.',
  pillars: [
    {
      icon: <Sparkles className="size-4" aria-hidden="true" />,
      label: 'Attention widget',
      description: 'High-signal hero block with actionable CTAs.',
    },
    {
      icon: <PanelTop className="size-4" aria-hidden="true" />,
      label: 'Code example widget',
      description: 'Editable CodeMirror sample with runnable workout output.',
    },
    {
      icon: <LayoutGrid className="size-4" aria-hidden="true" />,
      label: 'Syntax group widget',
      description: 'Grouped syntax cards linked to docs.',
    },
  ],
  actions: [
    { label: 'Jump to workout', action: 'scroll-to-workout', variant: 'primary' },
    { label: 'Open search', action: 'open-search', variant: 'secondary' },
  ],
}

const CODE_EXAMPLE_CONFIG: CodeExampleWidgetConfig = {
  lines: [
    { code: 'AMRAP 12:00', annotation: 'Run this block for 12 minutes.' },
    { code: '  10 Kettlebell Swings 24kg', annotation: 'Power hinge + posterior chain volume.' },
    { code: '  8 Burpees', annotation: 'Conditioning burst each round.' },
    { code: '  *:30 Rest', annotation: 'Keep transitions deliberate and repeatable.' },
  ],
  cta: 'Run this example',
}

const SYNTAX_GROUP_CONFIGS: SyntaxGroupWidgetConfig[] = [
  {
    category: 'Structure',
    icon: '🔁',
    title: 'Rounds',
    description: 'Use parenthesis to repeat grouped blocks.',
    example: '(3)\n  8 Front Squats 95lb\n  *:45 Rest',
    docsPath: '/guide/syntax?h=groups',
  },
  {
    category: 'Timing',
    icon: '⏱️',
    title: 'Timers',
    description: 'Countdowns and rest timers can mix in one block.',
    example: '2:00 Row\n*:30 Rest',
    docsPath: '/guide/syntax?h=timers',
  },
  {
    category: 'Loading',
    icon: '🏋️',
    title: 'Rep schemes',
    description: 'Comma-separated reps compress descending sets.',
    example: '21,15,9 Thrusters 95lb',
    docsPath: '/guide/syntax?h=metrics',
  },
]

const workoutFiles = import.meta.glob('../../../markdown/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})

export function PlaygroundLandingPage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const workoutSectionRef = useRef<HTMLElement | null>(null)

  const isDarkMode = useMemo(() => {
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  const workoutItems = useMemo(() => {
    return Object.entries(workoutFiles).map(([path, fileContent]) => {
      const parts = path.split('/')
      const fileName = parts[parts.length - 1].replace('.md', '')

      let category = 'General'
      const markdownIdx = parts.indexOf('markdown')
      if (markdownIdx !== -1 && parts.length > markdownIdx + 2) {
        category = parts[markdownIdx + 2]
      }

      return {
        id: path,
        name: fileName,
        category,
        content: fileContent as string,
      }
    })
  }, [])

  const handleSelectWorkout = useCallback(
    (item: { name: string; category?: string }) => {
      const category = item.category || 'General'
      navigate(workoutPath(category, item.name))
    },
    [navigate],
  )

  const openSearch = useCallback(async () => {
    const result = await usePaletteStore.getState().open({
      placeholder: 'Search workouts, results, pages…',
      sources: [globalSearchSource(workoutItems, canvasRoutes)],
    })

    if (result.dismissed) return
    const item = result.item

    if (item.type === 'route') {
      navigate((item.payload as { route: string }).route)
      return
    }

    if (item.type === 'workout') {
      handleSelectWorkout(item.payload as { name: string; category?: string })
      return
    }

    if (item.type === 'journal-entry') {
      navigate(reviewPath(item.id))
    }
  }, [handleSelectWorkout, navigate, workoutItems])

  const handleAttentionAction = useCallback(
    (action: AttentionActionType) => {
      if (action === 'scroll-to-workout') {
        workoutSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }

      if (action === 'open-search') {
        void openSearch()
      }
    },
    [openSearch],
  )

  const handleRunExample = useCallback(
    async (script: string) => {
      const template = [
        '# Playground Widget Example',
        '',
        '```wod',
        script,
        '```',
        '',
        '[▶ Run Workout]{.button action=start-workout}',
        '',
      ].join('\n')

      const id = await createPlaygroundPage(template)
      navigate(playgroundPath(id))
    },
    [navigate],
  )

  const handleOpenDocs = useCallback(
    (docsPath: string) => {
      if (/^https?:\/\//i.test(docsPath)) {
        window.open(docsPath, '_blank', 'noopener,noreferrer')
        return
      }
      navigate(docsPath)
    },
    [navigate],
  )

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10 sm:px-8 lg:px-12 lg:py-14">
      <div className="mb-6 flex justify-end">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/70">
          <Sun className="size-4 text-zinc-500" aria-hidden="true" />
          <Switch
            checked={isDarkMode}
            onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            aria-label="Toggle dark mode"
          />
          <Moon className="size-4 text-zinc-500" aria-hidden="true" />
        </div>
      </div>

      <AttentionWidget config={ATTENTION_CONFIG} onAction={handleAttentionAction} />

      <section ref={workoutSectionRef} id="workout-widget-surface" className="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CodeExampleWidget
            config={CODE_EXAMPLE_CONFIG}
            isDarkMode={isDarkMode}
            onRun={handleRunExample}
          />
        </div>

        <div className="space-y-4">
          {SYNTAX_GROUP_CONFIGS.map((config) => (
            <SyntaxGroupWidget key={config.title} config={config} onOpenDocs={handleOpenDocs} />
          ))}
        </div>
      </section>
    </main>
  )
}
