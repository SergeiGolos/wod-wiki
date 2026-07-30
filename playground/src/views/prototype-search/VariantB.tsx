/**
 * Variant B — Embedded Pill Spotlight / Omni-Bar
 *
 * Single search input container (40px high) containing embedded removable
 * clause pills inside the search box itself. Typing or pressing ArrowDown
 * opens a sleek command-palette autocomplete popover.
 *
 * Space-efficient: 40px footprint collapsed, command-palette navigation.
 */
import { useState, useRef, useEffect } from 'react'
import { Search as SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ClausePill } from './QueryPalette'
import {
  type QueryClause,
  type ClauseType,
  CLAUSE_META,
  getSuggestions,
  TARGET_OPTIONS,
  SCOPE_OPTIONS,
} from './queryClauses'

export function VariantB({
  clauses,
  onChange,
}: {
  clauses: QueryClause[]
  onChange: (c: QueryClause[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const [activeCategory, setActiveCategory] = useState<ClauseType | 'all'>('all')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Click outside to close popover
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const updateClause = (idx: number, patch: Partial<QueryClause>) => {
    onChange(clauses.map((c, i) => (i === idx ? { ...c, ...patch } : c)))
  }

  const removeClause = (idx: number) => {
    onChange(clauses.filter((_, i) => i !== idx))
  }

  const addClause = (type: ClauseType, value: string) => {
    const meta = CLAUSE_META[type]
    const existingIdx = clauses.findIndex(c => c.type === type)
    if (existingIdx >= 0 && (type === 'target' || type === 'scope' || type === 'time')) {
      updateClause(existingIdx, { value })
    } else {
      const newClause: QueryClause = {
        id: `c-${Date.now()}-${Math.random()}`,
        type,
        label: meta.label,
        value,
        inputType: meta.inputType,
        placeholder: meta.placeholder,
      }
      onChange([...clauses, newClause])
    }
    setInputVal('')
  }

  // Handle free text input enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputVal.trim()) {
      e.preventDefault()
      addClause('text', inputVal.trim())
    } else if (e.key === 'Backspace' && !inputVal && clauses.length > 0) {
      const removableIdx = [...clauses].map((c, i) => ({ c, i })).reverse().find(x => x.c.type !== 'target' && x.c.type !== 'scope')?.i
      if (removableIdx !== undefined) {
        removeClause(removableIdx)
      }
    }
  }

  const filterableTypes: ClauseType[] = [
    'target', 'scope', 'text', 'tag', 'effort', 'discipline', 'type', 'has', 'time', 'where'
  ]

  return (
    <div className="border-b border-border bg-background/95 backdrop-blur px-6 py-3" data-testid="variant-b">
      <div ref={containerRef} className="relative max-w-3xl">
        {/* Search Bar Input Container with embedded pills */}
        <div
          onClick={() => {
            setOpen(true)
            inputRef.current?.focus()
          }}
          className={cn(
            'flex flex-wrap items-center gap-1.5 min-h-[42px] rounded-xl border border-border bg-muted/20 px-3 py-1.5 text-xs transition-all cursor-text',
            open && 'border-primary/60 bg-background ring-2 ring-primary/20 shadow-md',
          )}
        >
          <SearchIcon className="size-4 text-muted-foreground/60 shrink-0" />

          {/* Embedded Clause Pills */}
          {clauses.map((clause, idx) => (
            <ClausePill
              key={clause.id}
              clause={clause}
              onChange={patch => updateClause(idx, patch)}
              onRemove={() => removeClause(idx)}
              compact
            />
          ))}

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            placeholder={clauses.length <= 2 ? 'Type search query or choose filter...' : 'Add text or filter...'}
            onChange={e => {
              setInputVal(e.target.value)
              if (!open) setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-[120px] bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground/40"
            data-testid="variant-b-input"
          />
        </div>

        {/* Command Palette Dropdown */}
        {open && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl p-2 max-h-[380px] overflow-y-auto animate-in fade-in-50 zoom-in-95">
            {/* Category filter tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1.5 mb-1.5 border-b border-border/50 no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors',
                  activeCategory === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground',
                )}
              >
                All
              </button>
              {filterableTypes.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActiveCategory(type)}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors shrink-0',
                    activeCategory === type ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground',
                  )}
                >
                  {CLAUSE_META[type].icon} {CLAUSE_META[type].label}
                </button>
              ))}
            </div>

            {/* Suggestion Groups */}
            <div className="space-y-2 text-xs">
              {/* Target options */}
              {(activeCategory === 'all' || activeCategory === 'target') && (
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 px-2 py-0.5">
                    🎯 Target (find:target)
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {TARGET_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => addClause('target', opt.value)}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-muted text-left font-mono"
                      >
                        <span>find:{opt.value}</span>
                        <span className="text-[10px] text-muted-foreground">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Scope options */}
              {(activeCategory === 'all' || activeCategory === 'scope') && (
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 px-2 py-0.5">
                    🌐 Scope (in scope)
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {SCOPE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => addClause('scope', opt.value)}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-muted text-left font-mono"
                      >
                        <span>in {opt.value}</span>
                        <span className="text-[10px] text-muted-foreground">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Filter Clauses Suggestions */}
              {filterableTypes.filter(t => t !== 'target' && t !== 'scope').map(type => {
                if (activeCategory !== 'all' && activeCategory !== type) return null
                const meta = CLAUSE_META[type]
                const suggestions = getSuggestions(type)
                return (
                  <div key={type}>
                    <div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 px-2 py-0.5 flex items-center justify-between">
                      <span>{meta.icon} {meta.label} ({meta.description})</span>
                    </div>
                    <div className="flex flex-wrap gap-1 px-1">
                      {suggestions.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => addClause(type, s)}
                          className="px-2 py-1 rounded bg-muted/40 hover:bg-primary/15 hover:text-primary text-[11px] font-mono transition-colors"
                        >
                          {type}:{s}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
