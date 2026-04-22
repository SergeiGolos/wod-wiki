import type { Meta, StoryObj } from '@storybook/react'
import { useEffect } from 'react'
import { MacOSChrome } from '../../../../playground/src/components/MacOSChrome'
import { RefreshCw } from 'lucide-react'

const meta = {
  title: 'catalog/molecules/chrome/MacOSChrome',
  component: MacOSChrome,
  parameters: {
    layout: 'fullscreen',
    docs: { story: { height: '540px' } },
  },
  decorators: [
    (Story) => {
      useEffect(() => {
        // StorybookHost uses width:100vw which can exceed the layout width when
        // a scrollbar is present. Clip horizontal overflow at the iframe root so
        // no scrollbar appears and the shadow-2xl on MacOSChrome stays contained.
        document.documentElement.style.overflowX = 'clip'
        return () => { document.documentElement.style.overflowX = '' }
      }, [])
      return (
        <div style={{ padding: 16, height: 480, boxSizing: 'border-box', overflow: 'hidden' }}>
          <Story />
        </div>
      )
    },
  ],

} satisfies Meta<typeof MacOSChrome>

export default meta
type Story = StoryObj<typeof meta>

const PlaceholderContent = () => (
  <div className="flex items-center justify-center h-40 text-muted-foreground text-sm font-medium">
    Panel content
  </div>
)

export const Default: Story = {
  args: {
    title: 'WodScript',
    children: <PlaceholderContent />,
  },
}

export const WithReset: Story = {
  args: {
    title: 'WodScript',
    onReset: () => alert('Reset!'),
    children: <PlaceholderContent />,
  },
}

export const WithHeaderActions: Story = {
  args: {
    title: 'WodScript',
    headerActions: (
      <button className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
        <RefreshCw className="size-3.5" />
      </button>
    ),
    children: <PlaceholderContent />,
  },
}

export const WithResetAndActions: Story = {
  args: {
    title: 'Live Preview',
    onReset: () => {},
    headerActions: (
      <button className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
        <RefreshCw className="size-3.5" />
      </button>
    ),
    children: (
      <div className="p-4 space-y-2 text-sm text-foreground">
        <p className="font-semibold">21-15-9 reps of:</p>
        <p>Thrusters (95/65 lb)</p>
        <p>Pull-ups</p>
      </div>
    ),
  },
}

export const TallContent: Story = {
  args: {
    title: 'Editor',
    children: (
      <div className="flex flex-col h-64">
        <div className="flex-1 p-4 font-mono text-sm text-muted-foreground leading-relaxed">
          {'3x\n  10 Push-ups\n  10 Pull-ups\n  400m Run\n'}
          <br />
          {'5:00 Rest'}
        </div>
      </div>
    ),
  },
}
