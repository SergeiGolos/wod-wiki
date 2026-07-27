/**
 * ScrollRing.tsx — highlight ring for ```scroll stages.
 *
 * v1 has a single ring target (the editor), so unlike the home tour's
 * multi-target gliding TourRing this is just a bordered overlay + corner
 * tag on the editor panel, toggled by the runway slice. Transition is a
 * simple CSS fade — no target registry, no canvas scaling.
 */

export interface ScrollRingProps {
  /** Corner tag text (e.g. the syntax token being highlighted). */
  tag?: string
  /** Accent color of the active stage. */
  accent?: string
}

export function ScrollRing({ tag, accent }: ScrollRingProps) {
  const color = accent ?? 'hsl(var(--foreground))'
  return (
    <div
      className="pointer-events-none absolute -inset-1.5 z-30 rounded-2xl transition-all duration-300"
      style={{ boxShadow: `0 0 0 2px ${color}` }}
      data-testid="scroll-ring"
    >
      {tag && (
        <span
          className="absolute -top-3 left-4 rounded-full px-2.5 py-1 font-mono text-[10px] tracking-[0.06em] text-background"
          style={{ background: color }}
        >
          {tag}
        </span>
      )}
    </div>
  )
}
