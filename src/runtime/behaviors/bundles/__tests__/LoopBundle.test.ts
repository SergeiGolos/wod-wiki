import { describe, it, expect } from 'bun:test';
import { LoopBundle } from '../LoopBundle';
import { ChildIndexBehavior } from '../../ChildIndexBehavior';
import { ChildRunnerBehavior } from '../../ChildRunnerBehavior';
import { RoundPerNextBehavior } from '../../RoundPerNextBehavior';
import { RoundPerLoopBehavior } from '../../RoundPerLoopBehavior';
import { RoundDisplayBehavior } from '../../RoundDisplayBehavior';

describe('LoopBundle', () => {
  describe('create()', () => {
    it('should create behaviors for loop with children', () => {
      const childBlocks: any[] = [
        { id: 'child1', label: 'Child 1' },
        { id: 'child2', label: 'Child 2' }
      ];

      const behaviors = LoopBundle.create({
        totalRounds: 5,
        children: childBlocks,
        loopMode: 'perLoop'
      });

      expect(behaviors.length).toBeGreaterThan(0);

      const childIndexBehavior = behaviors.find(b => b instanceof ChildIndexBehavior);
      expect(childIndexBehavior).toBeDefined();

      const childRunnerBehavior = behaviors.find(b => b instanceof ChildRunnerBehavior);
      expect(childRunnerBehavior).toBeDefined();

      const roundBehavior = behaviors.find(
        b => b instanceof RoundPerLoopBehavior || b instanceof RoundPerNextBehavior
      );
      expect(roundBehavior).toBeDefined();
    });

    it('should use RoundPerLoopBehavior for perLoop mode', () => {
      const childBlocks: any[] = [{ id: 'child1', label: 'Child 1' }];

      const behaviors = LoopBundle.create({
        totalRounds: 3,
        children: childBlocks,
        loopMode: 'perLoop'
      });

      const perLoopBehavior = behaviors.find(b => b instanceof RoundPerLoopBehavior);
      expect(perLoopBehavior).toBeDefined();

      const perNextBehavior = behaviors.find(b => b instanceof RoundPerNextBehavior);
      expect(perNextBehavior).toBeUndefined();
    });

    it('should use RoundPerNextBehavior for perNext mode', () => {
      const childBlocks: any[] = [{ id: 'child1', label: 'Child 1' }];

      const behaviors = LoopBundle.create({
        totalRounds: 3,
        children: childBlocks,
        loopMode: 'perNext'
      });

      const perNextBehavior = behaviors.find(b => b instanceof RoundPerNextBehavior);
      expect(perNextBehavior).toBeDefined();

      const perLoopBehavior = behaviors.find(b => b instanceof RoundPerLoopBehavior);
      expect(perLoopBehavior).toBeUndefined();
    });

    it('should include RoundDisplayBehavior when showRoundDisplay is true', () => {
      const childBlocks: any[] = [{ id: 'child1', label: 'Child 1' }];

      const behaviors = LoopBundle.create({
        totalRounds: 3,
        children: childBlocks,
        loopMode: 'perLoop',
        showRoundDisplay: true
      });

      const displayBehavior = behaviors.find(b => b instanceof RoundDisplayBehavior);
      expect(displayBehavior).toBeDefined();
    });

    it('should omit RoundDisplayBehavior when showRoundDisplay is false', () => {
      const childBlocks: any[] = [{ id: 'child1', label: 'Child 1' }];

      const behaviors = LoopBundle.create({
        totalRounds: 3,
        children: childBlocks,
        loopMode: 'perLoop',
        showRoundDisplay: false
      });

      const displayBehavior = behaviors.find(b => b instanceof RoundDisplayBehavior);
      expect(displayBehavior).toBeUndefined();
    });

    it('should enforce correct priority ordering', () => {
      const childBlocks: any[] = [{ id: 'child1', label: 'Child 1' }];

      const behaviors = LoopBundle.create({
        totalRounds: 3,
        children: childBlocks,
        loopMode: 'perLoop'
      });

      const childIndex = behaviors.find(b => b instanceof ChildIndexBehavior);
      const childRunner = behaviors.find(b => b instanceof ChildRunnerBehavior);

      // ChildIndex should have lower priority (executes first)
      expect(childIndex?.priority).toBeLessThan(childRunner?.priority || Infinity);
    });
  });

  describe('dependency enforcement', () => {
    it('should ensure ChildRunnerBehavior has required dependency', () => {
      const childBlocks: any[] = [{ id: 'child1', label: 'Child 1' }];

      const behaviors = LoopBundle.create({
        totalRounds: 3,
        children: childBlocks,
        loopMode: 'perLoop'
      });

      const childRunner = behaviors.find(b => b instanceof ChildRunnerBehavior) as any;
      
      // ChildRunnerBehavior should declare ChildIndexBehavior dependency
      expect(childRunner?.requiredBehaviors).toBeDefined();
      expect(childRunner?.requiredBehaviors).toContain(ChildIndexBehavior);
    });
  });
});
