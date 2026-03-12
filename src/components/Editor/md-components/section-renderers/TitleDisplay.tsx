/**
 * TitleDisplay
 * 
 * Read-only renderer for the title section (first section of a note).
 * Displays the title at prominent visual weight.
 */

import React from 'react';
import type { Section } from '../../types/section';
import { SECTION_LINE_HEIGHT } from '../SectionContainer';
import { cn } from '@/lib/utils';

export interface TitleDisplayProps {
  section: Section;
  className?: string;
}

export const TitleDisplay: React.FC<TitleDisplayProps> = ({ section, className }) => {
  return (
    <div
      className={cn(
        'text-foreground select-none text-2xl font-bold',
        className,
      )}
      style={{
        lineHeight: `${SECTION_LINE_HEIGHT}px`,
        minHeight: SECTION_LINE_HEIGHT,
      }}
    >
      {section.displayContent || '\u00A0'}
    </div>
  );
};
