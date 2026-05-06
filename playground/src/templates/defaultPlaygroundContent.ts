import playgroundHomeTemplate from './playground-home.md?raw'
import newPlaygroundTemplate from './new-playground.md?raw'

import { applyTemplate } from '../pages/shared/pageUtils'

const homeTemplate = applyTemplate(playgroundHomeTemplate)
const emptyPlaygroundTemplate = applyTemplate(newPlaygroundTemplate)

export const DEFAULT_PLAYGROUND_CONTENT = {
  content: homeTemplate.content,
  cursorOffset: homeTemplate.cursorOffset,
} as const

export const EMPTY_PLAYGROUND_CONTENT = {
  content: emptyPlaygroundTemplate.content,
  cursorOffset: emptyPlaygroundTemplate.cursorOffset,
} as const