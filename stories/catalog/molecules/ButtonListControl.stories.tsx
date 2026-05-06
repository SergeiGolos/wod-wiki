import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Blocks, Layers3, RotateCcw, TrendingUp } from 'lucide-react'
import { ButtonListControl, type ButtonListControlItem } from '@/components/ui/ButtonListControl'

const meta: Meta<typeof ButtonListControl> = {
  title: 'catalog/molecules/content/ButtonListControl',
  component: ButtonListControl,
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof meta>

const ROUND_EXAMPLES: Record<string, string> = {
  simple: `(3 Rounds)\n  10 Pull-ups\n  15 Push-ups\n  20 Air Squats`,
  nested: `(3 Rounds)\n  (2 Rounds)\n    10 Cal Bike\n    8 Burpees\n  1:00 Rest`,
  looping: `(5 Rounds)\n  :40 Work\n  :20 Rest\n  12 Wall Balls`,
  ladder: `(21-15-9)\n  Thrusters 95 lb\n  Pull-ups`,
}

const roundItems: ButtonListControlItem[] = [
  {
    id: 'simple',
    label: 'Simple Rounds',
    description: 'Load a single repeated block for the active editor panel.',
    icon: RotateCcw,
    badge: 'base',
    action: { type: 'view-source', source: ROUND_EXAMPLES.simple },
  },
  {
    id: 'nested',
    label: 'Nested Groups',
    description: 'Swap in groups inside groups to demonstrate structure and scope.',
    icon: Layers3,
    badge: 'nested',
    action: { type: 'view-source', source: ROUND_EXAMPLES.nested },
  },
  {
    id: 'looping',
    label: 'Timed Loops',
    description: 'Show work-rest grouping where the timer drives each round forward.',
    icon: Blocks,
    badge: 'time',
    action: { type: 'view-source', source: ROUND_EXAMPLES.looping },
  },
  {
    id: 'ladder',
    label: 'Increment Ladders',
    description: 'Compare repeater syntax against fixed rounds in the same teaching surface.',
    icon: TrendingUp,
    badge: 'reps',
    action: { type: 'view-source', source: ROUND_EXAMPLES.ladder },
  },
]

function RoundsVariantDemo() {
  const [activeId, setActiveId] = useState(roundItems[0].id)
  const [source, setSource] = useState(ROUND_EXAMPLES.simple)

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
      <div className="space-y-3">
        <p className="text-xs font-mono text-muted-foreground">
          grouped buttons can drive the active canvas content window by dispatching view-source actions
        </p>
        <ButtonListControl
          items={roundItems}
          selectedId={activeId}
          onSelectedIdChange={setActiveId}
          onAction={(action) => {
            if (action.type === 'view-source') {
              setSource(action.source)
            }
          }}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/40 px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Active content window
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {roundItems.find(item => item.id === activeId)?.label}
          </p>
        </div>
        <pre className="overflow-x-auto p-4 text-sm leading-relaxed text-foreground">
          <code>{source}</code>
        </pre>
      </div>
    </div>
  )
}

export const RoundsExampleSelector: Story = {
  render: () => <RoundsVariantDemo />,
}

export const HorizontalLayout: Story = {
  render: () => (
    <div className="space-y-4 max-w-5xl">
      <p className="text-xs font-mono text-muted-foreground">
        horizontal layout for hero bands or compact canvas sections
      </p>
      <ButtonListControl items={roundItems.slice(0, 3)} orientation="horizontal" />
    </div>
  ),
}