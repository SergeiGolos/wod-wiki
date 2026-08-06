/**
 * ChapterTourSection.test.tsx — the chapter tour: one shared morphing window
 * + six per-chapter blurb slides with inline badges.
 *
 * Uses the REAL ScrollSection (with a mocked IntersectionObserver so the
 * active-slide callback can be driven) and a NoteEditor mock that is a
 * superset of HomeTour.test's (fence-line divs + onBlocksChange + a stub
 * onViewCreated so TourEditorScreen can dispatch the focus effect).
 */

import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test'
import { render, screen, cleanup, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Chapter, Quest } from '../canvas/parseCanvasMarkdown'
import type { ScriptBlock } from '@/components/Editor/types'
import { CHAPTER_EXAMPLES } from './ChapterHeroSection'

// ── Mocks ──────────────────────────────────────────────────────────────────

let viewStub: { dispatch: ReturnType<typeof mock> }

mock.module('@/components/organisms/editor/NoteEditor', () => ({
  NoteEditor: (props: {
    value?: string
    onChange?: (value: string) => void
    onBlocksChange?: (blocks: ScriptBlock[]) => void
    onViewCreated?: (view: unknown) => void
  }) => {
    const React = require('react')
    React.useEffect(() => {
      props.onBlocksChange?.([{ id: 'block-1', type: 'Timer' } as unknown as ScriptBlock])
      props.onViewCreated?.(viewStub)
    }, [])
    return (
      <div>
        <textarea
          data-testid="mock-note-editor"
          value={props.value ?? ''}
          onChange={(e) => props.onChange?.(e.target.value)}
        />
        {(props.value ?? '').includes('```') && (
          <>
            <div className="cm-wod-fence-open" />
            <div className="cm-wod-inner" />
            <div className="cm-wod-fence-close" />
          </>
        )}
      </div>
    )
  },
}))

import { ChapterTourSection } from './ChapterTourSection'

const chapters: Chapter[] = [
  { id: 'basics', title: 'Basics', badge: 'trophy', desc: 'Basics blurb', focus: '2-4', questIds: ['basics-run'], sectionIds: [] },
  { id: 'protocols', title: 'Protocols', badge: 'timer', desc: 'Protocols blurb', focus: '1,5', questIds: ['protocols-run'], sectionIds: [] },
  { id: 'structure', title: 'Structure', badge: 'blocks', desc: 'Structure blurb', focus: '1', questIds: ['structure-run'], sectionIds: [] },
]
const quests: Quest[] = [
  { id: 'basics-run', label: 'Run the First Example' },
  { id: 'protocols-run', label: 'Run the First Example' },
  { id: 'structure-run', label: 'Run the First Example' },
]

// IntersectionObserver mock — captures every created observer's callback.
// Must be constructable (`new IntersectionObserver(...)`), so a plain
// function that returns the observer object (arrow functions can't be `new`ed).
let ioCallbacks: ((entries: unknown[]) => void)[] = []
const ioMock = function (this: unknown, cb: (entries: unknown[]) => void) {
  ioCallbacks.push(cb)
  return { observe: mock(), unobserve: mock(), disconnect: mock() }
}

function setup() {
  return render(
    <MemoryRouter>
      <ChapterTourSection chapters={chapters} allQuests={quests} theme="dark" />
    </MemoryRouter>,
  )
}

/** Fire every captured IntersectionObserver callback with a slide entry. */
function fireSlide(index: number) {
  const target = { dataset: { slideIndex: String(index) } } as unknown as HTMLElement
  act(() => {
    for (const cb of ioCallbacks) {
      cb([{ isIntersecting: true, target }])
    }
  })
}

describe('ChapterTourSection', () => {
  beforeEach(() => {
    viewStub = { dispatch: mock() }
    ioCallbacks = []
    window.IntersectionObserver = ioMock as unknown as typeof IntersectionObserver
    globalThis.IntersectionObserver = ioMock as unknown as typeof IntersectionObserver
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mock().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: mock(),
        removeListener: mock(),
        addEventListener: mock(),
        removeEventListener: mock(),
        dispatchEvent: mock(),
      })),
    })
  })
  afterEach(cleanup)

  it('renders one blurb slide per chapter with inline badge', () => {
    setup()
    expect(screen.getByTestId('chapter-slide-basics')).toBeTruthy()
    expect(screen.getByTestId('chapter-slide-protocols')).toBeTruthy()
    expect(screen.getByTestId('chapter-slide-structure')).toBeTruthy()
    expect(screen.getByText('Basics blurb')).toBeTruthy()
    expect(screen.getByText('Protocols blurb')).toBeTruthy()
    expect(screen.getByTestId('chapter-slide-badge-basics')).toBeTruthy()
    expect(screen.getByTestId('chapter-slide-badge-protocols')).toBeTruthy()
  })

  it('window shows the first chapter example by default', () => {
    setup()
    fireSlide(0) // visibility observer mounts the editor window
    const editor = screen.getByTestId('mock-note-editor') as HTMLTextAreaElement
    expect(editor.value).toBe(CHAPTER_EXAMPLES.basics)
  })

  it('morphs the window doc + focus when the active slide changes', () => {
    setup()
    fireSlide(0) // mount the editor window first
    fireSlide(1) // → protocols
    const editor = screen.getByTestId('mock-note-editor') as HTMLTextAreaElement
    expect(editor.value).toBe(CHAPTER_EXAMPLES.protocols)
    expect(viewStub.dispatch).toHaveBeenCalled()
  })

  it('includes the Learn the Language CTAs in the section header', () => {
    setup()
    expect(screen.getByText('Learn the Language')).toBeTruthy()
    expect(screen.getByText('Start Lesson 1')).toBeTruthy()
    expect(screen.getByText('Cheat sheet →')).toBeTruthy()
  })
})
