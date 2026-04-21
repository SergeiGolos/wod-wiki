/**
 * Catalog / Atoms / ButtonGroup
 *
 * Two-sided pill button — primary action (label + icon) left,
 * secondary action (icon only) right. Driven by INavActivation.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ExternalLink, Copy, Play, Bookmark, Share2, Download, Maximize2 } from 'lucide-react';
import { ButtonGroup } from '@/components/ui/ButtonGroup';
import type { INavActivation } from '@/nav/navTypes';

const meta: Meta<typeof ButtonGroup> = {
  title: 'catalog/atoms/ButtonGroup',
  component: ButtonGroup,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="p-8 space-y-6">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

const openAction: INavActivation = {
  id: 'open',
  label: 'Open',
  icon: ExternalLink,
  action: { type: 'call', handler: () => alert('Primary: Open') },
};

const copyAction: INavActivation = {
  id: 'copy',
  label: 'Copy link',
  icon: Copy,
  action: { type: 'call', handler: () => alert('Secondary: Copy link') },
};

const playAction: INavActivation = {
  id: 'play',
  label: 'Start workout',
  icon: Play,
  action: { type: 'call', handler: () => alert('Primary: Start workout') },
};

const bookmarkAction: INavActivation = {
  id: 'bookmark',
  label: 'Save',
  icon: Bookmark,
  action: { type: 'call', handler: () => alert('Secondary: Save') },
};

export const Default: Story = {
  name: 'Default',
  render: () => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-mono">primary + secondary</p>
      <ButtonGroup primary={openAction} secondary={copyAction} />
    </div>
  ),
};

export const Sizes: Story = {
  name: 'Sizes',
  render: () => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-mono">size</p>
      <div className="flex flex-col gap-3 items-start">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-16">sm</span>
          <ButtonGroup primary={playAction} secondary={bookmarkAction} size="sm" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-16">default</span>
          <ButtonGroup primary={playAction} secondary={bookmarkAction} size="default" />
        </div>
      </div>
    </div>
  ),
};

const shareAction: INavActivation = {
  id: 'share',
  label: 'Share',
  icon: Share2,
  action: { type: 'call', handler: () => alert('Primary: Share') },
};

const downloadAction: INavActivation = {
  id: 'download',
  label: 'Download',
  icon: Download,
  action: { type: 'call', handler: () => alert('Secondary: Download') },
};

export const Variants: Story = {
  name: 'Variants',
  render: () => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-mono">various action pairs</p>
      <div className="flex flex-col gap-3 items-start">
        <ButtonGroup primary={openAction} secondary={copyAction} />
        <ButtonGroup primary={playAction} secondary={bookmarkAction} />
        <ButtonGroup primary={shareAction} secondary={downloadAction} />
      </div>
    </div>
  ),
};

export const PlaygroundVariant: Story = {
  name: 'Playground variant',
  render: () => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-mono">
        replaces WodPlaygroundButton — actions wired at molecule level
      </p>
      <ButtonGroup
        primary={{
          id: 'playground',
          label: 'Playground',
          icon: ExternalLink,
          action: { type: 'call', handler: () => alert('Open in Playground') },
        }}
        secondary={{
          id: 'copy-url',
          label: 'Copy URL',
          icon: Copy,
          action: { type: 'call', handler: () => alert('URL copied') },
        }}
      />
    </div>
  ),
};

export const RunButton: Story = {
  name: 'Run button (primary variant)',
  render: () => (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground font-mono">
        variant="primary" — CTA pill for workout run buttons (replaces SplitRunButton)
      </p>
      <div className="flex flex-col gap-4 items-start">
        <ButtonGroup
          variant="primary"
          primary={{
            id: 'run',
            label: 'Run',
            icon: Play,
            action: { type: 'call', handler: () => alert('Run inline') },
          }}
          secondary={{
            id: 'fullscreen',
            label: 'Run fullscreen',
            icon: Maximize2,
            action: { type: 'call', handler: () => alert('Run fullscreen') },
          }}
        />
        <ButtonGroup
          variant="primary"
          primary={{
            id: 'start',
            label: 'Start workout',
            icon: Play,
            action: { type: 'call', handler: () => alert('Start') },
          }}
          secondary={{
            id: 'expand',
            label: 'Expand',
            icon: Maximize2,
            action: { type: 'call', handler: () => alert('Expand') },
          }}
        />
      </div>
    </div>
  ),
};
