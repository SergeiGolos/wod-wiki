import { describe, expect, it } from 'bun:test'
import {
  type QueryClause,
  clausesToWql,
  defaultClauses,
  wqlToClauses,
} from './queryClauses'
import { composerRegistry, type CustomSlotDefinition } from './ComposerRegistry'
import { parseQuery, isFindQuery } from '@/services/analytics/query/wql'

describe('queryClauses model & WQL generation', () => {
  it('generates default WQL correctly', () => {
    const clauses = defaultClauses()
    const wql = clausesToWql(clauses)
    expect(wql).toBe('find:note in journal last 2w')

    const parsed = parseQuery(wql)
    expect(isFindQuery(parsed)).toBe(true)
    if (isFindQuery(parsed)) {
      expect(parsed.target).toBe('note')
      expect(parsed.scope).toBe('journal')
      expect(parsed.last).toEqual({ size: 2, unit: 'w' })
    }
  })

  it('supports target: block and scope: all', () => {
    const clauses: QueryClause[] = [
      { id: '1', type: 'target', label: 'Target', value: 'block', inputType: 'select', placeholder: '' },
      { id: '2', type: 'scope', label: 'Scope', value: 'all', inputType: 'select', placeholder: '' },
      { id: '3', type: 'type', label: 'Type', value: 'wod', inputType: 'select', placeholder: '' },
    ]
    const wql = clausesToWql(clauses)
    expect(wql).toBe('find:block{type:wod} in all')

    const parsed = parseQuery(wql)
    expect(isFindQuery(parsed)).toBe(true)
    if (isFindQuery(parsed)) {
      expect(parsed.target).toBe('block')
      expect(parsed.scope).toBe('all')
      expect(parsed.filters).toHaveLength(1)
      expect(parsed.filters[0].key).toBe('type')
    }
  })

  it('composes multiple filter tags correctly', () => {
    const clauses: QueryClause[] = [
      { id: '1', type: 'target', label: 'Target', value: 'note', inputType: 'select', placeholder: '' },
      { id: '2', type: 'scope', label: 'Scope', value: 'collections', inputType: 'select', placeholder: '' },
      { id: '3', type: 'text', label: 'Text', value: 'Fran', inputType: 'freetext', placeholder: '' },
      { id: '4', type: 'tag', label: 'Tag', value: 'PR', inputType: 'select', placeholder: '' },
      { id: '5', type: 'effort', label: 'Effort', value: 'back-squat', inputType: 'select', placeholder: '' },
    ]
    const wql = clausesToWql(clauses)
    expect(wql).toBe('find:note{text:Fran, tags:PR, effort:back-squat} in collections')

    const parsed = parseQuery(wql)
    expect(isFindQuery(parsed)).toBe(true)
    if (isFindQuery(parsed)) {
      expect(parsed.target).toBe('note')
      expect(parsed.scope).toBe('collections')
      expect(parsed.filters).toHaveLength(3)
    }
  })

  it('supports cross-store where join clause', () => {
    const clauses: QueryClause[] = [
      { id: '1', type: 'target', label: 'Target', value: 'note', inputType: 'select', placeholder: '' },
      { id: '2', type: 'scope', label: 'Scope', value: 'journal', inputType: 'select', placeholder: '' },
      { id: '3', type: 'tag', label: 'Tag', value: 'PR', inputType: 'select', placeholder: '' },
      { id: '4', type: 'time', label: 'Time', value: 'last 8w', inputType: 'radio', placeholder: '' },
      { id: '5', type: 'where', label: 'Where', value: 'sum:totalVolume{} > 5000', inputType: 'freetext', placeholder: '' },
    ]
    const wql = clausesToWql(clauses)
    expect(wql).toBe('find:note{tags:PR} in journal last 8w where sum:totalVolume{} > 5000')

    const parsed = parseQuery(wql)
    expect(isFindQuery(parsed)).toBe(true)
    if (isFindQuery(parsed)) {
      expect(parsed.target).toBe('note')
      expect(parsed.scope).toBe('journal')
      expect(parsed.last).toEqual({ size: 8, unit: 'w' })
      expect(parsed.join).toBeDefined()
      expect(parsed.join?.metric).toBe('totalVolume')
      expect(parsed.join?.threshold).toBe(5000)
    }
  })
})

