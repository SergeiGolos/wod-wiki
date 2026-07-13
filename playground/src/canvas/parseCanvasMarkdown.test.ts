import { describe, expect, it } from 'bun:test'

import { parseCanvasMarkdown, getSectionProse, getChallengeSectionMap } from './parseCanvasMarkdown'

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
    expect(section?.theme).toBe('emerald')
    expect(section?.density).toBe('compact')
    expect(section?.isSticky).toBe(true)
    expect(section?.isDark).toBe(false)
    expect(section?.isFullBleed).toBe(false)
    expect(getSectionProse(section!)).toContain('Compare different measurement styles.')
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

    // Prose is derived from proseChunks via getSectionProse.
    const prose = getSectionProse(section!)
    expect(prose).toContain('First paragraph.')
    expect(prose).toContain('Second paragraph.')
    expect(prose).not.toContain('First →')
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

  it('hides view/command/example fences from prose — they are invisible anchor/trigger blocks', () => {
    const page = parseCanvasMarkdown(`---
template: canvas
route: /guide/demo
---

# Demo

## Whiteboard Script {sticky}

Here is the demo panel.

\`\`\`view
name:    demo
state:   note
source:  examples/demo.md
align:   right
width:   48%
\`\`\`

\`\`\`command
target: demo
pipeline:
  - set-source: examples/other.md
\`\`\`

\`\`\`example
label: Reps only
source: examples/reps.md
\`\`\`

After the anchors.
`)

    const section = page?.sections[1]
    const prose = getSectionProse(section!)
    expect(prose).toContain('Here is the demo panel.')
    expect(prose).toContain('After the anchors.')
    expect(prose).not.toContain('name:')
    expect(prose).not.toContain('source:  examples/demo.md')
    expect(prose).not.toContain('target: demo')
    expect(prose).not.toContain('set-source: examples/other.md')
    expect(prose).not.toContain('label: Reps only')
    expect(prose).not.toContain('```view')
    expect(prose).not.toContain('```command')
    expect(prose).not.toContain('```example')

    // Still parsed into their structured fields, just not left in the prose.
    expect(section?.view?.name).toBe('demo')
    expect(section?.commands).toHaveLength(1)
    expect(section?.examples).toEqual([{ label: 'Reps only', source: 'examples/reps.md' }])
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

  describe('page-level quest blocks', () => {
    it('extracts ```quest blocks from anywhere in the body', () => {
      const page = parseCanvasMarkdown(`---
template: canvas
route: /challenge
---

# Accept the Challenge

Intro paragraph that stays in the prose.

\`\`\`quest
id: first-movement
label: Add your first movement
desc: Type a movement line.
validation:
  type: has-movement
\`\`\`

\`\`\`quest
id: first-rounds
label: Wrap it in rounds
validation:
  type: min-rounds
  count: 3
\`\`\`
`)

      expect(page).not.toBeNull()
      expect(page?.quests).toEqual([
        {
          id: 'first-movement',
          label: 'Add your first movement',
          desc: 'Type a movement line.',
          validation: { type: 'has-movement' },
        },
        {
          id: 'first-rounds',
          label: 'Wrap it in rounds',
          validation: { type: 'min-rounds', count: 3 },
        },
      ])
    })

    it('strips quest blocks from the body so they do not bleed into section prose', () => {
      const page = parseCanvasMarkdown(`---
template: canvas
route: /challenge
---

# Top

\`\`\`quest
id: hidden
label: hidden
validation:
  type: has-movement
\`\`\`

## Section A

Body of section A.
`)
      expect(page?.quests.map((q) => q.id)).toEqual(['hidden'])
      const sectionA = page?.sections.find((s) => s.id === 'section-a')
      expect(sectionA?.proseChunks.some((c) => c.kind === 'prose' && c.text.includes('hidden'))).toBe(false)
    })

    it('skips quest blocks with no id', () => {
      const page = parseCanvasMarkdown(`---
template: canvas
route: /challenge
---

# Top

\`\`\`quest
label: no id
validation:
  type: has-movement
\`\`\`
`)
      expect(page?.quests).toEqual([])
    })

    it('defaults label to id when label is missing', () => {
      const page = parseCanvasMarkdown(`---
template: canvas
route: /challenge
---

# Top

\`\`\`quest
id: my-id
validation:
  type: has-movement
\`\`\`
`)
      expect(page?.quests[0]?.label).toBe('my-id')
    })
  })

  describe('page-level chapter blocks', () => {
    it('extracts ```chapter blocks with quest and section id lists', () => {
      const page = parseCanvasMarkdown(`---
template: canvas
route: /
---

# Top

\`\`\`chapter
id: basics
title: Basics
badge: trophy
quests: first-movement, first-reps
sections: [statement, metrics]
\`\`\`

\`\`\`chapter
id: sequences
title: Sequences
badge: dumbbell
quests: first-timer
sections: timers, groups
\`\`\`
`)

      expect(page?.chapters).toEqual([
        {
          id: 'basics',
          title: 'Basics',
          badge: 'trophy',
          questIds: ['first-movement', 'first-reps'],
          sectionIds: ['statement', 'metrics'],
        },
        {
          id: 'sequences',
          title: 'Sequences',
          badge: 'dumbbell',
          questIds: ['first-timer'],
          sectionIds: ['timers', 'groups'],
        },
      ])
    })

    it('defaults badge to "trophy" when missing', () => {
      const page = parseCanvasMarkdown(`---
template: canvas
route: /
---

# Top

\`\`\`chapter
id: basics
title: Basics
quests: q1
sections: sec1
\`\`\`
`)
      expect(page?.chapters[0]?.badge).toBe('trophy')
    })

    it('skips chapter blocks missing id or title', () => {
      const page = parseCanvasMarkdown(`---
template: canvas
route: /
---

# Top

\`\`\`chapter
badge: trophy
quests: q1
\`\`\`

\`\`\`chapter
id: only-id
\`\`\`
`)
      expect(page?.chapters).toEqual([])
    })

    it('tolerates empty quests and sections lists', () => {
      const page = parseCanvasMarkdown(`---
template: canvas
route: /
---

# Top

\`\`\`chapter
id: basics
title: Basics
\`\`\`
`)
      expect(page?.chapters[0]?.questIds).toEqual([])
      expect(page?.chapters[0]?.sectionIds).toEqual([])
    })

    it('strips chapter blocks from the body so they do not bleed into prose', () => {
      const page = parseCanvasMarkdown(`---
template: canvas
route: /
---

# Top

\`\`\`chapter
id: hidden
title: Hidden Chapter
quests: q1
sections: sec1
\`\`\`

## Section A

Body text.
`)
      expect(page?.chapters.map((c) => c.id)).toEqual(['hidden'])
      const sectionA = page?.sections.find((s) => s.id === 'section-a')
      expect(sectionA?.proseChunks.some((c) => c.kind === 'prose' && c.text.includes('Hidden Chapter'))).toBe(false)
    })
  })

  describe('inline challenge directives', () => {
    it('creates a challenge chunk for {{challenge:<id>}} and excludes it from prose', () => {
      const page = parseCanvasMarkdown(`---
template: canvas
route: /guide/challenge
---

# Demo

## Basics

Learn the movement syntax.

{{challenge:basics-movement}}

Keep going after the challenge.
`)
      expect(page).not.toBeNull()
      const section = page?.sections.find((s) => s.id === 'basics')
      expect(section).not.toBeUndefined()
      expect(section?.proseChunks.map((c) => c.kind)).toEqual([
        'prose',
        'challenge',
        'prose',
      ])
      const challengeChunk = section?.proseChunks.find((c) => c.kind === 'challenge')
      expect(challengeChunk).toEqual({ kind: 'challenge', id: 'basics-movement' })
      expect(getSectionProse(section!)).not.toContain('{{challenge')
      expect(getChallengeSectionMap(page!)).toEqual(new Map([['basics-movement', 'basics']]))
    })

    it('supports multiple challenge directives in one section', () => {
      const page = parseCanvasMarkdown(`---
template: canvas
route: /guide/challenge
---

# Demo

## Basics

{{challenge:basics-movement}}

{{challenge:basics-reps}}
`)
      const section = page?.sections.find((s) => s.id === 'basics')
      const challenges = section?.proseChunks.filter((c): c is { kind: 'challenge'; id: string } => c.kind === 'challenge')
      expect(challenges?.map((c) => c.id)).toEqual(['basics-movement', 'basics-reps'])
      expect(getChallengeSectionMap(page!)).toEqual(
        new Map([
          ['basics-movement', 'basics'],
          ['basics-reps', 'basics'],
        ]),
      )
    })
  })
})
