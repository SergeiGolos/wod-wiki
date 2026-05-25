import { describe, expect, it } from 'bun:test'

import { parseCanvasMarkdown } from './parseCanvasMarkdown'

describe('parseCanvasMarkdown', () => {
  it('extracts inline example blocks and keeps attribute values on the section', () => {
    const page = parseCanvasMarkdown(`---
template: canvas
route: /guide/demo
---

# Demo

## Metrics {sticky #metrics density:compact theme:emerald}

Compare different measurement styles.

\`\`\`example
label: Reps only
source: examples/reps.md
\`\`\`

\`\`\`example
label: With weight
source: examples/weight.md
\`\`\`
`)

    expect(page).not.toBeNull()
    const section = page?.sections[1]
    expect(section?.id).toBe('metrics')
    expect(section?.attrs).toEqual(['sticky', 'density:compact', 'theme:emerald'])
    expect(section?.prose).toContain('Compare different measurement styles.')
    expect(section?.examples).toEqual([
      { label: 'Reps only', source: 'examples/reps.md' },
      { label: 'With weight', source: 'examples/weight.md' },
    ])
  })
})
