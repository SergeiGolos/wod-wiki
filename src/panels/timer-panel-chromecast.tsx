/**
 * timer-panel-chromecast.tsx — Chromecast receiver timer panel.
 *
 * Thin adapter over the shared browser TimerDisplay.
 * Keeps receiver-specific event dispatch wiring (start/pause/stop/next)
 * while reusing the same timer rendering + stack logic as browser.
 */

import React from 'react';
import { TimerDisplay } from '@/panels/timer-panel';
import { useSnapshotBlocks } from '@/runtime/hooks/useStackSnapshot';
import type { FocusProps } from '@/hooks/useSpatialNavigation';
import type { IRuntimeEventProvider } from '@/runtime/contracts/IRuntimeEventProvider';

export const ReceiverTimerPanel: React.FC<{
  eventProvider: IRuntimeEventProvider;
  getFocusProps?: (id: string) => FocusProps;
}> = ({ eventProvider, getFocusProps }) => {
  const blocks = useSnapshotBlocks();

  const dispatchEvent = (name: string): void => {
    eventProvider.dispatch({ name, timestamp: new Date() });
  };

  return (
    <div className="flex-1 flex flex-col justify-center">
      <TimerDisplay
        elapsedMs={0}
        hasActiveBlock={blocks.length > 0}
        onStart={() => dispatchEvent('start')}
        onPause={() => dispatchEvent('pause')}
        onStop={() => dispatchEvent('stop')}
        onNext={() => dispatchEvent('next')}
        isRunning={false}
        enableDisplayStack
        getFocusProps={getFocusProps}
      />
    </div>
  );
};
