/**
 * CanvasPanelContent — stateless renderer for the canvas sticky panel.
 *
 * Renders the markdown note editor for editing the current canvas section.
 * Owns no state; everything it shows is decided by its props.
 */
import type { Extension } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import type { ScriptCommand } from '@/components/Editor/overlays/ScriptCommand'
import { NoteEditor } from '@/components/organisms/editor/NoteEditor'
import type { ScriptBlock } from '@/components/Editor/types'
import type { WorkoutResult } from '@/types/storage'

export interface CanvasPanelContentProps {
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
  extensions?: Extension[]

  // Editor persistence
  persistedResults: WorkoutResult[]

}

export function CanvasPanelContent({
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
  extensions,
  persistedResults,
}: CanvasPanelContentProps) {
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
          forceFullscreenReview
          extendedResults={persistedResults}
          commands={commands}
          hideDefaultCommands={false}
          className="h-full"
          extensions={extensions}
        />
      </div>
    </div>
  )
}
