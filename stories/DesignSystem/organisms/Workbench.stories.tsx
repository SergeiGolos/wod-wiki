/**
 * DesignSystem / Organisms / Workbench
 *
 * The full workbench shell — combines the editor, runtime panel, and companion
 * panels in a responsive three-mode layout (Plan / Track / Review).
 *
 * Workbench reads all state from context + router, so StorybookHost provides
 * the necessary providers. Route params control which view mode is active.
 */


import type { Meta, StoryObj } from '@storybook/react';
import { Workbench } from '@/components/layout/Workbench';

const meta: Meta<typeof Workbench> = {
  title: 'DesignSystem/Organisms/Workbench',
  component: Workbench,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full application workbench. Reads route params and context — no direct props. ' +
          'Uses StorybookHost with MemoryRouter to simulate different route states.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const PlanMode: Story = {
  name: 'Plan mode (/note/:noteId)',
  parameters: { router: { initialEntries: ['/note/entry-fran'] } },
  render: () => <Workbench />,
};

export const TrackMode: Story = {
  name: 'Track mode (/note/:noteId/track)',
  parameters: { router: { initialEntries: ['/note/entry-fran/track'] } },
  render: () => <Workbench />,
};

export const ReviewMode: Story = {
  name: 'Review mode (/note/:noteId/review)',
  parameters: { router: { initialEntries: ['/note/entry-fran/review'] } },
  render: () => <Workbench />,
};
