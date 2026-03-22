import { useRef } from 'react'
import { ParallaxSection } from '../components/ParallaxSection'
import { FrozenEditorPanel, type FrozenEditorPanelHandle } from '../components/FrozenEditorPanel'
import { RECORDS_STEPS } from '../data/parallaxActSteps'

export interface Act5RecordsSectionProps {
  actualTheme: string
}

export function Act5RecordsSection({ actualTheme }: Act5RecordsSectionProps) {
  const editorRef = useRef<FrozenEditorPanelHandle>(null)

  return (
    <ParallaxSection
      id="records"
      steps={RECORDS_STEPS}
      stickyAlign="right"
      chromeTitle="Plan"
      stickyContent={(activeStep, selectedExample) => (
        <FrozenEditorPanel
          ref={editorRef}
          activeStep={activeStep}
          selectedExample={selectedExample}
          actualTheme={actualTheme}
          onRun={() => {}}
          showRecords
          steps={RECORDS_STEPS}
        />
      )}
      className="bg-background"
    />
  )
}
