/**
 * PrototypeSwitcher — floating bottom bar for flipping between variants.
 *
 * Per /prototype/UI.md: Left arrow / variant label / right arrow, URL-synced
 * via `?variant=`, keyboard ←/→, hidden in production.
 */
import { useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export interface PrototypeSwitcherProps {
  variants: { key: string; label: string }[]
}

export function PrototypeSwitcher({ variants }: PrototypeSwitcherProps) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const current = searchParams.get('variant') ?? variants[0]?.key

  const setVariant = useCallback(
    (key: string) => {
      const next = new URLSearchParams(searchParams)
      next.set('variant', key)
      navigate(`?${next.toString()}`, { replace: true })
    },
    [searchParams, navigate],
  )

  const cycle = useCallback(
    (dir: 1 | -1) => {
      const idx = variants.findIndex(v => v.key === current)
      if (idx === -1) return
      const next = (idx + dir + variants.length) % variants.length
      setVariant(variants[next].key)
    },
    [variants, current, setVariant],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        cycle(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        cycle(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cycle])

  const currentLabel = variants.find(v => v.key === current)?.label ?? '?'

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-amber-500/50 bg-zinc-950/95 px-2 py-1.5 shadow-xl backdrop-blur"
      data-testid="prototype-switcher"
    >
      <span className="px-2 text-[10px] font-black uppercase tracking-widest text-amber-400">
        Prototype
      </span>
      <button
        type="button"
        onClick={() => cycle(-1)}
        className="size-7 rounded-full flex items-center justify-center text-zinc-100 hover:bg-zinc-800 transition-colors"
        aria-label="Previous variant"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <span className="min-w-[180px] text-center text-xs font-bold text-white tabular-nums">
        <span className="text-amber-400 mr-2">{current}</span>
        {currentLabel}
      </span>
      <button
        type="button"
        onClick={() => cycle(1)}
        className="size-7 rounded-full flex items-center justify-center text-zinc-100 hover:bg-zinc-800 transition-colors"
        aria-label="Next variant"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  )
}
