/**
 * syntaxChallengeValidator.test.ts — pure unit tests for the validator.
 *
 * Each validator is tested independently with a small synthetic ScriptBlock.
 * The ICodeStatement shape is constructed manually with a real MetricContainer
 * so we exercise the real metric-filtering code path.
 */

import { describe, expect, it } from 'bun:test';
import { MetricType, type IMetric } from '@/core/models/Metric';
import { MetricContainer } from '@/core/models/MetricContainer';
import { CodeMetadata } from '@/core/models/CodeMetadata';
import type { ICodeStatement } from '@/core/models/CodeStatement';
import { ParsedCodeStatement } from '@/core/models/CodeStatement';
import { createParser } from '@/parser/parserInstance';
import {
  validateAllQuests,
  validateScriptBlock,
  type ValidationSchema,
} from './syntaxChallengeValidator';

// ── Fixtures ──────────────────────────────────────────────────────────────

function makeMetric(type: MetricType | string, value: number | string): IMetric {
  return { type, value, image: String(value) } as IMetric;
}

function makeStatement(
  metrics: IMetric[],
  id = 0,
  exerciseId?: string,
): ICodeStatement {
  const stmt = new ParsedCodeStatement();
  stmt.id = id;
  stmt.parent = undefined;
  stmt.children = [];
  stmt.exerciseId = exerciseId;
  stmt.meta = new CodeMetadata({ line: 0, columnStart: 0, columnEnd: 0, startOffset: 0, endOffset: 0, length: 0, raw: '' });
  stmt.metricMeta = new Map();
  stmt.isLeaf = true;
  stmt.metrics = MetricContainer.from(metrics, id);
  return stmt;
}

function block(
  content: string,
  statements: ICodeStatement[] = [],
): { content: string; statements: ICodeStatement[] } {
  return { content, statements };
}

const EMPTY = { content: '', statements: [] };

// ── has-movement ─────────────────────────────────────────────────────────

describe('validateScriptBlock — has-movement', () => {
  it('passes when at least one statement carries an Effort metric', () => {
    const stmt = makeStatement([makeMetric(MetricType.Effort, 'KB Swings')], 0, 'kb-swings');
    const r = validateScriptBlock(block('10 KB Swings', [stmt]), {
      type: 'has-movement',
    });
    expect(r.pass).toBe(true);
    expect(r.detail).toBe('1 movement');
  });

  it('fails on an empty block', () => {
    const r = validateScriptBlock(EMPTY, { type: 'has-movement' });
    expect(r.pass).toBe(false);
    expect(r.reason).toMatch(/movement/);
  });
});

// ── exactly-movements ────────────────────────────────────────────────────

describe('validateScriptBlock — exactly-movements', () => {
  it('passes when the count matches', () => {
    const a = makeStatement([makeMetric(MetricType.Effort, 'A')], 0, 'a');
    const b = makeStatement([makeMetric(MetricType.Effort, 'B')], 1, 'b');
    const r = validateScriptBlock(block('A B', [a, b]), {
      type: 'exactly-movements',
      count: 2,
    });
    expect(r.pass).toBe(true);
    expect(r.detail).toBe('2');
  });

  it('fails on a count mismatch', () => {
    const a = makeStatement([makeMetric(MetricType.Effort, 'A')], 0, 'a');
    const r = validateScriptBlock(block('A', [a]), {
      type: 'exactly-movements',
      count: 2,
    });
    expect(r.pass).toBe(false);
    expect(r.reason).toMatch(/Expected exactly 2/);
  });

  it('fails when count is missing', () => {
    const r = validateScriptBlock(EMPTY, { type: 'exactly-movements' });
    expect(r.pass).toBe(false);
    expect(r.reason).toMatch(/count/);
  });
});

// ── has-reps / has-timer / min-rounds ─────────────────────────────────────

