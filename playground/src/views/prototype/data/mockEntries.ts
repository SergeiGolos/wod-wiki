/**
 * Mock data for the Library prototype (#808).
 *
 * Models a realistic cross-section of the unified Entry concept (#807):
 *   - Note   — a journal entry authored by the user (dated, multi-block)
 *   - Session — a hard-set, named, undated workout from a Catalog (e.g. "Fran")
 *   - Post   — a dated workout from a dated Catalog (e.g. crossfit-programming/2026-01-12)
 *
 * Includes an instance of "same workout, multiple sources" so the variants
 * can be judged for how they handle the Library-not-deduped decision (#807).
 */

export type EntryKind = 'note' | 'session' | 'post'

export interface MockEntry {
  /** Unique-enough id within the prototype. */
  id: string
  kind: EntryKind
  /** Display title. */
  title: string
  /** YYYY-MM-DD for dated entries; null for undated sessions. */
  date: string | null
  /** Source catalog id (`journal` for journal notes, `<catalog>` for sessions/posts). */
  sourceCatalog: string
  /** Source item id within the catalog. */
  sourceItem: string
  /** Block Content Id — used to expose the "same workout, multiple sources" case. */
  blockContentId?: string
  /** Optional small subtitle/secondary label. */
  subtitle?: string
  /** Brief detail to render in the row body. */
  detail?: string
}

