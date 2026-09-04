/**
 * PropertyTable — tabular projection component adapted to field projections (Ticket 002).
 *
 * Dynamically adapts column headers and row cells to the active entity level
 * and visible fields. Supports interactive row navigation and custom row click handlers.
 */
import { useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import type { Entry } from '../../lib/entryMapper'
import { entryOpenHref } from '../../lib/entryActions'
import {
  type EntityLevel,
  type FieldDefinition,
  getEntityLevel,
  getFieldsForLevel,
  getDefaultVisibleFieldIds,
} from '../../lib/fieldProjection'

export interface PropertyTableProps {
  entries: readonly Entry[]
  level?: EntityLevel
  visibleFieldIds?: readonly string[]
  onRowClick?: (entry: Entry) => void
  emptyMessage?: string
  className?: string
}

export function PropertyTable({
  entries,
  level,
  visibleFieldIds,
  onRowClick,
  emptyMessage = 'No entries to display',
  className = '',
}: PropertyTableProps) {
  const navigate = useNavigate()

  // Determine effective level
  const effectiveLevel: EntityLevel = useMemo(() => {
    if (level) return level
    if (entries.length > 0) return getEntityLevel(entries[0])
    return 'note'
  }, [level, entries])

  // Get all field definitions for this level
  const allFields = useMemo(() => getFieldsForLevel(effectiveLevel), [effectiveLevel])

  // Filter to active visible fields
  const activeFields: readonly FieldDefinition[] = useMemo(() => {
    const visibleSet = new Set(visibleFieldIds ?? getDefaultVisibleFieldIds(effectiveLevel))
    return allFields.filter(f => visibleSet.has(f.id))
  }, [allFields, visibleFieldIds, effectiveLevel])

  const handleRowClick = (entry: Entry) => {
    if (onRowClick) {
      onRowClick(entry)
    } else {
      navigate(entryOpenHref(entry))
    }
  }

  if (entries.length === 0) {
    return (
      <div
        className={`w-full py-16 text-center text-sm text-muted-foreground ${className}`}
        data-testid="property-table-empty"
      >
        {emptyMessage}
      </div>
    )
  }

  return (
    <div
      className={`w-full overflow-x-auto border-y border-border bg-card/50 ${className}`}
      data-testid="property-table"
    >
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {activeFields.map(field => {
              const alignClass =
                field.align === 'right'
                  ? 'text-right'
                  : field.align === 'center'
                    ? 'text-center'
                    : 'text-left'
              return (
                <th
                  key={field.id}
                  scope="col"
                  className={`px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-muted-foreground whitespace-nowrap ${alignClass}`}
                  data-testid={`property-table-header-${field.id}`}
                >
                  {field.label}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {entries.map(entry => (
            <tr
              key={entry.id}
              role="button"
              tabIndex={0}
              onClick={() => handleRowClick(entry)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleRowClick(entry)
                }
              }}
              className="hover:bg-muted/40 transition-colors cursor-pointer group"
              data-testid={`property-table-row-${entry.id}`}
            >
              {activeFields.map(field => {
                const val = field.getValue(entry)
                const formatted = field.formatValue(val, entry)
                const alignClass =
                  field.align === 'right'
                    ? 'text-right tabular-nums'
                    : field.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                return (
                  <td
                    key={field.id}
                    className={`px-4 py-3 whitespace-nowrap text-foreground/90 ${alignClass}`}
                    data-testid={`property-table-cell-${field.id}`}
                  >
                    {field.id === 'pacingTier' && entry.execution?.effortSlug ? (
                      <Link
                        to={`/effort/${encodeURIComponent(entry.execution.effortSlug)}`}
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => e.stopPropagation()}
                        data-testid="property-table-effort-link"
                        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-colors"
                        title={`View movement history for ${entry.detail ?? entry.execution.effortSlug}`}
                      >
                        {formatted}
                      </Link>
                    ) : field.id === 'title' || field.id === 'label' ? (
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {formatted}
                      </span>
                    ) : (
                      formatted
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
