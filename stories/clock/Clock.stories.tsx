import React, { useEffect, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ClockAnchor } from '../../src/clock/anchors/ClockAnchor';
import { LabelAnchor } from '../../src/clock/anchors/LabelAnchor';
import { MetricAnchor } from '../../src/clock/anchors/MetricAnchor';
import { CollectionSpan, Metric } from '../../src/CollectionSpan';
import { RuntimeProvider } from '../../src/runtime/context/RuntimeContext';
import { ScriptRuntime } from '../../src/runtime/ScriptRuntime';
import { RuntimeBlock } from '../../src/runtime/RuntimeBlock';
import { TimerBehavior, TIMER_MEMORY_TYPES } from '../../src/runtime/behaviors/TimerBehavior';
import { TypedMemoryReference } from '../../src/runtime/IMemoryReference';

const meta: Meta = {
  title: 'Clock/Default',
  decorators: [
    (Story) => (
        <div className="flex flex-col items-center justify-center flex-grow p-6 bg-gray-50">
          <Story />
        </div>
    ),
  ],
};

export default meta;

const metrics: Metric[] = [
  { sourceId: 1, values: [{
      type: 'reps', value: 10,
      unit: ''
  }, {
      type: 'weight', value: 50,
      unit: ''
  }] },
  { sourceId: 1, values: [{
      type: 'reps', value: 12,
      unit: ''
  }, {
      type: 'weight', value: 50,
      unit: ''
  }] },
  { sourceId: 2, values: [{
      type: 'reps', value: 8,
      unit: ''
  }, {
      type: 'weight', value: 60,
      unit: ''
  }] },
];

const defaultSpan: CollectionSpan = {
  blockKey: 'Jumping Jacks',
  duration: 185000, // 3 minutes 5 seconds
  timeSpans: [{ start: new Date(Date.now() - 185000), stop: new Date() }],
  metrics: metrics,
};

// Component that creates runtime and timer block for ClockAnchor
const ClockWithRuntime: React.FC<{ durationMs: number }> = ({ durationMs }) => {
  const runtime = useMemo(() => new ScriptRuntime(), []);
  const block = useMemo(() => {
    const behavior = new TimerBehavior();
    return new RuntimeBlock(runtime, [1], [behavior], 'Timer');
  }, [runtime]);

  useEffect(() => {
    block.push();

    const timeSpansRefs = runtime.memory.search({
      id: null,
      ownerId: block.key.toString(),
      type: TIMER_MEMORY_TYPES.TIME_SPANS,
      visibility: null
    });

    const isRunningRefs = runtime.memory.search({
      id: null,
      ownerId: block.key.toString(),
      type: TIMER_MEMORY_TYPES.IS_RUNNING,
      visibility: null
    });

    if (timeSpansRefs.length > 0 && isRunningRefs.length > 0) {
      const timeSpansRef = timeSpansRefs[0] as TypedMemoryReference<any>;
      const isRunningRef = isRunningRefs[0] as TypedMemoryReference<boolean>;

      timeSpansRef.set([{
        start: new Date(Date.now() - durationMs),
        stop: new Date()
      }]);
      isRunningRef.set(false);
    }

    return () => {
      block.dispose();
    };
  }, [runtime, block, durationMs]);

  return (
    <RuntimeProvider runtime={runtime}>
      <ClockAnchor blockKey={block.key.toString()} />
    </RuntimeProvider>
  );
};

const StoryRenderer = (args: { span?: CollectionSpan; durationMs?: number }) => (
    <div className="flex flex-col items-center justify-center">
        {args.durationMs !== undefined ? (
          <ClockWithRuntime durationMs={args.durationMs} />
        ) : (
          <ClockAnchor blockKey="placeholder" />
        )}
        <div className="mb-12 text-center mt-8">
            <LabelAnchor span={args.span} variant="badge" template="Warm-up" />
            <LabelAnchor span={args.span} variant="title" template="{{blockKey}}" />
            <LabelAnchor span={args.span} variant="subtitle" template="30 seconds" />
        </div>
        <div className="flex gap-4">
            <MetricAnchor span={args.span} metricType="reps" aggregator="sum" />
            <MetricAnchor span={args.span} metricType="reps" aggregator="avg" />
        </div>
        <LabelAnchor span={args.span} variant="next-up" template="Next up: 30s Plank" />
    </div>
);

export const Default: StoryObj = {
  args: {
    span: defaultSpan,
    durationMs: 185000, // 3 minutes 5 seconds
  },
  render: StoryRenderer,
};

export const Empty: StoryObj = {
  args: {
    span: new CollectionSpan(),
    durationMs: 0,
  },
  render: StoryRenderer,
};