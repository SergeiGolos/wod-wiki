/**
 * timerWalkthrough.test.ts — the locked 3-card timer walkthrough contract
 * (#885 + cast-slide revival):
 *
 *  1. Card ring targets — card 1 boxes the whole timer view, card 2 the
 *     Next button, card 3 the header cast button.
 *  2. Card order — exactly three timer cards (wallclock, Next, cast)
 *     sitting between the editor and analytics cards.
 *  3. Next-tutorial copy — card 2 explains that Next advances rounds and
 *     locks a time into the collected metrics, and prompts clicks.
 *  4. Cast-slide copy — card 3 points at the cast button and promises the
 *     big-screen mirror (the TV parallax rises on this slide).
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

  it('card 3 highlights the timer header cast button', () => {
    expect(stage('timer-cast').ringA).toBe('timer.castButton')
  })
})

describe('timer walkthrough card order (#885)', () => {
  it('runs exactly three timer cards after the editor cards and ends the runway', () => {
    const timerStages = TOUR_STAGES.filter((s) => s.screen === 'timer')
    expect(timerStages.map((s) => s.id)).toEqual(['timer-wallclock', 'timer-next', 'timer-cast'])

    const ids = TOUR_STAGES.map((s) => s.id)
    expect(ids.indexOf('timer-wallclock')).toBeGreaterThan(ids.indexOf('editor-run'))
    expect(ids.indexOf('timer-cast')).toBe(ids.length - 1)
  })

  it('the Chromecast broadcast card is its own slide again, after Next', () => {
    const ids = TOUR_STAGES.map((s) => s.id)
    expect(ids.indexOf('timer-cast')).toBeGreaterThan(ids.indexOf('timer-next'))
    expect(TOUR_CAPTIONS.some((c) => c.id === 'timer-cast')).toBe(true)
    // Stage ranges stay contiguous and ordered; cast is the final slide.
    expect(stage('timer-cast').start).toBe(stage('timer-next').end)
    expect(stage('timer-cast').end).toBe(1.0)
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

describe('cast-slide caption copy', () => {
  const caption = TOUR_CAPTIONS.find((c) => c.id === 'timer-cast')

  it('exists as the third timer card', () => {
    expect(caption).toBeDefined()
    expect(caption!.num).toContain('02c')
  })

  it('points at the cast button and promises the big-screen mirror', () => {
    const body = caption!.body.toLowerCase()
    expect(body).toContain('cast button')
    expect(body).toMatch(/chromecast|mirror/)
  })
})
