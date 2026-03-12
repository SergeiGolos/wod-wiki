/**
 * ParagraphDisplay
 * 
 * Read-only renderer for paragraph sections.
 * Renders each line individually to maintain exact line-height
 * alignment with the gutter.
 */

import React from 'react';
import type { Section } from '../../types/section';
import { SECTION_LINE_HEIGHT } from '../SectionContainer';
import { cn } from '@/lib/utils';

export interface ParagraphDisplayProps {
  section: Section;
  className?: string;
}

export const ParagraphDisplay: React.FC<ParagraphDisplayProps> = ({ section, className }) => {
  const lines = section.displayContent.split('\n');

  return (
    <div className={cn('select-none', className)}>
      {lines.map((line, i) => (
        <div
          key={i}
          className={cn(
            'text-sm text-foreground/80 font-mono',
            line.trim() === '' && 'h-0',
          )}
          style={{
            lineHeight: `${SECTION_LINE_HEIGHT}px`,
            minHeight: line.trim() === '' ? SECTION_LINE_HEIGHT : undefined,
            height: SECTION_LINE_HEIGHT,
          }}
        >
          {line || '\u00A0'}
        </div>
      ))}
    </div>
  );
};
