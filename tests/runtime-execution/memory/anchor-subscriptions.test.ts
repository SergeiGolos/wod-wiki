import { describe, it, expect, beforeEach } from 'bun:test';
import { ScriptRuntime } from '../../../src/runtime/ScriptRuntime';
import { BlockContext } from '../../../src/runtime/BlockContext';
import { MemoryTypeEnum } from '../../../src/runtime/models/MemoryTypeEnum';
import { IAnchorValue } from '../../../src/runtime/contracts/IAnchorValue';
import { RuntimeMemory } from '../../../src/runtime/RuntimeMemory';
import { RuntimeStack } from '../../../src/runtime/RuntimeStack';
import { RuntimeClock } from '../../../src/runtime/RuntimeClock';
import { EventBus } from '../../../src/runtime/events/EventBus';
import { WodScript } from '../../../src/parser/WodScript';
import { JitCompiler } from '../../../src/runtime/compiler/JitCompiler';

/**
 * Unit tests for the Anchor-Based Subscription Model.
 * 
 * These tests verify the core functionality of anchors:
 * 1. Creating and retrieving anchors with stable IDs
 * 2. Setting and updating anchor values (search criteria)
 * 3. Resolving anchors to target memory references
 * 4. Managing anchor lifecycle and cleanup
 */
