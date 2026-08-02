/**
 * queryClauses — source-pivot clause model (issue #838, decision #836).
 *
 * Asserts:
 *   1. The `source` head slot compiles the find skeleton for content planes
 *      (journal/collections/feeds/notes/blocks) and the aggregate skeleton
 *      for the metrics plane.
 *   2. Aggregate queries compose end-to-end: head, filters, group-by,
 *      rollup, display unit, where-join.
 *   3. `wqlToClauses` restores aggregate and find strings; recompiling
 *      round-trips exactly, including mixed filter clauses and salvage
 *      states (empty metric, invalid rollup period, exotic scope).
 *   4. `pivotClauses` switches planes: shared filter clauses survive,
 *      kind-specific clauses (time/where vs agg/metric/groupby/rollup/unit)
 *      are dropped, and the metrics head slots are seeded.
 *   5. `target`/`scope` clause types are gone — find target and scope are
 *      derived from the single `source` value.
 */

import { describe, expect, it } from 'bun:test'
import { composerRegistry, type CustomSlotDefinition } from './ComposerRegistry'
import {
  clausesToWql,
  wqlToClauses,
  pivotClauses,
  setMetricClause,
  defaultClauses,
  getClauseMeta,
  type QueryClause,
} from './queryClauses'

let seq = 0
function clause(type: string, value: string): QueryClause {
  return { id: `t-${type}-${seq++}`, type, ...getClauseMeta(type), value }
}

/** Restore-then-recompile must reproduce the input string. */
function expectRoundTrip(wql: string) {
  const clauses = wqlToClauses(wql)
  expect(clauses).not.toBeNull()
  expect(clausesToWql(clauses!)).toBe(wql)
}

function valueOf(clauses: QueryClause[] | null, type: string): string | undefined {
  return clauses?.find(c => c.type === type)?.value
}

describe('source-pivot compile — content planes', () => {
  it('compiles journal/collections/feeds as find:note in <source>', () => {
    expect(clausesToWql([clause('source', 'journal')])).toBe('find:note in journal')
    expect(clausesToWql([clause('source', 'collections')])).toBe('find:note in collections')
    expect(clausesToWql([clause('source', 'feeds')])).toBe('find:note in feeds')
  })

  it('compiles notes and blocks as find in all', () => {
    expect(clausesToWql([clause('source', 'notes')])).toBe('find:note in all')
    expect(clausesToWql([clause('source', 'blocks')])).toBe('find:block in all')
  })

  it('compiles efforts as find:effort in all, with effort-plane filters', () => {
    expect(clausesToWql([clause('source', 'efforts')])).toBe('find:effort in all')
    expect(clausesToWql([
      clause('source', 'efforts'),
      clause('discipline', 'strength'),
      clause('intensity', 'high'),
      clause('origin', 'user'),
      clause('text', 'fran'),
    ])).toBe('find:effort{discipline:strength, intensity:high, origin:user, text:fran} in all')
  })

  it('compiles filters, time, and where on the content plane', () => {
    const wql = clausesToWql([
      clause('source', 'feeds'),
      clause('time', 'last 8w'),
      clause('tag', 'pr'),
      clause('text', 'fran'),
      clause('where', 'sum:totalVolume{} > 5000'),
    ])
    expect(wql).toBe('find:note{tags:pr, text:fran} in feeds last 8w where sum:totalVolume{} > 5000')
  })

  it('ignores analytics head clauses on the content plane', () => {
    const wql = clausesToWql([
      clause('source', 'notes'),
      clause('agg', 'sum'),
      clause('metric', 'totalVolume'),
      clause('groupby', 'week'),
    ])
    expect(wql).toBe('find:note in all')
  })
})

describe('source-pivot compile — metrics plane', () => {
  it('compiles the bare aggregate head', () => {
    expect(clausesToWql([
      clause('source', 'metrics'),
      clause('agg', 'sum'),
      clause('metric', 'totalVolume'),
    ])).toBe('sum:totalVolume')
  })

  it('compiles filters, group-by, rollup, and unit in grammar order', () => {
    const wql = clausesToWql([
      clause('source', 'metrics'),
      clause('agg', 'avg'),
      clause('metric', 'tis'),
      clause('discipline', 'strength'),
      clause('groupby', 'week'),
      clause('rollup', '1w'),
      clause('unit', 'kg'),
    ])
    expect(wql).toBe('avg:tis{discipline:strength} by {week}.rollup(1w) in kg')
  })

  it('compiles multiple group-by clauses into one by {...} set', () => {
    const wql = clausesToWql([
      clause('source', 'metrics'),
      clause('agg', 'sum'),
      clause('metric', 'totalVolume'),
      clause('groupby', 'week'),
      clause('groupby', 'effort'),
    ])
    expect(wql).toBe('sum:totalVolume by {week, effort}')
  })

  it('compiles rollup without group-by and a trailing where find-join', () => {
    const wql = clausesToWql([
      clause('source', 'metrics'),
      clause('agg', 'sum'),
      clause('metric', 'totalVolume'),
      clause('rollup', '1d'),
      clause('where', 'find:note{tags:me}'),
    ])
    expect(wql).toBe('sum:totalVolume.rollup(1d) where find:note{tags:me}')
  })

  it('compiles an empty metric as the salvage head "sum:"', () => {
    expect(clausesToWql([
      clause('source', 'metrics'),
      clause('agg', 'sum'),
      clause('metric', ''),
    ])).toBe('sum:')
  })

  it('ignores the time clause on the metrics plane', () => {
    const wql = clausesToWql([
      clause('source', 'metrics'),
      clause('agg', 'sum'),
      clause('metric', 'tis'),
      clause('time', 'last 8w'),
    ])
    expect(wql).toBe('sum:tis')
  })
})

