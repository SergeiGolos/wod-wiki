import { describe, expect, it } from 'bun:test'

import { parseFrontmatter, stripFrontmatter } from './frontmatter'

describe('frontmatter utilities', () => {
  it('strips leading YAML frontmatter from editor source content', () => {
    const raw = `---
search: hidden
title: Just a Movement
section: statement
order: 1
---
\`\`\`wod
Pushups
\`\`\`
`

    expect(stripFrontmatter(raw)).toBe(`\`\`\`wod
Pushups
\`\`\`
`)
  })

  it('parses flat metadata while preserving body content', () => {
    const raw = [
      '---',
      'title: "Quoted Title"',
      "subtitle: 'Quoted subtitle'",
      'empty:',
      '---',
      'Body',
      '',
    ].join('\r\n')
    const { meta, body } = parseFrontmatter(raw)

    expect(meta).toEqual({
      title: 'Quoted Title',
      subtitle: 'Quoted subtitle',
      empty: '',
    })
    expect(body).toBe('Body\r\n')
  })

  it('leaves content without leading frontmatter unchanged', () => {
    const raw = `\`\`\`wod
---
Pushups
---
\`\`\`
`

    expect(stripFrontmatter(raw)).toBe(raw)
  })
})
