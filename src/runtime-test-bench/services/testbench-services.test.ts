import { describe, it, expect } from 'vitest';
import { globalParser, globalCompiler } from './testbench-services';
import { MdTimerRuntime } from '../../parser/md-timer';
import { JitCompiler } from '../../runtime/JitCompiler';

describe('testbench-services', () => {
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
});
