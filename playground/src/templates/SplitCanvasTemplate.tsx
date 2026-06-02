import React from 'react'
import { cn } from '@/lib/utils'

interface SplitCanvasTemplateProps {
  stickyAlign: 'left' | 'right'
  hasViewDef: boolean
  heroSlot?: React.ReactNode
  mobilePanel?: React.ReactNode
  desktopPanel?: React.ReactNode
  children: React.ReactNode
}

export const SplitCanvasTemplate: React.FC<SplitCanvasTemplateProps> = ({
  stickyAlign,
  hasViewDef,
  heroSlot,
  mobilePanel,
  desktopPanel,
  children,
}) => {
  return (
    <section className="relative border-b border-border/50">
      <div className="lg:flex">
        {stickyAlign === 'left' && desktopPanel}
        <div className={cn('w-full', hasViewDef && 'lg:w-[40%]')}>
          {mobilePanel}
          {heroSlot}
          {children}
        </div>
        {stickyAlign === 'right' && desktopPanel}
      </div>
    </section>
  )
}
