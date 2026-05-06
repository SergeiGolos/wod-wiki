export interface DocumentationLinkItem {
  id: string
  label: string
  to: string
}

export const HOME_WORKFLOW_DOC_LINKS = {
  write: {
    id: 'home-doc-write',
    label: 'Statement basics',
    to: '/getting-started?h=statement',
  },
  run: {
    id: 'home-doc-run',
    label: 'Timers and groups',
    to: '/syntax?h=groups',
  },
  analyze: {
    id: 'home-doc-analyze',
    label: 'Review workflow',
    to: '/getting-started?h=review',
  },
} as const

export const HOME_SYNTAX_DEEP_LINKS: DocumentationLinkItem[] = [
  {
    id: 'syntax-deep-overview',
    label: 'Syntax overview',
    to: '/syntax',
  },
  {
    id: 'syntax-deep-anatomy',
    label: 'Statement anatomy',
    to: '/syntax?h=anatomy',
  },
  {
    id: 'syntax-deep-groups',
    label: 'Groups and repeaters',
    to: '/syntax?h=groups',
  },
  {
    id: 'syntax-deep-protocols',
    label: 'Protocols',
    to: '/syntax?h=protocols',
  },
]