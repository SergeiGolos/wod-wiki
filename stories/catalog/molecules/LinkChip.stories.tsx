import type { Meta, StoryObj } from '@storybook/react'
import { LinkChip } from '@/components/molecules/LinkChip'
import type { LinkWidget } from '@/lib/frontmatter'

const meta: Meta<typeof LinkChip> = {
  title: 'catalog/molecules/data/LinkChip',
  component: LinkChip,
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof meta>

const variants: LinkWidget[] = [
  { kind: 'youtube', url: 'https://youtube.com/watch?v=abc', label: 'Demo Video' },
  { kind: 'amazon', url: 'https://amazon.com/dp/123', label: 'Buy on Amazon' },
  { kind: 'website', url: 'https://example.com', label: 'Official Site' },
  { kind: 'source', url: 'https://github.com/org/repo', label: 'GitHub Source' },
  { kind: 'book', url: 'https://example.com/book', label: 'Starting Strength' },
  { kind: 'strava', url: 'https://strava.com/activities/123', label: 'Strava Activity' },
]

export const AllKinds: Story = {
  render: () => (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground font-mono">link chips auto-style by kind</p>
      <div className="flex flex-wrap gap-2">
        {variants.map((widget) => (
          <LinkChip key={widget.kind} widget={widget} />
        ))}
      </div>
    </div>
  ),
}

export const WithDefaults: Story = {
  render: () => (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground font-mono">labels fall back to kind defaults when omitted</p>
      <div className="flex flex-wrap gap-2">
        <LinkChip widget={{ kind: 'youtube', url: '#', label: '' } as LinkWidget} />
        <LinkChip widget={{ kind: 'book', url: '#', label: '' } as LinkWidget} />
        <LinkChip widget={{ kind: 'strava', url: '#', label: '' } as LinkWidget} />
      </div>
    </div>
  ),
}
