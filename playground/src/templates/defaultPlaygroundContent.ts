import newPlaygroundTemplate from './new-playground.md?raw'

import { applyTemplate } from '../pages/shared/pageUtils'

const emptyPlaygroundTemplate = applyTemplate(newPlaygroundTemplate)

export const DEFAULT_PLAYGROUND_CONTENT = {
  content: emptyPlaygroundTemplate.content,
  cursorOffset: emptyPlaygroundTemplate.cursorOffset,
} as const
