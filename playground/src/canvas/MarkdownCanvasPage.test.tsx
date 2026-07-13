import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'

import type { NoteEditorProps } from '@/components/organisms/editor/NoteEditor'
import type { WorkoutResult } from '@/types/storage'

import type { PanelActions } from './MarkdownCanvasPage'
import type { ParsedCanvasPage } from './parseCanvasMarkdown'

const editorSnapshots: Array<{ noteId?: string; resultCount: number; source?: string }> = []
const storedResults: WorkoutResult[] = []
const saveResultCalls: WorkoutResult[] = []
const editorFocusCalls: string[] = []

const sampleWorkoutResults = {
  completed: true,
  startTime: 1_700_000_000_000,
  endTime: 1_700_000_030_000,
  logs: [{ id: 'log-1' }],
}

mock.module('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
  MemoryRouter: ({ children }: { children: React.ReactNode }) => children,
  Routes: ({ children }: { children: React.ReactNode }) => children,
  Route: () => null,
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
  NavLink: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
  Navigate: () => null,
  Outlet: () => null,
  useNavigate: () => () => {},
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'test' }),
  useSearchParams: () => [new URLSearchParams(), () => {}],
  useMatch: () => null,
  useResolvedPath: () => ({ pathname: '/' }),
  generatePath: (path: string) => path,
}))

mock.module('nuqs', () => ({
  useQueryState: () => [null, () => {}],
  parseAsStringEnum: () => ({ withDefault: () => 'all' }),
}))

mock.module('@/services/persistence', () => ({
  notePersistence: {
    listNotes: async ({ ids }: { ids?: string[] }) => {
      if (!ids || ids.length === 0) return []
      return ids.map(id => ({
        id,
        title: id,
        rawContent: '',
        tags: [],
        createdAt: 0,
        updatedAt: 0,
        schemaVersion: 1,
        extendedResults: storedResults.filter(r => r.noteId === id),
      }))
    },
    mutateNote: async (locator: unknown, mutation: { workoutResult?: any }) => {
      if (mutation.workoutResult) {
        const result = mutation.workoutResult
        const noteId = typeof locator === 'string' ? locator : (locator as any)?.id ?? 'canvas:home'
        const saved = { ...result, noteId, segmentId: result.sectionId }
        saveResultCalls.push(saved)
        storedResults.unshift(saved)
      }
      return {}
    },
  },
}))

mock.module('@/components/organisms/editor/NoteEditor', () => ({
  NoteEditor: (props: NoteEditorProps) => {
    useEffect(() => {
      props.onViewCreated?.({
        focus: () => editorFocusCalls.push(props.value),
      } as any)
      props.onBlocksChange?.([
        {
          id: 'block-1',
          contentId: 'block-1',
          content: '10 thrusters',
        } as any,
      ])
    }, [props])

    editorSnapshots.push({
      noteId: props.noteId,
      resultCount: props.extendedResults?.length ?? 0,
      source: typeof props.value === 'string' ? props.value : undefined,
    })

    return (
      <textarea
        data-testid="note-editor"
        data-note-id={props.noteId}
        data-result-count={String(props.extendedResults?.length ?? 0)}
        data-editor-source={typeof props.value === 'string' ? props.value : ''}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    )
  },
}))

mock.module('@/components/organisms/review/FullscreenTimer', () => ({
  FullscreenTimer: (props: { onCompleteWorkout: (blockId: string, results: typeof sampleWorkoutResults) => void }) => (
    <button data-testid="complete-fullscreen" onClick={() => props.onCompleteWorkout('block-1', sampleWorkoutResults)}>
      Complete fullscreen
    </button>
  ),
}))

mock.module('@/components/organisms/review/FullscreenReview', () => ({
  FullscreenReview: () => <div data-testid="fullscreen-review" />,
}))

mock.module('@/components/organisms/review/ReviewGrid', () => ({
  ReviewGrid: () => <div data-testid="review-grid" />,
}))
mock.module('@/services/AnalyticsTransformer', () => ({
  getAnalyticsFromLogs: () => ({
    segments: [{ id: 1, label: 'segment-1' }],
  }),
}))

