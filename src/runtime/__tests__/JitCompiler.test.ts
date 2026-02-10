import { describe, it, expect } from 'bun:test';
import { JitCompiler } from '../compiler/JitCompiler';
import { DialectRegistry } from '../../services/DialectRegistry';

describe('JitCompiler with Dialect Registry', () => {

  describe('dialect registry integration', () => {
    it('should use provided dialect registry', () => {
      const registry = new DialectRegistry();
      const compiler = new JitCompiler([], registry);

      expect(compiler.getDialectRegistry()).toBe(registry);
    });

    it('should create default dialect registry if none provided', () => {
      const compiler = new JitCompiler();

      expect(compiler.getDialectRegistry()).toBeInstanceOf(DialectRegistry);
    });

  });
});
