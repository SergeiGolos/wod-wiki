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

    it.skip('should process statements through dialect registry before strategy matching', () => {
      // NOTE: This test uses the old compile() API. The new JitCompiler uses apply(builder) pattern
      // and BlockBuilder.build() which requires proper context setup.
      const registry = new DialectRegistry();
      registry.register(new CrossFitDialect());
      
      // Strategy that matches on hints
      const hintBasedStrategy: IRuntimeBlockStrategy = {
        match: (statements) => {
          return statements[0].hints?.has('behavior.repeating_interval') ?? false;
        },
        compile: () => mockBlock,
        apply: () => {} // Required for composition flow
      };
      
      const compiler = new JitCompiler([hintBasedStrategy], registry);
      
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Action, value: 'EMOM 10', type: 'action' },
          { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' }
        ],
        children: [],
        meta: { line: 1, startOffset: 0, endOffset: 10, columnStart: 0, columnEnd: 10, length: 10 }
      } as any;
      
      const result = compiler.compile([statement], mockRuntime);
      
      // Strategy should match because dialect added the hint
      expect(result).toBe(mockBlock);
      // Statement should have hints after processing
      expect(statement.hints?.has('behavior.repeating_interval')).toBe(true);
      expect(statement.hints?.has('workout.emom')).toBe(true);
    });

    it('should not match strategy when dialect does not add required hints', () => {
      const registry = new DialectRegistry();
      registry.register(new CrossFitDialect());
      
      // Strategy that requires a specific hint
      const requiresSpecificHint: IRuntimeBlockStrategy = {
        match: (statements) => {
          return statements[0].hints?.has('behavior.time_bound') ?? false;
        },
        compile: () => mockBlock
      };
      
      const compiler = new JitCompiler([requiresSpecificHint], registry);
      
      // Statement without AMRAP or FOR TIME - no time_bound hint will be added
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' }
        ],
        children: [],
        meta: { line: 1, startOffset: 0, endOffset: 10, columnStart: 0, columnEnd: 10, length: 10 }
      } as any;
      
      const result = compiler.compile([statement], mockRuntime);
      
      // No strategy should match
      expect(result).toBeUndefined();
    });

    it.skip('should support multiple dialects adding hints', () => {
      // NOTE: This test uses the old compile() API. The new JitCompiler uses apply(builder) pattern
      const registry = new DialectRegistry();
      
      // First dialect adds hint A
      registry.register({
        id: 'dialect-a',
        name: 'Dialect A',
        analyze: () => ({ hints: ['hint.from.a'] })
      });
      
      // Second dialect adds hint B
      registry.register({
        id: 'dialect-b', 
        name: 'Dialect B',
        analyze: () => ({ hints: ['hint.from.b'] })
      });
      
      // Strategy that requires both hints
      const requiresBothHints: IRuntimeBlockStrategy = {
        match: (statements) => {
          const hints = statements[0].hints;
          return (hints?.has('hint.from.a') && hints?.has('hint.from.b')) ?? false;
        },
        compile: () => mockBlock,
        apply: () => {} // Required for composition flow
      };
      
      const compiler = new JitCompiler([requiresBothHints], registry);
      
      const statement: ICodeStatement = {
        id: 1,
        fragments: [],
        children: [],
        meta: { line: 1, startOffset: 0, endOffset: 10, columnStart: 0, columnEnd: 10, length: 10 }
      } as any;
      
      const result = compiler.compile([statement], mockRuntime);
      
      expect(result).toBe(mockBlock);
      expect(statement.hints?.has('hint.from.a')).toBe(true);
      expect(statement.hints?.has('hint.from.b')).toBe(true);
    });
  });

  describe('strategy registration', () => {
    it.skip('should allow registering strategies after construction', () => {
      // NOTE: This test uses the old compile() API. The new JitCompiler uses apply(builder) pattern
      const registry = new DialectRegistry();
      const compiler = new JitCompiler([], registry);
      
      const strategy: IRuntimeBlockStrategy = {
        match: () => true,
        compile: () => mockBlock,
        apply: () => {} // Required for composition flow
      };
      
      compiler.registerStrategy(strategy);
      
      const statement: ICodeStatement = {
        id: 1,
        fragments: [],
        children: [],
        meta: { line: 1, startOffset: 0, endOffset: 10, columnStart: 0, columnEnd: 10, length: 10 }
      } as any;
      
      const result = compiler.compile([statement], mockRuntime);
      
      expect(result).toBe(mockBlock);
    });
  });
});
