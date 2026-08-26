import { describe, expect, it } from 'bun:test'
import { getWorkoutPreview } from './CollectionWorkoutsList'

const FRONTMATTER = `---
tags:
  - crossfit
---
`

const ZOMBIE_FIT = `---
tags:
  - parkour
---

# WOD 34

---
Category: zombie-fit
Type: Intervals
Difficulty: Beginner / Advanced / Expert
date: 2009-12-01
original_url: "http://zombiefit.org/2009/11/wod-120109/"
wayback_url: "http://web.archive.org/web/2/http://zombiefit.org/2009/11/wod-120109/"
---

## Warm Up

Run 1/4 mile | bike 2 miles | row 500m followed by:

\`\`\`time
(2)
  250m Quadrupedal Movement
  50 Jumping Jacks
\`\`\`
`

describe('getWorkoutPreview', () => {
  it('returns null for empty content', () => {
    expect(getWorkoutPreview('')).toBeNull()
    expect(getWorkoutPreview(undefined)).toBeNull()
  })

  it('strips ** and __ formatting from the first body line', () => {
    const content = FRONTMATTER + '\n# 2024 CrossFit Games - Event 5\n\n**Category:** Competition\n**Type:** For Time\n'
    expect(getWorkoutPreview(content)).toBe('Category: Competition')
  })

  it('strips stray ** from unbalanced formatting', () => {
    const content =
      FRONTMATTER +
      '\n# 2020 CrossFit Games - Event 4\n\n**Location: CrossFit Ranch, Aromas, California (Finals)\nDate: October 23-25, 2020**\n'
    expect(getWorkoutPreview(content)).toBe('Location: CrossFit Ranch, Aromas, California (Finals)')
  })

  it('strips backticks and links from the first body line', () => {
    const content = FRONTMATTER + '\n# Test\n\nRun `[this link](https://example.com)` now\n'
    expect(getWorkoutPreview(content)).toBe('Run this link now')
  })

  it('skips in-body --- frontmatter blocks and returns the first real body line', () => {
    expect(getWorkoutPreview(ZOMBIE_FIT)).toBe('Run 1/4 mile | bike 2 miles | row 500m followed by:')
  })

  it('skips heading and code-fence delimiter lines when picking the first body line', () => {
    const content = FRONTMATTER + '\n# Title\n\nFirst real sentence.\n\n```time\n(5) burpees\n```\n'
    expect(getWorkoutPreview(content)).toBe('First real sentence.')
  })
})
