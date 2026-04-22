import type { Meta, StoryObj } from '@storybook/react'
import { RuntimeTimerPanel } from '../../../src/components/Editor/overlays/RuntimeTimerPanel'
import type { WodBlock } from '../../../src/components/Editor/types'

const meta = {
  title: 'catalog/organisms/RuntimeTimerPanel',
  component: RuntimeTimerPanel,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'In-overlay timer UI that creates its own ScriptRuntime via RuntimeFactory on mount. ' +
          'Displays the timer, metric overlays, and state transitions for a WOD block. ' +
          'Click **Start** to begin the runtime.',
      },
    },
  },

} satisfies Meta<typeof RuntimeTimerPanel>

export default meta
type Story = StoryObj<typeof meta>

const baseBlock = {
  state: 'idle' as const,
  widgetIds: {},
  version: 1,
  createdAt: Date.now(),
}

const simpleTimerBlock: WodBlock = {
  ...baseBlock,
  id: 'story-timer-block',
  startLine: 0,
  endLine: 1,
  content: '10:00 Run',
}

const amrapBlock: WodBlock = {
  ...baseBlock,
  id: 'story-amrap-block',
  startLine: 0,
  endLine: 5,
  content: `20:00 AMRAP
  5 Pull-ups
  10 Push-ups
  15 Air Squats`,
}

const emomBlock: WodBlock = {
  ...baseBlock,
  id: 'story-emom-block',
  startLine: 0,
  endLine: 4,
  content: `10x 1:00
  5 Power Cleans
  10 Box Jumps`,
}

const roundsBlock: WodBlock = {
  ...baseBlock,
  id: 'story-rounds-block',
  startLine: 0,
  endLine: 5,
  content: `5x
  21 Thrusters
  21 Pull-ups`,
}

export const SimpleTimer: Story = {
  args: {
    block: simpleTimerBlock,
    onClose: () => {},
    autoStart: false,
  },
}

export const Amrap: Story = {
  args: {
    block: amrapBlock,
    onClose: () => {},
    autoStart: false,
  },
}

export const Emom: Story = {
  args: {
    block: emomBlock,
    onClose: () => {},
    autoStart: false,
  },
}

export const RoundsForTime: Story = {
  args: {
    block: roundsBlock,
    onClose: () => {},
    autoStart: false,
  },
}

export const Expanded: Story = {
  args: {
    block: amrapBlock,
    onClose: () => {},
    isExpanded: true,
    autoStart: false,
  },
}
