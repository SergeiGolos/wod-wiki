/**
 * frontmatter-preview — default-subtype frontmatter (#860).
 *
 * Plain key/value frontmatter (e.g. a feed note's `tags:` block) resolved to
 * subtype `default`, which had NO preview widget — the raw `---` YAML block
 * rendered as visible page content (dogfood finding #10). A
 * DefaultFrontmatterWidget now replaces the section when the cursor is
 * outside it: tags render as chips, scalars as key/value rows. Amazon/Link
 * replacements are untouched; cursor-inside keeps the raw YAML editable.
 */
import { describe, expect, it } from 'bun:test'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { sectionField } from './section-state'
import {
  frontmatterPreview,
  frontmatterPreviewField,
  DefaultFrontmatterWidget,
  AmazonPreviewWidget,
} from './frontmatter-preview'

const TAGS_DOC = `---
tags:
  - crossfit
  - conditioning
  - strength
---

# Wednesday Hero

The classic hero workout.
`

function stateWith(doc: string, cursor: number) {
  return EditorState.create({
    doc,
    selection: { anchor: cursor },
    extensions: [sectionField, frontmatterPreview],
  })
}

function widgetsOfType<T>(state: EditorState, ctor: new (...args: never[]) => T): T[] {
  const found: T[] = []
  state.field(frontmatterPreviewField).between(0, state.doc.length, (_from, _to, value) => {
    if (value.spec.widget instanceof ctor) found.push(value.spec.widget as T)
  })
  return found
}

describe('default frontmatter replacement (#860)', () => {
  it('replaces a tags frontmatter with the default widget when the cursor is outside', () => {
    const state = stateWith(TAGS_DOC, TAGS_DOC.length)
    const widgets = widgetsOfType(state, DefaultFrontmatterWidget)
    expect(widgets).toHaveLength(1)
  })

  it('keeps the raw YAML editable when the cursor is inside the section', () => {
    // Position 2 is inside the opening frontmatter block.
    const state = stateWith(TAGS_DOC, 2)
    expect(widgetsOfType(state, DefaultFrontmatterWidget)).toHaveLength(0)
  })

  it('does not swallow Amazon frontmatter (existing replacement wins)', () => {
    const doc = `---\ntype: amazon\nasin: B001234567\n---\n\n# Note\n`
    const state = stateWith(doc, doc.length)
    expect(widgetsOfType(state, DefaultFrontmatterWidget)).toHaveLength(0)
    expect(widgetsOfType(state, AmazonPreviewWidget)).toHaveLength(1)
  })

  it('skips effort frontmatter — the FrontmatterCompanion overlay owns it', () => {
    const doc = `---\ntype: effort\nid: effort-1\n---\n\n# Note\n`
    const state = stateWith(doc, doc.length)
    expect(widgetsOfType(state, DefaultFrontmatterWidget)).toHaveLength(0)
  })

  it('leaves a bare `tags:` with no items as raw YAML (an empty card is worse)', () => {
    const doc = `---\ntags:\n---\n\n# Note\n`
    const state = stateWith(doc, doc.length)
    expect(widgetsOfType(state, DefaultFrontmatterWidget)).toHaveLength(0)
  })

  it('renders tags as chips and scalars as key/value rows — no raw --- block', () => {
    const state = stateWith(TAGS_DOC, TAGS_DOC.length)
    const [widget] = widgetsOfType(state, DefaultFrontmatterWidget)
    // toDOM ignores its view argument; constructing a real EditorView needs
    // requestAnimationFrame, which the test environment lacks.
    const dom = widget!.toDOM(null as unknown as EditorView)

    const chips = Array.from(dom.querySelectorAll('.cm-frontmatter-tag')).map(el => el.textContent)
    expect(chips).toEqual(['crossfit', 'conditioning', 'strength'])
    expect(dom.textContent).not.toContain('---')
  })

  it('renders scalar properties as rows', () => {
    const doc = `---\ntitle: Murph\ndifficulty: hard\n---\n\n# Note\n`
    const state = stateWith(doc, doc.length)
    const [widget] = widgetsOfType(state, DefaultFrontmatterWidget)
    const dom = widget!.toDOM(null as unknown as EditorView)

    const rows = Array.from(dom.querySelectorAll('.cm-frontmatter-row')).map(el => el.textContent)
    expect(rows.some(r => r?.includes('title') && r.includes('Murph'))).toBe(true)
    expect(rows.some(r => r?.includes('difficulty') && r.includes('hard'))).toBe(true)
  })
})