mock.module('../components/atoms/MacOSChrome', () => ({
  MacOSChrome: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="chrome">
      <div data-testid="chrome-title">{title}</div>
      {children}
    </div>
  ),
}))


mock.module('./CanvasProse', () => ({
  CanvasProse: ({ prose }: { prose: string }) => <div>{prose}</div>,
}))

mock.module('../views/queriable-list/CollectionWorkoutsList', () => ({
  CollectionWorkoutsList: () => null,
}))

const page: ParsedCanvasPage = {
  frontmatter: {},
  template: 'canvas',
  route: '/',
  quests: [],
  chapters: [],
  sections: [
    {
      id: 'hero',
      heading: 'Hero',
      level: 1,
      attrs: [],
      prose: '',
      proseChunks: [],
      view: {
        name: 'home',
        state: 'note',
        source: 'home-source.md',
        align: 'right',
        width: '50%',
        buttons: [],
      },
      commands: [],
      buttons: [],
    },
    {
      id: 'step-1',
      heading: 'Step 1',
      level: 2,
      attrs: [],
      prose: 'Run a workout.',
      proseChunks: [],
      commands: [],
      buttons: [],
    },
  ],
}

const examplePage: ParsedCanvasPage = {
  frontmatter: {},
  template: 'canvas',
  route: '/',
  quests: [],
  chapters: [],
  sections: [
    {
      id: 'hero',
      heading: 'Hero',
      level: 1,
      attrs: [],
      prose: '',
      proseChunks: [],
      view: {
        name: 'examples',
        state: 'note',
        source: 'initial.md',
        align: 'right',
        width: '50%',
        buttons: [],
      },
      commands: [],
      buttons: [],
    },
    {
      id: 'examples',
      heading: 'Examples',
      level: 2,
      attrs: ['density:compact', 'theme:emerald'],
      prose: 'Try different source variants.',
      proseChunks: [],
      commands: [],
      buttons: [],
      examples: [
        { label: 'Reps only', source: 'example-1.md' },
        { label: 'With weight', source: 'example-2.md' },
      ],
    },
  ],
}

const markdownCanvasPageModule = import('./MarkdownCanvasPage')

function getRenderedEditors() {
  return screen.getAllByTestId('note-editor')
}

function getRenderedRuntimeButtons() {
  return screen.getAllByTestId('complete-fullscreen')
}

function getEditorValue() {
  return (getRenderedEditors()[0] as HTMLTextAreaElement).value
}

