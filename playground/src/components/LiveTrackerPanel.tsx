import { useCallback } from 'react'
import { NoteEditor } from '@/components/Editor/NoteEditor'
import { RuntimeTimerPanel } from '@/components/Editor/overlays/RuntimeTimerPanel'
import type { WodBlock } from '@/components/Editor/types'
import type { IScriptRuntime } from '@/runtime/contracts/IScriptRuntime'
import { Search } from 'lucide-react'

interface LiveTrackerPanelProps {
  block: WodBlock | null
  onSearch: () => void
  preview: string | null
  actualTheme: string
  onRuntimeReady?: (runtime: IScriptRuntime) => void
  /** Called when the workout completes (all blocks done) or the user hits Stop */
  onComplete?: () => void
}

export function LiveTrackerPanel({ block, onSearch, preview, actualTheme, onRuntimeReady, onComplete }: LiveTrackerPanelProps) {
  const handleClose = useCallback(() => { onComplete?.() }, [onComplete])

  // Preview mode: show loaded workout
  if (!block && preview) {
    return (
      <div className="flex flex-col w-full h-full overflow-hidden">
        <div className="flex-1 min-h-0">
          <NoteEditor
            value={preview}
            onChange={() => {}}
            theme={actualTheme}
            readonly={true}
            showLineNumbers={false}
            enableOverlay={false}
            enableInlineRuntime={false}
            commands={[]}
            className="h-full"
          />
        </div>
      </div>
    )
  }

  if (!block) {
    return (
      <button
        onClick={onSearch}
        className="w-full h-full flex flex-col items-center justify-center gap-4 bg-background text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors"
      >
        <Search className="size-10 text-muted-foreground/30" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground/50">Browse Collections</p>
      </button>
    )
  }

  return (
    <div className="w-full h-full overflow-hidden">
      <RuntimeTimerPanel
        key={block.id}
        block={block}
        onClose={handleClose}
        autoStart={true}
        onRuntimeReady={onRuntimeReady}
        onComplete={onComplete ? () => onComplete() : undefined}
      />
    </div>
  )
}
