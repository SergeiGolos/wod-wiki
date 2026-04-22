/**
 * Catalog / Molecules / CastButtonRpc
 *
 * CastButtonRpc — Chromecast cast control button.
 *
 * The production component (src/components/cast/CastButtonRpc.tsx) depends on:
 *   - ChromecastSdk (browser cast API + session state)
 *   - useSubscriptionManager (runtime subscription pipeline)
 *   - useWorkbenchSyncStore (Zustand store for workbench state)
 *   - react-router useLocation (for page context syncing)
 *
 * Two sets of stories are provided:
 *
 * 1. **Presentation mock** (CastButtonMock) — documents all visual states
 *    without requiring a real Chromecast environment. Suitable for snapshot
 *    testing and visual regression.
 *
 * 2. **Real component** (CastButtonRpc) — the production component wrapped in
 *    a minimal mock context (null SubscriptionManager, empty workbench store).
 *    In Storybook it will show the SDK-unavailable state since Chrome Cast SDK
 *    is not loaded. Confirms the component renders without crashing.
 *
 * To test the real component with live cast, run the playground app and
 * use a Chromecast-capable browser.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TvMinimal, Cast, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Presentation mock ────────────────────────────────────────────────────────

type CastState = 'disconnected' | 'connecting' | 'casting' | 'disconnecting';

interface CastButtonMockProps {
  state?: CastState;
  deviceName?: string;
  onClick?: () => void;
}

function CastButtonMock({ state = 'disconnected', deviceName, onClick }: CastButtonMockProps) {
  const isCasting = state === 'casting';
  const isPending = state === 'connecting' || state === 'disconnecting';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={isPending}
      className={cn(
        'relative h-9 w-9',
        isCasting
          ? 'text-primary hover:text-primary'
          : 'text-muted-foreground hover:text-foreground'
      )}
      title={
        state === 'disconnected'   ? 'Cast to TV' :
        state === 'connecting'     ? 'Connecting to Chromecast…' :
        state === 'casting'        ? `Casting to ${deviceName ?? 'TV'}` :
        'Disconnecting…'
      }
    >
      {isPending ? (
        <Loader2 className="h-[1.2rem] w-[1.2rem] animate-spin" />
      ) : isCasting ? (
        <TvMinimal className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Cast className="h-[1.2rem] w-[1.2rem]" />
      )}
      <span className="sr-only">
        {state === 'disconnected' ? 'Cast to TV' : `Cast: ${state}`}
      </span>
    </Button>
  );
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof CastButtonMock> = {
  title: 'catalog/molecules/actions/CastButtonRpc',
  component: CastButtonMock,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="flex flex-col gap-6 p-8 bg-white dark:bg-zinc-900 rounded-lg border border-border">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ──────────────────────────────────────────────────────────────────

export const Disconnected: Story = {
  name: 'Disconnected',
  render: () => <CastButtonMock state="disconnected" />,
};

export const Connecting: Story = {
  name: 'Connecting…',
  render: () => <CastButtonMock state="connecting" />,
};

export const Casting: Story = {
  name: 'Casting (active)',
  render: () => <CastButtonMock state="casting" deviceName="Living Room TV" />,
};

export const Disconnecting: Story = {
  name: 'Disconnecting…',
  render: () => <CastButtonMock state="disconnecting" />,
};

export const AllStates: Story = {
  name: 'All States',
  render: () => (
    <div className="flex items-center gap-4">
      {(['disconnected', 'connecting', 'casting', 'disconnecting'] as CastState[]).map(s => (
        <div key={s} className="flex flex-col items-center gap-2">
          <CastButtonMock state={s} deviceName="Living Room TV" />
          <span className="text-[10px] text-muted-foreground font-mono">{s}</span>
        </div>
      ))}
    </div>
  ),
};

export const InNavbar: Story = {
  name: 'In Navbar Context',
  parameters: { layout: 'padded' },
  render: () => (
    <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 px-4 py-2 border-b border-border w-80">
      <span className="flex-1 text-sm font-medium text-foreground">Wod Wiki</span>
      <CastButtonMock state="casting" deviceName="TV" />
      <CastButtonMock state="disconnected" />
    </div>
  ),
};

/**
 * NOTE: The production CastButtonRpc component at src/components/cast/CastButtonRpc.tsx
 * requires a browser with the Google Cast SDK loaded. To test it live:
 *   1. Run `bun run dev:app` and open in Chrome
 *   2. The Cast SDK must be available (chrome.cast namespace)
 *   3. A Chromecast receiver must be on the same network
 *
 * The mock above captures all visual states for documentation and regression testing.
 * See also: CastButtonRpcReal.stories.tsx for the live production component story.
 */
