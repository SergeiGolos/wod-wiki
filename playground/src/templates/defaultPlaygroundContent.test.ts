import { describe, expect, it } from 'bun:test'

import homeSampleScript from '../../../markdown/canvas/home/sample-script.md?raw'
import newPlaygroundTemplate from './new-playground.md?raw'
import { DEFAULT_PLAYGROUND_CONTENT, EMPTY_PLAYGROUND_CONTENT } from './defaultPlaygroundContent'
import { applyTemplate } from '../pages/shared/pageUtils'

describe('DEFAULT_PLAYGROUND_CONTENT', () => {
  it('uses the home sample script as the default playground note body', () => {
    const expectedContent = homeSampleScript.endsWith('\n')
      ? homeSampleScript
      : `${homeSampleScript}\n`

    expect(DEFAULT_PLAYGROUND_CONTENT.content).toBe(expectedContent)
    expect(DEFAULT_PLAYGROUND_CONTENT.cursorOffset).toBe(expectedContent.length)
  })

  it('exposes an empty playground template for explicit blank-note creation', () => {
    const expectedTemplate = applyTemplate(newPlaygroundTemplate)

    expect(EMPTY_PLAYGROUND_CONTENT.content).toBe(expectedTemplate.content)
    expect(EMPTY_PLAYGROUND_CONTENT.cursorOffset).toBe(expectedTemplate.cursorOffset)
  })
})