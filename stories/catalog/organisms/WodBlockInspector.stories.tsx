/**
 * WodBlockInspector stories — testbench story template.
 *
 * Each story freezes the inspector at a specific pipeline phase
 * so you can inspect the metric cascade at any stage.
 *
 * The "Interactive" story runs through all phases with a delay
 * between each dispatch to simulate real pipeline execution.
 */

import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect } from 'react';

import { WodBlockInspector } from '../../../src/runtime-test-bench/components/inspector/WodBlockInspector';
import { useInspectorState } from '../../../src/runtime-test-bench/hooks/useInspectorState';
import {
  COMPILE_SPANS, COMPILE_ENTRIES,
  PLAN_SPANS,    PLAN_ENTRIES,
  RUNTIME_B1_SPANS, RUNTIME_B1_ENTRIES,
  RUNTIME_B2_SPANS, RUNTIME_B2_ENTRIES,
  SUMMARY_SPANS, SUMMARY_ENTRIES,
} from './WodBlockInspector.fixtures';

// ─── Wrapper that drives state from props ─────────────────────────────────────

interface StoryWrapperProps {
  content: string;
  dialect: string;
  /** Which phases to pre-load (simulates pipeline progress) */
  phases: Array<
    | 'compile'
    | 'plan'
    | 'runtime_b1'
    | 'runtime_b2'
    | 'summary'
  >;
  /** If true, dispatch each phase with a 800ms delay (live simulation) */
  animated?: boolean;
}

const StoryWrapper: React.FC<StoryWrapperProps> = ({ content, dialect, phases, animated = false }) => {
  const [state, dispatch] = useInspectorState();

  useEffect(() => {
    dispatch({ type: 'SET_CONTENT', payload: { content, dialect } });

    const actions: Array<() => void> = [];

    if (phases.includes('compile')) {
      actions.push(() => dispatch({
        type: 'COMPILE_COMPLETE',
        payload: { spans: COMPILE_SPANS, entries: COMPILE_ENTRIES },
      }));
    }
    if (phases.includes('plan')) {
      actions.push(() => dispatch({
        type: 'PLAN_COMPLETE',
        payload: { spans: PLAN_SPANS, entries: PLAN_ENTRIES },
      }));
    }
    if (phases.includes('runtime_b1')) {
      actions.push(() => dispatch({
        type: 'RUNTIME_BLOCK_REPORTED',
        payload: { spans: RUNTIME_B1_SPANS, entries: RUNTIME_B1_ENTRIES },
      }));
    }
    if (phases.includes('runtime_b2')) {
      actions.push(() => dispatch({
        type: 'RUNTIME_BLOCK_REPORTED',
        payload: { spans: RUNTIME_B2_SPANS, entries: RUNTIME_B2_ENTRIES },
      }));
    }
    if (phases.includes('summary')) {
      actions.push(() => dispatch({
        type: 'SUMMARY_COMPLETE',
        payload: { spans: SUMMARY_SPANS, entries: SUMMARY_ENTRIES },
      }));
    }

    if (animated) {
      let delay = 200;
      for (const action of actions) {
        setTimeout(action, delay);
        delay += 800;
      }
    } else {
      for (const action of actions) action();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      <WodBlockInspector state={state} dispatch={dispatch} />
    </div>
  );
};

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title:     'Debug / WodBlockInspector',
  component: StoryWrapper,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
Testbench story template for the WodBlockInspector component.
Each story represents a pipeline phase snapshot — use them to debug
metric cascade state at any stage of compilation, runtime, or analytics.
        `,
      },
    },
  },
} satisfies Meta<typeof StoryWrapper>;

export default meta;
type Story = StoryObj<typeof StoryWrapper>;

// ─── Shared args ──────────────────────────────────────────────────────────────

const STRENGTH_CONTENT = `3x10 bench press @135lbs\nsuperset rows @95lbs`;
const STRENGTH_DIALECT = 'strength';

// ─── Stories ──────────────────────────────────────────────────────────────────

/** Fresh — no pipeline has run yet */
export const Idle: Story = {
  args: {
    content: STRENGTH_CONTENT,
    dialect: STRENGTH_DIALECT,
    phases:  [],
  },
};

/** Parser and dialect metrics resolved. Runtime not started. */
export const CompileReady: Story = {
  args: {
    content: STRENGTH_CONTENT,
    dialect: STRENGTH_DIALECT,
    phases:  ['compile'],
  },
};

/** Plan predictions added on top of compile. */
export const PlanReady: Story = {
  args: {
    content: STRENGTH_CONTENT,
    dialect: STRENGTH_DIALECT,
    phases:  ['compile', 'plan'],
  },
};

/** First runtime block reported (bench press). */
export const RuntimeBlock1: Story = {
  args: {
    content: STRENGTH_CONTENT,
    dialect: STRENGTH_DIALECT,
    phases:  ['compile', 'plan', 'runtime_b1'],
  },
};

/** Both runtime blocks reported. */
export const RuntimeComplete: Story = {
  args: {
    content: STRENGTH_CONTENT,
    dialect: STRENGTH_DIALECT,
    phases:  ['compile', 'plan', 'runtime_b1', 'runtime_b2'],
  },
};

/** Full pipeline including analytics summary. */
export const Complete: Story = {
  args: {
    content: STRENGTH_CONTENT,
    dialect: STRENGTH_DIALECT,
    phases:  ['compile', 'plan', 'runtime_b1', 'runtime_b2', 'summary'],
  },
};

/** Live simulation — sections open as pipeline progresses. */
export const Animated: Story = {
  args: {
    content:  STRENGTH_CONTENT,
    dialect:  STRENGTH_DIALECT,
    phases:   ['compile', 'plan', 'runtime_b1', 'runtime_b2', 'summary'],
    animated: true,
  },
  parameters: {
    docs: { disable: true },
  },
};

/** Minimal — single line, no superset complexity. */
export const SingleLine: Story = {
  args: {
    content: `5x5 squat @185lbs`,
    dialect: STRENGTH_DIALECT,
    phases:  ['compile'],
  },
};

/** Empty content — edge case. */
export const EmptyBlock: Story = {
  args: {
    content: ``,
    dialect: STRENGTH_DIALECT,
    phases:  [],
  },
};
