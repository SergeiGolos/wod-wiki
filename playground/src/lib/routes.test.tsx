import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'

// ── Mutable mock state for react-router-dom ───────────────────────────────
let mockParams: Record<string, string> = {}
let lastNavigateTo: string | null = null
let lastNavigateReplace: boolean | undefined
const navigateCalls: Array<{ to: string; options?: { replace?: boolean } }> = []

mock.module('react-router-dom', () => ({
  useParams: () => mockParams,
  useNavigate: () => (to: string, options?: { replace?: boolean }) => {
    navigateCalls.push({ to, options })
  },
  Navigate: ({ to, replace }: { to: string; replace?: boolean }) => {
    lastNavigateTo = to
    lastNavigateReplace = replace
    return <div data-testid="navigate" />
  },
}))

// ── Import pure functions first (no react-router-dom dependency) ──────────
import {
  ROUTE_PATTERNS,
  resolveRedirect,
  ROUTE_REDIRECTS,
  playgroundPath,
  notePath,
  journalEntryPath,
  journalEntryAutoStartPath,
  workoutPath,
  runPath,
  reviewPath,
  trackerPath,
  loadPath,
  buildPlaygroundLoadUrl,
  buildJournalLoadUrl,
  feedDetailPath,
  feedItemPath,
  collectionDetailPath,
  isPlaygroundNotePath,
  isJournalEntryPath,
  isTrackerPath,
  isReviewPath,
  isCollectionWorkoutPath,
} from './routes'

// ── Dynamic imports for components that consume react-router-dom mocks ────
let redirectComponents: typeof import('./routes') | null = null

