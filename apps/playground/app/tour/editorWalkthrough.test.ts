/**
 * editorWalkthrough.test.ts — the locked 3-card editor walkthrough contract
 * (#884):
 *
 *  1. Card ring targets — card 1 boxes the whole editor window, card 2 the
 *     fenced block only, card 3 the Run button.
 *  2. Line alignment — every adventure preset shares identical
 *     header/footer scaffolding, so the fence occupies the same document
 *     lines (ADVENTURE_FENCE_LINES) and the card-2 highlight is fixed no
 *     matter which workout is loaded. welcome-1.md is the self-contained
 *     home intro (heading, pitch, fence, CTA): the card-2 ring measures the
 *     fence position at runtime, so it needs no line alignment.
 */

import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { stripFrontmatter } from '@/lib/frontmatter'
import {
  ADVENTURE_FENCE_LINES,
  WORKOUT_PRESETS,
  buildAdventureScript,
} from './TourCaptions'
import { parseCanvasMarkdown } from '../canvas/parseCanvasMarkdown'

const homeMarkdown = readFileSync(new URL('../../../../markdown/canvas/home/README.md', import.meta.url), 'utf8')
const homePage = parseCanvasMarkdown(homeMarkdown)
const stages = homePage?.scroll?.stages ?? []

const stage = (id: string) => {
  const s = stages.find((s) => s.id === id)
  if (!s) throw new Error(`stage ${id} missing`)
  return s
}
const ringKey = (id: string): string | undefined => {
  const r = stage(id).ring
  return typeof r === 'object' && r !== null ? r.key : undefined
}

describe('editor walkthrough card ring targets (#884)', () => {
  it('card 1 highlights the whole editor window', () => {
    expect(ringKey('editor-blank')).toBe('editor.window')
  })

  it('card 2 highlights only the fenced block', () => {
    expect(ringKey('editor-metrics')).toBe('editor.wodBlock')
  })

  it('card 3 highlights the Run button', () => {
    expect(ringKey('editor-run')).toBe('editor.runButton')
  })
})

describe('line-aligned adventure scaffolding (#884)', () => {
  const { open, close } = ADVENTURE_FENCE_LINES

  it('every preset puts the fence on the same document lines', () => {
    expect(WORKOUT_PRESETS.length).toBe(4)
    for (const preset of WORKOUT_PRESETS) {
      const lines = buildAdventureScript(preset.wod).split('\n')
      // 1-indexed document lines → 0-indexed array access.
      expect(lines[open - 1]).toBe('```time')
      expect(lines[close - 1]).toBe('```')
      // Identical header/footer scaffolding across presets.
      expect(lines[0]).toBe('# 👋 Edit Me')
      expect(lines[2]).toBe('Change the reps, distance, or load below — this is live.')
      expect(lines[close + 1]).toBe('> Press **Run** ↑ to start the Clock.')
    }
  })

  it('welcome-1.md is the self-contained intro demo (heading, pitch, fence, scroll CTA)', () => {
    const raw = readFileSync(
      new URL('../../../../markdown/canvas/home/welcome-1.md', import.meta.url),
      'utf8',
    )
    const lines = stripFrontmatter(raw).trimEnd().split('\n')
    // Default route loads the full intro: WOD Wiki heading first, the demo
    // fence in the middle, scroll call-to-action last.
    expect(lines[0].trim()).toBe('# WOD Wiki')
    expect(lines.some((line) => line.startsWith('```time'))).toBe(true)
    expect(lines[lines.length - 1]).toBe('### Keep scrolling to learn more!!!')
    // Wrapping on decode still adds the shared scaffold around the intro (#884).
    const wrapped = buildAdventureScript(stripFrontmatter(raw)).split('\n')
    expect(wrapped[0]).toBe('# 👋 Edit Me')
    expect(wrapped).toContain('> Press **Run** ↑ to start the Clock.')
    expect(wrapped).toContain('```time')
  })
})
