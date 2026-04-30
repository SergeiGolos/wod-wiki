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
  it('keeps feature list item content in the parsed Home canvas sections', () => {
    expect(getSectionProse('smart-timer')).toContain('Counts up / down / interval based on your script')
    expect(getSectionProse('smart-timer')).toContain('Full-screen mode during workouts')
    expect(getSectionProse('chromecast-home-gym-ready')).toContain('Cast the timer to any TV in your gym with one click')
    expect(getSectionProse('collections-library')).toContain('Browse by category (strength, cardio, mobility)')
    expect(getSectionProse('browse-the-library')).toContain('Hundreds of ready-to-run workouts')
  })

  it('renders analytics labels as bold prefixes with their labels intact', () => {
    const html = renderToStaticMarkup(
      <CanvasProse prose={getSectionProse('pre-post-analytics')} />,
    )

    expect(html).toContain('<strong class="font-black text-foreground">Pre:</strong>')
    expect(html).toContain('estimated time, total reps, projected volume')
    expect(html).toContain('<strong class="font-black text-foreground">Post:</strong>')
    expect(html).toContain('actual vs. estimated, intensity graph, per-block breakdown')
    expect(html).not.toContain('**Pre:**')
    expect(html).not.toContain('**Post:**')
  })
})
