import { describe, it, expect, vi } from 'bun:test';
import { JitCompiler } from '../compiler/JitCompiler';
import { DialectRegistry } from '../../services/DialectRegistry';
import { CrossFitDialect } from '../../dialects/CrossFitDialect';
import { ICodeStatement } from '../../core/models/CodeStatement';
import { FragmentType } from '../../core/models/CodeFragment';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeBlockStrategy } from '../contracts/IRuntimeBlockStrategy';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';

describe('JitCompiler with Dialect Registry', () => {
  // Mock runtime
  const mockRuntime = {
    fragmentCompiler: {
      compileStatementFragments: vi.fn().mockReturnValue({}),
    },
    memory: {
      allocate: vi.fn().mockReturnValue({ id: 'mem-1' }),
    },
    clock: {
      register: vi.fn(),
    }
  } as unknown as IScriptRuntime;

  // Simple mock block
  const mockBlock = {
    key: 'mock-block',
    dispose: vi.fn()
  } as unknown as IRuntimeBlock;

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
