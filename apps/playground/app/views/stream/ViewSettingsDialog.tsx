import { useMemo } from 'react'
import { LayoutGrid, Table, Rss, RotateCcw } from 'lucide-react'
import { EditorDialog } from '@bitcobblers/wod-wiki-ui'
import { Button } from '@/components/atoms/primitives/button'
import { type EntityLevel, getFieldsForLevel } from '../../lib/fieldProjection'
import type { ViewSettings, LayoutMode } from '../../lib/viewSettingsStorage'

export interface ViewSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  route: string
  level: EntityLevel
  settings: ViewSettings
  onLayoutChange: (layout: LayoutMode) => void
  onGroupByChange?: (groupBy: string) => void
  activeGroupBy?: string
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
  onToggleField,
  onReset,
}: ViewSettingsDialogProps) {
  const availableFields = useMemo(() => getFieldsForLevel(level), [level])
  const visibleSet = useMemo(() => new Set(settings.visibleFields), [settings.visibleFields])
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
          <legend className="text-xs font-semibold text-muted-foreground mb-2">Group By</legend>
          <div className="flex flex-wrap gap-1.5 p-1 bg-muted/40 rounded-lg border border-border/60">
            {[
              { id: 'date', label: 'Date' },
              { id: 'week', label: 'Week' },
              { id: 'month', label: 'Month' },
              { id: 'year', label: 'Year' },
              { id: 'discipline', label: 'Discipline' },
            ].map(opt => {
              const currentGroup = (activeGroupBy || settings.groupBy || (level === 'effort' ? 'discipline' : 'date')).toLowerCase()
              const isSelected = currentGroup === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onGroupByChange?.(opt.id)}
                  data-testid={`view-settings-group-${opt.id}`}
                  className={`min-h-11 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-card text-foreground shadow-sm border border-border/80 font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
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
