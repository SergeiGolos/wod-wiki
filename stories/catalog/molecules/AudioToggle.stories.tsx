/**
 * Catalog / Molecules / AudioToggle
 *
 * AudioToggle — mute/unmute button for the in-app audio system.
 * Lives in src/components/audio/AudioToggle.tsx.
 *
 * Consumes useAudio() from AudioContext (AudioProvider is included in the
 * global Storybook decorator via StorybookHost, so no extra setup needed).
 *
 * The toggle switches between Volume2 (enabled) and VolumeX (muted) icons
 * and calls toggleAudio() on click.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { AudioToggle } from '@/components/audio/AudioToggle';

const meta: Meta<typeof AudioToggle> = {
  title: 'catalog/molecules/AudioToggle',
  component: AudioToggle,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="flex items-center gap-4 p-6 bg-white dark:bg-zinc-900 rounded-lg border border-border">
        <Story />
        <span className="text-xs text-muted-foreground">Click to toggle audio on/off</span>
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Default (uses AudioContext)',
  render: () => <AudioToggle />,
};

export const InNavbar: Story = {
  name: 'In Navbar Context',
  render: () => (
    <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-4 py-2 border-b border-border w-80">
      <span className="flex-1 text-sm font-medium text-foreground">Wod Wiki</span>
      <AudioToggle />
    </div>
  ),
  parameters: { layout: 'padded' },
};
