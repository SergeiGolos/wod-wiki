import type { Meta, StoryObj } from '@storybook/react';
import { MockChromecastReceiver } from './components/MockChromecastReceiver';

/**
 * ChromeCast Receiver Application for wod.wiki
 * 
 * This component serves as a ChromeCast receiver that displays workout events
 * sent from ChromeCast sender applications.
 */
const meta: Meta<typeof MockChromecastReceiver> = {
  title: 'Cast/Receiver',
  component: MockChromecastReceiver,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof MockChromecastReceiver>;

/**
 * Default presentation of the ChromeCast receiver app
 */
export const Default: Story = {};
