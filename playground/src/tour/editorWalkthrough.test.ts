/**
 * editorWalkthrough.test.ts — the locked 3-card editor walkthrough contract
 * (#884):
 *
 *  1. Card ring targets — card 1 boxes the whole editor window, card 2 the
 *     fenced block only, card 3 the Run button.
 *  2. Line alignment — every adventure preset and the default welcome-1.md
 *     share identical header/footer scaffolding, so the fence occupies the
 *     same document lines (ADVENTURE_FENCE_LINES) and the card-2 highlight
 *     is fixed no matter which workout is loaded.
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

const homeMarkdown = readFileSync(new URL('../../../markdown/canvas/home/README.md', import.meta.url), 'utf8')
const homePage = parseCanvasMarkdown(homeMarkdown)
const stages = homePage?.scroll?.stages ?? []

const stage = (id: string) => {
  const s = stages.find((s) => s.id === id)
  if (!s) throw new Error(`stage ${id} missing`)
  return s
}

describe('editor walkthrough card ring targets (#884)', () => {
  it('card 1 highlights the whole editor window', () => {
    expect((stage('editor-blank').ring as any)?.key).toBe('editor.window')
  })

  it('card 2 highlights only the fenced block', () => {
    expect((stage('editor-metrics').ring as any)?.key).toBe('editor.wodBlock')
  })

  it('card 3 highlights the Run button', () => {
    expect((stage('editor-run').ring as any)?.key).toBe('editor.runButton')
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
      expect(lines[close + 1]).toBe('> Press **Run** ↑ to start the WallClock.')
    }
  })

  it('welcome-1.md uses the same scaffolding and fence lines', () => {
    const raw = readFileSync(
      new URL('../../../markdown/canvas/home/welcome-1.md', import.meta.url),
      'utf8',
    )
    const lines = stripFrontmatter(raw).split('\n')
    expect(lines[0]).toBe('# 👋 Edit Me')
    expect(lines[2]).toBe('Change the reps, distance, or load below — this is live.')
    expect(lines[open - 1]).toBe('```time')
    expect(lines[close - 1]).toBe('```')
    expect(lines[close + 1]).toBe('> Press **Run** ↑ to start the WallClock.')
  })
})
