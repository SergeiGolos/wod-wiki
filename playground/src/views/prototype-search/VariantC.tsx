/**
 * Variant C — "Query Builder Cards"
 *
 * A vertical stack of "filter cards" the user adds/removes. The first
 * card is always Source (Note / Session / Post — single select). Each
 * subsequent card is a filter the user chose to add. Each card has a
 * remove (×) button. An "+ Add filter" button at the bottom.
 *
 * This is a visual query builder — each card maps to a WQL clause.
 * The composed WQL is shown at the bottom as a live readout.
 */
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type SearchState,
  type SearchSource,
  SOURCE_META,
} from './shared'

type CardType = 'text' | 'catalog' | 'tag' | 'discipline' | 'date'

const AVAILABLE_CARDS: { type: CardType; label: string; placeholder: string }[] = [
  { type: 'text', label: 'Text contains', placeholder: 'e.g. thrusters, Fran, 21-15-9' },
  { type: 'catalog', label: 'In catalog', placeholder: 'Select catalog…' },
  { type: 'tag', label: 'Tagged with', placeholder: 'Select tag…' },
  { type: 'discipline', label: 'Discipline', placeholder: 'Select discipline…' },
  { type: 'date', label: 'Date range', placeholder: 'Select range…' },
]

const CATALOGS = ['CrossFit Girls', 'Dan John 40-Day', 'ZombieFit Dec 2009', 'Swimming College']
const TAGS = ['PR', 'Benchmark', 'Competition', 'Long', 'Short', 'Heavy']
const DISCIPLINES = ['Strength', 'Conditioning', 'Endurance', 'Gymnastics', 'Rowing']
const DATES = ['Today', 'Past week', 'Past month', 'Past 3 months', 'All time']

export function VariantC({ state, onChange }: { state: SearchState; onChange: (s: SearchState) => void }) {
  const [showAddMenu, setShowAddMenu] = useState(false)

  const setSource = (s: SearchSource) => onChange({ ...state, source: s, filters: [] })
  const addCard = (type: CardType) => {
    setShowAddMenu(false)
    const meta = AVAILABLE_CARDS.find(c => c.type === type)!
    onChange({ ...state, filters: [...state.filters, { key: type, label: meta.label, value: '' }] })
  }
  const updateCard = (idx: number, value: string) =>
    onChange({ ...state, filters: state.filters.map((f, i) => i === idx ? { ...f, value } : f) })
  const removeCard = (idx: number) =>
    onChange({ ...state, filters: state.filters.filter((_, i) => i !== idx) })

  return (
    <div className="border-b border-border bg-background px-6 py-3 space-y-2" data-testid="variant-c">
      {/* Card 1: Source — always present, not removable */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 w-20 shrink-0">Source</span>
        <div className="flex gap-1.5">
          {(Object.keys(SOURCE_META) as SearchSource[]).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSource(s)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                state.source === s ? 'bg-primary text-primary-foreground' : 'bg-background border border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {SOURCE_META[s].icon} {SOURCE_META[s].label}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground/50 ml-auto">{SOURCE_META[state.source].description}</span>
      </div>

      {/* Filter cards */}
      {state.filters.map((card, idx) => (
        <FilterCard
          key={idx}
          card={card}
          onUpdate={value => updateCard(idx, value)}
          onRemove={() => removeCard(idx)}
        />
      ))}

      {/* Add filter button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowAddMenu(o => !o)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <span className="flex items-center justify-center size-5 rounded-full border border-primary/30 bg-primary/5">
            <Plus className="size-3" />
          </span>
          Add filter
        </button>
        {showAddMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
            <div className="absolute z-20 mt-1 min-w-[180px] rounded-md border border-border bg-background shadow-lg py-1">
              {AVAILABLE_CARDS.map(c => (
                <button
                  key={c.type}
                  type="button"
                  onClick={() => addCard(c.type)}
                  className="block w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function FilterCard({
  card,
  onUpdate,
  onRemove,
}: {
  card: { key: string; label: string; value: string }
  onUpdate: (value: string) => void
  onRemove: () => void
}) {
  const options =
    card.key === 'catalog' ? CATALOGS :
    card.key === 'tag' ? TAGS :
    card.key === 'discipline' ? DISCIPLINES :
    card.key === 'date' ? DATES :
    null

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 group hover:border-primary/30 transition-colors">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 w-20 shrink-0">
        {card.label}
      </span>
      {options ? (
        <select
          value={card.value}
          onChange={e => onUpdate(e.target.value)}
          className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Select…</option>
          {options.map(opt => <option key={opt}>{opt}</option>)}
        </select>
      ) : (
        <input
          type="text"
          value={card.value}
          onChange={e => onUpdate(e.target.value)}
          placeholder="Type to search…"
          className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="size-5 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}
