/**
 * ResultsView Stories
 *
 * Consolidated results page: analytics carousel + filter tabs + data grid.
 * Desktop: full-width, information-dense.
 * Mobile: carousel scrolls horizontally, table scrolls both axes.
 */

import React, { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

// Runtime
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { JitCompiler } from '@/runtime/compiler/JitCompiler';
import { RuntimeStack } from '@/runtime/RuntimeStack';
import { EventBus } from '@/runtime/events';
import { createMockClock } from '@/runtime/RuntimeClock';
import { sharedParser } from '@/parser/parserInstance';
import { WhiteboardScript } from '@/parser/WhiteboardScript';

// Strategies
import { AmrapLogicStrategy } from '@/runtime/compiler/strategies/logic/AmrapLogicStrategy';
import { IntervalLogicStrategy } from '@/runtime/compiler/strategies/logic/IntervalLogicStrategy';
import { GenericTimerStrategy } from '@/runtime/compiler/strategies/components/GenericTimerStrategy';
import { GenericLoopStrategy } from '@/runtime/compiler/strategies/components/GenericLoopStrategy';
import { GenericGroupStrategy } from '@/runtime/compiler/strategies/components/GenericGroupStrategy';
import { SoundStrategy } from '@/runtime/compiler/strategies/enhancements/SoundStrategy';
import { ReportOutputStrategy } from '@/runtime/compiler/strategies/enhancements/ReportOutputStrategy';
import { ChildrenStrategy } from '@/runtime/compiler/strategies/enhancements/ChildrenStrategy';
import { EffortFallbackStrategy } from '@/runtime/compiler/strategies/fallback/EffortFallbackStrategy';

// Actions
import { StartSessionAction } from '@/runtime/actions/stack/StartSessionAction';
import { NextAction } from '@/runtime/actions/stack/NextAction';
import { TickEvent } from '@/runtime/events/TickEvent';

// Analytics
import { getAnalyticsFromRuntime } from '@/services/AnalyticsTransformer';
import type { Segment, AnalyticsGroup } from '@/core/models/AnalyticsModels';
import type { ProjectionResult } from '@/core/analytics/ProjectionResult';

// UI
import { ResultsView } from '@/components/review-grid/ResultsView';
import { DebugModeProvider } from '@/components/layout/DebugModeContext';

// ─── Helpers ─────────────────────────────────────────────────────

function buildCompiler(): JitCompiler {
  const compiler = new JitCompiler();
  compiler.registerStrategy(new AmrapLogicStrategy());
  compiler.registerStrategy(new IntervalLogicStrategy());
  compiler.registerStrategy(new GenericTimerStrategy());
  compiler.registerStrategy(new GenericLoopStrategy());
  compiler.registerStrategy(new GenericGroupStrategy());
  compiler.registerStrategy(new SoundStrategy());
  compiler.registerStrategy(new ReportOutputStrategy());
  compiler.registerStrategy(new ChildrenStrategy());
  compiler.registerStrategy(new EffortFallbackStrategy());
  return compiler;
}

function runToCompletion(
  scriptText: string,
  stepMs = 30_000,
  maxSteps = 50,
): { segments: Segment[]; groups: AnalyticsGroup[]; runtime: ScriptRuntime; projections: ProjectionResult[] } {
  const script = sharedParser.read(scriptText) as WhiteboardScript;
  const compiler = buildCompiler();
  const clock = createMockClock(new Date('2024-06-15T09:00:00Z'));
  const stack = new RuntimeStack();
  const eventBus = new EventBus();
  const runtime = new ScriptRuntime(script, compiler, { stack, clock, eventBus });

  runtime.do(new StartSessionAction({ label: 'Story Session' }));

  let steps = 0;
  while (runtime.stack.count > 0 && steps < maxSteps) {
    clock.advance(stepMs);
    runtime.handle(new TickEvent());
    runtime.do(new NextAction());
    steps++;
  }

  const { segments, groups } = getAnalyticsFromRuntime(runtime);

  // Build mock projections from segments (mirrors extractProjections logic)
  const projections: ProjectionResult[] = segments
    .filter((s) => s.outputType === 'analytics')
    .flatMap((s) => {
      const metrics = s.metrics?.toArray() || [];
      const labelMetric = metrics.find((m) => m.type === 'Label');
      const valueMetric = metrics.find((m) => m.type !== 'Label');
      if (!labelMetric || !valueMetric) return [];
      return [{
        name: String(labelMetric.value),
        value: Number(valueMetric.value) || 0,
        unit: valueMetric.unit || '',
        metricType: valueMetric.type,
      }];
    });

  return { segments, groups, runtime, projections };
}

// ─── Harness ─────────────────────────────────────────────────────

export interface ResultsViewHarnessProps {
  script: string;
  stepMs?: number;
  height?: string;
}

const ResultsViewHarness: React.FC<ResultsViewHarnessProps> = ({
  script,
  stepMs = 30_000,
  height = '700px',
}) => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [groups, setGroups] = useState<AnalyticsGroup[]>([]);
  const [projections, setProjections] = useState<ProjectionResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!script) {
      setSegments([]);
      setGroups([]);
      setProjections([]);
      return;
    }
    const result = runToCompletion(script, stepMs);
    setSegments(result.segments);
    setGroups(result.groups);
    setProjections(result.projections);
    return () => result.runtime.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (
    id: number,
    modifiers?: { ctrlKey: boolean; shiftKey: boolean },
    visibleIds?: number[],
  ) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (modifiers?.ctrlKey) {
        next.has(id) ? next.delete(id) : next.add(id);
      } else if (modifiers?.shiftKey && visibleIds) {
        const lastId = Array.from(prev).pop();
        if (lastId !== undefined) {
          const startIdx = visibleIds.indexOf(lastId);
          const endIdx = visibleIds.indexOf(id);
          if (startIdx !== -1 && endIdx !== -1) {
            const min = Math.min(startIdx, endIdx);
            const max = Math.max(startIdx, endIdx);
            for (let i = min; i <= max; i++) next.add(visibleIds[i]);
          } else next.add(id);
        } else next.add(id);
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  };

  return (
    <DebugModeProvider>
      <div style={{ height }} className="border rounded-lg overflow-hidden bg-background">
        <ResultsView
          runtime={null}
          segments={segments}
          selectedSegmentIds={selectedIds}
          onSelectSegment={handleSelect}
          groups={groups}
          projections={projections}
        />
      </div>
    </DebugModeProvider>
  );
};