describe('validateScriptBlock — has-reps', () => {
  it('passes when a Rep metric is present', () => {
    const stmt = makeStatement(
      [makeMetric(MetricType.Effort, 'KB'), makeMetric(MetricType.Rep, 10)],
      0,
      'kb',
    );
    const r = validateScriptBlock(block('10 KB Swings', [stmt]), {
      type: 'has-reps',
    });
    expect(r.pass).toBe(true);
  });

  it('fails when no Rep metric is present', () => {
    const stmt = makeStatement([makeMetric(MetricType.Effort, 'KB')], 0, 'kb');
    const r = validateScriptBlock(block('KB Swings', [stmt]), { type: 'has-reps' });
    expect(r.pass).toBe(false);
  });
});

describe('validateScriptBlock — has-timer', () => {
  it('passes on Duration metric', () => {
    const stmt = makeStatement([makeMetric(MetricType.Duration, 30000)], 0);
    const r = validateScriptBlock(block('*:30 Rest', [stmt]), {
      type: 'has-timer',
    });
    expect(r.pass).toBe(true);
  });

  it('fails without a Duration metric', () => {
    const stmt = makeStatement([makeMetric(MetricType.Effort, 'KB')], 0, 'kb');
    const r = validateScriptBlock(block('KB Swings', [stmt]), {
      type: 'has-timer',
    });
    expect(r.pass).toBe(false);
  });
});

describe('validateScriptBlock — min-rounds', () => {
  it('passes when the round total meets the threshold', () => {
    const stmt = makeStatement(
      [makeMetric(MetricType.Rounds, 3), makeMetric(MetricType.Effort, 'KB')],
      0,
      'kb',
    );
    const r = validateScriptBlock(block('(3 Rounds) KB', [stmt]), {
      type: 'min-rounds',
      count: 3,
    });
    expect(r.pass).toBe(true);
    expect(r.detail).toBe('3 rounds');
  });

  it('fails when below the threshold', () => {
    const stmt = makeStatement(
      [makeMetric(MetricType.Rounds, 1), makeMetric(MetricType.Effort, 'KB')],
      0,
      'kb',
    );
    const r = validateScriptBlock(block('(1 Round) KB', [stmt]), {
      type: 'min-rounds',
      count: 3,
    });
    expect(r.pass).toBe(false);
    expect(r.reason).toMatch(/at least 3/);
  });
});

// ── contains-token ───────────────────────────────────────────────────────

