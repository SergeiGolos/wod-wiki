/**
 * TourOutro.tsx — closing sections after the walkthrough runway.
 *
 * Preserves the current home page's real actions (markdown/canvas/home/README.md):
 * "Jump Right In" (Journal / Collections / New Note) and the "What's Next"
 * syntax-guide links.
 */

import { Link } from 'react-router-dom'

export interface TourOutroProps {
  /** Clears the tour editor and scrolls back to the editor stage. */
  onNewNote: () => void
}

const GUIDE_LINKS: Array<{ label: string; to: string }> = [
  { label: '🎓 Basics', to: '/guide/syntax/basics' },
  { label: '🧱 Structure & Reps', to: '/guide/syntax/structure' },
  { label: '⏱️ Timers & Protocols', to: '/guide/syntax/protocols' },
  { label: '🧩 Complex Workouts', to: '/guide/syntax/complex' },
  { label: '📊 Custom Metrics', to: '/guide/syntax/custom-metrics' },
  { label: '📋 Dialects', to: '/guide/syntax/dialects' },
]

const pillBase =
  'inline-flex items-center gap-2 rounded-full px-6 py-3 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors'
const pillSolid = `${pillBase} bg-foreground text-background hover:opacity-90`
const pillGhost = `${pillBase} border border-border text-foreground hover:border-primary/40`

export function TourOutro({ onNewNote }: TourOutroProps) {
  return (
    <>
      <section className="flex min-h-[70vh] flex-col items-center justify-center border-t border-border px-6 py-24 text-center">
        <h2 className="text-[clamp(30px,5vw,60px)] font-extrabold leading-[1.05] tracking-[-0.04em]">
          Stop app-switching.
          <br />
          <span className="text-[hsl(var(--metric-resistance))]">Start the clock.</span>
        </h2>
        <p className="mt-6 max-w-lg text-[15px] leading-[1.7] text-muted-foreground">
          Skip the tour and start using the app now — or open a blank note and write
          your first workout above.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
          <Link to="/journal" className={pillSolid}>
            📓 Open Journal
          </Link>
          <Link to="/collections" className={pillGhost}>
            🗂️ Browse Collections
          </Link>
          <button type="button" onClick={onNewNote} className={pillGhost}>
            ✍️ New Workout Note
          </button>
        </div>
      </section>

      <section className="border-t border-border px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h3 className="text-[clamp(22px,3vw,34px)] font-extrabold tracking-[-0.03em]">
            What&rsquo;s next
          </h3>
          <p className="mt-3 text-[14px] leading-[1.7] text-muted-foreground">
            Work through the tutorials, explore the full syntax reference, or open a new note.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {GUIDE_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className={pillGhost}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
