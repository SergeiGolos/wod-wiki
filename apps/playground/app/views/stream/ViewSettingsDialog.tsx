/**
 * ViewSettingsDialog — modal dialog for configuring stream/table layout and visible fields (Ticket 002).
 *
 * Keeps configuration tucked away behind a clean, uncluttered dialog rather than
 * crowding the sticky header.
 *
 * Features:
 * - Layout Mode: Card Stream vs Property Table segmented toggle.
 * - Visible Fields: Checkbox grid of available fields for the active entity level.
 * - Reset to defaults action.
 * - Accessible keyboard navigation (Escape to dismiss, backdrop click close).
 */
import { useEffect, useMemo } from 'react'
import { X, LayoutList, Table, RotateCcw } from 'lucide-react'
import { Button } from '@/components/atoms/primitives/button'
import {
  type EntityLevel,
  getFieldsForLevel,
} from '../../lib/fieldProjection'
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
  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onOpenChange(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  // Get available fields for this level
  const availableFields = useMemo(() => getFieldsForLevel(level), [level])
  const visibleSet = useMemo(() => new Set(settings.visibleFields), [settings.visibleFields])

  if (!open) return null

  const levelLabel = level.charAt(0).toUpperCase() + level.slice(1)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onOpenChange(false)
      }}
      data-testid="view-settings-dialog"
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="view-settings-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <h2 id="view-settings-title" className="text-sm font-bold text-foreground">
              View Settings
            </h2>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 bg-muted px-2 py-0.5 rounded-full border border-border">
              {levelLabel}
            </span>
            {route && (
              <span className="text-[10px] font-mono text-muted-foreground/60" data-testid="view-settings-route">
                {route}
              </span>
            )}
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Close"
            data-testid="view-settings-close-x"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Section 1: Layout Selection */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
              Layout Mode
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => onLayoutChange('stream')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                  settings.layout === 'stream'
                    ? 'bg-card text-foreground shadow-sm border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid="view-settings-layout-stream"
              >
                <LayoutList className="size-3.5" />
                <span>Card Stream</span>
              </button>
              <button
                type="button"
                onClick={() => onLayoutChange('table')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                  settings.layout === 'table'
                    ? 'bg-card text-foreground shadow-sm border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid="view-settings-layout-table"
              >
                <Table className="size-3.5" />
                <span>Property Table</span>
              </button>
            </div>
          </div>

          {/* Section 2: Grouping Selection */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
              Group By
            </label>
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
                    onClick={() => onGroupByChange?.(opt.id)}
                    data-testid={`view-settings-group-${opt.id}`}
                    className={`py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
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
          </div>

          {/* Section 2: Visible Fields */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Visible Fields ({visibleSet.size} of {availableFields.length})
              </label>
              <span className="text-[10px] text-muted-foreground/60">
                Customize column & property visibility
              </span>
            </div>

            <div className="space-y-1.5 border border-border/60 rounded-lg p-2 bg-muted/20">
              {availableFields.map(field => {
                const isChecked = visibleSet.has(field.id)
                return (
                  <label
                    key={field.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/40 transition-colors cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleField(field.id)}
                        className="rounded border-border text-primary focus:ring-primary/20 size-3.5"
                        data-testid={`view-settings-field-${field.id}`}
                      />
                      <span className="font-medium text-foreground">{field.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground/70">
                      {field.id}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/60 px-5 py-3 bg-muted/10">
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
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
            data-testid="view-settings-close"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
