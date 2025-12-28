/**
 * Tests for FragmentMetricCollector
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { FragmentMetricCollector } from '../compiler/FragmentMetricCollector';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { MetricBehavior } from '../../types/MetricBehavior';

describe('FragmentMetricCollector', () => {
  let collector: FragmentMetricCollector;

  beforeEach(() => {
    collector = new FragmentMetricCollector();
  });

  describe('collectFragment', () => {
    it('should collect a single fragment', () => {
      const fragment: ICodeFragment = {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 10,
        behavior: MetricBehavior.Collected,
      };

      collector.collectFragment('block-1', 1, fragment);

      const allFragments = collector.getAllFragments();
      expect(allFragments).toHaveLength(1);
      expect(allFragments[0]).toEqual(fragment);
    });

    it('should collect multiple fragments for same block', () => {
      const fragment1: ICodeFragment = {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 10,
        behavior: MetricBehavior.Collected,
      };

      const fragment2: ICodeFragment = {
        type: 'resistance',
        fragmentType: FragmentType.Resistance,
        value: 135,
        behavior: MetricBehavior.Collected,
      };

      collector.collectFragment('block-1', 1, fragment1);
      collector.collectFragment('block-1', 1, fragment2);

      const allFragments = collector.getAllFragments();
      expect(allFragments).toHaveLength(2);
    });

    it('should collect fragments for different blocks', () => {
      const fragment1: ICodeFragment = {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 10,
        behavior: MetricBehavior.Collected,
      };

      const fragment2: ICodeFragment = {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 20,
        behavior: MetricBehavior.Collected,
      };

      collector.collectFragment('block-1', 1, fragment1);
      collector.collectFragment('block-2', 2, fragment2);

      const byBlock = collector.getFragmentsByBlock();
      expect(byBlock.size).toBe(2);
      expect(byBlock.get('block-1')).toHaveLength(1);
      expect(byBlock.get('block-2')).toHaveLength(1);
    });
  });

  describe('getAllFragments', () => {
    it('should return empty array when no fragments collected', () => {
      const fragments = collector.getAllFragments();
      expect(fragments).toHaveLength(0);
    });

    it('should return all collected fragments', () => {
      collector.collectFragment('block-1', 1, {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 10,
      });
      collector.collectFragment('block-2', 2, {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 20,
      });

      const fragments = collector.getAllFragments();
      expect(fragments).toHaveLength(2);
    });
  });

  describe('getFragmentsByBlock', () => {
    it('should return fragments grouped by block', () => {
      collector.collectFragment('block-1', 1, {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 10,
      });
      collector.collectFragment('block-1', 1, {
        type: 'resistance',
        fragmentType: FragmentType.Resistance,
        value: 135,
      });
      collector.collectFragment('block-2', 2, {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 20,
      });

      const byBlock = collector.getFragmentsByBlock();
      expect(byBlock.get('block-1')).toHaveLength(2);
      expect(byBlock.get('block-2')).toHaveLength(1);
    });

    it('should return a copy to prevent external modification', () => {
      collector.collectFragment('block-1', 1, {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 10,
      });

      const byBlock1 = collector.getFragmentsByBlock();
      byBlock1.set('block-999', []);

      const byBlock2 = collector.getFragmentsByBlock();
      expect(byBlock2.has('block-999')).toBe(false);
    });
  });

  describe('getFragmentsByBehavior', () => {
    beforeEach(() => {
      collector.collectFragment('block-1', 1, {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 10,
        behavior: MetricBehavior.Defined,
      });
      collector.collectFragment('block-1', 1, {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 12,
        behavior: MetricBehavior.Collected,
      });
      collector.collectFragment('block-1', 1, {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 15,
        behavior: MetricBehavior.Recorded,
      });
    });

    it('should filter fragments by single behavior', () => {
      const collected = collector.getFragmentsByBehavior(MetricBehavior.Collected);
      expect(collected).toHaveLength(1);
      expect(collected[0].value).toBe(12);
    });

    it('should return empty array when no matches', () => {
      const calculated = collector.getFragmentsByBehavior(MetricBehavior.Calculated);
      expect(calculated).toHaveLength(0);
    });
  });

  describe('getFragmentsByBehaviors', () => {
    beforeEach(() => {
      collector.collectFragment('block-1', 1, {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 10,
        behavior: MetricBehavior.Defined,
      });
      collector.collectFragment('block-1', 1, {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 12,
        behavior: MetricBehavior.Collected,
      });
      collector.collectFragment('block-1', 1, {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 15,
        behavior: MetricBehavior.Recorded,
      });
    });

    it('should filter fragments by multiple behaviors', () => {
      const results = collector.getFragmentsByBehaviors([
        MetricBehavior.Collected,
        MetricBehavior.Recorded,
      ]);

      expect(results).toHaveLength(2);
      expect(results.map(f => f.value)).toEqual([12, 15]);
    });

    it('should return empty array when no matches', () => {
      const results = collector.getFragmentsByBehaviors([MetricBehavior.Calculated]);
      expect(results).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should remove all collected fragments', () => {
      collector.collectFragment('block-1', 1, {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 10,
      });
      collector.collectFragment('block-2', 2, {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 20,
      });

      collector.clear();

      expect(collector.getAllFragments()).toHaveLength(0);
      expect(collector.getFragmentsByBlock().size).toBe(0);
    });
  });
});
