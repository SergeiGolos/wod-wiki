/**
 * timerWalkthrough.test.ts — the locked 2-card timer walkthrough contract
 * (#885):
 *
 *  1. Card ring targets — card 1 boxes the whole timer view, card 2 the
 *     Next button.
 *  2. Card order — exactly two timer cards, wallclock then Next, sitting
 *     between the editor and analytics cards.
 *  3. Next-tutorial copy — card 2 explains that Next advances rounds and
 *     locks a time into the collected metrics, and prompts clicks.
 */

import { describe, expect, it } from 'bun:test'
import { TOUR_CAPTIONS } from './TourCaptions'
import { TOUR_STAGES } from './tourStages'

const stage = (id: string) => {
  const s = TOUR_STAGES.find((s) => s.id === id)
  if (!s) throw new Error(`stage ${id} missing`)
  return s
}

describe('timer walkthrough card ring targets (#885)', () => {
  it('card 1 highlights the whole timer view', () => {
    expect(stage('timer-wallclock').ringA).toBe('timer.floor')
  })

  it('card 2 highlights the Next button', () => {
    expect(stage('timer-next').ringA).toBe('timer.nextButton')
  })
})

describe('timer walkthrough card order (#885)', () => {
  it('runs exactly two timer cards between the editor and analytics cards', () => {
    const timerStages = TOUR_STAGES.filter((s) => s.screen === 'timer')
    expect(timerStages.map((s) => s.id)).toEqual(['timer-wallclock', 'timer-next'])

    const ids = TOUR_STAGES.map((s) => s.id)
    expect(ids.indexOf('timer-wallclock')).toBeGreaterThan(ids.indexOf('editor-run'))
    expect(ids.indexOf('analytics-scorecard')).toBeGreaterThan(ids.indexOf('timer-next'))
  })

  it('the Chromecast broadcast card is retired from the card flow', () => {
    expect(TOUR_STAGES.some((s) => s.id === ('timer-cast' as never))).toBe(false)
    expect(TOUR_CAPTIONS.some((c) => c.id === ('timer-cast' as never))).toBe(false)
  })
})

describe('Next-tutorial caption copy (#885)', () => {
  const caption = TOUR_CAPTIONS.find((c) => c.id === 'timer-next')

  it('exists as the second timer card', () => {
    expect(caption).toBeDefined()
    expect(caption!.num).toContain('02b')
  })

  it('explains that Next advances rounds and locks a time into the metrics', () => {
    const body = caption!.body.toLowerCase()
    expect(body).toContain('next')
    expect(body).toContain('advance')
    expect(body).toMatch(/locks? the elapsed time/)
    expect(body).toContain('collected metrics')
  })

  it('prompts clicks and promises the completion auto-advance', () => {
    const body = caption!.body.toLowerCase()
    expect(body).toContain('click')
    expect(body).toContain('analytics')
  })
})
