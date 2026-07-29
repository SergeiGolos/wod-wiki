/**
 * LibraryPrototypePage — /prototype/library (issue #808)
 *
 * Three radically different placements for the Library's unified layout,
 * switchable via ?variant=. Throwaway prototype — delete after picking one.
 *
 * Question being answered:
 *   1. Which Journal date-window modes carry over to the unified surface?
 *   2. Where do undated Sessions (Collections) sit in a dated stream?
 *
 * Decision: see the resolution comment recorded on issue #808.
 */
import { useSearchParams } from 'react-router-dom'
import { PrototypeSwitcher } from './components/PrototypeSwitcher'
import { VariantA } from './variants/VariantA'
import { VariantB } from './variants/VariantB'
import { VariantC } from './variants/VariantC'

const VARIANTS = [
  { key: 'A', label: 'Dated stream + Static shelf' },
  { key: 'B', label: 'Stream + Catalogues bucket' },
  { key: 'C', label: 'Mode strip + Pinned shelf' },
] as const

export function LibraryPrototypePage() {
  const [searchParams] = useSearchParams()
  const variant = (searchParams.get('variant') ?? 'A').toUpperCase()

  return (
    <div className="flex flex-col flex-1 bg-muted/30">
      <div className="px-6 py-4 border-b border-border bg-background">
        <div className="flex items-baseline gap-3">
          <h1 className="text-base font-black text-foreground">Library prototype</h1>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
            Throwaway · Issue #808
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
          Three placements for the unified Entry list, sourced from notes, sessions
          (catalog), and posts (dated catalog). Same mock data, different arrangement.
          Use ← / → to cycle. Flip the source filters (top-right) to see how each
          variant handles hiding sessions.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {variant === 'A' && <VariantA />}
        {variant === 'B' && <VariantB />}
        {variant === 'C' && <VariantC />}
        {variant !== 'A' && variant !== 'B' && variant !== 'C' && <VariantA />}
      </div>
      <PrototypeSwitcher variants={VARIANTS.map(v => ({ key: v.key, label: v.label }))} />
    </div>
  )
}