describe('wqlToClauses — URL restore (inverse of clausesToWql)', () => {
  const clauseMap = (clauses: QueryClause[]) =>
    new Map(clauses.map(c => [c.type, c.value]))

  it('restores target, scope, time, filters, and where from composed WQL', () => {
    const restored = wqlToClauses(
      'find:block{text:Fran, tags:pr, effort:back-squat} in collections last 8w where sum:totalVolume{} > 5000',
    )
    expect(restored).not.toBeNull()
    const byType = clauseMap(restored!)
    expect(byType.get('target')).toBe('block')
    expect(byType.get('scope')).toBe('collections')
    expect(byType.get('time')).toBe('last 8w')
    expect(byType.get('text')).toBe('Fran')
    expect(byType.get('tag')).toBe('pr')
    expect(byType.get('effort')).toBe('back-squat')
    expect(byType.get('where')).toBe('sum:totalVolume{} > 5000')
  })

  it('round-trips every composer-generated WQL string (compose → restore → compose is identity)', () => {
    const cases: QueryClause[][] = [
      defaultClauses(),
      [
        { id: '1', type: 'target', label: '', value: 'block', inputType: 'select', placeholder: '' },
        { id: '2', type: 'scope', label: '', value: 'all', inputType: 'select', placeholder: '' },
        { id: '3', type: 'time', label: '', value: 'all', inputType: 'select', placeholder: '' },
        { id: '4', type: 'type', label: '', value: 'wod', inputType: 'select', placeholder: '' },
      ],
      [
        { id: '1', type: 'target', label: '', value: 'note', inputType: 'select', placeholder: '' },
        { id: '2', type: 'scope', label: '', value: 'feeds', inputType: 'select', placeholder: '' },
        { id: '3', type: 'time', label: '', value: 'last 26w', inputType: 'select', placeholder: '' },
        { id: '4', type: 'text', label: '', value: 'Fran', inputType: 'freetext', placeholder: '' },
        { id: '5', type: 'catalog', label: '', value: 'crossfit-girls', inputType: 'select', placeholder: '' },
        { id: '6', type: 'discipline', label: '', value: 'strength', inputType: 'select', placeholder: '' },
        { id: '7', type: 'has', label: '', value: 'timer', inputType: 'select', placeholder: '' },
        { id: '8', type: 'where', label: '', value: 'avg:pace{} < 8', inputType: 'freetext', placeholder: '' },
      ],
    ]
    for (const clauses of cases) {
      const wql = clausesToWql(clauses)
      const restored = wqlToClauses(wql)
      expect(restored).not.toBeNull()
      expect(clausesToWql(restored!)).toBe(wql)
    }
  })

  it('restores composer states whose WQL does not parse (e.g. text with spaces)', () => {
    // `text:hello world` is a parse error for the Lezer grammar, but it is a
    // reachable composer state — back/forward must restore it exactly so the
    // diagnostics strip can keep flagging the offending slot.
    const restored = wqlToClauses('find:note{text:hello world} in journal last 2w')
    expect(restored).not.toBeNull()
    const byType = clauseMap(restored!)
    expect(byType.get('text')).toBe('hello world')
    expect(clausesToWql(restored!)).toBe('find:note{text:hello world} in journal last 2w')
  })

  it('emits an explicit “all time” time clause when the WQL carries no window', () => {
    const restored = wqlToClauses('find:note in all')
    expect(restored).not.toBeNull()
    const byType = clauseMap(restored!)
    expect(byType.get('time')).toBe('all')
    expect(clausesToWql(restored!)).toBe('find:note in all')
  })

  it('returns null for non-find queries, unknown filter keys, and negated filters', () => {
    expect(wqlToClauses('sum:totalVolume{}')).toBeNull()
    expect(wqlToClauses('')).toBeNull()
    // `source:` / `note:` are valid WQL filters but not composer-expressible.
    expect(wqlToClauses('find:note{source:feed} in all')).toBeNull()
    expect(wqlToClauses('find:note{!tags:pr} in journal')).toBeNull()
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
      const restored = wqlToClauses('find:note{weight:100kg} in journal last 2w')
      expect(restored).not.toBeNull()
      const byType = clauseMap(restored!)
      expect(byType.get('weight')).toBe('100kg')
      expect(clausesToWql(restored!)).toBe('find:note{weight:100kg} in journal last 2w')
    } finally {
      unregister()
    }
  })
})
