import { describe, expect, it, mock } from 'bun:test'
import { mapIndexToL3, applyTemplate } from './pageUtils'
import type { PageNavLink } from '@/components/organisms/layout/PageNavDropdown'

describe('mapIndexToL3', () => {
  it('maps a plain heading link to a scroll action', () => {
    const index: PageNavLink[] = [{ id: 'intro', label: 'Intro', type: 'heading' }]
    const l3 = mapIndexToL3(index)

    expect(l3).toHaveLength(1)
    expect(l3[0].action).toEqual({ type: 'scroll', sectionId: 'intro' })
    expect(l3[0].secondaryAction).toBeUndefined()
  })

  it('keeps a heading with a runtime action as a scroll primary action', () => {
    const onRun = mock(() => {})
    const index: PageNavLink[] = [{ id: 'warm-up', label: 'Warm Up', type: 'heading', onRun, runIcon: 'play' }]
    const l3 = mapIndexToL3(index)

    expect(l3[0].action).toEqual({ type: 'scroll', sectionId: 'warm-up' })
    expect(l3[0].secondaryAction?.action).toEqual({ type: 'call', handler: onRun })
  })

  it('navigates on primary click for collection workout links with the link icon', () => {
    const onRun = mock(() => {})
    const index: PageNavLink[] = [
      {
        id: 'workout-../../markdown/collections/girls/Fran.md',
        label: 'Fran',
        type: 'wod',
        onRun,
        runIcon: 'link',
      },
    ]
    const l3 = mapIndexToL3(index)

    expect(l3[0].action).toEqual({ type: 'call', handler: onRun })
    expect(l3[0].secondaryAction?.action).toEqual({ type: 'call', handler: onRun })
  })
})

describe('applyTemplate', () => {
  it('removes the $CURSOR token and reports the offset', () => {
    const result = applyTemplate('Hello $CURSOR world')
    expect(result.content).toBe('Hello  world')
    expect(result.cursorOffset).toBe(6)
  })

  it('returns the full string when no cursor token is present', () => {
    const result = applyTemplate('Hello world')
    expect(result.content).toBe('Hello world')
    expect(result.cursorOffset).toBe(11)
  })
})
