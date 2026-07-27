import React from 'react'

interface SplitCanvasTemplateProps {
  heroSlot?: React.ReactNode
  children: React.ReactNode
}

/**
 * Layout shell for a canvas page. Renders the hero slot, then the children
 * full-width. The desktop/mobile editor panels and the split-layout decision
 * are owned by `CanvasProsePanel` (which receives them as props from the
 * page-level `MarkdownCanvasPage`). This keeps the section-splitting logic
 * co-located with the section list.
 */
export const SplitCanvasTemplate: React.FC<SplitCanvasTemplateProps> = ({
  heroSlot,
  children,
}) => {
  return (
    <section className="relative border-b border-border/50">
      {heroSlot}
      {children}
    </section>
  )
}