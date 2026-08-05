/**
 * ChapterHeroPrototypePage — PROTOTYPE (throwaway) for wayfinder map #911,
 * ticket "Chapter hero shape on both form factors".
 *
 * Question: what should a chapter hero look like — a sticky view showing the
 * chapter's first runnable example (running it satisfies that chapter's new
 * lead "run the example" quest), quest cards sliding below (mobile) / beside
 * (desktop) with the lead quest first, guide CTA. Rendered in BOTH idioms at
 * once (phone column = top-sticky; desktop row = side-sticky) per the redraw.
 *
 * Variants via ?v=A|B|C. Static seeded content; Run just toggles the lead
 * card locally. Switcher + form-factor labels are DEV-only. NOT production.
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Play } from 'lucide-react'

const ACCENT = 'hsl(var(--metric-trophy))'

const BASIC_QUESTS = [
  { id: 'basics-run', label: 'Run the First Example' },
  { id: 'basics-movement', label: 'Add a movement' },
  { id: 'basics-reps', label: 'Add a rep count' },
  { id: 'basics-load', label: 'Add a load or distance' },
]

const EXAMPLE = ['```time', 'Pushups', 'Air Squats', '10 Reps each', '```']

function ExampleFence() {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 font-mono text-[12.5px] leading-relaxed">
      <div style={{ color: ACCENT }}>```time</div>
      {EXAMPLE.slice(1, -1).map((l) => (
        <div key={l}>&nbsp;&nbsp;{l}</div>
      ))}
      <div style={{ color: ACCENT }}>```</div>
    </div>
  )
}

function RunButton({ onRun, primary = true }: { onRun: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onRun}
      className={
        primary
          ? 'inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-[12px] font-bold text-primary-foreground'
          : 'inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[11px] font-semibold text-foreground'
      }
    >
      <Play className="size-3.5" /> Run example
    </button>
  )
}

function QuestCards({ ran }: { ran: boolean }) {
  return (
    <div className="flex flex-col gap-2.5">
      {BASIC_QUESTS.map((q, i) => {
        const done = i === 0 ? ran : false
        return (
          <div
            key={q.id}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
              done ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border bg-card'
            }`}
          >
            <span
              className={`flex size-5 flex-none items-center justify-center rounded-full border text-[11px] ${
                done
                  ? 'border-emerald-500 bg-emerald-500 text-background'
                  : 'border-border text-muted-foreground'
              }`}
            >
              {done ? <Check className="size-3" /> : i + 1}
            </span>
            <span
              className={`text-[13px] font-medium ${done ? 'text-muted-foreground' : 'text-foreground'}`}
            >
              {q.label}
            </span>
            {i === 0 && ran && (
              <span className="ml-auto rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-wide text-emerald-600">
                done
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Variant A — example + Run in the sticky view, quest cards beside/below ──
function VariantA({ ran, onRun }: { ran: boolean; onRun: () => void }) {
  return (
    <>
      <div className="rounded-2xl border border-border bg-background p-4 shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Basics · first example
          </span>
          <RunButton onRun={onRun} />
        </div>
        <ExampleFence />
      </div>
      <div className="mt-3">
        <QuestCards ran={ran} />
      </div>
      <a className="mt-3 inline-block text-[12px] font-semibold text-primary underline-offset-2 hover:underline">
        Open the Basics guide →
      </a>
    </>
  )
}

// ── Variant B — pinned chapter header + example; quest cards with summary ────
function VariantB({ ran, onRun }: { ran: boolean; onRun: () => void }) {
  return (
    <>
      <div className="rounded-2xl border border-border bg-background p-4 shadow-lg">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-muted/20 text-muted-foreground">
            🏆
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold">Basics</div>
            <div className="font-mono text-[9px] font-black uppercase tracking-wider text-muted-foreground">
              {ran ? 1 : 0}/{BASIC_QUESTS.length} complete
            </div>
          </div>
          <RunButton onRun={onRun} primary={false} />
        </div>
        <ExampleFence />
      </div>
      <div className="mt-3">
        <QuestCards ran={ran} />
      </div>
      <a className="mt-3 inline-block text-[12px] font-semibold text-primary underline-offset-2 hover:underline">
        Open the Basics guide →
      </a>
    </>
  )
}

// ── Variant C — bigger example pane; quest cards as a compact checklist ─────
function VariantC({ ran, onRun }: { ran: boolean; onRun: () => void }) {
  return (
    <>
      <div className="rounded-2xl border border-border bg-background p-4 shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Basics
          </span>
          <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-muted-foreground">
            Always on first
          </span>
        </div>
        <ExampleFence />
        <div className="mt-3">
          <RunButton onRun={onRun} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between px-1 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">
        <span>4 quests · {ran ? '1' : '0'} done</span>
        <a className="font-semibold text-primary normal-case underline-offset-2 hover:underline">
          Full guide →
        </a>
      </div>
      <div className="mt-2">
        <QuestCards ran={ran} />
      </div>
    </>
  )
}

const VARIANTS: Record<string, { label: string; el: (o: { ran: boolean; onRun: () => void }) => React.ReactNode }> = {
  A: { label: 'Example + quest cards', el: VariantA },
  B: { label: 'Header + progress summary', el: VariantB },
  C: { label: 'Big example + compact checklist', el: VariantC },
}

function Section({ phone, ran, onRun, v }: { phone: boolean; ran: boolean; onRun: () => void; v: string }) {
  const inner = VARIANTS[v].el({ ran, onRun })
  if (phone) {
    return (
      <div className="flex flex-col">
        <div
          className="sticky z-20 shrink-0 px-3 pt-[2px] pb-1"
          style={{ top: '65px', maxHeight: '56vh', overflow: 'auto' }}
        >
          {inner}
        </div>
        <div className="flex flex-col gap-3 px-4 py-4">
          {BasicPlaceholders()}
        </div>
      </div>
    )
  }
  // Desktop: side-sticky view + quest cards in the flow column.
  return (
    <div className="flex items-start gap-6">
      <div className="w-[360px] flex-none">{inner}</div>
      <div className="min-w-0 flex-1">{DesktopCards(ran)}</div>
    </div>
  )
}

function BasicPlaceholders() {
  return (
    <>
      {['Slide on first', 'Then the rest', 'Keep scrolling'].map((s) => (
        <div
          key={s}
          style={{ minHeight: '30vh' }}
          className="flex items-center justify-center rounded-2xl border border-dashed border-border/60 text-[11px] uppercase tracking-[0.2em] text-muted-foreground/50"
        >
          {s}
        </div>
      ))}
    </>
  )
}

function DesktopCards(ran: boolean) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-card/60 p-6">
        <div className="mb-2 text-[13px] font-bold text-foreground">Chapter quests</div>
        <QuestCards ran={ran} />
      </div>
    </div>
  )
}

export default function ChapterHeroPrototypePage() {
  const [params, setParams] = useSearchParams()
  const v = (params.get('v') ?? 'A').toUpperCase()
  const current = VARIANTS[v] ? v : 'A'
  const keys = Object.keys(VARIANTS)
  const [ran, setRan] = useState(false)

  const cycle = (dir: number) => {
    const idx = keys.indexOf(current)
    setParams({ v: keys[(idx + dir + keys.length) % keys.length] }, { replace: true })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Phone column — mobile idiom (top-sticky). */}
      <div className="mx-auto mt-6 w-full max-w-[390px] pb-8">
        <div className="px-4 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
          Mobile — top-sticky
        </div>
        <Section phone ran={ran} onRun={() => setRan(true)} v={current} />
      </div>

      {/* Desktop row — side-sticky idiom. */}
      <div className="mx-auto max-w-5xl border-t border-border px-6 py-8">
        <div className="mb-4 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
          Desktop — side-sticky
        </div>
        <Section phone={false} ran={ran} onRun={() => setRan(true)} v={current} />
      </div>

      {import.meta.env.DEV && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-foreground px-4 py-2 font-mono text-[11px] font-bold text-background shadow-xl">
          <button type="button" onClick={() => cycle(-1)} aria-label="previous" className="px-2 hover:opacity-70">
            ←
          </button>
          <span className="whitespace-nowrap">
            {current} — {VARIANTS[current].label}
          </span>
          <button type="button" onClick={() => cycle(1)} aria-label="next" className="px-2 hover:opacity-70">
            →
          </button>
        </div>
      )}
    </div>
  )
}
