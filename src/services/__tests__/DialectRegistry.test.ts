import { describe, it, expect, vi } from 'bun:test';
import { DialectRegistry } from '../DialectRegistry';
import { IDialect, DialectAnalysis } from '../../core/models/Dialect';
import { ICodeStatement } from '../../core/models/CodeStatement';
import { MetricType } from '../../core/models/Metric';
import { MetricContainer } from '../../core/models/MetricContainer';
import { getHints, hasHint, hintsToContainer } from '../../core/metrics/hints';

// Mock dialect for testing — emits hint markers as metrics.
const createMockDialect = (id: string, hints: string[] = []): IDialect => ({
  id,
  name: `Mock Dialect ${id}`,
  analyze: vi.fn().mockReturnValue({ metrics: hintsToContainer(hints) })
});

/** A minimal statement whose metrics is a real MetricContainer. */
const makeStatement = (id: number, seedHints: string[] = []): ICodeStatement =>
  ({ id, metrics: hintsToContainer(seedHints) } as any);

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
    it('should add hint metrics from dialect analysis', () => {
      const registry = new DialectRegistry();
      registry.register(createMockDialect('test', ['hint.a', 'hint.b']));

      const statement = makeStatement(1);

      registry.process(statement);

      expect(hasHint(statement, 'hint.a')).toBe(true);
      expect(hasHint(statement, 'hint.b')).toBe(true);
    });

    it('should process dialects in registration order', () => {
      const registry = new DialectRegistry();
      const order: string[] = [];

      const dialect1: IDialect = {
        id: 'first',
        name: 'First',
        analyze: () => {
          order.push('first');
          return { metrics: MetricContainer.empty() };
        }
      };

      const dialect2: IDialect = {
        id: 'second',
        name: 'Second',
        analyze: () => {
          order.push('second');
          return { metrics: MetricContainer.empty() };
        }
      };

      registry.register(dialect1);
      registry.register(dialect2);

      registry.process(makeStatement(1));

      expect(order).toEqual(['first', 'second']);
    });

    it('should accumulate hints from multiple dialects', () => {
      const registry = new DialectRegistry();
      registry.register(createMockDialect('a', ['hint.from.a']));
      registry.register(createMockDialect('b', ['hint.from.b']));

      const statement = makeStatement(1);
      registry.process(statement);

      expect(hasHint(statement, 'hint.from.a')).toBe(true);
      expect(hasHint(statement, 'hint.from.b')).toBe(true);
    });

    it('should preserve existing hints on statement', () => {
      const registry = new DialectRegistry();
      registry.register(createMockDialect('test', ['new.hint']));

      const statement = makeStatement(1, ['existing.hint']);

      registry.process(statement);

      expect(hasHint(statement, 'existing.hint')).toBe(true);
      expect(hasHint(statement, 'new.hint')).toBe(true);
    });
  });

  describe('processAll', () => {
    it('should process multiple statements', () => {
      const registry = new DialectRegistry();
      registry.register(createMockDialect('test', ['processed']));

      const statements: ICodeStatement[] = [
        makeStatement(1),
        makeStatement(2),
        makeStatement(3),
      ];

      registry.processAll(statements);

      statements.forEach(stmt => {
        expect(hasHint(stmt, 'processed')).toBe(true);
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
          const metrics = statement.metrics;

          const hasEmom = metrics.some(f =>
            (f.type === MetricType.Action || f.type === MetricType.Effort) &&
            typeof f.value === 'string' &&
            f.value.toUpperCase().includes('EMOM')
          );

          if (hasEmom) {
            hints.push('behavior.repeating_interval');
            hints.push('workout.emom');
          }

          return { metrics: hintsToContainer(hints) };
        }
      };

      const registry = new DialectRegistry();
      registry.register(crossfitLike);

      const statement: ICodeStatement = {
        id: 1,
        metrics: MetricContainer.from([
          { type: MetricType.Action, value: 'EMOM 10', origin: 'parser' },
          { type: MetricType.Duration, value: 60000, origin: 'parser' }
        ])
      } as any;

      registry.process(statement);

      expect(hasHint(statement, 'behavior.repeating_interval')).toBe(true);
      expect(hasHint(statement, 'workout.emom')).toBe(true);
      // Hint markers do not surface as display metrics.
      expect(getHints(statement).sort()).toEqual(['behavior.repeating_interval', 'workout.emom']);
    });
  });
});
