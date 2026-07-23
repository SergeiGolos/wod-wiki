import { useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Moon, Sun, Sparkles, PanelTop, LayoutGrid } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeProvider'
import { Switch } from '@/components/atoms/primitives/switch'
import { usePaletteStore } from '@/components/organisms/command-palette/palette-store'
import { canvasRoutes } from '../canvas/canvasRoutes'
import { globalSearchSource } from '../services/paletteDataSources'
import { createPlaygroundPage } from '../services/createPlaygroundPage'
import { AttentionWidget, type AttentionActionType, type AttentionWidgetConfig } from '../components/molecules/AttentionWidget'
import { CodeExampleWidget, type CodeExampleWidgetConfig } from '../components/molecules/CodeExampleWidget'
import { SyntaxGroupWidget, type SyntaxGroupWidgetConfig } from '../components/molecules/SyntaxGroupWidget'
import { syntaxGuideReference } from '@/content/syntaxGuideReference'
import { playgroundPath, reviewPath, workoutPath } from '../lib/routes'
import { useWorkoutItems } from '../lib/workoutIndex'
import { useShowPlaygrounds } from '../hooks/useShowPlaygrounds'
import { LandingTemplate } from '../templates/LandingTemplate'

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

const classicAmrapLines = syntaxGuideReference.classicAmrap.workout.split('\n')

const CODE_EXAMPLE_CONFIG: CodeExampleWidgetConfig = {
  lines: [
    {
      code: classicAmrapLines[0] ?? '20:00 AMRAP',
      annotation: 'Classic AMRAP from the guide — fixed time window with unbounded rounds.',
    },
    { code: classicAmrapLines[1] ?? '  5 Pullups', annotation: 'Start each round with five pullups.' },
    { code: classicAmrapLines[2] ?? '  10 Pushups', annotation: 'Then move into ten pushups.' },
    {
      code: classicAmrapLines[3] ?? '  15 Air Squats',
      annotation: 'Finish the round with fifteen air squats before looping.',
    },
  ],
  cta: 'Run this example',
}

const SYNTAX_GROUP_CONFIGS: SyntaxGroupWidgetConfig[] = [
  {
    category: 'Structure',
    icon: '🔁',
    title: syntaxGuideReference.simpleRounds.title,
    description: syntaxGuideReference.simpleRounds.subtitle,
    example: syntaxGuideReference.simpleRounds.workout,
    docsPath: syntaxGuideReference.simpleRounds.docsPath,
  },
  {
    category: 'Timing',
    icon: '⏱️',
    title: syntaxGuideReference.timersAndRest.title,
    description: syntaxGuideReference.timersAndRest.subtitle,
    example: syntaxGuideReference.timersAndRest.workout,
    docsPath: syntaxGuideReference.timersAndRest.docsPath,
  },
  {
    category: 'Structure',
    icon: '🏋️',
    title: 'Rep Schemes',
    description: syntaxGuideReference.repSchemes.subtitle,
    example: syntaxGuideReference.repSchemes.workout,
    docsPath: syntaxGuideReference.repSchemes.docsPath,
  },
]

export function PlaygroundLandingPage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const workoutSectionRef = useRef<HTMLElement | null>(null)

  const isDarkMode = useMemo(() => {
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  const workoutItems = useWorkoutItems()

  const [showPlaygrounds] = useShowPlaygrounds()

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
      sources: [globalSearchSource(workoutItems, canvasRoutes, showPlaygrounds)],
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
  }, [handleSelectWorkout, navigate, workoutItems, showPlaygrounds])

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
    <LandingTemplate
      actionsSlot={
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/70">
          <Sun className="size-4 text-zinc-500" aria-hidden="true" />
          <Switch
            checked={isDarkMode}
            onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            aria-label="Toggle dark mode"
          />
          <Moon className="size-4 text-zinc-500" aria-hidden="true" />
        </div>
      }
      heroSlot={<AttentionWidget config={ATTENTION_CONFIG} onAction={handleAttentionAction} />}
    >
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
    </LandingTemplate>
  )
}
