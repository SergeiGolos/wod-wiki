import { describe, it, expect } from 'bun:test';
import { globalParser, globalCompiler, PRODUCTION_STRATEGIES, createCompiler } from './runtimeServices';
import { MdTimerRuntime } from '../../parser/md-timer';
import { JitCompiler } from '../compiler/JitCompiler';
import { AmrapLogicStrategy } from '../compiler/strategies/logic/AmrapLogicStrategy';
import { IntervalLogicStrategy } from '../compiler/strategies/logic/IntervalLogicStrategy';
import { GenericTimerStrategy } from '../compiler/strategies/components/GenericTimerStrategy';
import { GenericLoopStrategy } from '../compiler/strategies/components/GenericLoopStrategy';
import { GenericGroupStrategy } from '../compiler/strategies/components/GenericGroupStrategy';
import { RestBlockStrategy } from '../compiler/strategies/components/RestBlockStrategy';
import { SoundStrategy } from '../compiler/strategies/enhancements/SoundStrategy';
import { ReportOutputStrategy } from '../compiler/strategies/enhancements/ReportOutputStrategy';
import { ChildrenStrategy } from '../compiler/strategies/enhancements/ChildrenStrategy';
import { EffortFallbackStrategy } from '../compiler/strategies/fallback/EffortFallbackStrategy';

describe('runtimeServices', () => {
  describe('globalParser', () => {
    it('should export a MdTimerRuntime instance', () => {
      expect(globalParser).toBeInstanceOf(MdTimerRuntime);
    });

    it('should successfully parse workout code', () => {
      const code = '(3) Pullups';
      const script = globalParser.read(code);
      
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
        const script = globalParser.read(pattern);
        expect(script).toBeDefined();
        expect(script.statements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('globalCompiler', () => {
    it('should export a JitCompiler instance', () => {
      expect(globalCompiler).toBeInstanceOf(JitCompiler);
    });

    it('should be ready for compilation with strategies', () => {
      // Verify the compiler is initialized and ready
      // Actual compilation tests require ScriptRuntime and are in integration tests
      const script = globalParser.read('(3) Pullups');
      
      expect(script).toBeDefined();
      expect(script.statements.length).toBeGreaterThan(0);
      expect(globalCompiler).toBeDefined();
    });
  });

  describe('module-level behavior', () => {
    it('should maintain same instance throughout test suite', () => {
      // Store references
      const parserRef1 = globalParser;
      const compilerRef1 = globalCompiler;

      // Access again
      const parserRef2 = globalParser;
      const compilerRef2 = globalCompiler;

      // Should be exact same references (singleton behavior)
      expect(parserRef1).toBe(parserRef2);
      expect(compilerRef1).toBe(compilerRef2);
    });
  });

  describe('PRODUCTION_STRATEGIES', () => {
    it('contains all 10 strategies', () => {
      expect(PRODUCTION_STRATEGIES).toHaveLength(10);
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

    it('has RestBlockStrategy at index 5', () => {
      expect(PRODUCTION_STRATEGIES[5]).toBeInstanceOf(RestBlockStrategy);
    });

    it('has SoundStrategy at index 6', () => {
      expect(PRODUCTION_STRATEGIES[6]).toBeInstanceOf(SoundStrategy);
    });

    it('has ReportOutputStrategy at index 7', () => {
      expect(PRODUCTION_STRATEGIES[7]).toBeInstanceOf(ReportOutputStrategy);
    });

    it('has ChildrenStrategy at index 8', () => {
      expect(PRODUCTION_STRATEGIES[8]).toBeInstanceOf(ChildrenStrategy);
    });

    it('has EffortFallbackStrategy at index 9', () => {
      expect(PRODUCTION_STRATEGIES[9]).toBeInstanceOf(EffortFallbackStrategy);
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
  });
});
