import { describe, it, expect } from 'bun:test';
import { RuntimeTestBuilder } from '../../../../tests/harness/RuntimeTestBuilder';
import { TimerStrategy } from '../TimerStrategy';
import { TimerBehavior } from '../../behaviors/TimerBehavior';
import { SoundBehavior } from '../../behaviors/SoundBehavior';
import { HistoryBehavior } from '../../behaviors/HistoryBehavior';

describe('TimerStrategy (Migrated)', () => {
  const timerStrategy = new TimerStrategy();

  describe('compile()', () => {
    it('should compile statement with Timer fragment into RuntimeBlock', () => {
      const harness = new RuntimeTestBuilder()
        .withScript('10:00 Run')
        .withStrategy(timerStrategy)
        .build();

      const block = harness.pushStatement(0);

      expect(block).toBeDefined();
      expect(block.blockType).toBe('Timer');

      const timerBehavior = block.getBehavior(TimerBehavior);
      expect(timerBehavior).toBeDefined();
    });

    it('should create countdown timer', () => {
      const harness = new RuntimeTestBuilder()
        .withScript('10:00 Run')
        .withStrategy(timerStrategy)
        .build();

      const block = harness.pushStatement(0);
      const timerBehavior = block.getBehavior(TimerBehavior);

      expect((timerBehavior as any).direction).toBe('down');
    });

    it('should create count-up timer when direction is up (00:00)', () => {
       const harness = new RuntimeTestBuilder()
        .withScript('00:00 Run')
        .withStrategy(timerStrategy)
        .build();

      const block = harness.pushStatement(0);
      const timerBehavior = block.getBehavior(TimerBehavior);

      expect((timerBehavior as any).direction).toBe('up');
    });

    it('should attach SoundBehavior with countdown cues', () => {
      const harness = new RuntimeTestBuilder()
        .withScript('10:00 Run')
        .withStrategy(timerStrategy)
        .build();

      const block = harness.pushStatement(0);
      const soundBehavior = block.getBehavior(SoundBehavior);

      expect(soundBehavior).toBeDefined();
      const config = (soundBehavior as any).config;
      expect(config.direction).toBe('down');
      // Should have 3-2-1 and complete cues
      expect(config.cues.length).toBeGreaterThan(0);
      expect(config.cues.find((c: any) => c.id === '3-sec')).toBeDefined();
      expect(config.cues.find((c: any) => c.id === 'complete')).toBeDefined();
    });

    it('should attach HistoryBehavior', () => {
      const harness = new RuntimeTestBuilder()
        .withScript('10:00 Run')
        .withStrategy(timerStrategy)
        .build();

      const block = harness.pushStatement(0);
      const historyBehavior = block.getBehavior(HistoryBehavior);

      expect(historyBehavior).toBeDefined();
      expect((historyBehavior as any).label).toBe("Timer");
    });
  });
});
