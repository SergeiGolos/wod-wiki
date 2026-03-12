/**
 * HeadingDisplay
 * 
 * Read-only renderer for heading sections.
 * Displays the heading text at appropriate visual weight
 * without the raw # prefix characters.
 * 
 * Height is constrained to lineCount * lineHeight for
 * exact alignment with the line number gutter.
 */

import React from 'react';
import type { Section } from '../../types/section';
import { SECTION_LINE_HEIGHT } from '../SectionContainer';
import { cn } from '@/lib/utils';

export interface HeadingDisplayProps {
  section: Section;
  className?: string;
}

/** Tailwind classes per heading level */
const HEADING_STYLES: Record<number, string> = {
  1: 'text-2xl font-bold',
  2: 'text-xl font-semibold',
  3: 'text-lg font-semibold',
  4: 'text-base font-medium',
  5: 'text-sm font-medium',
  6: 'text-xs font-medium uppercase tracking-wider',
};

export const HeadingDisplay: React.FC<HeadingDisplayProps> = ({ section, className }) => {
  const level = section.level ?? 1;
  const styleClass = HEADING_STYLES[level] ?? HEADING_STYLES[1];

  return (
    <div
      className={cn(
        'text-foreground select-none',
        styleClass,
        className,
      )}
      style={{
        lineHeight: `${SECTION_LINE_HEIGHT}px`,
        minHeight: SECTION_LINE_HEIGHT,
      }}
    >
      {section.displayContent}
    </div>
  );
};
