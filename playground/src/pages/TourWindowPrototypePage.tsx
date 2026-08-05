/**
 * TourWindowPrototypePage — PROTOTYPE (throwaway) for wayfinder map #911,
 * ticket "Tour window mobile rework: own window + ring feedback".
 *
 * Question: what should the tour's OWN pinned window look like on mobile —
 * top-sticky under the app header, slides (caption cards) below, with the
 * ring/box-selection feedback restored — so it no longer borrows the
 * greeting editor and no longer drops the highlight.
 *
 * Three structural variants, switched by ?v=A|B|C. Static seeded content only;
 * the runtime behaviour is already proven in the shipped TourMobileRunway.
 * Switcher is DEV-only. NOT production code — delete after the winner is chosen.
 */
import { useLayoutEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

// ── Shared bits ─────────────────────────────────────────────────────────────

/** Accent ring that measures a DOM target and draws the highlight around it. */
function HighlightRing({ target, accent }: { target: HTMLElement | null; accent: string }) {
  const ringRef = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    if (!target || !ringRef.current) return
    const measure = () => {
      const r = target.getBoundingClientRect()
      const box = ringRef.current!
      box.style.top = `${r.top}px`
      box.style.left = `${r.left}px`
      box.style.width = `${r.width}px`
      box.style.height = `${r.height}px`
      box.style.opacity = '1'
    }
    measure()
    // Only reposition on resize relative to the window's anchored box.
    const iv = window.setInterval(measure, 250)
    return () => window.clearInterval(iv)
  }, [target])
  return (
    <div
      ref={ringRef}
      className="pointer-events-none fixed z-30 opacity-0 transition-opacity duration-200"
      style={{ boxShadow: `0 0 0 2px ${accent}, 0 0 18px 2px ${accent}55`, border: `2px solid ${accent}` }}
    />
  )
}

/** Mock "editor" screen inside the window — a ```time fence the ring targets. */
function MockEditor({ fenceRef }: { fenceRef?: (el: HTMLDivElement | null) => void }) {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          welcome-1.md
        </span>
        <span className="rounded-md bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground">
          Run
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[12px] leading-relaxed">
        <div className="text-muted-foreground"># 👋 Edit Me</div>
        <div className="text-muted-foreground">Open a ```time block:</div>
        <div
          ref={fenceRef}
          className="my-2 rounded-md border border-[hsla(var(--metric-resistance)/0.4)] bg-muted/30 p-2 text-foreground"
        >
          <div className="text-[hsla(var(--metric-resistance)/0.9)]">```time</div>
          <div>&nbsp;&nbsp;10 Pushups</div>
          <div>&nbsp;&nbsp;15 Air Squats</div>
          <div>&nbsp;&nbsp;:30 Rest</div>
          <div className="text-[hsla(var(--metric-resistance)/0.9)]">```</div>
        </div>
        <div className="text-muted-foreground">Each line collects metrics as you go.</div>
      </div>
    </div>
  )
}

function WindowChrome({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between rounded-t-2xl border-b border-border bg-muted/20 px-3 py-2">
      <div className="flex gap-1.5">
        <span className="size-2.5 rounded-full bg-red-500/30" />
        <span className="size-2.5 rounded-full bg-amber-500/30" />
        <span className="size-2.5 rounded-full bg-emerald-500/30" />
      </div>
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </span>
    </div>
  )
}

const CAPTIONS = [
  { num: '01 · Live Editor', text: 'Watch a ```time block become a workout — rep counts, distance, and load on every line.' },
  { num: '02 · Timer', text: 'The script becomes the WallClock. Click Next to advance rounds; each click locks a split.' },
  { num: '03 · Analytics', text: 'Explore what you just did — total reps, distance, and volume, written to your journal.' },
]

function PinWindow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="sticky z-20 shrink-0 px-4 pt-[2px] pb-1"
      style={{ top: '65px', height: 'calc(50vh - 32px)' }}
    >
      <div className="h-full overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        {children}
      </div>
    </div>
  )
}

function CaptionCard({ num, text }: { num: string; text: string }) {
  return (
    <article className="mx-4 rounded-2xl border border-border bg-card p-5">
      <div className="mb-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-primary">
        {num}
      </div>
      <p className="text-[13.5px] leading-[1.7] text-muted-foreground">{text}</p>
    </article>
  )
}

const ACCENT = 'hsl(var(--metric-resistance))'

