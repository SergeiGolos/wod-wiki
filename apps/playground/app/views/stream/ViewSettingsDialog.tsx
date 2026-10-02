import { useMemo } from 'react'
import { LayoutGrid, Table, Rss, RotateCcw } from 'lucide-react'
import { EditorDialog } from '@bitcobblers/wod-wiki-ui'
import { Button } from '@/components/atoms/primitives/button'
import { type EntityLevel, getFieldsForLevel } from '../../lib/fieldProjection'
import type { ViewSettings, LayoutMode } from '../../lib/viewSettingsStorage'
import { GROUP_BY_FAVORITE_OPTIONS, readRouteWqlConfig } from '../../lib/routeWqlConfig'

export interface ViewSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  route: string
  level: EntityLevel
  settings: ViewSettings
  onLayoutChange: (layout: LayoutMode) => void
  onGroupByChange?: (groupBy: string) => void
  activeGroupBy?: string
  /** WQL grouping dimensions while the query owns grouping (work item 7):
   *  the fallback arrangement is disabled and shown unselected until the
   *  query grouping is removed or changed through the shared editor. */
  queryGrouping?: string[] | null
  /** Opens the shared query editor from the "Controlled by query" notice. */
  onEditQuery?: () => void
  onToggleField: (fieldId: string) => void
  onReset: () => void
}

export function ViewSettingsDialog({
  open,
  onOpenChange,
  route,
  level,
  settings,
  onLayoutChange,
  onGroupByChange,
  activeGroupBy,
  queryGrouping,
  onEditQuery,
  onToggleField,
  onReset,
}: ViewSettingsDialogProps) {
  const availableFields = useMemo(() => getFieldsForLevel(level), [level])
  const visibleSet = useMemo(() => new Set(settings.visibleFields), [settings.visibleFields])
  const queryControlsGrouping = (queryGrouping?.length ?? 0) > 0
  // Group-By vocabulary: the route's stored favorites reorder/prioritize the
  // shared fallback list; unknown configured ids fall back to a capitalized
  // label (reported as invalid in Settings ▸ Query Defaults).
  const groupOptions = useMemo<{ id: string; label: string }[]>(() => {
    const configured = readRouteWqlConfig(route).groupByOptions
    if (!configured) return [...GROUP_BY_FAVORITE_OPTIONS]
    return configured.map(
      id => GROUP_BY_FAVORITE_OPTIONS.find(o => o.id === id) ?? { id, label: id.charAt(0).toUpperCase() + id.slice(1) },
    )
  }, [route])
  const levelLabel = level.charAt(0).toUpperCase() + level.slice(1)

  return (
    <EditorDialog
      open={open}
      onClose={() => onOpenChange(false)}
      title="View Settings"
      description={`${levelLabel} · ${route}`}
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
            data-testid="view-settings-reset"
          >
            <RotateCcw className="size-3" />
            Reset to defaults
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)} data-testid="view-settings-close">
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-6" data-testid="view-settings-dialog">
        <fieldset>
          <legend className="text-xs font-semibold text-muted-foreground mb-2">Layout Mode</legend>
          <div className="grid grid-cols-3 gap-2 p-1 bg-muted/40 rounded-lg border border-border/60">
            {([
              { id: 'cards', label: 'Cards', icon: LayoutGrid },
              { id: 'rows', label: 'Rows', icon: Table },
              { id: 'feed', label: 'Feed', icon: Rss },
            ] as const).map(opt => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={settings.layout === opt.id}
                  onClick={() => onLayoutChange(opt.id)}
                  className={`flex min-h-11 items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
                    settings.layout === opt.id
                      ? 'bg-card text-foreground shadow-sm border border-border/80'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`view-settings-layout-${opt.id}`}
                >
                  <Icon className="size-3.5" />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-xs font-semibold text-muted-foreground mb-2">Arrange cards by</legend>
          {queryControlsGrouping && (
            <div
              data-testid="view-settings-query-grouped"
              className="flex items-center justify-between gap-2 mb-2 rounded-md border border-primary/30 bg-primary/[0.04] px-3 py-2"
            >
              <span className="text-xs text-foreground">
                Controlled by query — grouped by{' '}
                <span className="font-mono">{queryGrouping!.join(', ')}</span>
              </span>
              {onEditQuery && (
                <Button variant="outline" size="sm" onClick={onEditQuery} data-testid="view-settings-edit-query">
                  Edit query
                </Button>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 p-1 bg-muted/40 rounded-lg border border-border/60">
            {groupOptions.map(opt => {
              const currentGroup = (activeGroupBy || settings.groupBy || (level === 'effort' ? 'discipline' : 'date')).toLowerCase()
              // While the query owns grouping no fallback option may appear
              // selected — clearing the query grouping reveals the saved one.
              const isSelected = !queryControlsGrouping && currentGroup === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={queryControlsGrouping}
                  title={queryControlsGrouping ? 'Grouping is set by the query — edit the query to change it' : undefined}
                  onClick={() => onGroupByChange?.(opt.id)}
                  data-testid={`view-settings-group-${opt.id}`}
                  className={`min-h-11 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-card text-foreground shadow-sm border border-border/80 font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  } disabled:opacity-50 disabled:pointer-events-none`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-xs font-semibold text-muted-foreground mb-2">
            Visible Fields ({visibleSet.size} of {availableFields.length})
          </legend>
          <div className="space-y-1.5 border border-border/60 rounded-lg p-2 bg-muted/20">
            {availableFields.map(field => (
              <label key={field.id} className="flex min-h-11 items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/40 transition-colors cursor-pointer text-sm">
                <span className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={visibleSet.has(field.id)}
                    onChange={() => onToggleField(field.id)}
                    className="rounded border-border text-primary focus:ring-primary/20 size-4"
                    data-testid={`view-settings-field-${field.id}`}
                  />
                  <span className="font-medium text-foreground">{field.label}</span>
                </span>
                <span className="text-xs font-mono text-muted-foreground">{field.id}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </EditorDialog>
  )
}
