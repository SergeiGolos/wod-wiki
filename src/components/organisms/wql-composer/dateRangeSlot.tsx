/**
 * DateRangeSlot — demo custom slot for the WqlComposer (issue #830).
 *
 * A workout date-range picker registered through the ComposerRegistry. The
 * typed value is `{ start, end }` (ISO yyyy-mm-dd strings); it serializes
 * onto the clause as `<start>_<end>` and compiles to the WQL filter fragment
 * `daterange:<start>_<end>`, which parseQuery accepts alongside the built-in
 * clauses.
 */
import { useState } from 'react'
import type {
  CustomSlotDefinition,
  CustomSlotEditorProps,
} from './ComposerRegistry'

export interface DateRange {
  /** ISO yyyy-mm-dd, inclusive. */
  start: string
  /** ISO yyyy-mm-dd, inclusive. */
  end: string
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function DateRangeEditor({ value, onChange, onClose }: CustomSlotEditorProps<DateRange>) {
  const [start, setStart] = useState(value?.start ?? '')
  const [end, setEnd] = useState(value?.end ?? '')
  const ready = ISO_DATE.test(start) && ISO_DATE.test(end)

  return (
    <div className="space-y-2 text-xs" data-testid="date-range-editor">
      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <label className="text-[9px] uppercase font-bold text-muted-foreground">Start</label>
          <input
            type="date"
            value={start}
            onChange={e => setStart(e.target.value)}
            className="w-full rounded border border-border bg-background px-1.5 py-1 text-xs font-mono"
            data-testid="date-range-start"
          />
        </div>
        <div>
          <label className="text-[9px] uppercase font-bold text-muted-foreground">End</label>
          <input
            type="date"
            value={end}
            onChange={e => setEnd(e.target.value)}
            className="w-full rounded border border-border bg-background px-1.5 py-1 text-xs font-mono"
            data-testid="date-range-end"
          />
        </div>
      </div>
      <div className="pt-1 flex items-center justify-between border-t border-border/50">
        <code className="text-[10px] font-mono text-muted-foreground">
          {ready ? `daterange:${start}_${end}` : 'daterange: <start>_<end>'}
        </code>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => onChange({ start, end })}
            className="px-2.5 py-1 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
            data-testid="date-range-apply"
          >
            Set Range
          </button>
        </div>
      </div>
    </div>
  )
}

/** Demo slot definition: a workout date-range picker. */
export const dateRangeSlot: CustomSlotDefinition<DateRange> = {
  type: 'date-range',
  label: 'Date Range',
  icon: '📅',
  placeholder: 'Pick a workout date range...',
  placeholderText: 'daterange: [start_end]',
  description: 'Filter workouts to an explicit date range',
  Editor: DateRangeEditor,
  wqlGenerator: value => `daterange:${value.start}_${value.end}`,
  formatValue: value => `${value.start}_${value.end}`,
  parseValue: raw => {
    const [start, end] = raw.split('_')
    return start && end && ISO_DATE.test(start) && ISO_DATE.test(end) ? { start, end } : undefined
  },
  validate: value => (value.end >= value.start ? null : 'Date range end must not precede its start'),
}
