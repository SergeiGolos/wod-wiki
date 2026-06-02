import React from 'react'
import { cn } from '@/lib/utils'
import { MacOSChrome } from '../../atoms/MacOSChrome'
import { ViewPanelButtons } from '../../molecules/ViewPanelButtons'
import type { RunButtonState } from '../../molecules/SectionButtons'
import type { NavActionDeps } from '../../../nav/navTypes'
import { buttonToActivation } from '../../../nav/navTypes'
import type { PipelineStep, OpenMode } from '../../../canvas/parseCanvasMarkdown'
import { STICKY_NAV_HEIGHT, MOBILE_STICKY_TOP } from '../../../canvas/canvasUtils'

interface CanvasEditorPanelProps {
  variant: 'desktop' | 'mobile'
  panelTitle: string
  panelContent: React.ReactNode
  panelThemeClass?: string
  headerActions?: React.ReactNode
  showPanelButtons?: boolean
  viewDefButtons?: Array<{ label: string; pipeline: PipelineStep[]; open?: OpenMode }>
  runState?: RunButtonState
  deps: NavActionDeps
}

export const CanvasEditorPanel: React.FC<CanvasEditorPanelProps> = ({
  variant,
  panelTitle,
  panelContent,
  panelThemeClass,
  headerActions,
  showPanelButtons = false,
  viewDefButtons,
  runState,
  deps,
}) => {
  const chrome = (
    <MacOSChrome
      title={panelTitle}
      headerActions={headerActions}
      className={cn('transition-colors duration-300', panelThemeClass)}
    >
      {panelContent}
    </MacOSChrome>
  )

  const buttons = showPanelButtons && viewDefButtons && viewDefButtons.length > 0 ? (
    <ViewPanelButtons
      activations={viewDefButtons.map((b, i) => buttonToActivation(b, i))}
      runState={runState}
      deps={deps}
    />
  ) : null

  if (variant === 'desktop') {
    return (
      <div
        className="w-[60%] self-start sticky hidden lg:flex flex-col p-6 pt-8 pb-8 gap-3"
        style={{ top: `${STICKY_NAV_HEIGHT}px`, height: `calc(100vh - ${STICKY_NAV_HEIGHT}px)` }}
      >
        <div className="flex-1 min-h-0">{chrome}</div>
        {buttons}
      </div>
    )
  }

  return (
    <div
      className="lg:hidden sticky z-20 shrink-0 px-4 pt-[2px] pb-1"
      style={{ top: `${MOBILE_STICKY_TOP}px`, height: `calc(50vh - ${MOBILE_STICKY_TOP / 2}px)` }}
    >
      <div className="flex flex-col gap-2" style={{ height: '100%' }}>
        <div className="flex-1 min-h-0">{chrome}</div>
        {buttons}
      </div>
    </div>
  )
}
