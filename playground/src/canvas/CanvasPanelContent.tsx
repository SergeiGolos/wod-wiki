/**
 * CanvasPanelContent — stateless renderer for the canvas sticky panel.
 *
 * Picks the panel body (running timer / review grid / editor) based on
 * `panelMode`. Owns no state; everything it shows is decided by its props.
 * The page (or whichever container lays this out) supplies the runtime slice
 * and the editor slice from its focused hooks.
 */
import React from 'react'
import { ArrowLeft } from 'lucide-react'
import type { EditorView } from '@codemirror/view'
import type { ScriptCommand } from '@/components/Editor/overlays/ScriptCommand'
import { NoteEditor } from '@/components/organisms/editor/NoteEditor'
import { RuntimeTimerPanel } from '@/components/organisms/editor/RuntimeTimerPanel'
import { ReviewGrid } from '@/components/organisms/review/ReviewGrid'
import type { Segment } from '@/core/models/AnalyticsModels'
import type { ScriptBlock, WorkoutResults } from '@/components/Editor/types'
import type { WorkoutResult } from '@/types/storage'

type PanelMode = 'editor' | 'running' | 'review'

export interface CanvasPanelContentProps {
  // Runtime slice
  panelMode: PanelMode
  viewTimerBlock: ScriptBlock | null
  reviewSegments: Segment[]
  selectedSegmentIds: Set<number>
  setSelectedSegmentIds: React.Dispatch<React.SetStateAction<Set<number>>>
  setPanelMode: (mode: PanelMode) => void
  closeViewRuntime: () => void
  handleViewComplete: (blockId: string, results: WorkoutResults) => void

  // Editor slice
  editorSource: string
  editorOpacity: number
  activeOriginalSource: string
  handleEditorChange: (value: string) => void
  resetActiveSource: () => void

  // Editor installation callbacks
  canvasNoteId: string
  theme: string
  commands: ScriptCommand[]
  activeSectionId: string | null
  onBlocksChange: (blocks: ScriptBlock[]) => void
  onViewCreated: (view: EditorView | null) => void

  // Editor persistence
  persistedResults: WorkoutResult[]

  // Debug
  isDebugMode: boolean
}

export function CanvasPanelContent({
  panelMode,
  viewTimerBlock,
  reviewSegments,
  selectedSegmentIds,
  setSelectedSegmentIds,
  setPanelMode,
  closeViewRuntime,
  handleViewComplete,
  editorSource,
  editorOpacity,
  activeOriginalSource,
  handleEditorChange,
  resetActiveSource,
  canvasNoteId,
  theme,
  commands,
  activeSectionId,
  onBlocksChange,
  onViewCreated,
  persistedResults,
  isDebugMode,
}: CanvasPanelContentProps) {
  if (panelMode === 'running' && viewTimerBlock) {
    return (
      <RuntimeTimerPanel
        block={viewTimerBlock}
        autoStart
        onClose={closeViewRuntime}
        onComplete={handleViewComplete}
        isExpanded
      />
    )
  }

  if (panelMode === 'review') {
    return (
      <div className="flex flex-col h-full">
        <button
          onClick={() => setPanelMode('editor')}
          className="flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors shrink-0 border-b border-border/40"
        >
          <ArrowLeft className="size-3" />
          Back to editor
        </button>
        <div className="flex-1 min-h-0 overflow-auto">
          <ReviewGrid
            runtime={null}
            segments={reviewSegments}
            selectedSegmentIds={selectedSegmentIds}
            gridViewPreset={isDebugMode ? 'debug' : 'default'}
            onSelectSegment={(id, modifiers, visibleIds) => {
              setSelectedSegmentIds((prev) => {
                const next = new Set(prev)
                if (modifiers?.ctrlKey) {
                  if (next.has(id)) next.delete(id); else next.add(id)
                } else if (modifiers?.shiftKey && visibleIds) {
                  const lastId = Array.from(prev).pop()
                  if (lastId !== undefined) {
                    const startIdx = visibleIds.indexOf(lastId)
                    const endIdx = visibleIds.indexOf(id)
                    if (startIdx !== -1 && endIdx !== -1) {
                      const min = Math.min(startIdx, endIdx)
                      const max = Math.max(startIdx, endIdx)
                      for (let i = min; i <= max; i++) next.add(visibleIds[i])
                    } else { next.add(id) }
                  } else { next.add(id) }
                } else { next.clear(); next.add(id) }
                return next
              })
            }}
            groups={[]}
          />
        </div>
      </div>
    )
  }

  const isEditorDirty = editorSource !== activeOriginalSource
  return (
    <div style={{ opacity: editorOpacity, transition: 'opacity 180ms ease', height: '100%' }} className="flex flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-primary/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        <span>Try editing this example ↓</span>
        {isEditorDirty ? (
          <button
            type="button"
            onClick={resetActiveSource}
            className="rounded-full border border-primary/30 px-3 py-1 text-[10px] font-black text-primary transition-colors hover:bg-primary/10"
          >
            Reset to example
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">
        <NoteEditor
          noteId={canvasNoteId}
          value={editorSource}
          onChange={handleEditorChange}
          onBlocksChange={onBlocksChange}
          onViewCreated={onViewCreated}
          activeSectionId={activeSectionId}
          theme={theme}
          readonly={false}
          showLineNumbers={false}
          enableOverlay={false}
          enableInlineRuntime={false}
          extendedResults={persistedResults}
          commands={commands}
          hideDefaultCommands={false}
          className="h-full"
        />
      </div>
    </div>
  )
}
