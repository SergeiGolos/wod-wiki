import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'fs'

import { CanvasProse } from '../../playground/src/canvas/CanvasProse'
import { parseCanvasMarkdown } from '../../playground/src/canvas/parseCanvasMarkdown'

const homeMarkdown = readFileSync(new URL('../../markdown/canvas/home/README.md', import.meta.url), 'utf8')
const page = parseCanvasMarkdown(homeMarkdown)

function getSectionProse(id: string): string {
  const section = page?.sections.find(s => s.id === id)
  if (!section) throw new Error(`Expected home section ${id} to exist`)
  return section.prose
}

describe('home feature markdown rendering', () => {
  it('keeps the new home canvas sections in the parsed home page', () => {
    expect(getSectionProse('jump-in')).toContain('Skip the tour and start using the app now')
    expect(getSectionProse('learn')).toContain('keep scrolling to try the live demo')
    expect(getSectionProse('whats-next')).toContain('Ready to go deeper?')
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