beforeEach(async () => {
  mockParams = {}
  lastNavigateTo = null
  lastNavigateReplace = undefined
  navigateCalls.length = 0
  cleanup()

  if (!redirectComponents) {
    redirectComponents = await import('./routes')
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// 1. Redirect matrix (ROUTE_REDIRECTS + resolveRedirect)
// ═══════════════════════════════════════════════════════════════════════════

describe('resolveRedirect', () => {
  it('redirects /note/playground/:name → /playground/:name', () => {
    expect(resolveRedirect('/note/playground/hello-world')).toBe(
      '/playground/hello-world',
    )
  })

  it('redirects /workout/:category/:name → /collections/:category/:name', () => {
    expect(resolveRedirect('/workout/dan-john/simple-strength')).toBe(
      '/collections/dan-john/simple-strength',
    )
  })

  it('redirects /getting-started → /', () => {
    expect(resolveRedirect('/getting-started')).toBe('/')
  })

  it('redirects /chapters/basics → /guide/syntax/basics', () => {
    expect(resolveRedirect('/chapters/basics')).toBe('/guide/syntax/basics')
  })

  it('redirects /chapters/sequences → /guide/syntax', () => {
    expect(resolveRedirect('/chapters/sequences')).toBe('/guide/syntax')
  })

  it('redirects /chapters/protocols → /guide/syntax/protocols', () => {
    expect(resolveRedirect('/chapters/protocols')).toBe('/guide/syntax/protocols')
  })

  it('redirects /challenge → /', () => {
    expect(resolveRedirect('/challenge')).toBe('/')
  })

  it('redirects /syntax → /guide/syntax', () => {
    expect(resolveRedirect('/syntax')).toBe('/guide/syntax')
  })

  it('redirects /syntax/basics → /guide/syntax/basics', () => {
    expect(resolveRedirect('/syntax/basics')).toBe('/guide/syntax/basics')
  })

  it('redirects /syntax/protocols → /guide/syntax/protocols', () => {
    expect(resolveRedirect('/syntax/protocols')).toBe('/guide/syntax/protocols')
  })

  it('redirects /tracker/:runtimeId → /run/:runtimeId', () => {
    expect(resolveRedirect('/tracker/abc-123')).toBe('/run/abc-123')
  })

  it('redirects /plan → /journal?mode=plan (unified journal list)', () => {
    expect(resolveRedirect('/plan')).toBe('/journal?mode=plan')
    // /plan?zip=… callers (e.g. feed → plan pre-fill) preserve caller intent
    // via the PlanRedirect component, not the matrix entry.
  })

  it('returns null for already-canonical paths', () => {
    expect(resolveRedirect('/playground/my-note')).toBeNull()
    expect(resolveRedirect('/journal/2026-05-19')).toBeNull()
    expect(resolveRedirect('/collections/dan-john/simple-strength')).toBeNull()
    expect(resolveRedirect('/guide/getting-started')).toBeNull()
    expect(resolveRedirect('/guide/syntax')).toBeNull()
    expect(resolveRedirect('/run/abc-123')).toBeNull()
    expect(resolveRedirect('/review/abc-123')).toBeNull()
  })

  it('returns null for unknown paths', () => {
    expect(resolveRedirect('/unknown-path')).toBeNull()
    expect(resolveRedirect('/foo/bar/baz')).toBeNull()
    expect(resolveRedirect('')).toBeNull()
  })

  it('handles URL-encoded characters in legacy paths', () => {
    expect(resolveRedirect('/note/playground/hello%20world')).toBe(
      '/playground/hello%20world',
    )
    expect(resolveRedirect('/workout/cat%201/name%202')).toBe(
      '/collections/cat%201/name%202',
    )
  })

  it('does not partially match substrings', () => {
    expect(resolveRedirect('/prefix/getting-started')).toBeNull()
    expect(resolveRedirect('/tracker')).toBeNull()
    expect(resolveRedirect('/note/playground')).toBeNull()
  })
})

describe('ROUTE_REDIRECTS structure', () => {
  it('contains exactly the declared legacy aliases', () => {
    expect(ROUTE_REDIRECTS).toHaveLength(10)
  })

  it('every rule has a match function and a to function', () => {
    for (const rule of ROUTE_REDIRECTS) {
      expect(typeof rule.match).toBe('function')
      expect(typeof rule.to).toBe('function')
    }
  })

  it('match returns false for non-matching paths', () => {
    for (const rule of ROUTE_REDIRECTS) {
      expect(rule.match('/totally-unrelated-path')).toBe(false)
    }
  })

  it('match returns a params object for matching paths', () => {
    const params = ROUTE_REDIRECTS[0]!.match('/note/playground/test')
    expect(params).not.toBe(false)
    expect(params).toEqual({ name: 'test' })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 2. Path builders
// ═══════════════════════════════════════════════════════════════════════════

describe('path builders', () => {
  it('playgroundPath encodes the id', () => {
    expect(playgroundPath('hello world')).toBe('/playground/hello%20world')
  })

  it('notePath encodes category and name', () => {
    expect(notePath('cat 1', 'name 2')).toBe('/note/cat%201/name%202')
  })

  it('journalEntryPath encodes the id', () => {
    expect(journalEntryPath('2026-05-19')).toBe('/journal/2026-05-19')
  })

  it('journalEntryAutoStartPath appends query param', () => {
    expect(journalEntryAutoStartPath('2026-05-19', 'run-42')).toBe(
      '/journal/2026-05-19?autoStart=run-42',
    )
  })

  it('workoutPath encodes collection and workout', () => {
    expect(workoutPath('dan john', 'simple strength')).toBe(
      '/collections/dan%20john/simple%20strength',
    )
  })

  it('runPath encodes runtimeId', () => {
    expect(runPath('abc-123')).toBe('/run/abc-123')
  })

  it('reviewPath encodes runtimeId', () => {
    expect(reviewPath('abc-123')).toBe('/review/abc-123')
  })

  it('trackerPath encodes runtimeId (legacy alias)', () => {
    expect(trackerPath('abc-123')).toBe('/tracker/abc-123')
  })

  it('loadPath returns static path', () => {
    expect(loadPath()).toBe('/load')
  })

  it('buildPlaygroundLoadUrl encodes zip query', () => {
    expect(buildPlaygroundLoadUrl({ zip: 'abc 123' })).toBe('/load?zip=abc%20123')
  })

  it('buildJournalLoadUrl builds journal load path without date', () => {
    expect(buildJournalLoadUrl({ zip: 'abc 123' })).toBe('/load/journal?zip=abc%20123')
  })

  it('buildJournalLoadUrl builds journal load path with date', () => {
    expect(buildJournalLoadUrl({ zip: 'abc 123', date: '2024-06-15' })).toBe(
      '/load/journal/2024-06-15?zip=abc%20123',
    )
  })

  it('feedDetailPath encodes slug', () => {
    expect(feedDetailPath('my feed')).toBe('/feeds/my%20feed')
  })

  it('feedItemPath encodes all three segments', () => {
    expect(feedItemPath('my feed', '2026-05-19', 'item 1')).toBe(
      '/feeds/my%20feed/2026-05-19/item%201',
    )
  })

  it('collectionDetailPath encodes slug', () => {
    expect(collectionDetailPath('dan-john')).toBe('/collections/dan-john')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 3. Route family helpers
// ═══════════════════════════════════════════════════════════════════════════

describe('route family helpers', () => {
  it('isPlaygroundNotePath detects canonical and alias paths', () => {
    expect(isPlaygroundNotePath('/playground/my-note')).toBe(true)
    expect(isPlaygroundNotePath('/note/playground/my-note')).toBe(true)
    expect(isPlaygroundNotePath('/playground')).toBe(false)
    expect(isPlaygroundNotePath('/journal/my-note')).toBe(false)
    expect(isPlaygroundNotePath('/')).toBe(false)
  })

  it('isJournalEntryPath detects /journal/:id but not /journal index', () => {
    expect(isJournalEntryPath('/journal/2026-05-19')).toBe(true)
    expect(isJournalEntryPath('/journal/abc')).toBe(true)
    expect(isJournalEntryPath('/journal')).toBe(false)
  expect(isJournalEntryPath('/journal/')).toBe(false)
    expect(isJournalEntryPath('/playground/note')).toBe(false)
  })

  it('isTrackerPath detects /tracker and /run', () => {
    expect(isTrackerPath('/tracker/abc')).toBe(true)
    expect(isTrackerPath('/run/abc')).toBe(true)
    expect(isTrackerPath('/tracker')).toBe(false)
    expect(isTrackerPath('/run')).toBe(false)
    expect(isTrackerPath('/review/abc')).toBe(false)
  })

  it('isReviewPath detects /review', () => {
    expect(isReviewPath('/review/abc')).toBe(true)
    expect(isReviewPath('/review')).toBe(false)
    expect(isReviewPath('/run/abc')).toBe(false)
  })

  it('isCollectionWorkoutPath detects /collections/:c/:w', () => {
    expect(isCollectionWorkoutPath('/collections/dan-john/simple')).toBe(true)
    expect(isCollectionWorkoutPath('/collections/dan-john')).toBe(false)
    expect(isCollectionWorkoutPath('/collections')).toBe(false)
    expect(isCollectionWorkoutPath('/collections/a/')).toBe(false)
    expect(isCollectionWorkoutPath('/playground/note')).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 4. Redirect components
// ═══════════════════════════════════════════════════════════════════════════

describe('NotePlaygroundRedirect', () => {
  it('renders Navigate to /playground/:name with replace', async () => {
    mockParams = { name: 'my-playground' }
    const { NotePlaygroundRedirect } = redirectComponents!
    render(<NotePlaygroundRedirect />)

    expect(lastNavigateTo).toBe('/playground/my-playground')
    expect(lastNavigateReplace).toBe(true)
    expect(screen.getByTestId('navigate')).toBeDefined()
  })

  it('handles encoded names', async () => {
    mockParams = { name: 'hello world' }
    const { NotePlaygroundRedirect } = redirectComponents!
    render(<NotePlaygroundRedirect />)

    expect(lastNavigateTo).toBe('/playground/hello%20world')
  })
})

describe('WorkoutRedirect', () => {
  it('renders Navigate to /collections/:category/:name with replace', async () => {
    mockParams = { category: 'dan-john', name: 'simple-strength' }
    const { WorkoutRedirect } = redirectComponents!
    render(<WorkoutRedirect />)

    expect(lastNavigateTo).toBe('/collections/dan-john/simple-strength')
    expect(lastNavigateReplace).toBe(true)
  })
})

describe('TrackerRedirect', () => {
  it('renders Navigate to /run/:runtimeId with replace', async () => {
    mockParams = { runtimeId: 'abc-123' }
    const { TrackerRedirect } = redirectComponents!
    render(<TrackerRedirect />)

    expect(lastNavigateTo).toBe('/run/abc-123')
    expect(lastNavigateReplace).toBe(true)
  })
})

describe('GettingStartedRedirect', () => {
  it('renders Navigate to / with replace', async () => {
    const { GettingStartedRedirect } = redirectComponents!
    render(<GettingStartedRedirect />)

    expect(lastNavigateTo).toBe('/')
    expect(lastNavigateReplace).toBe(true)
  })
})

describe('SyntaxRedirect', () => {
  it('redirects bare /syntax to /guide/syntax', async () => {
    mockParams = {}
    const { SyntaxRedirect } = redirectComponents!
    render(<SyntaxRedirect />)

    expect(lastNavigateTo).toBe('/guide/syntax')
    expect(lastNavigateReplace).toBe(true)
  })

  it('redirects /syntax/basics to /guide/syntax/basics', async () => {
    mockParams = { '*': 'basics' }
    const { SyntaxRedirect } = redirectComponents!
    render(<SyntaxRedirect />)

    expect(lastNavigateTo).toBe('/guide/syntax/basics')
    expect(lastNavigateReplace).toBe(true)
  })

  it('redirects /syntax/protocols to /guide/syntax/protocols', async () => {
    mockParams = { '*': 'protocols' }
    const { SyntaxRedirect } = redirectComponents!
    render(<SyntaxRedirect />)

    expect(lastNavigateTo).toBe('/guide/syntax/protocols')
    expect(lastNavigateReplace).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 5. NotFoundPage
// ═══════════════════════════════════════════════════════════════════════════

describe('NotFoundPage', () => {
  it('renders 404 messaging', async () => {
    const { NotFoundPage } = await import('../pages/NotFoundPage')
    render(<NotFoundPage />)

    expect(screen.getByText('Page not found')).toBeDefined()
    expect(
      screen.getByText(
        'The page you are looking for does not exist or has been moved.',
      ),
    ).toBeDefined()
  })

  it('navigates home when Go home button is clicked', async () => {
    const { NotFoundPage } = await import('../pages/NotFoundPage')
    render(<NotFoundPage />)

    const button = screen.getByRole('button', { name: /Go home/i })
    expect(button).toBeDefined()

    fireEvent.click(button)
    expect(navigateCalls).toEqual([{ to: '/', options: undefined }])
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 6. Canonical route patterns
// ═══════════════════════════════════════════════════════════════════════════

describe('ROUTE_PATTERNS', () => {
  it('declares all canonical route families', () => {
    expect(ROUTE_PATTERNS.home).toBe('/')
    expect(ROUTE_PATTERNS.playgroundRoot).toBe('/playground')
    expect(ROUTE_PATTERNS.playground).toBe('/playground/:id')
    expect(ROUTE_PATTERNS.notePlaygroundAlias).toBe('/note/playground/:name')
    expect(ROUTE_PATTERNS.note).toBe('/note/:category/:name')
    expect(ROUTE_PATTERNS.journal).toBe('/journal')
    expect(ROUTE_PATTERNS.journalEntry).toBe('/journal/:identity')
    expect(ROUTE_PATTERNS.journalNote).toBe('/journal/:date/:uuid')
    expect(ROUTE_PATTERNS.plan).toBe('/plan')
    expect(ROUTE_PATTERNS.guideGettingStarted).toBe('/guide/getting-started')
    expect(ROUTE_PATTERNS.guideSyntax).toBe('/guide/syntax')
    expect(ROUTE_PATTERNS.feeds).toBe('/feeds')
    expect(ROUTE_PATTERNS.feedDetail).toBe('/feeds/:feedSlug')
    expect(ROUTE_PATTERNS.feedItem).toBe('/feeds/:feedSlug/:feedDate/:feedItem')
    expect(ROUTE_PATTERNS.collections).toBe('/collections')
    expect(ROUTE_PATTERNS.collectionDetail).toBe('/collections/:slug')
    expect(ROUTE_PATTERNS.collectionWorkout).toBe('/collections/:collection/:workout')
    expect(ROUTE_PATTERNS.tracker).toBe('/tracker/:runtimeId')
    expect(ROUTE_PATTERNS.run).toBe('/run/:runtimeId')
    expect(ROUTE_PATTERNS.review).toBe('/review/:runtimeId')
    expect(ROUTE_PATTERNS.load).toBe('/load')
    expect(ROUTE_PATTERNS.loadJournal).toBe('/load/journal')
    expect(ROUTE_PATTERNS.loadJournalDate).toBe('/load/journal/:date')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 7. Short canonical routes — not yet implemented
// ═══════════════════════════════════════════════════════════════════════════

describe('short canonical routes (not yet registered in router)', () => {
  it.skip('/p/:id should resolve as a canonical playground note route', () => {
    // Expected: /p/:id either renders PlaygroundNotePage directly or
    // redirects to /playground/:id. Currently no route pattern exists.
    expect(resolveRedirect('/p/my-note')).not.toBeNull()
  })

  it.skip('/j/:date should resolve as a canonical journal entry route', () => {
    // Expected: /j/:date either renders JournalPage directly or
    // redirects to /journal/:date. Currently no route pattern exists.
    expect(resolveRedirect('/j/2026-05-19')).not.toBeNull()
  })
})
