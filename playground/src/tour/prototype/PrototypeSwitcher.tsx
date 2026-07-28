/**
 * PROTOTYPE — throwaway. Floating variant switcher for the home wireframe (#765).
 * Cycles `?variant=A|B|C` on the current route; arrows + keyboard.
 * Renders nothing outside dev.
 */
import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

export const PROTOTYPE_VARIANTS = [
  { key: 'A', name: 'Upgraded Tour' },
  { key: 'B', name: 'Editorial' },
  { key: 'C', name: 'Command Deck' },
] as const

export function PrototypeSwitcher({ current }: { current: string }) {
  const [searchParams, setSearchParams] = useSearchParams()

  const cycle = useCallback(
    (dir: 1 | -1) => {
      const idx = PROTOTYPE_VARIANTS.findIndex((v) => v.key === current)
      const next =
        PROTOTYPE_VARIANTS[(idx + dir + PROTOTYPE_VARIANTS.length) % PROTOTYPE_VARIANTS.length]
      searchParams.set('variant', next.key)
      setSearchParams(searchParams, { replace: true })
    },
    [current, searchParams, setSearchParams],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, [contenteditable]')) return
      if (e.key === 'ArrowLeft') cycle(-1)
      if (e.key === 'ArrowRight') cycle(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cycle])

  if (!import.meta.env.DEV) return null
  const active = PROTOTYPE_VARIANTS.find((v) => v.key === current)

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-foreground px-2 py-1.5 text-background shadow-xl">
      <span className="rounded bg-background/20 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide">
        prototype
      </span>
      <button
        onClick={() => cycle(-1)}
        className="rounded-full p-1 hover:bg-background/20"
        aria-label="Previous variant"
      >
        <ChevronLeftIcon className="size-4" />
      </button>
      <span className="min-w-32 text-center text-xs font-medium">
        {active?.key} — {active?.name}
      </span>
      <button
        onClick={() => cycle(1)}
        className="rounded-full p-1 hover:bg-background/20"
        aria-label="Next variant"
      >
        <ChevronRightIcon className="size-4" />
      </button>
    </div>
  )
}
