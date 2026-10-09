import { describe, expect, it } from 'bun:test'
import { buildWorkoutItems, deriveDate } from './workoutIndex'

const ZOMBIE_WOD = `---
date: 2009-12-01
original_url: "http://zombiefit.org/2009/11/wod-120109/"
format: intervals
---
# WOD
`

const NO_DATE = `---
format: for-time
---
# WOD
`

describe('deriveDate', () => {
  it('parses YYYY-MM-DD to noon-UTC epoch ms', () => {
    expect(deriveDate(ZOMBIE_WOD)).toBe(new Date('2009-12-01T12:00:00Z').getTime())
  })

  it('returns undefined when date is missing or malformed', () => {
    expect(deriveDate(NO_DATE)).toBeUndefined()
    expect(deriveDate('---\ndate: December 1, 2009\n---\n')).toBeUndefined()
  })
})

describe('buildWorkoutItems', () => {
  it('carries frontmatter date onto the WorkoutItem', () => {
    const [item] = buildWorkoutItems({
      'markdown/collections/zombiefit/2009-12-01.md': ZOMBIE_WOD,
    })
    expect(item!.date).toBe(new Date('2009-12-01T12:00:00Z').getTime())
    expect(item!.category).toBe('zombiefit')
  })

  it('leaves date undefined for undated files', () => {
    const [item] = buildWorkoutItems({ 'markdown/collections/crossfit-girls/fran.md': NO_DATE })
    expect(item!.date).toBeUndefined()
  })
})
