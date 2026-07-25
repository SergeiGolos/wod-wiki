/**
 * TourOutro.tsx — closing sections after the walkthrough runway.
 *
 * "Jump Right In" (Journal / Collections / New Note), then the quest list
 * (TourQuests): the home-tour chapter — completed by scrolling the page —
 * followed by the syntax-guide chapters with live progress.
 */

import { Link } from 'react-router-dom'
import type { Chapter, Quest } from '../canvas/parseCanvasMarkdown'
import { TourQuests } from './TourQuests'

export interface TourOutroProps {
  /** Clears the tour editor and scrolls back to the editor stage. */
  onNewNote: () => void
  /** Home page quests (labels for the home-tour chapter). */
  quests: Quest[]
  /** Page-level chapters, home-tour first. */
  chapters: Chapter[]
  /** Cross-page quest id → label. */
  questLabels?: Record<string, string>
  /** Home-chapter quest click — scrolls the runway to the stage. */
  onHomeQuestClick?: (questId: string) => void
}

const pillBase =
  'inline-flex items-center gap-2 rounded-full px-6 py-3 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors'
const pillSolid = `${pillBase} bg-foreground text-background hover:opacity-90`
const pillGhost = `${pillBase} border border-border text-foreground hover:border-primary/40`

export function TourOutro({ onNewNote, quests, chapters, questLabels, onHomeQuestClick }: TourOutroProps) {
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

      <TourQuests
        quests={quests}
        chapters={chapters}
        questLabels={questLabels}
        onHomeQuestClick={onHomeQuestClick}
      />
    </>
  )
}