describe('wqlToClauses — find restore maps to source', () => {
  it('maps note + known scopes to the matching source value', () => {
    expect(valueOf(wqlToClauses('find:note in journal'), 'source')).toBe('journal')
    expect(valueOf(wqlToClauses('find:note in collections'), 'source')).toBe('collections')
    expect(valueOf(wqlToClauses('find:note in feeds'), 'source')).toBe('feeds')
  })

  it('maps note + all/absent scope to notes, block to blocks (scope dropped)', () => {
    expect(valueOf(wqlToClauses('find:note in all'), 'source')).toBe('notes')
    expect(valueOf(wqlToClauses('find:note'), 'source')).toBe('notes')
    expect(valueOf(wqlToClauses('find:block in all'), 'source')).toBe('blocks')
    expect(valueOf(wqlToClauses('find:block in journal'), 'source')).toBe('blocks')
  })

  it('restores an exotic scope verbatim as the source value (salvage)', () => {
    expect(valueOf(wqlToClauses('find:note in archive'), 'source')).toBe('archive')
  })

  it('round-trips find strings exactly', () => {
    expectRoundTrip('find:note{text:fran} in feeds last 8w')
    expectRoundTrip('find:note{tags:pr} in journal last 8w where sum:totalVolume{} > 5000')
    expectRoundTrip('find:block{type:wod} in all')
    expectRoundTrip('find:note in archive')
  })

  it('maps effort target to the efforts source (scope dropped)', () => {
    expect(valueOf(wqlToClauses('find:effort in all'), 'source')).toBe('efforts')
    expect(valueOf(wqlToClauses('find:effort{intensity:high} in all'), 'intensity')).toBe('high')
  })

  it('round-trips effort strings exactly, including the new effort-plane filters', () => {
    expectRoundTrip('find:effort in all')
    expectRoundTrip('find:effort{discipline:strength, intensity:high, origin:user, text:fran} in all')
  })
})

describe('wqlToClauses — aggregate restore', () => {
  it('restores head, filters, group-by, rollup, and unit', () => {
    const clauses = wqlToClauses('avg:tis{discipline:strength} by {week}.rollup(1w) in kg')
    expect(valueOf(clauses, 'source')).toBe('metrics')
    expect(valueOf(clauses, 'agg')).toBe('avg')
    expect(valueOf(clauses, 'metric')).toBe('tis')
    expect(valueOf(clauses, 'discipline')).toBe('strength')
    expect(valueOf(clauses, 'groupby')).toBe('week')
    expect(valueOf(clauses, 'rollup')).toBe('1w')
    expect(valueOf(clauses, 'unit')).toBe('kg')
  })

  it('restores multiple dims as separate group-by clauses', () => {
    const clauses = wqlToClauses('sum:totalVolume by {week, effort}')
    expect(clauses?.filter(c => c.type === 'groupby').map(c => c.value)).toEqual(['week', 'effort'])
  })

  it('round-trips aggregate strings exactly, including mixed filters and where', () => {
    expectRoundTrip('sum:totalVolume{discipline:strength} by {week}.rollup(1w)')
    expectRoundTrip('avg:tis by {week, effort} in kg')
    expectRoundTrip('sum:totalVolume{tags:fran, effort:thruster} where find:note{tags:me}')
    expectRoundTrip('count:sessionLoad')
    expectRoundTrip('sum:calc.acwr')
    expectRoundTrip('avg:calc.monotony by {week}.rollup(1w)')
  })

  it('salvages composer-reachable invalid states (bad rollup period, empty metric)', () => {
    expectRoundTrip('sum:totalVolume.rollup(1m)')
    expectRoundTrip('sum:')
  })

  it('round-trips canonical calc.* metric keys (dotted)', () => {
    expect(valueOf(wqlToClauses('sum:calc.acwr'), 'metric')).toBe('calc.acwr')
  })

  it('returns null for strings that are not composer products', () => {
    expect(wqlToClauses('random prose')).toBeNull()
    expect(wqlToClauses('sum:totalVolume{!tags:fran}')).toBeNull()
    expect(wqlToClauses('find:note{boguskey:x} in all')).toBeNull()
  })

  it('restores composer states whose WQL does not parse (salvage, issue #833)', () => {
    expectRoundTrip('find:note{text:hello world} in all')
  })

  it('emits an explicit “all time” time clause when the WQL carries no window', () => {
    const clauses = wqlToClauses('find:note in all')
    expect(valueOf(clauses, 'time')).toBe('all')
  })

  it('restores custom-slot fragments through the ComposerRegistry', () => {
    const weightSlot: CustomSlotDefinition<{ value: number; unit: 'kg' | 'lb' }> = {
      type: 'weight',
      label: 'Weight',
      icon: '🏋',
      placeholder: 'Pick a weight...',
      placeholderText: 'weight: [value_unit]',
      Editor: () => null,
      wqlGenerator: w => `weight:${w.value}${w.unit}`,
      formatValue: w => `${w.value}${w.unit}`,
      parseValue: raw => {
        const m = /^(\d+)(kg|lb)$/.exec(raw)
        return m ? { value: Number(m[1]), unit: m[2] as 'kg' | 'lb' } : undefined
      },
    }
    const unregister = composerRegistry.registerSlot(weightSlot)
    try {
      expectRoundTrip('find:note{weight:100kg} in journal last 2w')
      expect(valueOf(wqlToClauses('find:note{weight:100kg} in journal'), 'weight')).toBe('100kg')
    } finally {
      unregister()
    }
  })
})

