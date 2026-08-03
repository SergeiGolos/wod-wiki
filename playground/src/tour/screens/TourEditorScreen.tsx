import React from 'react'
import { Play, RotateCcw, Share2 } from 'lucide-react'
import { NoteEditor } from '@/components/organisms/editor/NoteEditor'
import type { ScriptBlock } from '@/components/Editor/types'
import { useRingRef } from '../TourRing'
export interface TourEditorScreenProps {
  doc: string
  onDocChange: (next: string) => void
  onBlocksChange: (blocks: ScriptBlock[]) => void
  onRun: () => void
  onShare: () => void
  onOpenInEditor: () => void
  theme: string
  /**
   * Set when the demo is a shared script (#882): the header reads
   * `shared by: {sharedBy}` instead of the welcome-1.md path, and a Reset
   * button clears the stored script back to the default.
   */
  sharedBy?: string
  onResetShared?: () => void
}

export const TourEditorScreen: React.FC<TourEditorScreenProps> = ({
  doc,
  onDocChange,
  onBlocksChange,
  onRun,
  onShare,
  onOpenInEditor,
  theme,
  sharedBy,
  onResetShared,
}) => {
  const fenceRef = useRingRef('editor.fence')
  const wodBlockRef = useRingRef('editor.wodBlock')
  const runButtonRef = useRingRef('editor.runButton')
  return (
    <div className="flex h-full flex-col bg-background text-left">
      <div
        className="flex items-center justify-between border-b border-border px-3 py-2"
        data-testid="tour-editor-header"
      >
        <div ref={fenceRef} className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {sharedBy ? `shared by: ${sharedBy}` : 'Home / Notes / welcome-1.md'}
          </span>
          {sharedBy && onResetShared && (
            <button
              type="button"
              title="Reset to welcome-1.md"
              onClick={onResetShared}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <RotateCcw size={11} />
              Reset
            </button>
          )}
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
