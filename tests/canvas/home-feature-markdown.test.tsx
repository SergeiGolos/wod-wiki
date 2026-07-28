import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'fs'

import { CanvasProse } from '../../playground/src/canvas/CanvasProse'

const homeMarkdown = readFileSync(new URL('../../markdown/canvas/home/README.md', import.meta.url), 'utf8')

describe('home feature markdown rendering', () => {
  it('retains chapter and quest metadata after the prose cut (PRD #767)', () => {
    for (const id of ['home-tour', 'basics', 'protocols', 'structure', 'custom-metrics', 'dialects', 'complex']) {
      expect(homeMarkdown).toContain(`id: ${id}`)
    }
    for (const id of ['qs-arrive', 'qs-tour-timer', 'qs-tour-analytics', 'qs-edit', 'qs-run']) {
      expect(homeMarkdown).toContain(`id: ${id}`)
    }
  })

  it('renders analytics labels as bold prefixes with their labels intact', () => {
    const testProse = [
      '- **Pre:** estimated time, total reps, projected volume',
      '- **Post:** actual vs. estimated, intensity graph, per-block breakdown'
    ].join('\n')

    const html = renderToStaticMarkup(
      <CanvasProse prose={testProse} />,
    )

    expect(html).toContain('<strong class="font-black text-foreground">Pre:</strong>')
    expect(html).toContain('estimated time, total reps, projected volume')
    expect(html).toContain('<strong class="font-black text-foreground">Post:</strong>')
    expect(html).toContain('actual vs. estimated, intensity graph, per-block breakdown')
    expect(html).not.toContain('**Pre:**')
    expect(html).not.toContain('**Post:**')
  })
})
