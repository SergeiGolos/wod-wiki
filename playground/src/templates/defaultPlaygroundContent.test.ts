import { describe, expect, it } from 'bun:test'

import playgroundHomeTemplate from './playground-home.md?raw'
import newPlaygroundTemplate from './new-playground.md?raw'
import { DEFAULT_PLAYGROUND_CONTENT, EMPTY_PLAYGROUND_CONTENT } from './defaultPlaygroundContent'
import { applyTemplate } from '../pages/shared/pageUtils'

describe('DEFAULT_PLAYGROUND_CONTENT', () => {
  it('uses the playground-home template as the default playground note body', () => {
    const expected = applyTemplate(playgroundHomeTemplate)

    expect(DEFAULT_PLAYGROUND_CONTENT.content).toBe(expected.content)
    expect(DEFAULT_PLAYGROUND_CONTENT.cursorOffset).toBe(expected.cursorOffset)
  })

  it('exposes an empty playground template for explicit blank-note creation', () => {
    const expectedTemplate = applyTemplate(newPlaygroundTemplate)

    expect(EMPTY_PLAYGROUND_CONTENT.content).toBe(expectedTemplate.content)
    expect(EMPTY_PLAYGROUND_CONTENT.cursorOffset).toBe(expectedTemplate.cursorOffset)
  })
})