describe('pivotClauses', () => {
  it('pivoting to metrics drops time/where, keeps shared filters, seeds agg+metric', () => {
    const next = pivotClauses([
      clause('source', 'notes'),
      clause('time', 'last 8w'),
      clause('tag', 'fran'),
      clause('where', 'sum:totalVolume{} > 5000'),
    ], 'metrics')

    expect(valueOf(next, 'source')).toBe('metrics')
    expect(valueOf(next, 'tag')).toBe('fran')
    expect(next.some(c => c.type === 'time')).toBe(false)
    expect(next.some(c => c.type === 'where')).toBe(false)
    expect(valueOf(next, 'agg')).toBe('sum')
    expect(valueOf(next, 'metric')).toBe('')
  })

  it('pivoting to a content plane drops the analytics head, keeps shared filters', () => {
    const next = pivotClauses([
      clause('source', 'metrics'),
      clause('agg', 'sum'),
      clause('metric', 'totalVolume'),
      clause('groupby', 'week'),
      clause('rollup', '1w'),
      clause('unit', 'kg'),
      clause('effort', 'thruster'),
      clause('where', 'find:note{tags:me}'),
    ], 'journal')

    expect(valueOf(next, 'source')).toBe('journal')
    expect(valueOf(next, 'effort')).toBe('thruster')
    for (const t of ['agg', 'metric', 'groupby', 'rollup', 'unit', 'where']) {
      expect(next.some(c => c.type === t)).toBe(false)
    }
  })
})

describe('setMetricClause', () => {
  it('sets the metric on an existing metrics-plane clause', () => {
    const next = setMetricClause([
      clause('source', 'metrics'),
      clause('agg', 'sum'),
      clause('metric', 'totalVolume'),
    ], 'tis')
    expect(valueOf(next, 'metric')).toBe('tis')
    expect(clausesToWql(next)).toBe('sum:tis')
  })

  it('appends a metric clause when the metrics plane has none (pill removed)', () => {
    const next = setMetricClause([
      clause('source', 'metrics'),
      clause('agg', 'avg'),
    ], 'tis')
    expect(valueOf(next, 'metric')).toBe('tis')
    expect(clausesToWql(next)).toBe('avg:tis')
  })

  it('pivots a content plane to metrics, preserving shared filters', () => {
    const next = setMetricClause([
      clause('source', 'journal'),
      clause('time', 'last 8w'),
      clause('tag', 'fran'),
    ], 'sessionLoad')
    expect(valueOf(next, 'source')).toBe('metrics')
    expect(valueOf(next, 'metric')).toBe('sessionLoad')
    expect(valueOf(next, 'tag')).toBe('fran')
    expect(next.some(c => c.type === 'time')).toBe(false)
    expect(clausesToWql(next)).toBe('sum:sessionLoad{tags:fran}')
  })

  it('seeds the source clause when the list has none', () => {
    const next = setMetricClause([], 'tis')
    expect(valueOf(next, 'source')).toBe('metrics')
    expect(clausesToWql(next)).toBe('sum:tis')
  })
})

describe('defaultClauses', () => {
  it('compiles the default content query', () => {
    expect(clausesToWql(defaultClauses())).toBe('find:note in all last 2w')
  })
})
