/**
 * Catalog / Atoms / ButtonGroupDropdown
 *
 * Two-sided pill: primary action left, chevron opens a dropdown of
 * any number of additional INavActivation actions on the right.
 */

import type { Meta, StoryObj } from '@storybook/react';
import {
  ExternalLink,
  Copy,
  Pencil,
  Trash2,
  Share2,
  BookmarkPlus,
  Play,
  RotateCcw,
  Download,
} from 'lucide-react';
import { ButtonGroupDropdown } from '@/components/ui/ButtonGroupDropdown';
import type { INavActivation } from '@/nav/navTypes';

const meta: Meta<typeof ButtonGroupDropdown> = {
  title: 'catalog/molecules/actions/ButtonGroupDropdown',
  component: ButtonGroupDropdown,
  parameters: { layout: 'centered', subsystem: 'workbench' },
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

const say = (msg: string) => () => alert(msg);

const workoutActions: INavActivation[] = [
  { id: 'open',     label: 'Open in Playground', icon: ExternalLink,  action: { type: 'call', handler: say('Open in Playground') } },
  { id: 'copy',     label: 'Copy link',           icon: Copy,          action: { type: 'call', handler: say('Copy link') } },
  { id: 'sep1',     label: '',                                          action: { type: 'none' } },
  { id: 'edit',     label: 'Edit',                icon: Pencil,        action: { type: 'call', handler: say('Edit') } },
  { id: 'bookmark', label: 'Save to notebook',    icon: BookmarkPlus,  action: { type: 'call', handler: say('Save to notebook') } },
  { id: 'sep2',     label: '',                                          action: { type: 'none' } },
  { id: 'delete',   label: 'Delete',              icon: Trash2,        action: { type: 'call', handler: say('Delete') } },
];

export const Default: Story = {
  name: 'Default',
  render: () => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-mono">primary + chevron dropdown</p>
      <ButtonGroupDropdown
        primary={{ id: 'start', label: 'Start workout', icon: Play, action: { type: 'call', handler: say('Start workout') } }}
        actions={workoutActions}
      />
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
          <ButtonGroupDropdown
            size="sm"
            primary={{ id: 'start', label: 'Start', icon: Play, action: { type: 'call', handler: say('Start') } }}
            actions={workoutActions}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-16">default</span>
          <ButtonGroupDropdown
            primary={{ id: 'start', label: 'Start workout', icon: Play, action: { type: 'call', handler: say('Start') } }}
            actions={workoutActions}
          />
        </div>
      </div>
    </div>
  ),
};

export const ShareVariant: Story = {
  name: 'Share variant',
  render: () => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-mono">different primary + share actions</p>
      <ButtonGroupDropdown
        primary={{ id: 'share', label: 'Share', icon: Share2, action: { type: 'call', handler: say('Share') } }}
        actions={[
          { id: 'copy-link',   label: 'Copy link',      icon: Copy,     action: { type: 'call', handler: say('Copy link') } },
          { id: 'download',    label: 'Download PDF',   icon: Download, action: { type: 'call', handler: say('Download') } },
          { id: 'reset',       label: 'Reset sharing',  icon: RotateCcw, action: { type: 'call', handler: say('Reset') } },
        ]}
      />
    </div>
  ),
};
