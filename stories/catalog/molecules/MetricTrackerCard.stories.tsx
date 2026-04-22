/**
 * DesignSystem / Molecules / MetricTrackerCard
 *
 * Floating bubbles that display session-total analytics computed by
 * useWorkoutTracker(). The component reads from runtime context so it
 * renders nothing without an active workout — this story documents that
 * behaviour and shows the component within a labelled container.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MetricTrackerCard } from '@/components/track/MetricTrackerCard';
import { ScriptRuntimeProvider } from '@/runtime/context/RuntimeContext';
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { JitCompiler } from '@/runtime/compiler/JitCompiler';
import { RuntimeStack } from '@/runtime/RuntimeStack';
import { EventBus } from '@/runtime/events';
import { RuntimeClock } from '@/runtime/RuntimeClock';
import { sharedParser } from '@/parser/parserInstance';
import { WodScript } from '@/parser/WodScript';

/** Build an idle runtime — no blocks pushed, just enough for the context hook. */
function buildIdleRuntime(): ScriptRuntime {
  const script = sharedParser.read('') as WodScript;
  const compiler = new JitCompiler();
  const clock = new RuntimeClock();
  const stack = new RuntimeStack();
  const eventBus = new EventBus();
  return new ScriptRuntime(script, compiler, { stack, clock, eventBus });
}

const meta: Meta<typeof MetricTrackerCard> = {
  title: 'catalog/molecules/metrics/MetricTrackerCard',
  component: MetricTrackerCard,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => {
      const runtime = React.useMemo(() => buildIdleRuntime(), []);
      return (
        <ScriptRuntimeProvider runtime={runtime}>
          <div className="p-6 bg-background rounded-lg border border-border min-w-[320px]">
            <Story />
          </div>
        </ScriptRuntimeProvider>
      );
    },
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const NoActiveWorkout: Story = {
  name: 'No active workout (renders nothing)',
  render: () => (
    <div className="flex flex-col items-center gap-3">
      <MetricTrackerCard />
      <p className="text-xs text-muted-foreground text-center max-w-64">
        MetricTrackerCard is context-driven. It renders bubbles only when
        a workout is running and session-total analytics are available.
        Start a workout via the Track view to see live data here.
      </p>
    </div>
  ),
};