describe('MarkdownCanvasPage result persistence', () => {
  beforeEach(() => {
    class MockIntersectionObserver {
      observe() {}
      disconnect() {}
      unobserve() {}
    }

    ;(globalThis as any).IntersectionObserver = MockIntersectionObserver
    ;(window as any).matchMedia = () => ({
      matches: false,
      media: '',
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() { return false },
    })
    editorSnapshots.length = 0
    storedResults.length = 0
    saveResultCalls.length = 0
    editorFocusCalls.length = 0
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
  })

  it('persists the first inline canvas completion and feeds it back to the editor', async () => {
    const { MarkdownCanvasPage } = await markdownCanvasPageModule
    let panelActions: PanelActions | null = null

    render(
      <MarkdownCanvasPage
        page={page}
        wodFiles={{ '../../markdown/home-source.md': '10 thrusters' }}
        theme="light"
        onPanelActionsReady={(actions) => {
          panelActions = actions
        }}
      />,
    )

    await waitFor(() => expect(panelActions).toBeTruthy())
    await waitFor(() => expect(getRenderedEditors()).toHaveLength(2))

    expect(getRenderedEditors().every((editor) => editor.getAttribute('data-note-id') === 'canvas:home')).toBe(true)
    expect(getRenderedEditors().every((editor) => editor.getAttribute('data-result-count') === '0')).toBe(true)

    act(() => {
      panelActions?.run()
    })

    await waitFor(() => expect(getRenderedRuntimeButtons()).toHaveLength(1))

    act(() => {
      getRenderedRuntimeButtons()[0].click()
    })

    await waitFor(() => expect(saveResultCalls).toHaveLength(1))
    expect(saveResultCalls[0]).toMatchObject({
      noteId: 'canvas:home',
      blockContentId: 'block-1',
      data: sampleWorkoutResults,
    })

    act(() => {
      panelActions?.reset()
    })

    await waitFor(() => expect(getRenderedEditors().every((editor) => editor.getAttribute('data-result-count') === '1')).toBe(true))
  })

  it('hydrates stored canvas results on initial load', async () => {
    storedResults.push({
      id: 'stored-result-1',
      noteId: 'canvas:home',
      blockContentId: 'block-1',
      data: sampleWorkoutResults as any,
      completedAt: sampleWorkoutResults.endTime,
    })

    const { MarkdownCanvasPage } = await markdownCanvasPageModule

    render(
      <MarkdownCanvasPage
        page={page}
        wodFiles={{ '../../markdown/home-source.md': '10 thrusters' }}
        theme="light"
      />,
    )

    await waitFor(() => expect(getRenderedEditors().every((editor) => editor.getAttribute('data-result-count') === '1')).toBe(true))
    expect(editorSnapshots.some((snapshot) => snapshot.noteId === 'canvas:home' && snapshot.resultCount === 1)).toBe(true)
  })

  it('keeps edits per example and can reset the active example', async () => {
    const editablePage: ParsedCanvasPage = {
      ...page,
      sections: [
        page.sections[0],
        {
          ...page.sections[1],
          buttons: [
            {
              label: 'Load Alt',
              target: 'home',
              pipeline: [{ action: 'set-source', value: 'alt-source.md' }],
            },
            {
              label: 'Load Initial',
              target: 'home',
              pipeline: [{ action: 'set-source', value: 'home-source.md' }],
            },
          ],
        },
      ],
    }
    const { MarkdownCanvasPage } = await markdownCanvasPageModule

    render(
      <MarkdownCanvasPage
        page={editablePage}
        wodFiles={{
          '../../markdown/home-source.md': 'initial source',
          '../../markdown/alt-source.md': 'alt source',
        }}
        theme="light"
      />,
    )

    await waitFor(() => expect(getRenderedEditors()).toHaveLength(2))
    expect(screen.getAllByText('Try editing this example ↓')).toHaveLength(2)

    fireEvent.change(getRenderedEditors()[0], { target: { value: 'edited initial' } })
    expect(screen.getAllByRole('button', { name: 'Reset to example' })).toHaveLength(2)

    act(() => {
      screen.getByRole('button', { name: 'Load Alt' }).click()
    })
    await waitFor(() => expect(getEditorValue()).toBe('alt source'))
    await waitFor(() => expect(editorFocusCalls.length).toBeGreaterThan(0))

    fireEvent.change(getRenderedEditors()[0], { target: { value: 'edited alt' } })

    act(() => {
      screen.getByRole('button', { name: 'Load Initial' }).click()
    })
    await waitFor(() => expect(getEditorValue()).toBe('edited initial'))

    act(() => {
      screen.getByRole('button', { name: 'Load Alt' }).click()
    })
    await waitFor(() => expect(getEditorValue()).toBe('edited alt'))

    act(() => {
      screen.getAllByRole('button', { name: 'Reset to example' })[0].click()
    })
    await waitFor(() => expect(getEditorValue()).toBe('alt source'))
  })

  it('shows the active section title and swaps inline examples without scrolling', async () => {
    const { MarkdownCanvasPage } = await markdownCanvasPageModule

    render(
      <MarkdownCanvasPage
        page={examplePage}
        wodFiles={{
          '../../markdown/initial.md': 'Initial source',
          '../../markdown/example-1.md': '10 pushups',
          '../../markdown/example-2.md': '5 deadlift 225lb',
        }}
        theme="light"
      />,
    )

    await waitFor(() => expect(screen.getAllByTestId('chrome-title')[0]?.textContent).toBe('Examples'))

    act(() => {
      screen.getByRole('button', { name: 'With weight' }).click()
    })

    await waitFor(() => {
      expect(getRenderedEditors().every((editor) => editor.getAttribute('data-editor-source') === '5 deadlift 225lb')).toBe(true)
    })
  })
})
