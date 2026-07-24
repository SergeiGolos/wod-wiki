/**
 * PROTOTYPE — throwaway. Gamified-onboarding synthesis POC.
 * Source: docs/gamafication-poc-index.html + docs/wodwiki_gamified_onboarding_report.md
 *
 * Question: do the three synthesis micro-mechanics — inline compiler feedback
 * on the user's own edit, escalating hint buttons on quest cards, and PR
 * deltas re-annotating journal history — feel right on the real app?
 *
 * Two variants of the existing routes, switchable via ?proto=today|synthesis
 * and a floating bottom bar (arrows / ← → keys). Everything proto-gated reads
 * `useProtoVariant()`. Delete this file and all `proto/` imports when the
 * question is answered.
 *
 * Implementation note: deliberately NOT nuqs — proto-gated components render
 * in tests and Storybook where no nuqs adapter (or even a Router) exists.
 * A tiny module store + URLSearchParams keeps the flag dependency-free;
 * default is always 'today' outside a browser.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { ChevronLeft, ChevronRight, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'

export const PROTO_VARIANTS = ['today', 'synthesis'] as const
export type ProtoVariant = (typeof PROTO_VARIANTS)[number]

const VARIANT_LABELS: Record<ProtoVariant, string> = {
  today: 'A — Today',
  synthesis: 'B — Synthesis',
}

// ── tiny module store ────────────────────────────────────────────────────────

function readFromUrl(): ProtoVariant {
  if (typeof window === 'undefined') return 'today'
  try {
    return new URLSearchParams(window.location.search).get('proto') === 'synthesis'
      ? 'synthesis'
      : 'today'
  } catch {
    return 'today'
  }
}

let current: ProtoVariant = readFromUrl()
const listeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const next = readFromUrl()
    if (next !== current) {
      current = next
      listeners.forEach((l) => l())
    }
  })
}

function setVariant(next: ProtoVariant) {
  current = next
  if (typeof window !== 'undefined') {
    try {
      const url = new URL(window.location.href)
      if (next === 'today') url.searchParams.delete('proto')
      else url.searchParams.set('proto', next)
      window.history.replaceState(null, '', url)
    } catch {
      /* jsdom / non-browser: state only */
    }
  }
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** True when the ?proto=synthesis variant is active. */
export function useProtoVariant(): {
  proto: boolean
  variant: ProtoVariant
  cycle: (dir: 1 | -1) => void
} {
  const variant = useSyncExternalStore(subscribe, () => current, () => 'today' as const)
  const cycle = (dir: 1 | -1) => {
    const i = PROTO_VARIANTS.indexOf(variant)
    setVariant(PROTO_VARIANTS[(i + dir + PROTO_VARIANTS.length) % PROTO_VARIANTS.length])
  }
  return { proto: variant === 'synthesis', variant, cycle }
}

/** Floating bottom-centre variant switcher. Hidden in production builds. */
export function ProtoVariantSwitch() {
  const { variant, cycle } = useProtoVariant()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      // Don't steal arrows from the CodeMirror editor.
      if (t && t.closest?.('.cm-editor')) return
      if (e.key === 'ArrowLeft') cycle(-1)
      if (e.key === 'ArrowRight') cycle(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cycle])

  if (import.meta.env.PROD) return null

  return (
    <div
      data-testid="proto-variant-switch"
      className={cn(
        'fixed bottom-4 left-1/2 z-[9999] -translate-x-1/2',
        'flex items-center gap-1 rounded-full border border-amber-500/50',
        'bg-zinc-900/95 px-2 py-1.5 text-zinc-100 shadow-xl shadow-zinc-900/40',
        'font-mono text-xs',
      )}
    >
      <FlaskConical className="mx-1 size-3.5 text-amber-400" aria-hidden />
      <button
        type="button"
        aria-label="Previous prototype variant"
        onClick={() => cycle(-1)}
        className="rounded-full p-1 hover:bg-zinc-700"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-28 text-center font-semibold">{VARIANT_LABELS[variant]}</span>
      <button
        type="button"
        aria-label="Next prototype variant"
        onClick={() => cycle(1)}
        className="rounded-full p-1 hover:bg-zinc-700"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}
