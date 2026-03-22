import { useRef } from 'react'
import { Search } from 'lucide-react'
import { ParallaxSection } from '../components/ParallaxSection'
import { FrozenEditorPanel, type FrozenEditorPanelHandle } from '../components/FrozenEditorPanel'
import { BROWSE_STEPS } from '../data/parallaxActSteps'

export interface ActBrowseSectionProps {
  actualTheme: string
  onRun: (script: string) => void
  onSearch: () => void
  browseRef?: React.RefObject<FrozenEditorPanelHandle | null>
}

export function ActBrowseSection({ actualTheme, onRun, onSearch, browseRef }: ActBrowseSectionProps) {
  const internalRef = useRef<FrozenEditorPanelHandle>(null)
  const ref = browseRef ?? internalRef

  return (
    <ParallaxSection
      id="browse"
      steps={BROWSE_STEPS}
      stickyAlign="right"
      chromeTitle="Browse"
      stickyContent={(activeStep, selectedExample) => (
        <FrozenEditorPanel
          ref={ref}
          activeStep={activeStep}
          selectedExample={selectedExample}
          actualTheme={actualTheme}
          onRun={onRun}
        />
      )}
      renderStepExtra={(_stepIdx, _activeStep) => (
        <div className="flex flex-col gap-3 mt-2">
          <button
            onClick={onSearch}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-muted/60 text-foreground text-xs font-black uppercase tracking-wider border border-border/60 shadow-sm hover:bg-muted hover:scale-[1.03] transition-all w-fit"
          >
            <Search className="size-3.5" />
            Browse Workouts
          </button>
        </div>
      )}
      className="bg-muted/[0.03]"
    />
  )
}
