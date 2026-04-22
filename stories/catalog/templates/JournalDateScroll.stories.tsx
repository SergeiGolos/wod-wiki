import type { Meta, StoryObj } from '@storybook/react'
import { JournalDateScroll } from '../../../playground/src/views/queriable-list/JournalDateScroll'
import type { FilteredListItem } from '../../../playground/src/views/queriable-list/types'
import type { JournalEntrySummary } from '../../../playground/src/views/queriable-list/JournalDateScroll'

const meta: Meta<typeof JournalDateScroll> = {
  title: 'catalog/templates/JournalDateScroll',
  component: JournalDateScroll,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Infinite date-scroll list for the Journal view. ' +
          'Renders days with workout blocks grouped under sticky date headers. ' +
          'Supports imperative scrollToDate via a ref handle.',
      },
    },
  },
}
export default meta
type Story = StoryObj<typeof meta>

// ── Sample data ──────────────────────────────────────────────────────────────

const now = Date.now()
const DAY = 86_400_000

function makeBlock(id: string, title: string, daysAgo: number): FilteredListItem {
  return {
    id,
    type: 'block',
    title,
    subtitle: 'WOD block',
    date: now - daysAgo * DAY,
    group: 'playground',
    payload: { id, name: title },
  }
}

function makeNote(id: string, title: string, daysAgo: number): FilteredListItem {
  return {
    id,
    type: 'note',
    title,
    subtitle: 'Journal note',
    date: now - daysAgo * DAY,
    group: 'playground',
    payload: { id, name: title },
  }
}

const fewItems: FilteredListItem[] = [
  makeBlock('b1', 'Fran — 21-15-9 Thrusters + Pull-ups', 0),
  makeBlock('b2', 'AMRAP 20 — Cindy', 2),
  makeNote('n1', 'Training notes — Week 12', 3),
]

const manyItems: FilteredListItem[] = [
  makeBlock('b1', 'Fran — 21-15-9', 0),
  makeBlock('b2', 'AMRAP 20 Cindy', 1),
  makeNote('n1', 'Week 12 notes', 2),
  makeBlock('b3', 'Murph — with vest', 3),
  makeBlock('b4', 'CrossFit Total', 5),
  makeNote('n2', 'Recovery week log', 6),
  makeBlock('b5', 'Diane — 21-15-9 DL + HSPU', 7),
  makeBlock('b6', 'Grace — 30 Clean & Jerk', 8),
  makeBlock('b7', 'Isabel — 30 Snatches', 10),
  makeNote('n3', 'Month retrospective', 12),
  makeBlock('b8', 'Jackie — Row + Thruster + Pull-up', 14),
]

const journalEntries = new Map<string, JournalEntrySummary>([
  ['2025-01-15', { title: 'Training notes', updatedAt: now - 2 * DAY }],
  ['2025-01-12', { title: 'Week 12 goals', updatedAt: now - 5 * DAY }],
])

// ── Stories ──────────────────────────────────────────────────────────────────

export const Empty: Story = {
  args: {
    items: [],
    onSelect: () => {},
    initialDate: new Date(),
  },
}

export const FewItems: Story = {
  args: {
    items: fewItems,
    onSelect: () => {},
    initialDate: new Date(),
  },
}

export const ManyItems: Story = {
  args: {
    items: manyItems,
    onSelect: () => {},
    initialDate: new Date(),
  },
}

export const WithJournalEntries: Story = {
  args: {
    items: manyItems,
    onSelect: () => {},
    journalEntries,
    onOpenEntry: () => {},
    onCreateEntry: () => {},
    initialDate: new Date(),
  },
}

export const WithCreateEntry: Story = {
  args: {
    items: fewItems,
    onSelect: () => {},
    onCreateEntry: () => {},
    initialDate: new Date(),
  },
}
