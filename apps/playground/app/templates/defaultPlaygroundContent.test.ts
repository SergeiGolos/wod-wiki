import { describe, expect, it } from 'bun:test'

import newPlaygroundTemplate from './new-playground.md?raw'
import { DEFAULT_PLAYGROUND_CONTENT } from './defaultPlaygroundContent'
import { applyTemplate } from '../pages/shared/pageUtils'

describe('DEFAULT_PLAYGROUND_CONTENT', () => {
  it('uses the new-playground (empty) template as the default playground note body', () => {
    const expected = applyTemplate(newPlaygroundTemplate)

    expect(DEFAULT_PLAYGROUND_CONTENT.content).toBe(expected.content)
    expect(DEFAULT_PLAYGROUND_CONTENT.cursorOffset).toBe(expected.cursorOffset)
  })
})