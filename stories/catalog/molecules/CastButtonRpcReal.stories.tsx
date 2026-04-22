/**
 * Catalog / Molecules / CastButtonRpc (Real Component)
 *
 * This story renders the production CastButtonRpc component directly.
 * In Storybook the Google Cast SDK is not loaded, so the button renders
 * in the SDK-unavailable (hidden) state. This confirms the component
 * mounts without crashing in a non-Chromecast environment.
 *
 * For visual documentation of all states (disconnected, connecting, casting,
 * disconnecting) see the mock stories in CastButtonRpc.stories.tsx.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CastButtonRpc } from '@/components/cast/CastButtonRpc';

const meta: Meta<typeof CastButtonRpc> = {
  title: 'catalog/molecules/actions/CastButtonRpc/RealComponent',
  component: CastButtonRpc,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Production CastButtonRpc. In Storybook the Cast SDK is not available so ' +
          'the button renders hidden / in SDK-not-loaded state. Use the CastButtonRpc ' +
          'mock stories for visual regression coverage of all cast states.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="flex flex-col items-center gap-4 p-8 bg-white dark:bg-zinc-900 rounded-lg border border-border min-h-[80px]">
        <Story />
        <p className="text-xs text-muted-foreground">
          Cast SDK not loaded — button is hidden or shows unavailable state.
        </p>
      </div>
    ),
  ],
};

export default meta;

/**
 * The real component in Storybook. The Cast SDK is not loaded so the button
 * may be invisible (SDK unavailable = button not rendered).
 */
export const SdkUnavailable: StoryObj<typeof CastButtonRpc> = {
  name: 'SDK unavailable (Storybook)',
  render: () => <CastButtonRpc />,
};
