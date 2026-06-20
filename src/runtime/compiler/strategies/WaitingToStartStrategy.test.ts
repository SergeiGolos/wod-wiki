import { describe, it, expect } from 'bun:test';
import { apply, stubRuntime } from '@/testing/harness/StrategyTestHarness';
import { WaitingToStartStrategy } from './WaitingToStartStrategy';
import {
  ReportOutputBehavior,
  LabelingBehavior,
  ButtonBehavior,
  ExitBehavior,
} from '@/runtime/behaviors';

describe('WaitingToStartStrategy', () => {
  const strategy = new WaitingToStartStrategy();
  const runtime = stubRuntime();

  it('match returns false', () => {
    const result = apply(strategy, []);
    expect(result.matched).toBe(false);
  });

  it('apply does not throw', () => {
    expect(() => apply(strategy, [])).not.toThrow();
  });

  it('build creates a WaitingToStartBlock with correct type and label', () => {
    const block = strategy.build(runtime);

    expect(block.blockType).toBe('WaitingToStart');
    expect(block.label).toBe('Ready to Start');
  });

  it('build attaches all expected behaviors', () => {
    const block = strategy.build(runtime);

    expect(block.getBehavior(ReportOutputBehavior)).toBeDefined();
    expect(block.getBehavior(LabelingBehavior)).toBeDefined();
    expect(block.getBehavior(ButtonBehavior)).toBeDefined();
    expect(block.getBehavior(ExitBehavior)).toBeDefined();
  });
});
