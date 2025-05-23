import type { Meta, StoryObj } from '@storybook/react';
import '../index.css';
import { Workbook } from '@/components/workbook';
import { SoundProvider } from '@/contexts/SoundContext';
import { ScreenProvider } from '@/contexts/ScreenContext';

const meta: Meta<typeof Workbook> = {
  title: 'App/Workbook',
  component: Workbook,
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
type Story = StoryObj<typeof Workbook>;

export const Default: Story = {};