describe('Anchor-Based Subscription Model', () => {
  let runtime: ScriptRuntime;
  let context: BlockContext;

  beforeEach(() => {
    const dependencies = {
      memory: new RuntimeMemory(),
      stack: new RuntimeStack(),
      clock: new RuntimeClock(),
      eventBus: new EventBus(),
    };
    const script = new WodScript('', [], []);
    const compiler = new JitCompiler();
    runtime = new ScriptRuntime(script, compiler, dependencies);
    context = new BlockContext(runtime, 'test-block-1', 'test-exercise');
  });

  describe('MemoryTypeEnum.ANCHOR', () => {
    it('should include ANCHOR type in MemoryTypeEnum', () => {
      expect(MemoryTypeEnum.ANCHOR.toString()).toBe('anchor');
    });
  });

  describe('getOrCreateAnchor()', () => {
    it('should create a new anchor with a stable ID', () => {
      const anchorId = 'anchor-test-clock';
      const anchor = context.getOrCreateAnchor(anchorId);

      expect(anchor).toBeDefined();
      expect(anchor.id).toBe(anchorId);
      expect(anchor.type).toBe(MemoryTypeEnum.ANCHOR);
      expect(anchor.visibility).toBe('public');
    });

    it('should return existing anchor if ID already exists', () => {
      const anchorId = 'anchor-test-clock';
      const anchor1 = context.getOrCreateAnchor(anchorId);
      const anchor2 = context.getOrCreateAnchor(anchorId);

      expect(anchor1.id).toBe(anchor2.id);
      expect(anchor1).toBe(anchor2); // Same reference
    });

    it('should return same anchor across different contexts', () => {
      const anchorId = 'anchor-shared-clock';
      const context2 = new BlockContext(runtime, 'test-block-2', 'test-exercise');

      const anchor1 = context.getOrCreateAnchor(anchorId);
      const anchor2 = context2.getOrCreateAnchor(anchorId);

      expect(anchor1.id).toBe(anchor2.id);
      expect(anchor1).toBe(anchor2); // Same reference
    });

    it('should throw error if context is released', () => {
      context.release();

      expect(() => {
        context.getOrCreateAnchor('anchor-test');
      }).toThrow(/released context/);
    });

    it('should track anchor in context references', () => {
      const anchorId = 'anchor-tracked';
      const anchor = context.getOrCreateAnchor(anchorId);

      const trackedRefs = context.references;
      expect(trackedRefs).toContain(anchor);
    });
  });

  describe('Anchor Value (IAnchorValue)', () => {
    it('should store and retrieve search criteria', () => {
      const anchorId = 'anchor-timer-data';
      const anchor = context.getOrCreateAnchor(anchorId);

      const anchorValue: IAnchorValue = {
        searchCriteria: {
          ownerId: 'timer-block-123',
          type: 'timer:time-spans' as any,
          id: null,
          visibility: null
        }
      };

      anchor.set(anchorValue);
      const retrieved = anchor.get();

      expect(retrieved).toEqual(anchorValue);
      expect(retrieved?.searchCriteria.ownerId).toBe('timer-block-123');
      expect(retrieved?.searchCriteria.type).toBe('timer:time-spans');
    });

    it('should allow updating anchor value dynamically', () => {
      const anchorId = 'anchor-dynamic';
      const anchor = context.getOrCreateAnchor(anchorId);

      // Initial value points to timer 1
      anchor.set({
        searchCriteria: {
          ownerId: 'timer-1',
          type: 'timer:time-spans' as any,
          id: null,
          visibility: null
        }
      });

      expect(anchor.get()?.searchCriteria.ownerId).toBe('timer-1');

      // Update to point to timer 2
      anchor.set({
        searchCriteria: {
          ownerId: 'timer-2',
          type: 'timer:time-spans' as any,
          id: null,
          visibility: null
        }
      });

      expect(anchor.get()?.searchCriteria.ownerId).toBe('timer-2');
    });

    it('should support partial search criteria', () => {
      const anchorId = 'anchor-partial';
      const anchor = context.getOrCreateAnchor(anchorId);

      // Only specify type, leave ownerId flexible
      anchor.set({
        searchCriteria: {
          type: 'timer:is-running' as any
        }
      });

      const value = anchor.get();
      expect(value?.searchCriteria.type).toBe('timer:is-running');
      expect(value?.searchCriteria.ownerId).toBeUndefined();
    });
  });

  describe('Anchor Resolution', () => {
    it('should resolve anchor to target memory reference', () => {
      // Create target data
      const dataRef = context.allocate<number>(
        'metric:values',
        42,
        'public'
      );

      // Create anchor pointing to the data
      const anchor = context.getOrCreateAnchor('anchor-metric');
      anchor.set({
        searchCriteria: {
          ownerId: context.ownerId,
          type: 'metric:values' as any,
          id: null,
          visibility: null
        }
      });

      // Resolve the anchor
      const anchorValue = anchor.get();
      expect(anchorValue).toBeDefined();

      const criteria = {
        id: null,
        ownerId: null,
        type: null,
        visibility: null,
        ...anchorValue!.searchCriteria
      };

      const resolved = runtime.memory.search(criteria);
      expect(resolved.length).toBeGreaterThanOrEqual(1);
      expect(resolved).toContain(dataRef);
    });

    it('should return empty array when anchor points to non-existent data', () => {
      const anchor = context.getOrCreateAnchor('anchor-missing');
      anchor.set({
        searchCriteria: {
          ownerId: 'non-existent-block',
          type: 'timer:time-spans' as any,
          id: null,
          visibility: null
        }
      });

      const anchorValue = anchor.get();
      const criteria = {
        id: null,
        ownerId: null,
        type: null,
        visibility: null,
        ...anchorValue!.searchCriteria
      };

      const resolved = runtime.memory.search(criteria);
      expect(resolved.length).toBe(0);
    });

    it('should resolve to multiple references if search matches multiple', () => {
      // Create multiple data references with same type
      const ref1 = context.allocate<number>('metric:values', 10, 'public');
      const ref2 = context.allocate<number>('metric:values', 20, 'public');

      const anchor = context.getOrCreateAnchor('anchor-multi');
      anchor.set({
        searchCriteria: {
          ownerId: context.ownerId,
          type: 'metric:values' as any,
          id: null,
          visibility: null
        }
      });

      const anchorValue = anchor.get();
      const criteria = {
        id: null,
        ownerId: null,
        type: null,
        visibility: null,
        ...anchorValue!.searchCriteria
      };

      const resolved = runtime.memory.search(criteria);
      expect(resolved.length).toBeGreaterThanOrEqual(2);
      expect(resolved).toContain(ref1);
      expect(resolved).toContain(ref2);
    });
  });

  describe('Anchor Subscriptions', () => {
    it('should notify subscribers when anchor value changes', () => {
      const anchor = context.getOrCreateAnchor('anchor-notify');
      let notificationCount = 0;
      let lastValue: IAnchorValue | undefined;

      const unsubscribe = anchor.subscribe((newValue) => {
        notificationCount++;
        lastValue = newValue;
      });

      // Set initial value
      const value1: IAnchorValue = {
        searchCriteria: {
          ownerId: 'block-1',
          type: 'timer:time-spans' as any,
          id: null,
          visibility: null
        }
      };
      anchor.set(value1);

      expect(notificationCount).toBe(1);
      expect(lastValue).toEqual(value1);

      // Update value
      const value2: IAnchorValue = {
        searchCriteria: {
          ownerId: 'block-2',
          type: 'timer:time-spans' as any,
          id: null,
          visibility: null
        }
      };
      anchor.set(value2);

      expect(notificationCount).toBe(2);
      expect(lastValue).toEqual(value2);

      unsubscribe();
    });

    it('should allow multiple subscribers on same anchor', () => {
      const anchor = context.getOrCreateAnchor('anchor-multi-sub');
      let count1 = 0;
      let count2 = 0;

      const unsub1 = anchor.subscribe(() => count1++);
      const unsub2 = anchor.subscribe(() => count2++);

      anchor.set({
        searchCriteria: { type: 'timer:time-spans' as any }
      });

      expect(count1).toBe(1);
      expect(count2).toBe(1);

      unsub1();
      unsub2();
    });

    it('should stop notifications after unsubscribe', () => {
      const anchor = context.getOrCreateAnchor('anchor-unsub');
      let count = 0;

      const unsubscribe = anchor.subscribe(() => count++);

      anchor.set({
        searchCriteria: { type: 'timer:time-spans' as any }
      });
      expect(count).toBe(1);

      unsubscribe();

      anchor.set({
        searchCriteria: { type: 'timer:is-running' as any }
      });
      expect(count).toBe(1); // No new notification
    });
  });

  describe('Anchor Search and Discovery', () => {
    it('should find anchor by ID using memory search', () => {
      const anchorId = 'anchor-searchable';
      context.getOrCreateAnchor(anchorId);

      const found = runtime.memory.search({
        id: anchorId,
        type: MemoryTypeEnum.ANCHOR,
        ownerId: null,
        visibility: null
      });

      expect(found.length).toBe(1);
      expect(found[0].id).toBe(anchorId);
      expect(found[0].type).toBe(MemoryTypeEnum.ANCHOR);
    });

    it('should find all anchors using type search', () => {
      context.getOrCreateAnchor('anchor-1');
      context.getOrCreateAnchor('anchor-2');
      context.getOrCreateAnchor('anchor-3');

      const allAnchors = runtime.memory.search({
        id: null,
        type: MemoryTypeEnum.ANCHOR,
        ownerId: null,
        visibility: null
      });

      expect(allAnchors.length).toBeGreaterThanOrEqual(3);
    });

    it('should distinguish anchors from regular memory references', () => {
      // Create an anchor with a unique ID
      const anchor = context.getOrCreateAnchor('anchor-distinguish-test');

      // Create regular memory reference (using a valid enum type)
      const metric = context.allocate<number>(MemoryTypeEnum.METRIC_REPS, 42, 'public');

      const anchors = runtime.memory.search({
        id: null,
        type: MemoryTypeEnum.ANCHOR,
        ownerId: null,
        visibility: null
      });

      const metrics = runtime.memory.search({
        id: null,
        type: MemoryTypeEnum.METRIC_REPS,
        ownerId: null,
        visibility: null
      });

      expect(anchors.length).toBeGreaterThanOrEqual(1);
      expect(metrics.length).toBeGreaterThanOrEqual(1);
      // Verify anchors and metrics have different types
      expect(anchors[0].type).toBe(MemoryTypeEnum.ANCHOR);
      expect(metrics[0].type).toBe(MemoryTypeEnum.METRIC_REPS);
      // Also verify the specific references we created
      expect(anchor.type).toBe(MemoryTypeEnum.ANCHOR);
      expect(metric.type).toBe(MemoryTypeEnum.METRIC_REPS);
      expect(anchor.id).not.toBe(metric.id);
    });
  });

  describe('Anchor Lifecycle and Cleanup', () => {
    it('should release anchor when context is released', () => {
      const anchorId = 'anchor-cleanup';
      context.getOrCreateAnchor(anchorId);

      // Verify anchor exists
      let found = runtime.memory.search({
        id: anchorId,
        type: null,
        ownerId: null,
        visibility: null
      });
      expect(found.length).toBe(1);

      // Release context
      context.release();

      // Verify anchor is cleaned up
      found = runtime.memory.search({
        id: anchorId,
        type: null,
        ownerId: null,
        visibility: null
      });
      expect(found.length).toBe(0);
    });

    it('should maintain anchor value across multiple block contexts', () => {
      const anchorId = 'anchor-persistent';
      const context2 = new BlockContext(runtime, 'test-block-2', 'test-exercise');

      // Create anchor in first context
      const anchor1 = context.getOrCreateAnchor(anchorId);
      anchor1.set({
        searchCriteria: { type: 'timer:time-spans' as any }
      });

      // Access same anchor in second context
      const anchor2 = context2.getOrCreateAnchor(anchorId);
      const value = anchor2.get();

      // Both contexts reference the same anchor instance
      expect(value?.searchCriteria.type).toBe('timer:time-spans');
      expect(anchor1).toBe(anchor2);

      // Note: When a context is released, it releases all its references
      // including shared anchors. This is the current behavior.
      context.release();
      context2.release();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined anchor value', () => {
      const anchor = context.getOrCreateAnchor('anchor-undefined');
      const value = anchor.get();

      expect(value).toBeUndefined();
    });

    it('should handle empty search criteria', () => {
      const anchor = context.getOrCreateAnchor('anchor-empty');
      anchor.set({
        searchCriteria: {}
      });

      const value = anchor.get();
      expect(value).toEqual({ searchCriteria: {} });
    });

    it('should handle null values in search criteria', () => {
      const anchor = context.getOrCreateAnchor('anchor-nulls');
      anchor.set({
        searchCriteria: {
          id: null,
          ownerId: null,
          type: null,
          visibility: null
        }
      });

      const value = anchor.get();
      expect(value?.searchCriteria).toBeDefined();
    });

    it('should create multiple unique anchors with different IDs', () => {
      const anchor1 = context.getOrCreateAnchor('anchor-unique-1');
      const anchor2 = context.getOrCreateAnchor('anchor-unique-2');
      const anchor3 = context.getOrCreateAnchor('anchor-unique-3');

      expect(anchor1.id).not.toBe(anchor2.id);
      expect(anchor2.id).not.toBe(anchor3.id);
      expect(anchor1.id).not.toBe(anchor3.id);
    });
  });
});
