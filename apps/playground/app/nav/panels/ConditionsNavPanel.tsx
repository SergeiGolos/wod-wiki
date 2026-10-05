/**
 * ConditionsNavPanel — the shared L2 panel for the five stream routes
 * (/journal /collections /playgrounds /efforts /sessions).
 *
 * One accordion of every `{}` condition the CURRENT query's target supports
 * (`wqlFilterKeys(target,'find')`), with values and counts derived from the
 * committed full result set published by QueriableStreamView (one execution
 * per query change — the panel never re-runs the query). Every value is a
 * stable single row whose control cycles Off → Include → Exclude,
 * backed by the pure model (filterValueState / setFacetValueState): edits go
 * through occurrence-exact clause edits, so source scope, window, grouping,
 * pipes, joins and sibling filters survive; every selection is a history
 * entry, so Back/Forward restore query, options and results. Selected values
 * stay listed with removal controls even at zero results, and nothing
 * engine-ignored is ever offered.
 *
 * While a fresh execution is pending, the last committed run for THIS route
 * stays visible with all controls disabled — no disappearing/reordering
 * flicker; a previous route's run is never shown. Section labels, order and
 * curated value lists come from conditionsConfig; defaults reuse the
 * engine-supported keys and current result-backed options.
 *
 * Grouping presets ("Arrange by …", "All time") ride the CURRENT query as
 * their base — never the profile default — and page actions (Feeds, the
 * landing row) stay plain routes.
 */

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import clsx from 'clsx'
import { CheckSquare, MinusSquare, Plus, Square } from 'lucide-react'

import { isFindQuery, parseQuery, WQL_TYPED_TAG_KEYS, type ParsedFindQuery } from '@bitcobblers/wod-wiki-wql'
import { wqlFilterKeys } from '@bitcobblers/wod-wiki-wql'
import { getClauseMeta } from '@bitcobblers/wod-wiki-ui'

import { SidebarItem, SidebarLabel, SidebarSection } from '@/components/organisms/layout/Sidebar'
import { SidebarAccordion } from '@/components/organisms/layout/SidebarAccordion'

import { staticNoteStore } from '@/services/content/staticBlockIndex'
import { storageService } from '@/services/storage'

import { applyRouteWqlConfig, readRouteWqlConfig, GROUP_BY_FAVORITE_OPTIONS } from '../../lib/routeWqlConfig'
import { withGroupBy, withoutWindow } from '../../lib/wqlEdits'
import type { StreamProfile } from '../../views/stream/streamProfile'
import { useStreamResults, type StreamResultSnapshot } from '../../views/stream/streamResults'
import type { Entry } from '../../lib/entryMapper'
import type { NavItem, NavPanelProps } from '../navTypes'
import { executeNavAction } from '../navTypes'
import { useCloseNavigationDrawer } from '../NavigationDrawerContext'
import {
  clauseTypeFor,
  facetOptions,
  filterValueState,
  headSourceScope,
  isFreeformKey,
  selectedValuesFor,
  setFacetValueState,
  type FacetContext,
  type FacetOption,
  type TagMembership,
} from './conditionsFacets'
import { conditionSectionConfig } from './conditionsConfig'

export interface ConditionsPanelSpec {
  /** Landing ("All …") row label and route. */
  landingLabel: string
  icon: NavItem['icon']
  route: string
  profile: StreamProfile
  /** Grouping preset dimensions when no Query-Defaults favorites exist. */
  groupDims?: readonly string[]
  /** Plain page actions after the presets (e.g. Feeds). */
  extraChildren?: NavItem[]
  /** Whole zone route family (drives landing-row + L1 activation). */
  familyActive: (loc: Location) => boolean
}

/** Stable identity for the no-data facet feed — a fresh `[]` per render
 *  would re-fire the membership effect and rebuild the facet context. */
const EMPTY_ENTRIES: Entry[] = []

const urlQuery = (loc: Location): string => new URLSearchParams(loc.search).get('q') ?? ''

const DIM_LABELS: Record<string, string> = Object.fromEntries(
  GROUP_BY_FAVORITE_OPTIONS.map(option => [option.id, option.label]),
)

