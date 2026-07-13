import React from 'react'
import { cn } from '@/lib/utils'

interface SplitCanvasTemplateProps {
  stickyAlign: 'left' | 'right'
  hasViewDef: boolean
  editorWidth?: string
  heroSlot?: React.ReactNode
  mobilePanel?: React.ReactNode
  desktopPanel?: React.ReactNode
  children: React.ReactNode
}

export const SplitCanvasTemplate: React.FC<SplitCanvasTemplateProps> = ({
  stickyAlign,
  hasViewDef,
  editorWidth = '60%',
  heroSlot,
  mobilePanel,
  desktopPanel,
  children,
}) => {
  // Calculate dynamic width for prose on desktop viewports where flex is active
  const [proseWidthStyle, setProseWidthStyle] = React.useState<React.CSSProperties | undefined>(undefined)

  React.useEffect(() => {
    const updateWidth = () => {
      if (hasViewDef && window.innerWidth >= 1024) {
        setProseWidthStyle({ width: `calc(100% - ${editorWidth})` })
      } else {
        setProseWidthStyle(undefined)
      }
    }
    
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [hasViewDef, editorWidth])

  return (
    <section className="relative border-b border-border/50">
      {heroSlot}
      <div className="lg:flex">
        {stickyAlign === 'left' && desktopPanel}
        <div
          className="w-full"
          style={proseWidthStyle}
        >
          {mobilePanel}
          {children}
        </div>
        {stickyAlign === 'right' && desktopPanel}
      </div>
    </section>
  )
}
