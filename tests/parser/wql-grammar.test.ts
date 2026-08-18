/**
 * WQL grammar tests — the Lezer grammar (src/grammar/wql.grammar) behind the
 * Wod Query Language (CONTEXT.md glossary).
 *
 * Defends the observable contracts:
 *   1. The full WQL surface parses without error nodes:
 *      aggregators, dotted metric namespaces, negated/wildcard tag filters,
 *      group-by dimensions, day/week rollups.
 *   2. Words that collide with structural literals still parse — Lezer
 *      resolves tokens contextually (metric `session` in `count:session`,
 *      `d`/`w`-prefixed words like `week`/`walking`, a dimension named `by`).
 *   3. Malformed input recovers: the parser never throws, always returns a
 *      tree, and marks the damage with error nodes so parseQuery can reject.
 */
import { describe, it, expect } from 'bun:test';
import type { Tree } from '@lezer/common';
import { parser } from '@bitcobblers/wod-wiki-engine';

const parse = (source: string): Tree => parser.parse(source);

function errorSpans(tree: Tree, source: string): string[] {
  const spans: string[] = [];
  tree.iterate({
    enter(node) {
      if (node.type.isError) spans.push(source.slice(node.from, node.to));
    },
  });
  return spans;
}

describe('wql.grammar', () => {
  describe('full surface', () => {
    const valid = [
      'sum:totalVolume{discipline:strength,!effort:burpee} by {week,effort}.rollup(1w)',
      'max:tis{effort:back*}',
      'avg:tis{}.rollup(7d)',
      'count:totalReps',
      'avg:wod.rep_rate{effort:thruster, note:friday-benchmark} by {round}',
      'avg:back-squat.reps{} by {day, week, session, round}',
      'last:wod.time.total{note:friday-benchmark} by {session}',
      'avg:wod.load.acwr{}.rollup(1d)',
      'sum:wod.session_load{} by {intensity}.rollup(1w)',
      // Whitespace-tolerant authoring style.
      'sum:totalVolume{discipline:strength, !effort:burpee} by {week, effort} .rollup(1w)',
      // Multi-value tag filters.
      'sum:totalVolume{note:a|b|c}',
      'max:tis{effort:back*|squat*}',
      'avg:tis{effort:thruster|burpee,note:monday} by {week}',
    ];

    for (const source of valid) {
      it(`parses cleanly: ${source}`, () => {
        expect(errorSpans(parse(source), source)).toEqual([]);
      });
    }

    it('exposes the structural nodes the AST mapper walks', () => {
      const source = 'sum:totalVolume{discipline:strength,!effort:burpee} by {week,effort}.rollup(1w)';
      expect(parse(source).toString()).toBe(
        'Query(' +
          'Head(Aggregator(Word),Metric(Word)),' +
          'Filters(Filter(TagKey(Word),TagValue(Value(Word))),Filter(Negate,TagKey(Word),TagValue(Value(Word)))),' +
          'GroupBy(By,Dimension(Word),Dimension(Word)),' +
          'Rollup(RollupDot,Int,Word)' +
        ')',
      );
    });

    it('exposes repeated TagValue words for multi-value filters', () => {
      expect(parse('sum:totalVolume{note:a|b|c}').toString()).toBe(
        'Query(Head(Aggregator(Word),Metric(Word)),Filters(Filter(TagKey(Word),TagValue(Value(Word),Value(Word),Value(Word)))))',
      );
      expect(parse('max:tis{effort:back*|squat*}').toString()).toBe(
        'Query(Head(Aggregator(Word),Metric(Word)),Filters(Filter(TagKey(Word),TagValue(Value(Word,Star),Value(Word,Star)))))',
      );
      expect(parse('sum:totalVolume{!effort:thruster|burpee}').toString()).toBe(
        'Query(Head(Aggregator(Word),Metric(Word)),Filters(Filter(Negate,TagKey(Word),TagValue(Value(Word),Value(Word)))))',
      );
    });
  });

  describe('contextual token resolution', () => {
    const colliding = [
      // A metric named like a virtual dimension.
      'count:session',
      // Metric segments starting with rollup units (d/w).
      'sum:distance{effort:walking}',
      'avg:delta.reps by {week,day}',
      // A dimension named like the `by` keyword.
      'sum:x by {by}',
      // Aggregator-named metrics.
      'count:count',
    ];

    for (const source of colliding) {
      it(`parses cleanly: ${source}`, () => {
        expect(errorSpans(parse(source), source)).toEqual([]);
      });
    }
  });

  describe('error recovery', () => {
    it('recovers from garbage with error nodes, never throwing', () => {
      const tree = parse('not a query');
      expect(tree.topNode.name).toBe('Query');
      expect(errorSpans(tree, 'not a query').length).toBeGreaterThan(0);
    });

    it('marks an empty document as erroneous', () => {
      expect(errorSpans(parse(''), '').length).toBeGreaterThan(0);
    });

    it('keeps valid subtrees around the damage', () => {
      const source = 'sum:tis{effort:thruster, !!!} by {week}';
      const tree = parse(source);
      expect(errorSpans(tree, source).length).toBeGreaterThan(0);
      // The head and group-by survive intact around the broken filter.
      expect(tree.topNode.getChild('Head')?.name).toBe('Head');
      expect(tree.topNode.getChild('GroupBy')?.name).toBe('GroupBy');
    });

    it('rejects an unterminated filter list without losing the head', () => {
      const source = 'sum:tis{effort:thruster';
      const tree = parse(source);
      expect(errorSpans(tree, source).length).toBeGreaterThan(0);
      expect(tree.topNode.getChild('Head')?.getChild('Metric')?.name).toBe('Metric');
    });
  });
});