// ─── Meta ────────────────────────────────────────────────────────

const meta: Meta<typeof ResultsViewHarness> = {
  title: 'catalog/templates/ResultsView',
  component: ResultsViewHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'ResultsView — consolidated results page with analytics scorecard carousel, ' +
          'workout-type filter tabs, and dense data grid. Desktop: full-width. Mobile: ' +
          'independent horizontal scrolling for carousel and table.',
      },
    },
  },
  argTypes: {
    script: { control: 'text' },
    stepMs: { control: { type: 'number', min: 1000, max: 600_000, step: 1000 } },
    height: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ─────────────────────────────────────────────────────

export const Empty: Story = {
  name: 'Empty — No Data',
  args: { script: '', height: '500px' },
};

export const FranDesktop: Story = {
  name: 'Desktop — Fran (21-15-9)',
  args: {
    script: [
      '21 Thrusters @95lb',
      '21 Pull-ups',
      '15 Thrusters @95lb',
      '15 Pull-ups',
      '9 Thrusters @95lb',
      '9 Pull-ups',
    ].join('\n'),
    stepMs: 30_000,
    height: '700px',
  },
};

export const AmrapDesktop: Story = {
  name: 'Desktop — AMRAP 20 (Cindy)',
  args: {
    script: '20:00 AMRAP\n5 Pull-ups\n10 Push-ups\n15 Air Squats',
    stepMs: 60_000,
    height: '750px',
  },
};

export const EmomDesktop: Story = {
  name: 'Desktop — EMOM 10',
  args: {
    script: '10x 1:00\n10 Thrusters @95lb',
    stepMs: 60_000,
    height: '700px',
  },
};

export const FranMobile: Story = {
  name: 'Mobile (390px) — Fran',
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '390px', margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    script: [
      '21 Thrusters @95lb',
      '21 Pull-ups',
      '15 Thrusters @95lb',
      '15 Pull-ups',
      '9 Thrusters @95lb',
      '9 Pull-ups',
    ].join('\n'),
    stepMs: 30_000,
    height: '844px',
  },
};

export const AmrapMobile: Story = {
  name: 'Mobile (390px) — AMRAP 20',
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '390px', margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    script: '20:00 AMRAP\n5 Pull-ups\n10 Push-ups\n15 Air Squats',
    stepMs: 60_000,
    height: '844px',
  },
};
