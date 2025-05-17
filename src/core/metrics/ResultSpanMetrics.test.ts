import { describe, test, expect, beforeEach } from 'vitest';
import { ResultSpan, RuntimeMetric, StatementNode, ZeroIndexMeta } from "@/core/timer.types";
import { PrecompiledNode } from "@/core/timer.types";
import { AbstractBlockLifecycle } from "../runtime/blocks/AbstractBlockLifecycle";
import { BlockContext } from "../runtime/blocks/BlockContext";
import { ResultSpanRegistry } from "./ResultSpanRegistry";

// Create a minimal mock implementation for testing
class TestBlock extends AbstractBlockLifecycle {
  doEnter() { return []; }
  doNext() { return []; }
  doLeave() { return []; }
}

describe('ResultSpan Metrics Integration', () => {
  let block: TestBlock;
  let registry: ResultSpanRegistry;

  beforeEach(() => {
    // Create a valid StatementNode first
    const testNode: StatementNode = {
      id: 1,
      children: [],
      meta: new ZeroIndexMeta(),
      fragments: []
    };
    
    // Create a PrecompiledNode using the StatementNode
    const precompiledNode = new PrecompiledNode(testNode);
    
    // Use the properly constructed PrecompiledNode
    block = new TestBlock([precompiledNode]);
    registry = new ResultSpanRegistry();
  });

  test('metrics should be properly added to ResultSpans', () => {
    // Create an initial span for the block
    block.enter({ timestamp: new Date() } as any);
    
    // Add a metric through the metrics system
    block.updateMetrics(metrics => {
      return [...metrics, {
        sourceId: 'test-metric',
        effort: 'medium',
        values: [{
          type: 'repetitions',
          value: 42,
          unit: 'reps'
        }]
      } as RuntimeMetric];
    });
    
    // Get the span and check if metric was added
    const spans = block.getResultSpans();
    expect(spans.length).toBeGreaterThan(0);
    expect(spans[0].metrics.length).toBeGreaterThan(0);
    expect(spans[0].metrics.find(m => m.sourceId === 'test-metric')?.values[0].value).toBe(42);
  });

  test('getMetrics should return metrics from spans', () => {
    // Set up the block with a span and metrics
    block.enter({ timestamp: new Date() } as any);
    
    // Create a span and add it to the block's context
    const span = new ResultSpan();
    span.blockKey = 'test-block';
    span.metrics = [{
      sourceId: 'test-metric',
      effort: 'low',
      values: [{
        type: 'repetitions',
        value: 42,
        unit: 'reps'
      }]
    } as RuntimeMetric];
    
    // Get the block's context and add the span
    const context = block.getContext() as BlockContext;
    context.spans = [span];
    
    // Get metrics and check if they come from the span
    const metrics = block.getMetrics();
    expect(metrics.length).toBeGreaterThan(0);
    expect(metrics.find(m => m.sourceId === 'test-metric')?.values[0].value).toBe(42);
  });

  test('ResultSpanRegistry should aggregate metrics from spans', () => {
    // Create multiple spans with metrics
    const span1 = new ResultSpan();
    span1.blockKey = 'test-block-1';
    span1.metrics = [{
      sourceId: 'test-metric',
      effort: 'high',
      values: [{
        type: 'repetitions',
        value: 10,
        unit: 'reps'
      }]
    } as RuntimeMetric];
    
    const span2 = new ResultSpan();
    span2.blockKey = 'test-block-2';
    span2.metrics = [{
      sourceId: 'test-metric',
      effort: 'high',
      values: [{
        type: 'repetitions',
        value: 20,
        unit: 'reps'
      }]
    } as RuntimeMetric];
    
    // Register spans
    registry.registerSpan(span1);
    registry.registerSpan(span2);
    
    // Aggregate metrics
    const aggregatedMetrics = registry.aggregateMetrics([span1, span2]);
    expect(aggregatedMetrics.length).toBe(1);
    expect(aggregatedMetrics[0].sourceId).toBe('test-metric');
    expect(aggregatedMetrics[0].values[0].value).toBe(30); // 10 + 20
  });
});
