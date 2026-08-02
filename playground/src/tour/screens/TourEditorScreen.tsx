import React from 'react'
import { Play, Share2, Sparkles } from 'lucide-react'
import { NoteEditor } from '@/components/organisms/editor/NoteEditor'
import type { ScriptBlock } from '@/components/Editor/types'
import { useRingRef } from '../TourRing'

export const WORKOUT_PRESETS = [
  {
    name: '21-15-9 Rep Scaling (24kg Swings, 400m Run, 225lb Deadlifts)',
    wod: '```wod\n21-15-9\n  Kettlebell Swings 24kg\n  400m Run\n  Deadlifts 225lb\n  *:30 Rest\n```',
  },
  {
    name: 'Bodyweight & Distance (20 reps, 200m)',
    wod: '```wod\n(4 Rounds)\n  20 Air Squats\n  200m Run\n  15 Push-ups\n  *:45 Rest\n```',
  },
  {
    name: 'Heavy Triplet (5 reps, 100m, 185lb/50lb)',
    wod: '```wod\n(5 Sets)\n  5 Barbell Back Squats 185lb\n  100m Farmer Carry 50lb\n  10 Ring Dips\n```',
  },
]
export interface TourEditorScreenProps {
  doc: string
  onDocChange: (next: string) => void
  onBlocksChange: (blocks: ScriptBlock[]) => void
  onRun: () => void
  onShare: () => void
  onOpenInEditor: () => void
  theme: string
}

export const TourEditorScreen: React.FC<TourEditorScreenProps> = ({
  doc,
  onDocChange,
  onBlocksChange,
  onRun,
  onShare,
  onOpenInEditor,
  theme,
}) => {
  const fenceRef = useRingRef('editor.fence')
  const wodBlockRef = useRingRef('editor.wodBlock')
  const runButtonRef = useRingRef('editor.runButton')

  const handleSelectPreset = (wod: string) => {
    onDocChange(`# 👋 Edit Me\n\nChange the reps, distance, or load below — this is live.\n\n${wod}\n\n> Press **Run** ↑ to start the WallClock.\n`)
  }
  return (
    <div className="flex h-full flex-col bg-background text-left">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div ref={fenceRef} className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Home / Notes / welcome-1.md
          </span>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Sparkles size={12} className="text-primary" />
            <select
              aria-label="Preset workouts"
              className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              onChange={(e) => {
                if (e.target.value) handleSelectPreset(e.target.value)
              }}
              defaultValue=""
            >
              <option value="" disabled>
                Preset Workouts (Reps + Distance + Load)
              </option>
              {WORKOUT_PRESETS.map((p) => (
                <option key={p.name} value={p.wod}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Copy share link"
            onClick={onShare}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
          >
            <Share2 size={16} />
          </button>
          <button
            type="button"
            title="Open in journal"
            onClick={onOpenInEditor}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted/50"
          >
            Open in editor →
          </button>
          <button
            ref={runButtonRef}
            type="button"
            title="Start the WallClock"
            onClick={onRun}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Play size={14} fill="currentColor" />
            Run
          </button>
        </div>
      </div>
      <div ref={wodBlockRef} className="flex-1 min-h-0 relative">
        <NoteEditor
          noteId="canvas:home"
          value={doc}
          onChange={onDocChange}
          onBlocksChange={onBlocksChange}
          theme={theme}
          readonly={false}
          showLineNumbers={false}
          enableOverlay={false}
          enableInlineRuntime={false}
          forceFullscreenReview
          className="h-full"
        />
      </div>
    </div>
  )
}