/** Static-corpus tags are untyped labels on the note rows the executor's
 *  static store answers `tags:` with; junction rows carry their tag type. */
async function loadTagMembership(): Promise<TagMembership> {
  const [byNote, staticNotes] = await Promise.all([
    storageService.getNoteTagLabelsBatch(),
    staticNoteStore.getAllNotes(),
  ])
  for (const note of staticNotes) {
    for (const label of note.tags ?? []) {
      const rows = byNote.get(note.id)
      if (rows) {
        if (!rows.some(row => row.label === label)) rows.push({ label })
      } else {
        byNote.set(note.id, [{ label }])
      }
    }
  }
  return byNote
}

/** Push a query-only navigation: every selection is its own history entry;
 *  unrelated URL params ride along untouched. */
function navigateToQuery(location: Location, navigate: (to: string) => void, wql: string): void {
  const params = new URLSearchParams(location.search)
  params.set('q', wql)
  navigate(`${location.pathname}?${params.toString()}`)
}

export function createConditionsNavPanel(spec: ConditionsPanelSpec) {
  // Factory scope: the spec is a stable tree literal, so the Route-Default
  // overlay resolves once — the panel and the view agree on the fallback.
  const profile = applyRouteWqlConfig(spec.profile)
  return function ConditionsNavPanel(_props: NavPanelProps | Record<string, unknown>) {
    const location = useLocation()
    const navigate = useNavigate()
    const published = useStreamResults()

    // Exact host parity: the URL `q` rides verbatim (whitespace included)
    // when it parses; absent or invalid falls back to the profile default —
    // the same rule useComposerQueryState applies, so publication matches.
    const rawQ = urlQuery(location)
    const effectiveQuery = rawQ && !parseQuery(rawQ).error ? rawQ : profile.defaultWql
    const parsed = useMemo(() => parseQuery(effectiveQuery), [effectiveQuery])
    const parsedFind = useMemo(
      () => (!parsed.error && isFindQuery(parsed) ? parsed : null),
      [parsed],
    )
    const isFind = parsedFind !== null

    // Snapshot freshness: pathname AND query must match the committed run —
    // a previous page's results or a superseded draft never feed options.
    const entries = published && published.pathname === location.pathname && published.query === effectiveQuery
      ? published.entries
      : null

    // Last committed run for THIS route. While a fresh execution is pending
    // (query edited, snapshot not yet replaced) its rows stay visible with
    // controls disabled; a previous ROUTE's run is never reused.
    const [committed, setCommitted] = useState<StreamResultSnapshot | null>(null)
    useEffect(() => {
      if (published && published.pathname === location.pathname) setCommitted(published)
    }, [published, location.pathname])
    const pending = entries === null && committed !== null && committed.pathname === location.pathname
    const facetEntries = entries ?? (pending ? committed!.entries : EMPTY_ENTRIES)

    const sectionKeys = useMemo(
      () => (parsedFind ? wqlFilterKeys(parsedFind.target, 'find').slice() : []),
      [parsedFind],
    )
    const needsTagMembership = sectionKeys.some(
      key => key === 'tags' || (WQL_TYPED_TAG_KEYS as readonly string[]).includes(key),
    )
    const needsEffortMembership = sectionKeys.includes('effort')
    const [memberships, setMemberships] = useState<{
      tags: TagMembership | null
      efforts: Map<string, string[]> | null
    }>({ tags: null, efforts: null })
    useEffect(() => {
      if ((!needsTagMembership && !needsEffortMembership) || facetEntries.length === 0) return
      let cancelled = false
      Promise.all([
        needsTagMembership ? loadTagMembership() : null,
        needsEffortMembership ? storageService.getEffortSlugsByNoteBatch() : null,
      ])
        .then(([tags, efforts]) => {
          if (!cancelled) setMemberships({ tags, efforts })
        })
        .catch(() => {
          if (!cancelled) setMemberships({ tags: null, efforts: null })
        })
      return () => {
        cancelled = true
      }
    }, [needsTagMembership, needsEffortMembership, facetEntries])

    const facetContext: FacetContext = useMemo(
      () => ({ entries: facetEntries, tagMembership: memberships.tags, effortMembership: memberships.efforts }),
      [facetEntries, memberships],
    )

    const apply = (wql: string) => navigateToQuery(location, navigate, wql)
    // Full-query shortcuts (landing row, grouping presets, page actions)
    // replace the whole query/page — the drawer closes after navigating.
    // Facet edits below intentionally keep it open.
    const closeNavigationDrawer = useCloseNavigationDrawer()
    const headScope = parsedFind ? headSourceScope(parsedFind) : null

    // Config participates in section set + order: disabled keys drop, the
    // rest sort by configured order (stable — ties keep engine order).
    const orderedKeys = useMemo(
      () => sectionKeys
        .filter(key => conditionSectionConfig(key).enabled !== false)
        .sort((a, b) => (conditionSectionConfig(a).order ?? 0) - (conditionSectionConfig(b).order ?? 0)),
      [sectionKeys],
    )

    // Grouping presets: the CURRENT query is the base — never a reset.
    const saved = readRouteWqlConfig(spec.route)
    const dimSource = saved.groupByOptions?.length ? saved.groupByOptions.slice(0, 2) : spec.groupDims ?? []
    const currentDims = parsedFind?.groupBy ?? []
    const groupRows = (dimSource)
      .filter(dim => !currentDims.includes(dim.toLowerCase()))
      .map(dim => ({ dim, wql: withGroupBy(effectiveQuery, dim) }))
      .filter(row => row.wql !== effectiveQuery)
    const allTime = withoutWindow(effectiveQuery)

    return (
      <div className="flex flex-col gap-1 px-2 py-3" data-testid="conditions-nav-panel">
        <SidebarSection>
          <SidebarItem
            onClick={() => {
              navigate(spec.route)
              closeNavigationDrawer()
            }}
            current={spec.familyActive(location) && urlQuery(location).trim() === ''}
          >
            {spec.icon && <spec.icon data-slot="icon" />}
            <SidebarLabel>{spec.landingLabel}</SidebarLabel>
          </SidebarItem>
          {groupRows.map(row => (
            <SidebarItem
              key={`group-${row.dim}`}
              onClick={() => {
                apply(row.wql)
                closeNavigationDrawer()
              }}
              current={urlQuery(location) === row.wql}
            >
              <SidebarLabel>{DIM_LABELS[row.dim] ?? row.dim}</SidebarLabel>
            </SidebarItem>
          ))}
          {isFind && allTime !== effectiveQuery && (
            <SidebarItem
              onClick={() => {
                apply(allTime)
                closeNavigationDrawer()
              }}
              current={urlQuery(location) === allTime}
            >
              <SidebarLabel>All time</SidebarLabel>
            </SidebarItem>
          )}
          {(spec.extraChildren ?? []).map(child => (
            <SidebarItem
              key={child.id}
              onClick={() => {
                if (child.action) {
                  executeNavAction(child.action, { navigate, setQueryParam: () => {} })
                  closeNavigationDrawer()
                }
              }}
              current={child.isActive?.(location) ?? false}
            >
              {child.icon && <child.icon data-slot="icon" />}
              <SidebarLabel>{child.label}</SidebarLabel>
            </SidebarItem>
          ))}
        </SidebarSection>

        {parsedFind && (
          <div className="flex flex-col" aria-busy={pending || undefined}>
            {orderedKeys.map(key => (
              <div key={key} data-testid={`conditions-section-${key}`}>
                <ConditionSection
                  query={effectiveQuery}
                  parsed={parsedFind}
                  entryKey={key}
                  facetContext={facetContext}
                  labels={identifierLabels(parsedFind.target, key, facetEntries)}
                  headScope={key === 'source' ? headScope : null}
                  pending={pending}
                  onApply={apply}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
}

/** Identifier values (note/block/result ids) render with their human label. */
function identifierLabels(target: string, key: string, entries: Entry[]): Map<string, string> {
  const labels = new Map<string, string>()
  const bump = (id: string | undefined, title: string) => {
    if (id && !labels.has(id)) labels.set(id, title)
  }
  if ((target === 'note' || target === 'block') && key === 'note') {
    for (const entry of entries) bump(entry.noteId ?? entry.id, entry.title)
  }
  if (target === 'session') {
    for (const entry of entries) {
      if (key === 'result') bump(entry.execution?.resultId, entry.title)
      for (const event of entry.execution?.events ?? []) {
        if (key === 'block') bump(event.blockContentId, entry.title)
        if (key === 'note') bump(event.noteId, entry.title)
      }
    }
  }
  return labels
}

// ── Tri-state condition rows ─────────────────────────────────────────────────

const TRI_STATES = ['off', 'include', 'exclude'] as const

const STATE_TITLE: Record<FilterValueState, string> = { off: 'Off', include: 'Include', exclude: 'Exclude' }

const STATE_ICON: Record<FilterValueState, typeof Square> = {
  off: Square,
  include: CheckSquare,
  exclude: MinusSquare,
}

/** One stable row: a value present in the current options, currently
 *  selected, or both — rendered once with its tri-state. */
interface ConditionRowModel {
  value: string
  label: string
  /** Current-result rows this value would keep; null when the narrowed
   *  result set no longer contains it (selection stays removable). */
  count: number | null
  state: FilterValueState
}

function ConditionSection({
  query,
  parsed,
  entryKey,
  facetContext,
  labels,
  headScope,
  pending,
  onApply,
}: {
  query: string
  parsed: ParsedFindQuery
  entryKey: string
  facetContext: FacetContext
  labels: Map<string, string>
  headScope: string | null
  pending: boolean
  onApply: (wql: string) => void
}) {
  const config = conditionSectionConfig(entryKey)
  if (config.enabled === false) return null
  const meta = getClauseMeta(clauseTypeFor(entryKey))
  const freeform = isFreeformKey(entryKey) || IDENTIFIER_FREEFORM[entryKey] !== undefined

  const selected = selectedValuesFor(parsed, entryKey, labels)
  const options = facetOptions(parsed.target, entryKey, facetContext)

  const selectedByDisplay = new Map(selected.map(row => [row.display, row] as const))
  const optionByValue = new Map(options.map(option => [option.value, option] as const))
  const expected = config.expectedValues
  const rows: ConditionRowModel[] = []
  const seen = new Set<string>()
  const addRow = (value: string, option: FacetOption | undefined, labelOverride?: string) => {
    if (seen.has(value)) return
    seen.add(value)
    rows.push({
      value,
      label: labelOverride ?? option?.label ?? selectedByDisplay.get(value)?.label ?? value,
      count: option ? option.count : null,
      state: filterValueState(query, entryKey, value),
    })
  }
  // Expected values constrain + relabel the CURRENT options; an expected
  // value with no support here (and no active selection) is never invented.
  for (const spec of expected ?? []) {
    const option = optionByValue.get(spec.value)
    if (option || selectedByDisplay.has(spec.value)) addRow(spec.value, option, spec.label)
  }
  if (!expected) for (const option of options) addRow(option.value, option)
  // Active selections always render — even absent from the narrowed results.
  for (const row of selected) addRow(row.display, optionByValue.get(row.display))
  if (entryKey === 'source' && headScope) addRow(headScope, optionByValue.get(headScope))
  // Configured order first, then label — never count ranking.
  const expectedIndex = new Map((expected ?? []).map((spec, index) => [spec.value, index] as const))
  rows.sort((a, b) =>
    (expectedIndex.get(a.value) ?? Number.MAX_SAFE_INTEGER) - (expectedIndex.get(b.value) ?? Number.MAX_SAFE_INTEGER)
    || a.label.localeCompare(b.label),
  )

  if (rows.length === 0 && !freeform) return null
  return (
    <SidebarAccordion
      title={config.label ?? meta.label}
      count={rows.length}
      defaultOpen={rows.some(row => row.state !== 'off') || freeform}
      sticky
      className="[&>button]:gap-1.5 [&>button]:py-1.5 [&>button]:text-[11px] [&>button]:font-semibold [&>button]:normal-case [&>button]:tracking-normal [&>button>span:last-child]:h-auto [&>button>span:last-child]:w-auto [&>button>span:last-child]:min-w-0 [&>button>span:last-child]:rounded-sm [&>button>span:last-child]:px-1 [&>button>span:last-child]:bg-transparent [&>button>span:last-child]:text-[10px] [&>button>span:last-child]:font-semibold [&>button>span:last-child]:text-muted-foreground"
    >
      {/* Every current-result value renders — long lists flow through the
          shared SidebarBody scroller, never a per-section viewport. */}
      <ul className="flex flex-col">
        {rows.map(row => (
          <ConditionRow
            key={row.value}
            query={query}
            entryKey={entryKey}
            row={row}
            pending={pending}
            onApply={onApply}
          />
        ))}
      </ul>
      {freeform && (
        <FreeformRow
          entryKey={entryKey}
          placeholder={meta.placeholder}
          pending={pending}
          onApply={value => onApply(setFacetValueState(query, entryKey, value, 'include'))}
        />
      )}
    </SidebarAccordion>
  )
}

function ConditionRow({
  query,
  entryKey,
  row,
  pending,
  onApply,
}: {
  query: string
  entryKey: string
  row: ConditionRowModel
  pending: boolean
  onApply: (wql: string) => void
}) {
  // One row, one control: a native <button> cycles off → include → exclude →
  // off with the plain keyboard contract (Enter/Space) and no checkbox/radio
  // role mimicry. The accessible name announces the action (next state) and
  // the current state; the icon shows the current state.
  const next = TRI_STATES[(TRI_STATES.indexOf(row.state) + 1) % TRI_STATES.length]!
  const Icon = STATE_ICON[row.state]
  const cycleLabel = `${STATE_TITLE[next]} “${row.label}” (currently ${STATE_TITLE[row.state]})`
  return (
    <li data-testid={`conditions-row-${entryKey}:${row.value}`} className={clsx('px-1 py-0.5', pending && 'opacity-60')}>
      <div className="flex h-11 items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-xs leading-4 text-foreground">{row.label}</span>
        {row.count !== null && (
          <span className="text-[10px] leading-4 tabular-nums text-muted-foreground">{row.count}</span>
        )}
        <button
          type="button"
          data-testid={`conditions-state-${entryKey}:${row.value}`}
          data-state={row.state}
          onClick={() => onApply(setFacetValueState(query, entryKey, row.value, next))}
          disabled={pending}
          aria-label={cycleLabel}
          title={cycleLabel}
          className={clsx(
            'flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-default',
            row.state === 'include' && 'bg-primary/10 text-primary',
            row.state === 'exclude' && 'bg-destructive/10 text-destructive',
            row.state === 'off' && 'text-muted-foreground',
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
        </button>
      </div>
    </li>
  )
}

/** Identifier sections also accept a pasted id (deep links carry ids the
 *  current results may not contain). */
const IDENTIFIER_FREEFORM: Record<string, true> = { note: true, block: true, result: true }

function FreeformRow({
  entryKey,
  placeholder,
  pending,
  onApply,
}: {
  entryKey: string
  placeholder: string
  pending: boolean
  onApply: (value: string) => void
}) {
  const [text, setText] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = text.trim()
    if (!value) return
    onApply(value)
    setText('')
  }
  return (
    <form onSubmit={submit} className="flex items-center gap-1 px-1 py-1.5">
      <input
        value={text}
        onChange={event => setText(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        data-testid={`conditions-input-${entryKey}`}
        disabled={pending}
        className="h-8 min-w-0 flex-1 rounded-md border border-border/60 bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
      />
      <button
        type="submit"
        aria-label={`Add ${placeholder}`}
        data-testid={`conditions-add-${entryKey}`}
        disabled={pending || !text.trim()}
        className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus aria-hidden="true" className="size-3.5" />
      </button>
    </form>
  )
}
