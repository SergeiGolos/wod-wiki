/**
 * Catalog / Molecules / NavSearchInput
 *
 * Renders: {@link import('../../../src/components/molecules/NavSearchInput').NavSearchInput}
 * Data:     See {@link ../../data-for-storybook.md}
 *
 * Stories:
 *  1. Default — basic search input button
 *  2. InToolbar — search button within a toolbar context
 */
import type { Meta, StoryObj } from '@storybook/react'
import { NavSearchInput } from '@/components/molecules/NavSearchInput'

const meta: Meta<typeof NavSearchInput> = {
  title: 'catalog/molecules/navigation/NavSearchInput',
  component: NavSearchInput,
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onOpen: () => console.log('open search palette'),
  },
}

export const InToolbar: Story = {
  render: (args) => (
    <div className="flex items-center gap-3 p-3 border rounded-lg bg-background">
      <NavSearchInput {...args} />
    </div>
  ),
  args: {
    onOpen: () => {},
  },
}
