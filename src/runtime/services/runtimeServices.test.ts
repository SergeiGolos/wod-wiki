import { describe, it, expect } from 'bun:test';
import { PRODUCTION_STRATEGIES, createCompiler } from './runtimeServices';
import { createParser } from '../../parser/parserInstance';
import { MdTimerRuntime } from '../../parser/md-timer';
import { JitCompiler } from '../compiler/JitCompiler';
import { AmrapLogicStrategy } from '../compiler/strategies/logic/AmrapLogicStrategy';
import { IntervalLogicStrategy } from '../compiler/strategies/logic/IntervalLogicStrategy';
import { GenericTimerStrategy } from '../compiler/strategies/components/GenericTimerStrategy';
import { GenericLoopStrategy } from '../compiler/strategies/components/GenericLoopStrategy';
import { GenericGroupStrategy } from '../compiler/strategies/components/GenericGroupStrategy';
import { SoundStrategy } from '../compiler/strategies/enhancements/SoundStrategy';
import { ReportOutputStrategy } from '../compiler/strategies/enhancements/ReportOutputStrategy';
import { ChildrenStrategy } from '../compiler/strategies/enhancements/ChildrenStrategy';
import { EffortFallbackStrategy } from '../compiler/strategies/fallback/EffortFallbackStrategy';

describe('runtimeServices', () => {
  describe('createParser', () => {
    it('should return a MdTimerRuntime instance', () => {
      const parser = createParser();
      expect(parser).toBeInstanceOf(MdTimerRuntime);
    });

    it('should successfully parse workout code', () => {
      const code = '(3) Pullups';
      const script = createParser().read(code);

      expect(script).toBeDefined();
      expect(script.statements).toBeDefined();
      expect(script.statements.length).toBeGreaterThan(0);
    });

    it('should parse different workout patterns', () => {
      const patterns = [
        '(3) Pullups',
        '10:00 AMRAP Pullups',
        'For Time: 21 Thrusters'
      ];

      patterns.forEach(pattern => {
        const script = createParser().read(pattern);
        expect(script).toBeDefined();
        expect(script.statements.length).toBeGreaterThan(0);
      });
    });

    it('should return fresh instances on each call', () => {
      const parser1 = createParser();
      const parser2 = createParser();
      expect(parser1).not.toBe(parser2);
    });
  });

  describe('createCompiler', () => {
    it('returns a JitCompiler with production strategies by default', () => {
      const compiler = createCompiler();
      expect(compiler).toBeInstanceOf(JitCompiler);
    });

    it('accepts custom strategy list', () => {
      const compiler = createCompiler([new EffortFallbackStrategy()]);
      expect(compiler).toBeInstanceOf(JitCompiler);
    });

    it('should be ready for compilation with strategies', () => {
      const script = createParser().read('(3) Pullups');
      const compiler = createCompiler();

      expect(script).toBeDefined();
      expect(script.statements.length).toBeGreaterThan(0);
      expect(compiler).toBeDefined();
    });
  });

  describe('PRODUCTION_STRATEGIES', () => {
    it('contains 9 strategies (RestBlockStrategy is direct-built, not JIT-matched)', () => {
      expect(PRODUCTION_STRATEGIES).toHaveLength(9);
    });

    it('has AmrapLogicStrategy at index 0', () => {
      expect(PRODUCTION_STRATEGIES[0]).toBeInstanceOf(AmrapLogicStrategy);
    });

    it('has IntervalLogicStrategy at index 1', () => {
      expect(PRODUCTION_STRATEGIES[1]).toBeInstanceOf(IntervalLogicStrategy);
    });

    it('has GenericTimerStrategy at index 2', () => {
      expect(PRODUCTION_STRATEGIES[2]).toBeInstanceOf(GenericTimerStrategy);
    });

    it('has GenericLoopStrategy at index 3', () => {
      expect(PRODUCTION_STRATEGIES[3]).toBeInstanceOf(GenericLoopStrategy);
    });

    it('has GenericGroupStrategy at index 4', () => {
      expect(PRODUCTION_STRATEGIES[4]).toBeInstanceOf(GenericGroupStrategy);
    });

    it('has SoundStrategy at index 5', () => {
      expect(PRODUCTION_STRATEGIES[5]).toBeInstanceOf(SoundStrategy);
    });

    it('has ReportOutputStrategy at index 6', () => {
      expect(PRODUCTION_STRATEGIES[6]).toBeInstanceOf(ReportOutputStrategy);
    });

    it('has ChildrenStrategy at index 7', () => {
      expect(PRODUCTION_STRATEGIES[7]).toBeInstanceOf(ChildrenStrategy);
    });

    it('has EffortFallbackStrategy at index 8', () => {
      expect(PRODUCTION_STRATEGIES[8]).toBeInstanceOf(EffortFallbackStrategy);
    });
  });
});
