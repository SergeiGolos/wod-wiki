import { describe, it, expect, vi } from 'bun:test';
import { DialectRegistry } from '../DialectRegistry';
import { IDialect, DialectAnalysis } from '../../core/models/Dialect';
import { ICodeStatement } from '../../core/models/CodeStatement';
import { FragmentType } from '../../core/models/CodeFragment';

// Mock dialect for testing
const createMockDialect = (id: string, hints: string[] = []): IDialect => ({
  id,
  name: `Mock Dialect ${id}`,
  analyze: vi.fn().mockReturnValue({ hints })
});

describe('DialectRegistry', () => {
  describe('register and unregister', () => {
    it('should register a dialect', () => {
      const registry = new DialectRegistry();
      const dialect = createMockDialect('test');
      
      registry.register(dialect);
      
      expect(registry.get('test')).toBe(dialect);
    });

    it('should unregister a dialect', () => {
      const registry = new DialectRegistry();
      const dialect = createMockDialect('test');
      
      registry.register(dialect);
      registry.unregister('test');
      
      expect(registry.get('test')).toBeUndefined();
    });

    it('should return registered dialect IDs', () => {
      const registry = new DialectRegistry();
      registry.register(createMockDialect('a'));
      registry.register(createMockDialect('b'));
      registry.register(createMockDialect('c'));
      
      const ids = registry.getRegisteredIds();
      
      expect(ids).toContain('a');
      expect(ids).toContain('b');
      expect(ids).toContain('c');
      expect(ids).toHaveLength(3);
    });

    it('should clear all dialects', () => {
      const registry = new DialectRegistry();
      registry.register(createMockDialect('a'));
      registry.register(createMockDialect('b'));
      
      registry.clear();
      
      expect(registry.getRegisteredIds()).toHaveLength(0);
    });
  });

  describe('process', () => {
    it('should create hints set if not present', () => {
      const registry = new DialectRegistry();
      registry.register(createMockDialect('test'));
      
      const statement: ICodeStatement = {
        id: 1,
        fragments: []
      } as any;
      
      registry.process(statement);
      
      expect(statement.hints).toBeDefined();
      expect(statement.hints).toBeInstanceOf(Set);
    });

    it('should add hints from dialect analysis', () => {
      const registry = new DialectRegistry();
      registry.register(createMockDialect('test', ['hint.a', 'hint.b']));
      
      const statement: ICodeStatement = {
        id: 1,
        fragments: []
      } as any;
      
      registry.process(statement);
      
      expect(statement.hints?.has('hint.a')).toBe(true);
      expect(statement.hints?.has('hint.b')).toBe(true);
    });

    it('should process dialects in registration order', () => {
      const registry = new DialectRegistry();
      const order: string[] = [];
      
      const dialect1: IDialect = {
        id: 'first',
        name: 'First',
        analyze: () => {
          order.push('first');
          return { hints: [] };
        }
      };
      
      const dialect2: IDialect = {
        id: 'second',
        name: 'Second',
        analyze: () => {
          order.push('second');
          return { hints: [] };
        }
      };
      
      registry.register(dialect1);
      registry.register(dialect2);
      
      const statement: ICodeStatement = { id: 1, fragments: [] } as any;
      registry.process(statement);
      
      expect(order).toEqual(['first', 'second']);
    });

    it('should accumulate hints from multiple dialects', () => {
      const registry = new DialectRegistry();
      registry.register(createMockDialect('a', ['hint.from.a']));
      registry.register(createMockDialect('b', ['hint.from.b']));
      
      const statement: ICodeStatement = { id: 1, fragments: [] } as any;
      registry.process(statement);
      
      expect(statement.hints?.has('hint.from.a')).toBe(true);
      expect(statement.hints?.has('hint.from.b')).toBe(true);
    });

    it('should not duplicate existing hints', () => {
      const registry = new DialectRegistry();
      registry.register(createMockDialect('a', ['shared.hint']));
      registry.register(createMockDialect('b', ['shared.hint']));
      
      const statement: ICodeStatement = { id: 1, fragments: [] } as any;
      registry.process(statement);
      
      // Set automatically deduplicates
      expect(statement.hints?.size).toBe(1);
      expect(statement.hints?.has('shared.hint')).toBe(true);
    });

    it('should preserve existing hints on statement', () => {
      const registry = new DialectRegistry();
      registry.register(createMockDialect('test', ['new.hint']));
      
      const statement: ICodeStatement = {
        id: 1,
        fragments: [],
        hints: new Set(['existing.hint'])
      } as any;
      
      registry.process(statement);
      
      expect(statement.hints?.has('existing.hint')).toBe(true);
      expect(statement.hints?.has('new.hint')).toBe(true);
    });
  });

  describe('processAll', () => {
    it('should process multiple statements', () => {
      const registry = new DialectRegistry();
      registry.register(createMockDialect('test', ['processed']));
      
      const statements: ICodeStatement[] = [
        { id: 1, fragments: [] } as any,
        { id: 2, fragments: [] } as any,
        { id: 3, fragments: [] } as any
      ];
      
      registry.processAll(statements);
      
      statements.forEach(stmt => {
        expect(stmt.hints?.has('processed')).toBe(true);
      });
    });
  });

  describe('integration with real dialect', () => {
    it('should work with CrossFit dialect patterns', () => {
      // Dynamic dialect that mimics CrossFit behavior
      const crossfitLike: IDialect = {
        id: 'crossfit-like',
        name: 'CrossFit-like Dialect',
        analyze: (statement: ICodeStatement): DialectAnalysis => {
          const hints: string[] = [];
          const fragments = statement.fragments || [];
          
          const hasEmom = fragments.some(f =>
            (f.fragmentType === FragmentType.Action || f.fragmentType === FragmentType.Effort) &&
            typeof f.value === 'string' &&
            f.value.toUpperCase().includes('EMOM')
          );
          
          if (hasEmom) {
            hints.push('behavior.repeating_interval');
            hints.push('workout.emom');
          }
          
          return { hints };
        }
      };
      
      const registry = new DialectRegistry();
      registry.register(crossfitLike);
      
      const statement: ICodeStatement = {
        id: 1,
        fragments: [
          { fragmentType: FragmentType.Action, value: 'EMOM 10', type: 'action' },
          { fragmentType: FragmentType.Timer, value: 60000, type: 'timer' }
        ]
      } as any;
      
      registry.process(statement);
      
      expect(statement.hints?.has('behavior.repeating_interval')).toBe(true);
      expect(statement.hints?.has('workout.emom')).toBe(true);
    });
  });
});
