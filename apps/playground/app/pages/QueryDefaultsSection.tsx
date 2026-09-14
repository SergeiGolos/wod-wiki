/**
 * QueryDefaultsSection — Settings ▸ Query Defaults (/settings/queries).
 *
 * Per-surface override of the landing default WQL plus the source and
 * Group-By option lists, persisted client-side via routeWqlConfig. Each
 * card shows the in-code system default read-only; an empty query field
 * means "use the system default" and resetting discards the override. An
 * emptied custom option list is the deliberate "no predefined options"
 * state — the route nudges for a pick but never blocks.
 */
import { useMemo, useState } from 'react'
import { parseQuery } from '@bitcobblers/wod-wiki-engine'
import { Plus, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/atoms/primitives/button'
import { Switch } from '@/components/atoms/primitives/switch'
import {
  readRouteWqlConfig,
  writeRouteWqlConfig,
  clearRouteWqlConfig,
  PALETTE_ROUTE_ID,
  type RouteWqlConfig,
} from '../lib/routeWqlConfig'
import {
  JOURNAL_STREAM_PROFILE,
  COLLECTIONS_STREAM_PROFILE,
  FEEDS_STREAM_PROFILE,
  LIBRARY_STREAM_PROFILE,
  EFFORTS_STREAM_PROFILE,
  RESULTS_STREAM_PROFILE,
  SEGMENTS_STREAM_PROFILE,
  type StreamProfile,
} from '../views/stream/streamProfile'
import { PALETTE_SEED_QUERY } from '../services/wqlSearchSource'

interface ConfigurableSurface {
  id: string
  label: string
  profile?: StreamProfile
}

const CONFIGURABLE_SURFACES: ConfigurableSurface[] = [
  { id: LIBRARY_STREAM_PROFILE.route, label: 'Library', profile: LIBRARY_STREAM_PROFILE },
  { id: JOURNAL_STREAM_PROFILE.route, label: 'Journal', profile: JOURNAL_STREAM_PROFILE },
  { id: COLLECTIONS_STREAM_PROFILE.route, label: 'Collections', profile: COLLECTIONS_STREAM_PROFILE },
  { id: FEEDS_STREAM_PROFILE.route, label: 'Feeds', profile: FEEDS_STREAM_PROFILE },
  { id: EFFORTS_STREAM_PROFILE.route, label: 'Efforts', profile: EFFORTS_STREAM_PROFILE },
  { id: RESULTS_STREAM_PROFILE.route, label: 'Results', profile: RESULTS_STREAM_PROFILE },
  { id: SEGMENTS_STREAM_PROFILE.route, label: 'Result Segments', profile: SEGMENTS_STREAM_PROFILE },
  { id: PALETTE_ROUTE_ID, label: '⌘K Command Palette' },
]

/** Editor draft; `defaultWql: ''` and custom-off lists mean "system default". */
interface EditorState {
  defaultWql: string
  customType: boolean
  typeOptions: string[]
  customGroup: boolean
  groupByOptions: string[]
}

function stateFromConfig(config: RouteWqlConfig): EditorState {
  return {
    defaultWql: config.defaultWql ?? '',
    customType: config.typeOptions !== undefined,
    typeOptions: config.typeOptions ?? [],
    customGroup: config.groupByOptions !== undefined,
    groupByOptions: config.groupByOptions ?? [],
  }
}

function stateToConfig(state: EditorState): RouteWqlConfig {
  return {
    defaultWql: state.defaultWql.trim() || undefined,
    typeOptions: state.customType ? state.typeOptions : undefined,
    groupByOptions: state.customGroup ? state.groupByOptions : undefined,
  }
}

function StringListEditor({
  values,
  onChange,
  placeholder,
  testPrefix,
}: {
  values: string[]
  onChange: (next: string[]) => void
  placeholder: string
  testPrefix: string
}) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const value = draft.trim()
    if (!value || values.includes(value)) return
    onChange([...values, value])
    setDraft('')
  }

  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map(value => (
            <span
              key={value}
              data-testid={`${testPrefix}-chip-${value}`}
              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-medium"
            >
              {value}
              <button
                type="button"
                aria-label={`Remove ${value}`}
                data-testid={`${testPrefix}-remove-${value}`}
                onClick={() => onChange(values.filter(v => v !== value))}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          data-testid={`${testPrefix}-input`}
          className="flex min-h-9 w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs"
        />
        <Button variant="outline" size="sm" onClick={add} data-testid={`${testPrefix}-add`}>
          <Plus className="size-3.5" />
          <span>Add</span>
        </Button>
      </div>
    </div>
  )
}

