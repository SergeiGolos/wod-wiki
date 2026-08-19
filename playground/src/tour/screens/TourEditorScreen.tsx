import React, { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Play, RotateCcw, Share2 } from 'lucide-react'
import type { EditorView } from '@codemirror/view'
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
  /**
   * Opt in to ring-target registration (#884): the whole window under
   * 'editor.window', the measured fenced-block region under
   * 'editor.wodBlock', and the Run button under 'editor.runButton'. Only
   * the runway window registers — the hero renders the same screen and
   * must not hijack the ring.
   */
  withRingTargets?: boolean
}

interface BlockBox {
  top: number
  left: number
  width: number
  height: number
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
  withRingTargets = false,
}) => {
  const windowRef = useRingRef('editor.window')
  const wodBlockRef = useRingRef('editor.wodBlock')
  const runButtonRef = useRingRef('editor.runButton')
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [blockBox, setBlockBox] = useState<BlockBox | null>(null)
  // Card 2 highlight (#884): measure the styled fence lines
  // (.cm-wod-fence-open … .cm-wod-fence-close, drawn by previewDecorations)
  // and register an invisible proxy over exactly that region. Presets are
  // line-aligned so this box is identical for every adventure pick.
  const measure = useCallback(() => {
    if (!withRingTargets) return
    const view = viewRef.current
    const body = bodyRef.current
    if (!body) return

    if (view) {
      try {
        const doc = view.state.doc
        let openPos = -1
        let closePos = -1
        for (let i = 1; i <= doc.lines; i++) {
          const text = doc.line(i).text
          if (text.startsWith('```time') || text.startsWith('```wod') || text.startsWith('```log')) {
            openPos = doc.line(i).from
          } else if (openPos !== -1 && text.startsWith('```')) {
            closePos = doc.line(i).from
            break
          }
        }
        if (openPos !== -1 && closePos !== -1) {
          const topBlock = view.lineBlockAt(openPos)
          const bottomBlock = view.lineBlockAt(closePos)
          setBlockBox({
            top: topBlock.top,
            left: 0,
            width: view.dom.offsetWidth || body.offsetWidth,
            height: (bottomBlock.top + bottomBlock.height) - topBlock.top,
          })
          return
        }
      } catch {
        // fallback to DOM if line blocks not yet initialized
      }
    }

    const open = body.querySelector('.cm-wod-fence-open')
    const close = body.querySelector('.cm-wod-fence-close')
    if (!open || !close) {
      setBlockBox(null)
      return
    }
    const bodyRect = body.getBoundingClientRect()
    const scale = body.offsetWidth ? bodyRect.width / body.offsetWidth : 1
    const openRect = open.getBoundingClientRect()
    const closeRect = close.getBoundingClientRect()
    setBlockBox({
      top: (openRect.top - bodyRect.top) / scale,
      left: (Math.min(openRect.left, closeRect.left) - bodyRect.left) / scale,
      width: (Math.max(openRect.right, closeRect.right) - Math.min(openRect.left, closeRect.left)) / scale,
      height: (closeRect.bottom - openRect.top) / scale,
    })
  }, [withRingTargets])

  useLayoutEffect(() => {
    if (!withRingTargets) return
    const body = bodyRef.current
    if (!body) return

    measure()
    // Re-measure after CM decorates/fonts settle and on container resizes.
    const t1 = window.setTimeout(measure, 120)
    const t2 = window.setTimeout(measure, 480)
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure)
      ro.observe(body)
    }
    window.addEventListener('resize', measure)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [doc, withRingTargets, measure])
  return (
    <div
      ref={withRingTargets ? windowRef : undefined}
      className="flex h-full flex-col bg-background text-left"
    >
      <div
        className="flex items-center justify-between border-b border-border px-3 py-2"
        data-testid="tour-editor-header"
      >
        <div className="flex items-center gap-2">
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
            ref={withRingTargets ? runButtonRef : undefined}
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
      <div ref={bodyRef} className="flex-1 min-h-0 relative">
        <NoteEditor
          noteId="canvas:home"
          value={doc}
          onChange={onDocChange}
          onBlocksChange={onBlocksChange}
          onViewCreated={(view) => {
            viewRef.current = view
            if (withRingTargets) measure()
          }}
          theme={theme}
          readonly={false}
          showLineNumbers={false}
          enableOverlay={false}
          enableInlineRuntime={false}
          className="h-full"
        />
        {withRingTargets && blockBox && (
          <div
            ref={wodBlockRef}
            data-testid="tour-wod-block-region"
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              top: blockBox.top,
              left: blockBox.left,
              width: blockBox.width,
              height: blockBox.height,
            }}
          />
        )}
      </div>
    </div>
  )
}
