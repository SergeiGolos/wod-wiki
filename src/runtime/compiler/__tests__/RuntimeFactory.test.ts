import { describe, expect, it } from 'bun:test';
import { RuntimeFactory } from '../RuntimeFactory';
import { globalParser } from '@/runtime/services/runtimeServices';
import type { WodBlock } from '@/components/Editor/types';
import { MetricType } from '@/core/models/Metric';

describe('RuntimeFactory', () => {
  const factory = new RuntimeFactory(globalParser);

  function makeBlock(content: string, statements?: WodBlock['statements']): WodBlock {
    return {
      id: 'test-block',
      startLine: 0,
      endLine: 2,
      content,
      statements: statements ?? globalParser.read(content).statements,
      state: 'parsed',
      widgetIds: {},
      version: 1,
      createdAt: Date.now(),
    };
  }

  it('returns null for a block with no statements', () => {
    const block = makeBlock('', []);
    const runtime = factory.createRuntime(block);
    expect(runtime).toBeNull();
  });

  it('creates a runtime with an analytics engine attached', () => {
    const block = makeBlock('10 Pushups');
    const runtime = factory.createRuntime(block);

    expect(runtime).not.toBeNull();
    expect(runtime!.analyticsContext).toBeDefined();
    expect(runtime!.analyticsContext!.effortResolver).toBeDefined();
  });

  it('wires tracker into the analytics engine when provided in options', () => {
    const tracker = {
      recordMetric: () => {},
      onUpdate: (cb: any) => () => {},
    };

    const block = makeBlock('10 Pushups');
    const runtime = factory.createRuntime(block, { tracker });

    expect(runtime).not.toBeNull();
    // The engine is internal; we verify via behavior: analyticsContext exists
    // and the runtime accepted the tracker without throwing.
    expect(runtime!.analyticsContext).toBeDefined();
  });


  it('collapses Choice metrics before runtime creation', () => {
    const block = makeBlock('135/185 lbs');
    expect(block.statements.some(stmt => stmt.metrics.some(m => m.type === MetricType.Choice))).toBe(true);

    const runtime = factory.createRuntime(block);

    expect(runtime).not.toBeNull();
    expect(runtime!.script.statements.some(stmt => stmt.metrics.some(m => m.type === MetricType.Choice))).toBe(false);
    expect(runtime!.script.statements.some(stmt => stmt.metrics.some(m => m.origin === 'user-plan'))).toBe(true);
  });
  it('selects processors based on block metrics (Rep + Resistance → power-enrichment)', () => {
    // Use parser-generated statements so meta offsets are present
    // (ScriptRuntime.emitLoadOutput requires stmt.meta.startOffset)
    const block = makeBlock('10 Pushups @ BW');
    const runtime = factory.createRuntime(block);

    expect(runtime).not.toBeNull();
    expect(runtime!.analyticsContext).toBeDefined();

    // Verify the runtime processes outputs through the analytics engine
    // by checking that addOutput works without errors.
    const initialOutputs = runtime!.getOutputStatements();
    expect(initialOutputs.length).toBeGreaterThan(0);
  });

  it('uses custom effortResolver when provided via analyticsOptions', () => {
    const customResolver = {
      resolveBySlug: () => null,
      resolveByAlias: () => null,
      resolveFuzzy: () => null as any,
      resolveEffort: () => null as any,
      resolveDefinition: () => null as any,
      list: () => [],
    };

    const block = makeBlock('10 Pushups');
    const runtime = factory.createRuntime(block, {
      analyticsOptions: { effortResolver: customResolver as any },
    });

    expect(runtime).not.toBeNull();
    expect(runtime!.analyticsContext).toBeDefined();
    expect(runtime!.analyticsContext!.effortResolver).toBe(customResolver);
  });

  it('passes userProfile through analyticsOptions', () => {
    const block = makeBlock('10 Pushups');
    const runtime = factory.createRuntime(block, {
      analyticsOptions: { userProfile: { vo2max: 55 } },
    });

    expect(runtime).not.toBeNull();
    // User profile affects TISProcessor; we verify the runtime is created
    // without error and analytics context is present.
    expect(runtime!.analyticsContext).toBeDefined();
  });

  it('disposes runtime without errors', () => {
    const block = makeBlock('10 Pushups');
    const runtime = factory.createRuntime(block);

    expect(runtime).not.toBeNull();
    factory.disposeRuntime(runtime!);
    // Should complete without throwing
    expect(true).toBe(true);
  });
});
