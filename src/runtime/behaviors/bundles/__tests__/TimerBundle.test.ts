import { describe, it, expect } from 'bun:test';
import { TimerBundle } from '../TimerBundle';
import { TimerBehavior } from '../../TimerBehavior';
import { TimerPauseResumeBehavior } from '../../TimerPauseResumeBehavior';
import { SoundBehavior } from '../../SoundBehavior';
import { StrategyBasedCompletionBehavior } from '@/runtime/completion/StrategyBasedCompletionBehavior';

describe('TimerBundle', () => {
  describe('create()', () => {
    it('should create behaviors for countdown timer with all features', () => {
      const behaviors = TimerBundle.create({
        direction: 'down',
        durationMs: 60000,
        enableSound: true,
        enablePauseResume: true
      });

      expect(behaviors.length).toBeGreaterThan(0);
      
      const timerBehavior = behaviors.find(b => b instanceof TimerBehavior);
      expect(timerBehavior).toBeDefined();
      
      const pauseBehavior = behaviors.find(b => b instanceof TimerPauseResumeBehavior);
      expect(pauseBehavior).toBeDefined();
      
      const soundBehavior = behaviors.find(b => b instanceof SoundBehavior);
      expect(soundBehavior).toBeDefined();
      
      const completionBehavior = behaviors.find(b => b instanceof StrategyBasedCompletionBehavior);
      expect(completionBehavior).toBeDefined();
    });

    it('should create behaviors for countup timer without duration', () => {
      const behaviors = TimerBundle.create({
        direction: 'up',
        enableSound: false,
        enablePauseResume: true
      });

      expect(behaviors.length).toBeGreaterThan(0);
      
      const timerBehavior = behaviors.find(b => b instanceof TimerBehavior);
      expect(timerBehavior).toBeDefined();
      
      const completionBehavior = behaviors.find(b => b instanceof StrategyBasedCompletionBehavior);
      expect(completionBehavior).toBeUndefined();
    });

    it('should omit pause/resume when disabled', () => {
      const behaviors = TimerBundle.create({
        direction: 'down',
        durationMs: 60000,
        enablePauseResume: false
      });

      const pauseBehavior = behaviors.find(b => b instanceof TimerPauseResumeBehavior);
      expect(pauseBehavior).toBeUndefined();
    });

    it('should omit sound when disabled', () => {
      const behaviors = TimerBundle.create({
        direction: 'down',
        durationMs: 60000,
        enableSound: false
      });

      const soundBehavior = behaviors.find(b => b instanceof SoundBehavior);
      expect(soundBehavior).toBeUndefined();
    });

    it('should place timer behavior first with correct priority', () => {
      const behaviors = TimerBundle.create({
        direction: 'down',
        durationMs: 60000,
        enableSound: true,
        enablePauseResume: true
      });

      const timerBehavior = behaviors.find(b => b instanceof TimerBehavior);
      expect(timerBehavior).toBeDefined();
      expect(timerBehavior!.priority).toBe(100);
    });
  });
});
