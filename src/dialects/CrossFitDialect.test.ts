import { describe, it, expect } from 'bun:test';
import { CrossFitDialect } from './CrossFitDialect';
import { MdTimerRuntime } from '../parser/md-timer';
import { ICodeStatement } from '../core/models/CodeStatement';

describe('CrossFitDialect', () => {
  const dialect = new CrossFitDialect();
  const runtime = new MdTimerRuntime();

  // Helper to parse a single line into a statement
  function parseStatement(text: string): ICodeStatement {
    const script = runtime.read(text);
    if (!script.statements.length) {
      throw new Error(`Failed to parse statement from text: "${text}"`);
    }
    return script.statements[0] as ICodeStatement;
  }

  describe('AMRAP detection', () => {
    it('should detect AMRAP in Action fragment', () => {
      // "AMRAP 20 mins" -> Action="AMRAP", Timer=20mins
      const statement = parseStatement('AMRAP 20 mins');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('behavior.time_bound');
      expect(analysis.hints).toContain('workout.amrap');
    });

    it('should detect AMRAP in mixed case', () => {
      const statement = parseStatement('amrap workout');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('behavior.time_bound');
      expect(analysis.hints).toContain('workout.amrap');
    });

    it('should detect AMRAP in Effort fragment', () => {
      // "20 min AMRAP" -> Timer=20mins, Action="AMRAP" (or similar depending on parser)
      // The parser handles "20 min" as a timer usually.
      const statement = parseStatement('20 min AMRAP');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('behavior.time_bound');
      expect(analysis.hints).toContain('workout.amrap');
    });
  });

  describe('EMOM detection', () => {
    it('should detect EMOM in Action fragment', () => {
      const statement = parseStatement('EMOM 10 mins');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('behavior.repeating_interval');
      expect(analysis.hints).toContain('workout.emom');
    });

    it('should detect EMOM in mixed case', () => {
      const statement = parseStatement('emom for 10 mins');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('behavior.repeating_interval');
      expect(analysis.hints).toContain('workout.emom');
    });
  });

  describe('FOR TIME detection', () => {
    it('should detect FOR TIME in Action fragment', () => {
      const statement = parseStatement('For Time');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('behavior.time_bound');
      expect(analysis.hints).toContain('workout.for_time');
    });
  });

  describe('TABATA detection', () => {
    it('should detect TABATA in Action fragment', () => {
      const statement = parseStatement('Tabata Squats');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toContain('behavior.repeating_interval');
      expect(analysis.hints).toContain('workout.tabata');
    });
  });

  describe('no hints for non-matching statements', () => {
    it('should return empty hints for regular exercise', () => {
      const statement = parseStatement('10 Pullups');
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toHaveLength(0);
    });

    it('should return empty hints for timer-only statement', () => {
      const statement = parseStatement('1 min'); // Just a timer
      const analysis = dialect.analyze(statement);

      expect(analysis.hints).toHaveLength(0);
    });

    // We can't easily parse an "empty" statement from text as the parser might skip it, 
    // but we can pass an empty string and verify behavior or skip this test if irrelevant 
    // to real-world usage.
    // However, keeping the manual case for edge-case robustness is fine if preferred, 
    // but parsing empty string usually results in 0 statements.

    it('should handle undefined fragments gracefully', () => {
      // This is an impossible state from the parser, but good for defensive coding.
      // We'll manually construct this one edge case as it tests the dialect's null safety
      // rather than the parser's output.
      const statement = { id: 1 } as any;
      const analysis = dialect.analyze(statement);
      expect(analysis.hints).toHaveLength(0);
    });
  });

  describe('dialect metadata', () => {
    it('should have correct id', () => {
      expect(dialect.id).toBe('crossfit');
    });

    it('should have correct name', () => {
      expect(dialect.name).toBe('CrossFit Dialect');
    });
  });
});
