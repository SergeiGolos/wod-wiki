import { describe, it, expect } from 'bun:test';
import { apply, stubRuntime } from '@/testing/harness/StrategyTestHarness';
import { IdleBlockStrategy } from './IdleBlockStrategy';
import {
  CountupTimerBehavior,
  ExitBehavior,
  LabelingBehavior,
  ButtonBehavior,
} from '@/runtime/behaviors';

describe('IdleBlockStrategy', () => {
  const strategy = new IdleBlockStrategy();
  const runtime = stubRuntime();

  it('match returns false', () => {
    const result = apply(strategy, []);
    expect(result.matched).toBe(false);
  });

  it('apply does not throw', () => {
    expect(() => apply(strategy, [])).not.toThrow();
  });

  it('build creates an Idle block with label', () => {
    const block = strategy.build(runtime, {
      id: 'idle-1',
      label: 'Rest',
    });

    expect(block.blockType).toBe('Idle');
    expect(block.label).toBe('Rest');
  });

  it('build adds LabelingBehavior always', () => {
    const block = strategy.build(runtime, { id: 'idle-1', label: 'Rest' });
    expect(block.getBehavior(LabelingBehavior)).toBeDefined();
  });

  it('build adds ExitBehavior when popOnNext is true', () => {
    const block = strategy.build(runtime, {
      id: 'idle-1',
      label: 'Rest',
      popOnNext: true,
    });
    expect(block.getBehavior(ExitBehavior)).toBeDefined();
  });

  it('build omits ExitBehavior when popOnNext is false', () => {
    const block = strategy.build(runtime, {
      id: 'idle-1',
      label: 'Rest',
      popOnNext: false,
    });
    expect(block.getBehavior(ExitBehavior)).toBeUndefined();
  });

  it('build adds CountupTimerBehavior when trackTiming is true', () => {
    const block = strategy.build(runtime, {
      id: 'idle-1',
      label: 'Rest',
      trackTiming: true,
    });
    expect(block.getBehavior(CountupTimerBehavior)).toBeDefined();
  });

  it('build adds ButtonBehavior when button config is provided', () => {
    const block = strategy.build(runtime, {
      id: 'idle-1',
      label: 'Rest',
      button: { id: 'go', label: 'Go', action: 'next' },
    });
    expect(block.getBehavior(ButtonBehavior)).toBeDefined();
  });
});
