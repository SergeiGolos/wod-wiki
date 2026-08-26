import type { ReactNode } from 'react'
/**
 * CanvasPanelContent — stateless renderer for the canvas sticky panel.
 *
 * Renders the markdown note editor for editing the current canvas section.
 * Owns no state; everything it shows is decided by its props.
 */
import type { EditorView } from '@codemirror/view'
import type { ScriptCommand } from '@/components/Editor/overlays/ScriptCommand'
import { EditorWindow } from '../components/organisms/editor/EditorWindow'

export interface CanvasPanelContentProps {
  editorSource: string
  editorOpacity: number
  activeOriginalSource: string
  handleEditorChange: (value: string) => void
  resetActiveSource: () => void
  canvasNoteId: string
  theme: string
  commands: ScriptCommand[]
  activeSectionId: string | null
  onBlocksChange: (blocks: ScriptBlock[]) => void
  onViewCreated: (view: EditorView | null) => void
  panelTitle: string
  panelSubtitle?: string
  panelThemeClass?: string
  headerActions?: ReactNode
  onRun?: (doc: string, block: ScriptBlock | null) => void
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
  panelTitle,
  panelSubtitle,
  panelThemeClass,
  headerActions,
  onRun,
}: CanvasPanelContentProps) {
  const isEditorDirty = editorSource !== activeOriginalSource
  const subheader = (
    <div style={{ opacity: editorOpacity, transition: 'opacity 180ms ease' }} className="flex items-center justify-between gap-3 border-b border-border/40 bg-primary/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
      <span>Try editing this example ↓</span>
      {isEditorDirty ? (
        <button
          type="button"
          onClick={resetActiveSource}
          className="rounded-full border border-primary/30 px-3 py-1 text-[10px] font-black text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          Reset to example
        </button>
      ) : null}
    </div>
  )

  return (
    <div className="h-full" style={{ opacity: editorOpacity, transition: 'opacity 180ms ease' }}>
      <EditorWindow
        title={panelTitle}
        subtitle={panelSubtitle}
        doc={editorSource}
        onDocChange={handleEditorChange}
        noteId={canvasNoteId}
        onBlocksChange={onBlocksChange}
        onViewCreated={onViewCreated}
        theme={theme}
        readonly={false}
        showLineNumbers={false}
        enableOverlay={false}
        enableInlineRuntime={false}
        commands={commands}
        hideDefaultCommands={false}
        headerActions={headerActions}
        className={panelThemeClass}
        subheader={subheader}
        run={onRun ? { onRun } : undefined}
      />
    </div>
  )
}
