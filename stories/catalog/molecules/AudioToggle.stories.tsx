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

import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { VolumeX } from 'lucide-react';
import { AudioToggle } from '@/components/audio/AudioToggle';
import { Button } from '@/components/ui/button';
import { useAudio } from '@/components/audio/AudioContext';

const meta: Meta<typeof AudioToggle> = {
  title: 'catalog/molecules/actions/AudioToggle',
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

const MutedOnMount = () => {
  const { isEnabled, toggleAudio } = useAudio();
  useEffect(() => {
    if (isEnabled) toggleAudio();
  }, [isEnabled, toggleAudio]);
  return <AudioToggle />;
};

export const MutedState: Story = {
  name: 'Muted state',
  render: () => <MutedOnMount />,
};

export const DisconnectedError: Story = {
  name: 'Disconnected / error',
  render: () => (
    <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
      <Button
        variant="ghost"
        size="icon"
        disabled
        className="h-9 w-9 text-destructive/70"
        title="Audio unavailable"
      >
        <VolumeX className="h-[1.2rem] w-[1.2rem]" />
      </Button>
      <span className="text-xs text-destructive">Audio device unavailable</span>
    </div>
  ),
};

export const InNavbarAndSidebar: Story = {
  name: 'In-context (navbar + sidebar)',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="h-64 border border-border rounded-lg overflow-hidden bg-background">
      <div className="h-11 border-b border-border px-4 flex items-center justify-between">
        <span className="text-sm font-medium">Wod Wiki</span>
        <AudioToggle />
      </div>
      <div className="flex h-[calc(100%-44px)]">
        <aside className="w-52 border-r border-border p-3 flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Sidebar</span>
          <div className="flex items-center justify-between rounded-md border border-border px-2 py-1.5">
            <span className="text-xs text-muted-foreground">Audio</span>
            <AudioToggle />
          </div>
        </aside>
        <main className="flex-1 p-4 text-sm text-muted-foreground">Main content area</main>
      </div>
    </div>
  ),
};
