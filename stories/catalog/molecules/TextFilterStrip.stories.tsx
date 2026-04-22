import type { Meta, StoryObj } from '@storybook/react'
import { TextFilterStrip } from '../../../playground/src/views/queriable-list/TextFilterStrip'

const meta = {
  title: 'catalog/molecules/navigation/TextFilterStrip',
  component: TextFilterStrip,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'URL-aware text search/filter bar. Reads and writes a URL query param (`q` by default) ' +
          'via nuqs, so it can live in a sticky header without prop-drilling callbacks.',
      },
    },
  },

} satisfies Meta<typeof TextFilterStrip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const CustomPlaceholder: Story = {
  args: {
    placeholder: 'Filter collections…',
  },
}

export const CustomParam: Story = {
  name: 'Custom URL Param (filter)',
  args: {
    paramName: 'filter',
    placeholder: 'Filter workouts…',
  },
}

export const AutoFocused: Story = {
  args: {
    autoFocus: true,
    placeholder: 'Start typing to filter…',
  },
}
