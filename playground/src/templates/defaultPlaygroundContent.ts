import homeSampleScript from '../../../markdown/canvas/home/sample-script.md?raw'
import newPlaygroundTemplate from './new-playground.md?raw'

import { applyTemplate } from '../pages/shared/pageUtils'

function normalizePlaygroundContent(raw: string): string {
  return raw.endsWith('\n') ? raw : `${raw}\n`
}

const defaultContent = normalizePlaygroundContent(homeSampleScript)
const emptyPlaygroundTemplate = applyTemplate(newPlaygroundTemplate)

export const DEFAULT_PLAYGROUND_CONTENT = {
  content: defaultContent,
  cursorOffset: defaultContent.length,
} as const

export const EMPTY_PLAYGROUND_CONTENT = {
  content: emptyPlaygroundTemplate.content,
  cursorOffset: emptyPlaygroundTemplate.cursorOffset,
} as const