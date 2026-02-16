import type { Meta, StoryObj } from '@storybook/react';
import { Workbench } from '../../src/components/layout/Workbench';
import { StorybookHost } from '../StorybookHost';
import { MockContentProvider } from '../../src/services/content/MockContentProvider';
import { createMockEntry } from '../../src/services/content/fixtures';

import beginnerFriendlyMarkdown from '../../wod/swimming/beginner-friendly-swimming.md?raw';

const mockProvider = new MockContentProvider([
  createMockEntry({
    id: 'swimming-1',
    title: 'Beginner Friendly Swimming',
    rawContent: beginnerFriendlyMarkdown,
    tags: ['swimming']
  })
]);

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Swimming',
  component: Workbench,
  decorators: [
    (Story) => (
      <StorybookHost initialEntries={['/note/swimming-1/plan']}>
        <Story />
      </StorybookHost>
    ),
  ],
  args: {
    provider: mockProvider
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Swim programming rendered via MarkdownEditor. Content is synchronized with the markdown sources in the `wod/` directory.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof Workbench>;

export const BeginnerFriendlySwimming: Story = {
  args: {
    // Workbench now gets its content from the provider via route ID
    // We don't need to pass initialContent purely if the provider handles it, 
    // but Workbench might default to it if provider fails or mode is mixed.
    // In this case, we rely on the provider.
  }
};
