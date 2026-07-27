import { describe, expect, it } from 'bun:test'

import { resolveScrollStage, clamp01, lerp, quadOut } from './scrollRunway'
import type { ScrollStage } from './parseCanvasMarkdown'

const STAGES: ScrollStage[] = [
  { id: 'a', range: [0, 0.25], ring: { tag: '```wod' } },
  { id: 'b', range: [0.25, 0.75], ring: true },
  { id: 'c', range: [0.75, 1] },
]

describe('resolveScrollStage', () => {
  it('resolves progress 0 to the first stage with t = 0', () => {
    const slice = resolveScrollStage(0, STAGES)
    expect(slice.index).toBe(0)
    expect(slice.stage.id).toBe('a')
    expect(slice.t).toBe(0)
  })

  it('resolves mid-stage progress to the right local t', () => {
    const slice = resolveScrollStage(0.5, STAGES)
    expect(slice.stage.id).toBe('b')
    expect(slice.t).toBe(0.5)
  })

  it('uses [start, end) boundaries — end of one stage is the next stage', () => {
    expect(resolveScrollStage(0.25, STAGES).stage.id).toBe('b')
    expect(resolveScrollStage(0.75, STAGES).stage.id).toBe('c')
  })

  it('clamps p >= 1 to the last stage', () => {
    const slice = resolveScrollStage(1, STAGES)
    expect(slice.stage.id).toBe('c')
    expect(slice.t).toBe(1)
    expect(resolveScrollStage(1.4, STAGES).stage.id).toBe('c')
  })

  it('clamps negative progress to the first stage', () => {
    const slice = resolveScrollStage(-0.2, STAGES)
    expect(slice.stage.id).toBe('a')
    expect(slice.t).toBe(0)
  })

  it('resolves ring from { tag } and from true', () => {
    expect(resolveScrollStage(0.1, STAGES).ring).toEqual({ tag: '```wod' })
    expect(resolveScrollStage(0.5, STAGES).ring).toEqual({ tag: undefined })
    expect(resolveScrollStage(0.9, STAGES).ring).toBeNull()
  })

  it('clamps inverted / out-of-bounds ranges instead of failing', () => {
    const weird: ScrollStage[] = [
      { id: 'x', range: [0.8, 0.2] }, // inverted → [0.2, 0.8]
      { id: 'y', range: [0.8, 3] },   // out of bounds → [0.8, 1]
    ]
    expect(resolveScrollStage(0.5, weird).stage.id).toBe('x')
    expect(resolveScrollStage(0.9, weird).stage.id).toBe('y')
  })
})

describe('easing helpers', () => {
  it('clamp01 bounds values', () => {
    expect(clamp01(-1)).toBe(0)
    expect(clamp01(2)).toBe(1)
    expect(clamp01(0.4)).toBe(0.4)
  })

  it('lerp interpolates', () => {
    expect(lerp(10, 20, 0.5)).toBe(15)
  })

  it('quadOut eases out', () => {
    expect(quadOut(0)).toBe(0)
    expect(quadOut(1)).toBe(1)
    expect(quadOut(0.5)).toBe(0.75)
  })
})
