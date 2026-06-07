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

  it('interleaves button blocks between the paragraphs they were authored under', () => {
    const page = parseCanvasMarkdown(`---
template: canvas
route: /guide/buttons
---

# Demo

## Inline

First paragraph.

\`\`\`button
label:  First →
target: a
pipeline:
  - set-state: track
\`\`\`

Second paragraph.

\`\`\`button
label:  Second →
target: a
pipeline:
  - set-state: track
\`\`\`
`)

    const section = page?.sections[1]
    expect(section?.proseChunks?.map((c) => c.kind)).toEqual([
      'prose',
      'button',
      'prose',
      'button',
      'prose',
    ])

    const firstButton = section?.proseChunks?.[1]
    expect(firstButton?.kind).toBe('button')
    if (firstButton?.kind === 'button') {
      expect(firstButton.button.label).toBe('First →')
    }

    const secondButton = section?.proseChunks?.[3]
    expect(secondButton?.kind).toBe('button')
    if (secondButton?.kind === 'button') {
      expect(secondButton.button.label).toBe('Second →')
    }

    // The legacy `prose` field remains a prose-only concatenation.
    expect(section?.prose).toContain('First paragraph.')
    expect(section?.prose).toContain('Second paragraph.')
    expect(section?.prose).not.toContain('First →')
  })

  it('places a button before any prose when authored at the start of a section', () => {
    const page = parseCanvasMarkdown(`---
template: canvas
route: /guide/buttons
---

# Demo

## Early

\`\`\`button
label:  Open →
target: a
pipeline:
  - set-state: track
\`\`\`

After the button.
`)

    const section = page?.sections[1]
    expect(section?.proseChunks?.map((c) => c.kind)).toEqual([
      'prose',
      'button',
      'prose',
    ])
    // The leading prose chunk (before the button) contains only whitespace
    // (the blank lines that separate the section heading from the fence).
    expect(section?.proseChunks?.[0]).toMatchObject({ kind: 'prose' })
    expect((section?.proseChunks?.[0] as { kind: 'prose'; text: string } | undefined)?.text.trim()).toBe('')
    expect(section?.proseChunks?.[2]).toMatchObject({
      kind: 'prose',
      text: expect.stringContaining('After the button.'),
    })
  })

  it('places a button after the final paragraph when authored at the end of a section', () => {
    const page = parseCanvasMarkdown(`---
template: canvas
route: /guide/buttons
---

# Demo

## Tail

A trailing paragraph.

\`\`\`button
label:  Go →
target: a
pipeline:
  - set-state: track
\`\`\`
`)

    const section = page?.sections[1]
    expect(section?.proseChunks?.map((c) => c.kind)).toEqual([
      'prose',
      'button',
      'prose',
    ])
    const lastProse = section?.proseChunks?.[2]
    expect(lastProse?.kind).toBe('prose')
    // Trailing chunk is empty when the button is the last thing authored.
    expect(lastProse && lastProse.kind === 'prose' ? lastProse.text.trim() : '').toBe('')
  })

  it('produces a single prose chunk when a section has no buttons', () => {
    const page = parseCanvasMarkdown(`---
template: canvas
route: /guide/buttons
---

# Demo

## Plain

Just some prose with a list:

- one
- two
`)

    const section = page?.sections[1]
    expect(section?.proseChunks?.map((c) => c.kind)).toEqual(['prose'])
    expect(section?.proseChunks?.[0]).toMatchObject({
      kind: 'prose',
      text: expect.stringContaining('Just some prose'),
    })
  })

  it('keeps non-canvas fenced code blocks inside the prose segments', () => {
    const page = parseCanvasMarkdown(`---
template: canvas
route: /guide/buttons
---

# Demo

## Code

Use the \`set-source\` step:

\`\`\`\`yaml
key: value
\`\`\`\`

\`\`\`button
label:  Go →
target: a
pipeline:
  - set-state: track
\`\`\`
`)

    const section = page?.sections[1]
    expect(section?.proseChunks?.map((c) => c.kind)).toEqual([
      'prose',
      'button',
      'prose',
    ])
    const firstProse = section?.proseChunks?.[0]
    expect(firstProse?.kind).toBe('prose')
    if (firstProse?.kind === 'prose') {
      expect(firstProse.text).toContain('```yaml')
      expect(firstProse.text).toContain('key: value')
    }
  })
})
