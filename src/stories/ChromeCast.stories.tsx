import type { Meta, StoryObj } from '@storybook/react';
import CastReceiver from '../cast/CastReceiver';

/**
 * ChromeCast Receiver Application for wod.wiki
 * 
 * This component serves as a ChromeCast receiver that displays workout events
 * sent from ChromeCast sender applications.
 */
const meta: Meta<typeof CastReceiver> = {
  title: 'Cast/Receiver',
  component: CastReceiver,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof CastReceiver>;

/**
 * Default presentation of the ChromeCast receiver app
 */
export const Default: Story = {};
