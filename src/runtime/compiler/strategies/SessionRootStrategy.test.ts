import { describe, it, expect } from 'bun:test';
import { apply, stubRuntime, stmtWith } from '@/testing/harness/StrategyTestHarness';
import { SessionRootStrategy } from './SessionRootStrategy';
import {
  CountupTimerBehavior,
  ChildSelectionBehavior,
  WaitingToStartInjectorBehavior,
  ReportOutputBehavior,
  LabelingBehavior,
  ButtonBehavior,
} from '@/runtime/behaviors';
import { MetricType } from '@/core/models/Metric';

describe('SessionRootStrategy', () => {
  const strategy = new SessionRootStrategy();
  const runtime = stubRuntime();

  it('match returns false', () => {
    const result = apply(strategy, []);
    expect(result.matched).toBe(false);
  });

  it('apply does not throw', () => {
    expect(() => apply(strategy, [])).not.toThrow();
  });

  it('build creates a SessionRootBlock with correct type and label', () => {
    const block = strategy.build(runtime, {
      label: 'Test',
      childGroups: [[1, 2], [3, 4]],
    });

    expect(block.blockType).toBe('SessionRoot');
    expect(block.label).toBe('Test');
  });

  it('build attaches all expected behaviors', () => {
    const block = strategy.build(runtime, {
      label: 'Test',
      childGroups: [[1, 2], [3, 4]],
    });

    expect(block.getBehavior(CountupTimerBehavior)).toBeDefined();
    expect(block.getBehavior(ChildSelectionBehavior)).toBeDefined();
    expect(block.getBehavior(WaitingToStartInjectorBehavior)).toBeDefined();
    expect(block.getBehavior(ReportOutputBehavior)).toBeDefined();
    expect(block.getBehavior(LabelingBehavior)).toBeDefined();
    expect(block.getBehavior(ButtonBehavior)).toBeDefined();
  });

  it('buildFromStatements derives childGroups from statements', () => {
    const statements = [
      stmtWith(MetricType.Reps, 5),
      stmtWith(MetricType.Time, '1:00'),
    ];

    const block = strategy.buildFromStatements(runtime, statements, {
      label: 'WOD',
    });

    expect(block.blockType).toBe('SessionRoot');
    expect(block.label).toBe('WOD');
    expect(block.getBehavior(ChildSelectionBehavior)).toBeDefined();
    expect(block.getBehavior(ReportOutputBehavior)).toBeDefined();
  });
});
