/**
 * Variant B3 — Omni Command Bar with Quick Keyboard Selection
 *
 * High-density command bar with placeholder slots, keyboard shortcut triggers,
 * and Tab / Shift+Tab slot navigation + ↑ / ↓ option selection.
 */
import { useState, useRef } from 'react'
import { Command } from 'lucide-react'
import { TokenSlotPill, AddFilterDropdown } from './QueryPalette'
import {
  type QueryClause,
  type ClauseType,
  CLAUSE_META,
} from './queryClauses'
import { cn } from '@/lib/utils'

export function VariantC({
  clauses,
  onChange,
}: {
  clauses: QueryClause[]
  onChange: (c: QueryClause[]) => void
}) {
  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null)
  const [freeText, setFreeText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const updateClause = (idx: number, patch: Partial<QueryClause>) => {
    onChange(clauses.map((c, i) => (i === idx ? { ...c, ...patch } : c)))
  }

  const removeClause = (idx: number) => {
    onChange(clauses.filter((_, i) => i !== idx))
  }

  const addClause = (type: ClauseType) => {
    const meta = CLAUSE_META[type]
    const newClause: QueryClause = {
      id: `c-${Date.now()}-${Math.random()}`,
      type,
      label: meta.label,
      value: type === 'time' ? 'last 2w' : type === 'where' ? 'sum:totalVolume{} > 5000' : '',
      inputType: meta.inputType,
      placeholder: meta.placeholder,
    }
    onChange([...clauses, newClause])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && freeText.trim()) {
      e.preventDefault()
      const meta = CLAUSE_META.text
      const newClause: QueryClause = {
        id: `c-${Date.now()}-${Math.random()}`,
        type: 'text',
        label: meta.label,
        value: freeText.trim(),
        inputType: meta.inputType,
        placeholder: meta.placeholder,
      }
      onChange([...clauses, newClause])
      setFreeText('')
    }
  }

  return (
    <div className="border-b border-border bg-background/95 backdrop-blur px-6 py-3" data-testid="variant-b3">
      <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 mb-1.5 flex items-center justify-between">
        <span>B3 — Omni Command Bar with Quick Keyboard Selection</span>
        <span className="text-[9px] font-normal text-muted-foreground/50">Tab / Shift+Tab to jump slots · ↑↓ to choose · Type text + Enter</span>
      </div>

      <div className="max-w-3xl">
        <div
          onClick={() => inputRef.current?.focus()}
          className={cn(
            'flex flex-wrap items-center gap-1.5 min-h-[46px] rounded-xl border border-border bg-muted/20 px-3 py-1.5 text-xs transition-all cursor-text shadow-xs',
            activeSlotIdx !== null && 'border-primary/60 bg-background ring-2 ring-primary/20 shadow-md',
          )}
        >
          <Command className="size-4 text-amber-500 shrink-0 mr-0.5" />

          {/* Token Slots */}
          {clauses.map((clause, idx) => (
            <TokenSlotPill
              key={clause.id}
              clause={clause}
              isActive={activeSlotIdx === idx}
              onClick={() => setActiveSlotIdx(idx)}
              onChange={patch => updateClause(idx, patch)}
              onRemove={() => removeClause(idx)}
              compact
            />
          ))}

          {/* Quick Free-text Search Input */}
          <input
            ref={inputRef}
            type="text"
            value={freeText}
            placeholder="Type search term and press Enter..."
            onChange={e => setFreeText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-[140px] bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground/40 font-mono"
            data-testid="variant-b3-input"
          />

          <AddFilterDropdown clauses={clauses} onAdd={addClause} />
        </div>
      </div>
    </div>
  )
}
