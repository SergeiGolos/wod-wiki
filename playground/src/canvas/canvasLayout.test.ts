import { describe, expect, it } from 'bun:test'
import { getEditorPreferredHeight, resolveCanvasLayout } from './canvasLayout'

describe('canvas layout policy', () => {
  it('uses one bounded default for editor width', () => {
    expect(resolveCanvasLayout().editorWidth).toBe('50%')
    expect(resolveCanvasLayout().editorMinWidth).toBe('22rem')
    expect(resolveCanvasLayout().editorMaxWidth).toBe('42rem')
  })

  it('preserves authored width while keeping height policy bounded', () => {
    const policy = resolveCanvasLayout('38%')
    expect(policy.editorWidth).toBe('38%')
    expect(policy.editorMaxHeight).toContain('100dvh')
  })

  it('gives longer source a larger preferred frame up to the cap', () => {
    const shortHeight = getEditorPreferredHeight('5:00 Run')
    const longHeight = getEditorPreferredHeight(Array.from({ length: 40 }, () => '5:00 Run').join('\n'))
    expect(shortHeight).toBe('calc(180px + 3.5rem)')
    expect(longHeight).toBe('calc(560px + 3.5rem)')
  })
})
