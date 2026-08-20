import React, { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Share2 } from 'lucide-react'
import type { EditorView } from '@codemirror/view'
import { NoteEditor } from '@/components/organisms/editor/NoteEditor'
import type { ScriptBlock } from '@/components/Editor/types'
import { useRingRef } from '../TourRing'
import { TEST_IDS } from '@/testing/contracts/TestIdContract'

export interface TourEditorScreenProps {
  doc: string
  onDocChange: (next: string) => void
  onBlocksChange: (blocks: ScriptBlock[]) => void
  /** Starts the fullscreen playground bound to this editor's first block. */
  onRun: () => void
  /** Copies a /load?z= share link for the current doc (#882). */
  onShare: () => void
  theme: string
  /**
   * Opt in to ring-target registration (#884): the measured fenced-block
   * region under 'editor.wodBlock' and the Run button under
   * 'editor.runButton'.
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
  theme,
  withRingTargets = false,
}) => {
  const wodBlockRef = useRingRef('editor.wodBlock')
  const runButtonRef = useRingRef('editor.runButton')
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [blockBox, setBlockBox] = useState<BlockBox | null>(null)
  const [runBox, setRunBox] = useState<BlockBox | null>(null)
  // Card 2 highlight (#884): measure the styled fence lines
  // (.cm-wod-fence-open … .cm-wod-fence-close, drawn by previewDecorations)
  // and register an invisible proxy over exactly that region. Presets are
  // line-aligned so this box is identical for every adventure pick.
  const measure = useCallback(() => {
    if (!withRingTargets) return
    const view = viewRef.current
    const body = bodyRef.current
    if (!body) return

    let calculatedBlockBox: BlockBox | null = null
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
          calculatedBlockBox = {
            top: topBlock.top,
            left: 0,
            width: view.dom.offsetWidth || body.offsetWidth,
            height: (bottomBlock.top + bottomBlock.height) - topBlock.top,
          }
        }
      } catch {
        // fallback to DOM if line blocks not yet initialized
      }
    }

    if (!calculatedBlockBox) {
      const open = body.querySelector('.cm-wod-fence-open')
      const close = body.querySelector('.cm-wod-fence-close')
      if (open && close) {
        const bodyRect = body.getBoundingClientRect()
        const scale = body.offsetWidth ? bodyRect.width / body.offsetWidth : 1
        const openRect = open.getBoundingClientRect()
        const closeRect = close.getBoundingClientRect()
        calculatedBlockBox = {
          top: (openRect.top - bodyRect.top) / scale,
          left: (Math.min(openRect.left, closeRect.left) - bodyRect.left) / scale,
          width: (Math.max(openRect.right, closeRect.right) - Math.min(openRect.left, closeRect.left)) / scale,
          height: (closeRect.bottom - openRect.top) / scale,
        }
      }
    }
    setBlockBox(calculatedBlockBox)

    // Measure the Run pill rendered on the workout block by InlineCommandBar
    const runPill = body.querySelector(`[data-testid="${TEST_IDS.EDITOR_START_WORKOUT}"]`) ?? body.querySelector('button[title="Run"]')
    if (runPill) {
      const bodyRect = body.getBoundingClientRect()
      const pillRect = runPill.getBoundingClientRect()
      const scale = body.offsetWidth ? bodyRect.width / body.offsetWidth : 1
      setRunBox({
        top: (pillRect.top - bodyRect.top) / scale,
        left: (pillRect.left - bodyRect.left) / scale,
        width: pillRect.width / scale,
        height: pillRect.height / scale,
      })
    } else {
      setRunBox(null)
    }
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
  const handleStartWorkout = useCallback(() => {
    onRun()
  }, [onRun])

  return (
    <div className="relative flex h-full flex-col bg-background text-left">
      <div ref={bodyRef} className="relative flex-1 min-h-0">
        <NoteEditor
          noteId="canvas:home"
          value={doc}
          onChange={onDocChange}
          onBlocksChange={onBlocksChange}
          onStartWorkout={handleStartWorkout}
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
        {withRingTargets && runBox && (
          <div
            ref={runButtonRef}
            data-testid="tour-run-button-region"
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              top: runBox.top,
              left: runBox.left,
              width: runBox.width,
              height: runBox.height,
            }}
          />
        )}
        <div className="absolute bottom-2.5 right-3 z-20">
          <button
            type="button"
            title="Copy share link"
            onClick={onShare}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Share2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
