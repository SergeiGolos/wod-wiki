import { describe, it, expect } from 'bun:test';
import { PRODUCTION_STRATEGIES, createCompiler, strategyRegistry } from './runtimeServices';
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
    // PRODUCTION_STRATEGIES now derives from strategyRegistry.list(), which is
    // priority-sorted (descending) rather than insertion-ordered — so these
    // assertions check presence and relative priority ordering instead of
    // fixed indices, which would be fragile against future priority tweaks.
    it('contains 9 strategies (RestBlockStrategy is direct-built, not JIT-matched)', () => {
      expect(PRODUCTION_STRATEGIES).toHaveLength(9);
    });

    it('contains every production strategy exactly once', () => {
      const expectedTypes = [
        AmrapLogicStrategy, IntervalLogicStrategy,
        GenericTimerStrategy, GenericLoopStrategy, GenericGroupStrategy,
        SoundStrategy, ReportOutputStrategy, ChildrenStrategy,
        EffortFallbackStrategy,
      ];
      for (const Type of expectedTypes) {
        const matches = PRODUCTION_STRATEGIES.filter(s => s instanceof Type);
        expect(matches).toHaveLength(1);
      }
    });

    it('is sorted by descending priority', () => {
      for (let i = 1; i < PRODUCTION_STRATEGIES.length; i++) {
        expect(PRODUCTION_STRATEGIES[i].priority).toBeLessThanOrEqual(PRODUCTION_STRATEGIES[i - 1].priority);
      }
    });

    it('shares the same strategy instances as strategyRegistry (no duplicate construction)', () => {
      const registryList = strategyRegistry.list();
      expect(PRODUCTION_STRATEGIES).toHaveLength(registryList.length);
      PRODUCTION_STRATEGIES.forEach((s, i) => {
        expect(s).toBe(registryList[i]); // same instance, not just same type
      });
    });
  });
});