// Pick a "today" anchor so the prototype always looks fresh. The variants
// place relative to this; the dates below are *relative* to today so the play
// shape (today pinned, past stretching back, future planning visible) is
// realistic regardless of when the prototype is opened.
const TODAY = new Date()
function isoOffset(days: number): string {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const CID_FRAN = 'cid:fran' // shared with one date so dedupe-vs-not is visible
const CID_DEADLIFT = 'cid:deadlift'

export const MOCK_ENTRIES: MockEntry[] = [
  // ── Today ────────────────────────────────────────────────────────────────
  {
    id: 'note-2026-07-29',
    kind: 'note',
    title: 'Heavy day — back squats + Fran finisher',
    date: isoOffset(0),
    sourceCatalog: 'journal',
    sourceItem: 'journal/' + isoOffset(0),
    detail: '5x3 back squat @ 102.5kg, then 21-15-9 thrusters / pull-ups',
  },
  {
    id: 'post-2026-07-29-crossfit',
    kind: 'post',
    title: 'CrossFit Programming — Wednesday',
    date: isoOffset(0),
    sourceCatalog: 'crossfit-programming',
    sourceItem: 'wednesday-2026-07-29',
    blockContentId: 'cid:' + isoOffset(0) + '-crossfit-programming',
    subtitle: 'CrossFit Programming',
    detail: '5RM back squat, then 3-round AMRAP',
  },

  // ── Yesterday ────────────────────────────────────────────────────────────
  {
    id: 'note-2026-07-28',
    kind: 'note',
    title: 'Easy 5k + mobility',
    date: isoOffset(-1),
    sourceCatalog: 'journal',
    sourceItem: 'journal/' + isoOffset(-1),
    detail: '5k @ 5:30/km, 20 min mobility flow',
  },

  // ── 3 days ago — a "Fran" day (same content as the Session) ──────────────
  {
    id: 'note-2026-07-26',
    kind: 'note',
    title: 'Fran — beat time by 2 minutes',
    date: isoOffset(-3),
    sourceCatalog: 'journal',
    sourceItem: 'journal/' + isoOffset(-3),
    blockContentId: CID_FRAN,
    detail: '21-15-9 thrusters / pull-ups — 6:42',
  },

  // ── 5 days ago — past Post from a feed ───────────────────────────────────
  {
    id: 'post-2026-07-24',
    kind: 'post',
    title: 'CrossFit Programming — Friday benchmark',
    date: isoOffset(-5),
    sourceCatalog: 'crossfit-programming',
    sourceItem: 'friday-benchmark',
    subtitle: 'CrossFit Programming',
    detail: 'Fran — 21-15-9 thrusters / pull-ups',
    blockContentId: CID_FRAN,
  },

  // ── 8 days ago — deadlift day (also a Session in Dan John) ───────────────
  {
    id: 'note-2026-07-21',
    kind: 'note',
    title: 'Deadlift 5x5 + accessory',
    date: isoOffset(-8),
    sourceCatalog: 'journal',
    sourceItem: 'journal/' + isoOffset(-8),
    blockContentId: CID_DEADLIFT,
    detail: '5x5 @ 140kg, barbell rows 4x8',
  },

  // ── 12 days ago — older note ─────────────────────────────────────────────
  {
    id: 'note-2026-07-17',
    kind: 'note',
    title: 'Long aerobic ride',
    date: isoOffset(-12),
    sourceCatalog: 'journal',
    sourceItem: 'journal/' + isoOffset(-12),
    detail: '90 min Z2, HR 132 avg',
  },

  // ── 21 days ago — a month-old Session-origin (no date) ───────────────────
  // Session carried into the journal — shown as undated in the variants.

  // ── Undated Sessions (Catalog items, not journal-run) ───────────────────
  {
    id: 'session-fran',
    kind: 'session',
    title: 'Fran',
    date: null,
    sourceCatalog: 'crossfit-girls',
    sourceItem: 'fran',
    blockContentId: CID_FRAN,
    subtitle: 'CrossFit Girls',
    detail: '21-15-9 thrusters / pull-ups',
  },
  {
    id: 'session-cindy',
    kind: 'session',
    title: 'Cindy',
    date: null,
    sourceCatalog: 'crossfit-girls',
    sourceItem: 'cindy',
    subtitle: 'CrossFit Girls',
    detail: 'AMRAP 20: 5 pull-ups, 10 push-ups, 15 air squats',
  },
  {
    id: 'session-helen',
    kind: 'session',
    title: 'Helen',
    date: null,
    sourceCatalog: 'crossfit-girls',
    sourceItem: 'helen',
    subtitle: 'CrossFit Girls',
    detail: '3 rounds: 400m run, 21 KB swings, 12 pull-ups',
  },
  {
    id: 'session-armor-building',
    kind: 'session',
    title: 'Armor Building Complex',
    date: null,
    sourceCatalog: 'dan-john',
    sourceItem: 'armor-building-complex',
    subtitle: 'Dan John',
    detail: '6 movements: clean, press, front squat, bench, bent row, deadlift',
  },
  {
    id: 'session-40-day',
    kind: 'session',
    title: '40-Day Program — Day 1',
    date: null,
    sourceCatalog: 'dan-john',
    sourceItem: 'the-40-day-program',
    subtitle: 'Dan John',
    detail: 'Front squat EMOM + accessory, kettlebell finisher',
  },
  {
    id: 'session-snatch-test',
    kind: 'session',
    title: 'StrongFirst Snatch Test',
    date: null,
    sourceCatalog: 'strongfirst',
    sourceItem: 'strongfirst-snatch-test',
    subtitle: 'StrongFirst',
    detail: '100 snatches in 5 min @ 24kg',
  },
  {
    id: 'session-macebell-360',
    kind: 'session',
    title: 'Macebell 360° Swing',
    date: null,
    sourceCatalog: 'unconventional',
    sourceItem: 'macebell_360_swing',
    subtitle: 'Unconventional',
    detail: '10 rounds: 10 mace 360s + 10 squat-to-press',
  },

  // ── Future planned dates (the Journal's "plan mode" range) ──────────────
  {
    id: 'note-2026-07-31-planned',
    kind: 'note',
    title: 'Rest day',
    date: isoOffset(2),
    sourceCatalog: 'journal',
    sourceItem: 'journal/' + isoOffset(2),
    detail: 'Planned: mobility + sauna',
  },
  {
    id: 'note-2026-08-02-planned',
    kind: 'note',
    title: 'Long ride + bricks',
    date: isoOffset(4),
    sourceCatalog: 'journal',
    sourceItem: 'journal/' + isoOffset(4),
    detail: 'Planned: 2h ride + 20 min run',
  },
  {
    id: 'note-2026-08-05-planned',
    kind: 'note',
    title: 'Open prep — repeat 24.2',
    date: isoOffset(7),
    sourceCatalog: 'journal',
    sourceItem: 'journal/' + isoOffset(7),
    detail: 'Planned: 12 min AMRAP — semantically a "play"-link to Fran',
  },
]

export const TODAY_KEY = isoOffset(0)
