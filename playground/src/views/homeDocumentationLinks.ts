import { syntaxGuideReference } from '@/content/syntaxGuideReference'

export interface DocumentationLinkItem {
  id: string
  label: string
  to: string
}

export const HOME_WORKFLOW_DOC_LINKS = {
  write: {
    id: 'home-doc-write',
    label: 'Statement basics',
    to: '/guide/getting-started?h=statement',
  },
  run: {
    id: 'home-doc-run',
    label: 'Timers and groups',
    to: syntaxGuideReference.simpleRounds.docsPath,
  },
  analyze: {
    id: 'home-doc-analyze',
    label: 'Review workflow',
    to: '/guide/getting-started?h=review',
  },
} as const

export const HOME_SYNTAX_DEEP_LINKS: DocumentationLinkItem[] = [
  {
    id: 'syntax-deep-overview',
    label: 'Syntax overview',
    to: '/guide/syntax',
  },
  {
    id: 'syntax-deep-anatomy',
    label: 'Statement anatomy',
    to: syntaxGuideReference.coreRules.docsPath,
  },
  {
    id: 'syntax-deep-groups',
    label: 'Groups and repeaters',
    to: syntaxGuideReference.simpleRounds.docsPath,
  },
  {
    id: 'syntax-deep-protocols',
    label: 'Protocols',
    to: syntaxGuideReference.classicAmrap.docsPath,
  },
]
