import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'

import type { NoteEditorProps } from '@/components/Editor/NoteEditor'
import type { WorkoutResult } from '@/types/storage'

import type { PanelActions } from './MarkdownCanvasPage'
import type { ParsedCanvasPage } from './parseCanvasMarkdown'

const editorSnapshots: Array<{ noteId?: string; resultCount: number }> = []
const storedResults: WorkoutResult[] = []
const saveResultCalls: WorkoutResult[] = []

const sampleWorkoutResults = {
  completed: true,
  startTime: 1_700_000_000_000,
  endTime: 1_700_000_030_000,
  logs: [{ id: 'log-1' }],
}

mock.module('react-router-dom', () => ({
  useNavigate: () => () => {},
}))

mock.module('nuqs', () => ({
  useQueryState: () => [null, () => {}],
}))

mock.module('@/services/db/IndexedDBService', () => ({
  indexedDBService: {
    getResultsForNote: async (noteId: string) => storedResults.filter((result) => result.noteId === noteId),
    saveResult: async (result: WorkoutResult) => {
      saveResultCalls.push(result)
      storedResults.unshift(result)
      return result.id
    },
  },
}))

mock.module('@/components/Editor/NoteEditor', () => ({
  NoteEditor: (props: NoteEditorProps) => {
    useEffect(() => {
      props.onBlocksChange?.([
        {
          id: 'block-1',
          content: '10 thrusters',
        } as any,
      ])
    }, [props])

    editorSnapshots.push({
      noteId: props.noteId,
      resultCount: props.extendedResults?.length ?? 0,
    })

    return (
      <div
        data-testid="note-editor"
        data-note-id={props.noteId}
        data-result-count={String(props.extendedResults?.length ?? 0)}
      />
    )
  },
}))

mock.module('@/components/Editor/overlays/RuntimeTimerPanel', () => ({
  RuntimeTimerPanel: ({ onComplete }: { onComplete: (blockId: string, results: typeof sampleWorkoutResults) => void }) => (
    <button data-testid="complete-runtime" onClick={() => onComplete('block-1', sampleWorkoutResults)}>
      Complete runtime
    </button>
  ),
}))

mock.module('@/components/Editor/overlays/FullscreenTimer', () => ({
  FullscreenTimer: () => null,
}))

mock.module('@/components/review-grid/ReviewGrid', () => ({
  ReviewGrid: () => <div data-testid="review-grid" />,
}))

mock.module('@/services/AnalyticsTransformer', () => ({
  getAnalyticsFromLogs: () => ({
    segments: [{ id: 1, label: 'segment-1' }],
  }),
}))

mock.module('../components/MacOSChrome', () => ({
  MacOSChrome: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

mock.module('@/components/ui/ButtonGroup', () => ({
  ButtonGroup: ({ primary }: { primary: { action: { handler: () => void } } }) => (
    <button onClick={primary.action.handler}>Run</button>
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
  sections: [
    {
      id: 'hero',
      heading: 'Hero',
      level: 1,
      attrs: [],
      prose: '',
      view: {
        name: 'home',
        state: 'note',
        source: 'home-source.md',
        align: 'right',
        width: '48%',
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
      commands: [],
      buttons: [],
    },
  ],
}

const markdownCanvasPageModule = import('./MarkdownCanvasPage')

function getRenderedEditors() {
  return screen.getAllByTestId('note-editor')
}

function getRenderedRuntimeButtons() {
  return screen.getAllByTestId('complete-runtime')
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

    await waitFor(() => expect(getRenderedRuntimeButtons()).toHaveLength(2))

    act(() => {
      getRenderedRuntimeButtons()[0].click()
    })

    await waitFor(() => expect(saveResultCalls).toHaveLength(1))
    expect(saveResultCalls[0]).toMatchObject({
      noteId: 'canvas:home',
      sectionId: 'block-1',
      segmentId: 'block-1',
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
      sectionId: 'block-1',
      segmentId: 'block-1',
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
})