import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { NoteEditor } from '@/components/Editor/NoteEditor'
import type { WodCommand } from '@/components/Editor/overlays/WodCommand'
import { Play } from 'lucide-react'
import { EDITOR_STEPS, type ParallaxStep } from '../data/parallaxActSteps'

export interface FrozenEditorPanelHandle {
  loadScript: (script: string) => void
}

interface FrozenEditorPanelProps {
  activeStep: number
  selectedExample: number
  actualTheme: string
  onRun: (script: string) => void
  /** When true, enables inline runtime to show records below the wod block */
  showRecords?: boolean
  /**
   * Step data to use for extracting examples. Defaults to EDITOR_STEPS.
   * When provided, `activeStep` and `selectedExample` index into this
   * array to determine which example script to display.
   */
  steps?: ParallaxStep[]
}

export const FrozenEditorPanel = forwardRef<FrozenEditorPanelHandle, FrozenEditorPanelProps>(function FrozenEditorPanel(
  { activeStep, selectedExample, actualTheme, onRun, showRecords, steps },
  ref
) {
  const stepsData = steps ?? EDITOR_STEPS

  const [displayScript, setDisplayScript] = useState(
    stepsData[0]?.examples?.[0]?.wodScript ?? ''
  )
  const [opacity, setOpacity] = useState(1)
  const prevKey = useRef('0-0')
  const scriptRef = useRef(displayScript)

  /** Load an external script (e.g. from command palette or collection) */
  const loadScript = useCallback((script: string) => {
    setDisplayScript(script)
    scriptRef.current = script
    prevKey.current = `ext-${Date.now()}`
    setOpacity(1)
  }, [])

  // Expose loadScript via imperative handle
  useImperativeHandle(ref, () => ({ loadScript }), [loadScript])

  useEffect(() => {
    const step = stepsData[Math.min(activeStep, stepsData.length - 1)]
    const examples = step.examples ?? []
    const exIdx = Math.min(selectedExample, Math.max(0, examples.length - 1))
    const target = examples[exIdx]?.wodScript ?? scriptRef.current
    const key = `${activeStep}-${exIdx}`
    if (key === prevKey.current) return
    prevKey.current = key
    if (target === scriptRef.current) {
      setOpacity(1)
      return
    }
    setOpacity(0)
    const t = setTimeout(() => {
      setDisplayScript(target)
      scriptRef.current = target
      setOpacity(1)
    }, 200)
    return () => clearTimeout(t)
  }, [activeStep, selectedExample, stepsData])

  // Always show Run — the home page editor panel never shows Playground links.
  const commands: WodCommand[] = [{
    id: 'run-to-tracker',
    label: 'Run',
    icon: <Play className="h-3 w-3 fill-current" />,
    primary: true,
    onClick: () => {
      onRun(scriptRef.current)
    },
  }]

  return (
    <div className="w-full h-full overflow-hidden">
      <div
        className="w-full h-full"
        style={{ opacity, transition: 'opacity 200ms ease' }}
      >
        <NoteEditor
          value={displayScript}
          onChange={(v) => { setDisplayScript(v); scriptRef.current = v }}
          theme={actualTheme}
          readonly={false}
          showLineNumbers={false}
          enableOverlay={false}
          enableInlineRuntime={showRecords ?? false}
          commands={commands}
          className="h-full"
        />
      </div>
    </div>
  )
})
