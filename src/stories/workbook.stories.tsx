import type { Meta } from '@storybook/react';
// import type { StoryObj } from '@storybook/react'; // Temporarily disabled
import '../index.css';
import { Workbook } from '@/components/workbook';
import { SoundProvider } from '@/contexts/SoundContext';
import { ScreenProvider } from '@/contexts/ScreenContext';

const meta: Meta<typeof Workbook> = {
  title: 'Components/Workbook',
  component: Workbook,
  tags: ['!dev'], // Disable this story from appearing in Storybook
  parameters: {
    layout: 'fullscreen',
    controls: { hideNoControlsWarning: true },
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh' }}>
        <ScreenProvider>
          <SoundProvider>
            <Story />
          </SoundProvider>
        </ScreenProvider>
      </div>
    ),
  ],
};

export default meta;
// type Story = StoryObj<typeof Workbook>;

// Temporarily disabled - will be useful later
// export const Default: Story = {};