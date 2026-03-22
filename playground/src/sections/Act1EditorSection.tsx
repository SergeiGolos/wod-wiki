import { useRef } from 'react'
import { Search } from 'lucide-react'
import { ParallaxSection } from '../components/ParallaxSection'
import { FrozenEditorPanel, type FrozenEditorPanelHandle } from '../components/FrozenEditorPanel'
import { EDITOR_STEPS } from '../data/parallaxActSteps'

export interface Act1EditorSectionProps {
  actualTheme: string
  onRun: (script: string) => void
  onSearch: () => void
  /** Ref exposed so parent can push scripts into the editor */
  editorRef?: React.RefObject<FrozenEditorPanelHandle | null>
}

export function Act1EditorSection({ actualTheme, onRun, onSearch, editorRef }: Act1EditorSectionProps) {
  const internalRef = useRef<FrozenEditorPanelHandle>(null)
  const ref = editorRef ?? internalRef

  return (
    <ParallaxSection
      id="editor"
      steps={EDITOR_STEPS}
      stickyAlign="right"
      chromeTitle="Plan"
      stickyContent={(activeStep, selectedExample) => (
        <FrozenEditorPanel
          ref={ref}
          activeStep={activeStep}
          selectedExample={selectedExample}
          actualTheme={actualTheme}
          onRun={onRun}
        />
      )}
      renderStepExtra={(stepIdx, _activeStep) => {
        if (stepIdx !== EDITOR_STEPS.length - 1) return null
        return (
          <div className="flex flex-col gap-3 mt-2">
            <button
              onClick={onSearch}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-muted/60 text-foreground text-xs font-black uppercase tracking-wider border border-border/60 shadow-sm hover:bg-muted hover:scale-[1.03] transition-all w-fit"
            >
              <Search className="size-3.5" />
              Browse Workouts
            </button>
          </div>
        )
      }}
      className="bg-background"
    />
  )
}