// ── Variant A — pinned window + ring, full-width caption cards ──────────────
function VariantA() {
  const fenceRef = useRef<HTMLDivElement | null>(null)
  return (
    <div>
      <PinWindow>
        <WindowChrome title="WOD Editor & Autocomplete" />
        <MockEditor fenceRef={(el) => (fenceRef.current = el)} />
      </PinWindow>
      <HighlightRing target={fenceRef.current} accent={ACCENT} />
      <div className="flex flex-col gap-4 py-4">
        {CAPTIONS.map((c, i) => (
          <div key={c.num} style={{ minHeight: '38vh' }} className="flex items-center">
            <CaptionCard num={c.num} text={c.text} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Variant B — pinned window + ring + pinned caption rail, compact cards ───
function VariantB() {
  const fenceRef = useRef<HTMLDivElement | null>(null)
  return (
    <div>
      <PinWindow>
        <WindowChrome title="WOD Editor & Autocomplete" />
        <MockEditor fenceRef={(el) => (fenceRef.current = el)} />
      </PinWindow>
      <HighlightRing target={fenceRef.current} accent={ACCENT} />
      <div className="sticky top-[calc(50vh-22px)] z-10 mx-4 mb-2 rounded-xl border border-border bg-popover px-4 py-2.5 shadow-lg">
        <div className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-primary">
          {CAPTIONS[0].num}
        </div>
        <div className="text-[12px] leading-snug text-popover-foreground">{CAPTIONS[0].text}</div>
      </div>
      <div className="flex flex-col gap-3 px-6 pb-4">
        {CAPTIONS.map((c) => (
          <div key={c.num} style={{ minHeight: '34vh' }} className="flex items-center">
            <div className="w-full rounded-xl border border-border/60 bg-muted/20 px-4 py-3 font-mono text-[11px] text-muted-foreground">
              {c.num.split(' · ')[0]} — slot
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Variant C — pinned window + ring + bottom stage stepper ─────────────────
function VariantC() {
  const fenceRef = useRef<HTMLDivElement | null>(null)
  return (
    <div>
      <PinWindow>
        <WindowChrome title="WOD Editor & Autocomplete" />
        <MockEditor fenceRef={(el) => (fenceRef.current = el)} />
        <div className="absolute inset-x-4 bottom-2 flex items-center justify-center gap-1.5">
          {CAPTIONS.map((c, i) => (
            <span
              key={c.num}
              className="h-1 rounded-full"
              style={{
                width: i === 0 ? 24 : 10,
                background: i === 0 ? ACCENT : 'hsl(var(--foreground) / 0.2)',
              }}
            />
          ))}
        </div>
      </PinWindow>
      <HighlightRing target={fenceRef.current} accent={ACCENT} />
      <div className="flex flex-col gap-4 py-4">
        {CAPTIONS.map((c) => (
          <div key={c.num} style={{ minHeight: '40vh' }} className="flex items-center">
            <CaptionCard num={c.num} text={c.text} />
          </div>
        ))}
      </div>
    </div>
  )
}

const VARIANTS: Record<string, { label: string; el: React.ReactNode }> = {
  A: { label: 'Ring + full cards', el: <VariantA /> },
  B: { label: 'Ring + caption rail', el: <VariantB /> },
  C: { label: 'Ring + stage stepper', el: <VariantC /> },
}

export default function TourWindowPrototypePage() {
  const [params, setParams] = useSearchParams()
  const v = (params.get('v') ?? 'A').toUpperCase()
  const current = VARIANTS[v] ? v : 'A'
  const keys = Object.keys(VARIANTS)

  const cycle = (dir: number) => {
    const idx = keys.indexOf(current)
    const next = keys[(idx + dir + keys.length) % keys.length]
    setParams({ v: next }, { replace: true })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Phone-width centred column so the layout reads as a mobile tour. */}
      <div className="mx-auto w-full max-w-[390px]">
        {VARIANTS[current].el}
        <div className="h-16" />
      </div>

      {import.meta.env.DEV && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-foreground px-4 py-2 font-mono text-[11px] font-bold text-background shadow-xl">
          <button
            type="button"
            onClick={() => cycle(-1)}
            aria-label="previous variant"
            className="px-2 hover:opacity-70"
          >
            ←
          </button>
          <span className="whitespace-nowrap">
            {current} — {VARIANTS[current].label}
          </span>
          <button
            type="button"
            onClick={() => cycle(1)}
            aria-label="next variant"
            className="px-2 hover:opacity-70"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