function RouteWqlEditor({ surface }: { surface: ConfigurableSurface }) {
  const systemDefaultWql = surface.profile?.defaultWql ?? PALETTE_SEED_QUERY
  const systemTypeOptions = surface.profile?.typeOptions ?? []

  const [state, setState] = useState<EditorState>(() => stateFromConfig(readRouteWqlConfig(surface.id)))
  const [savedConfig, setSavedConfig] = useState<RouteWqlConfig>(() => readRouteWqlConfig(surface.id))

  const wqlError = useMemo(() => {
    const text = state.defaultWql.trim()
    if (!text) return null
    return parseQuery(text).error ?? null
  }, [state.defaultWql])

  const nextConfig = stateToConfig(state)
  const dirty = JSON.stringify(nextConfig) !== JSON.stringify(savedConfig)
  const hasOverride = Object.values(savedConfig).some(v => v !== undefined)

  const save = () => {
    if (wqlError || !dirty) return
    writeRouteWqlConfig(surface.id, nextConfig)
    setSavedConfig(readRouteWqlConfig(surface.id))
  }

  const reset = () => {
    clearRouteWqlConfig(surface.id)
    setSavedConfig({})
    setState(stateFromConfig({}))
  }

  return (
    <div
      className="space-y-4 rounded-lg border border-border/60 bg-card/40 p-4"
      data-testid={`query-defaults-card-${surface.id}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{surface.label}</h3>
        <span className="font-mono text-xs text-muted-foreground">{surface.id}</span>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground">Landing default query</label>
        <p className="text-xs text-muted-foreground">
          System default: <span className="font-mono">{systemDefaultWql}</span>
        </p>
        <textarea
          rows={2}
          value={state.defaultWql}
          onChange={e => setState({ ...state, defaultWql: e.target.value })}
          placeholder={systemDefaultWql}
          data-testid={`query-defaults-wql-${surface.id}`}
          className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        {wqlError ? (
          <p className="text-xs text-destructive" data-testid={`query-defaults-wql-error-${surface.id}`}>
            Couldn't parse — {wqlError}
          </p>
        ) : (
          !state.defaultWql.trim() && (
            <p className="text-xs text-muted-foreground">Empty — the system default is used.</p>
          )
        )}
      </div>

      {surface.profile && (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground">Source options</label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Custom
            <Switch
              checked={state.customType}
              onChange={customType => setState({ ...state, customType })}
              data-testid={`query-defaults-type-custom-${surface.id}`}
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">System: {systemTypeOptions.join(', ') || '—'}</p>
        {state.customType && (
          <>
            <StringListEditor
              values={state.typeOptions}
              onChange={typeOptions => setState({ ...state, typeOptions })}
              placeholder="e.g. notes"
              testPrefix={`query-defaults-type-${surface.id}`}
            />
            {state.typeOptions.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400" data-testid={`query-defaults-type-empty-${surface.id}`}>
                No predefined options — the route nudges for a pick instead.
              </p>
            )}
          </>
        )}
      </div>
      )}

      {surface.profile && (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground">Group-By options</label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Custom
            <Switch
              checked={state.customGroup}
              onChange={customGroup => setState({ ...state, customGroup })}
              data-testid={`query-defaults-group-custom-${surface.id}`}
            />
          </label>
        </div>
        {state.customGroup && (
          <StringListEditor
            values={state.groupByOptions}
            onChange={groupByOptions => setState({ ...state, groupByOptions })}
            placeholder="e.g. week"
            testPrefix={`query-defaults-group-${surface.id}`}
          />
        )}
      </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button
          size="sm"
          onClick={save}
          disabled={!dirty || !!wqlError}
          data-testid={`query-defaults-save-${surface.id}`}
        >
          Save
        </Button>
        {hasOverride && (
          <Button variant="ghost" size="sm" onClick={reset} data-testid={`query-defaults-reset-${surface.id}`}>
            <RotateCcw className="size-3.5" />
            <span>Reset to system default</span>
          </Button>
        )}
      </div>
    </div>
  )
}

export function QueryDefaultsSection() {
  return (
    <section data-testid="query-defaults-section" className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Query Defaults</h2>
        <p className="text-sm text-muted-foreground">
          Override the landing query and the source / Group-By options per surface. An empty query uses the
          system default; an emptied options list nudges you to pick instead of presetting one. Stored in this
          browser only.
        </p>
      </div>
      {CONFIGURABLE_SURFACES.map(surface => (
        <RouteWqlEditor key={surface.id} surface={surface} />
      ))}
    </section>
  )
}