describe('validateScriptBlock — contains-token', () => {
  it('passes when the token appears in the content', () => {
    const r = validateScriptBlock(
      { content: '```wod\n10 KB Swings\n```', statements: [] },
      { type: 'contains-token', value: 'KB' },
    );
    expect(r.pass).toBe(true);
  });

  it('fails when the token is absent', () => {
    const r = validateScriptBlock(
      { content: '```wod\n10 Push-ups\n```', statements: [] },
      { type: 'contains-token', value: 'KB' },
    );
    expect(r.pass).toBe(false);
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────

describe('validateScriptBlock — edge cases', () => {
  it('fails on missing schema', () => {
    const r = validateScriptBlock(EMPTY, undefined);
    expect(r.pass).toBe(false);
  });

  it('fails on empty schema.type', () => {
    const r = validateScriptBlock(EMPTY, { type: '' });
    expect(r.pass).toBe(false);
  });

  it('fails on unknown validation type (default-deny)', () => {
    const r = validateScriptBlock(EMPTY, { type: 'frobnicate' });
    expect(r.pass).toBe(false);
    expect(r.reason).toMatch(/Unknown validation type/);
  });
});

describe('validateAllQuests', () => {
  it('returns a map keyed by quest id', () => {
    const stmt = makeStatement(
      [makeMetric(MetricType.Effort, 'KB'), makeMetric(MetricType.Rep, 10)],
      0,
      'kb',
    );
    const results = validateAllQuests(block('10 KB', [stmt]), [
      { id: 'a', validation: { type: 'has-movement' } },
      { id: 'b', validation: { type: 'has-timer' } },
    ]);
    expect(Object.keys(results).sort()).toEqual(['a', 'b']);
    expect(results.a.pass).toBe(true);
    expect(results.b.pass).toBe(false);
  });

  it('skips quests with no validation schema', () => {
    const r = validateAllQuests(EMPTY, [
      { id: 'a' /* no validation */ },
    ]);
    expect(r.a.pass).toBe(false);
  });

  // type assertion to keep TS happy with the untyped schema
  expect({} as ValidationSchema).toBeDefined();
});

/**
 * Integration test — proves the *real* compile→validate data path that
 * `useSyntaxChallenge` uses. The unit tests above build blocks with a
 * hand-crafted MetricContainer; this one feeds raw wod text through the
 * editor's own `MdTimerRuntime.read()` and confirms the validator sees the
 * expected metrics. If a metric-shape mismatch ever lands between the
 * parser and the validator, the banner would silently never flip in the
 * real editor — these tests are the line of defense.
 */
describe('end-to-end compile→validate (real MdTimerRuntime output)', () => {
  it('empty wod block produces zero statements, so no quest passes', () => {
    const script = createParser().read('```wod\n```');
    const r = validateScriptBlock(
      { content: '```wod\n```', statements: script.statements },
      { type: 'has-movement' },
    );
    expect(r.pass).toBe(false);
  });

  it('"10 Pushups" satisfies has-movement', () => {
    const script = createParser().read('```wod\n10 Pushups\n```');
    const r = validateScriptBlock(
      { content: '```wod\n10 Pushups\n```', statements: script.statements },
      { type: 'has-movement' },
    );
    expect(r.pass).toBe(true);
  });

  it('"*:30 Rest" satisfies has-timer', () => {
    const script = createParser().read('```wod\n*:30 Rest\n```');
    const r = validateScriptBlock(
      { content: '```wod\n*:30 Rest\n```', statements: script.statements },
      { type: 'has-timer' },
    );
    expect(r.pass).toBe(true);
  });

  it('"(3 Rounds) KB" satisfies min-rounds with count=3', () => {
    const script = createParser().read('```wod\n(3 Rounds)\n10 KB\n```');
    const r = validateScriptBlock(
      { content: '```wod\n(3 Rounds)\n10 KB\n```', statements: script.statements },
      { type: 'min-rounds', count: 3 },
    );
    expect(r.pass).toBe(true);
  });

  it('"(1 Round)" fails min-rounds with count=3', () => {
    const script = createParser().read('```wod\n(1 Round)\n10 KB\n```');
    const r = validateScriptBlock(
      { content: '```wod\n(1 Round)\n10 KB\n```', statements: script.statements },
      { type: 'min-rounds', count: 3 },
    );
    expect(r.pass).toBe(false);
  });

  it('full 3-quest script flips all three challenges', () => {
    const source = '```wod\n(3 Rounds)\n  10 KB Swings\n  15 Goblet Squats\n  *:30 Rest\n```';
    const script = createParser().read(source);
    const block = { content: source, statements: script.statements };
    expect(validateScriptBlock(block, { type: 'has-movement' }).pass).toBe(true);
    expect(validateScriptBlock(block, { type: 'has-timer' }).pass).toBe(true);
    expect(validateScriptBlock(block, { type: 'min-rounds', count: 3 }).pass).toBe(true);
  });

  it('blank source (no wod block) fails all three challenges', () => {
    const source = '# Just a heading\n\nNo wod block here.';
    const script = createParser().read(source);
    const block = { content: source, statements: script.statements };
    expect(validateScriptBlock(block, { type: 'has-movement' }).pass).toBe(false);
    expect(validateScriptBlock(block, { type: 'has-timer' }).pass).toBe(false);
    expect(validateScriptBlock(block, { type: 'min-rounds', count: 3 }).pass).toBe(false);
  });
});
