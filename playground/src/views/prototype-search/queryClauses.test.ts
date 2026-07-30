import { describe, expect, it } from 'bun:test'
import {
  type QueryClause,
  clausesToWql,
  defaultClauses,
} from './queryClauses'
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
