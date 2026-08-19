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
import { readFileSync } from 'node:fs'
import { TOUR_CAPTIONS } from './TourCaptions'
import { parseCanvasMarkdown } from '../canvas/parseCanvasMarkdown'

const homeMarkdown = readFileSync(new URL('../../../markdown/canvas/home/README.md', import.meta.url), 'utf8')
const homePage = parseCanvasMarkdown(homeMarkdown)
const stages = homePage?.scroll?.stages ?? []

const stage = (id: string) => {
  const s = stages.find((s) => s.id === id)
  if (!s) throw new Error(`stage ${id} missing`)
  return s
}

describe('timer walkthrough card ring targets (#885)', () => {
  it('card 1 highlights the whole timer view', () => {
    expect((stage('timer-wallclock').ring as any)?.key).toBe('timer.floor')
  })

  it('card 2 highlights the Next button', () => {
    expect((stage('timer-next').ring as any)?.key).toBe('timer.nextButton')
  })

  it('card 3 highlights the timer header cast button', () => {
    expect((stage('timer-cast').ring as any)?.key).toBe('timer.castButton')
  })
})

describe('timer walkthrough card order (#885)', () => {
  it('runs exactly three timer cards after the editor cards, before the WQL analytics beats', () => {
    const timerStages = stages.filter((s) => s.screen === 'timer')
    expect(timerStages.map((s) => s.id)).toEqual(['timer-wallclock', 'timer-next', 'timer-cast'])

    const ids = stages.map((s) => s.id)
    expect(ids.indexOf('timer-wallclock')).toBeGreaterThan(ids.indexOf('editor-run'))
    expect(ids.indexOf('timer-cast')).toBeLessThan(ids.indexOf('wql-idea'))
    expect(ids[ids.length - 1]).toBe('wql-live')
  })

  it('the Chromecast broadcast card is its own slide again, after Next', () => {
    const ids = stages.map((s) => s.id)
    expect(ids.indexOf('timer-cast')).toBeGreaterThan(ids.indexOf('timer-next'))
    expect(TOUR_CAPTIONS.some((c) => c.id === 'timer-cast')).toBe(true)
    // Stage ranges stay contiguous and ordered; the WQL beats close the runway.
    expect(stage('timer-cast').range[0]).toBe(stage('timer-next').range[1])
    expect(stage('timer-cast').range[1]).toBe(stage('wql-idea').range[0])
    expect(stage('wql-live').range[1]).toBe(1.0)
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
