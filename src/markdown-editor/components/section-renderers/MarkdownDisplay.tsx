/**
 * MarkdownDisplay
 * 
 * Read-only renderer for markdown sections.
 * Renders each line with basic markdown-aware styling:
 * headings, bold, italic, lists, and plain text.
 */

import React from 'react';
import type { Section } from '../../types/section';
import { SECTION_LINE_HEIGHT } from '../SectionContainer';
import { cn } from '@/lib/utils';

export interface MarkdownDisplayProps {
  section: Section;
  className?: string;
}

/** Apply heading styles based on # prefix */
function headingLevel(line: string): number | null {
  const match = line.match(/^(#{1,6})\s+/);
  return match ? match[1].length : null;
}

const HEADING_STYLES: Record<number, string> = {
  1: 'text-2xl font-bold',
  2: 'text-xl font-semibold',
  3: 'text-lg font-semibold',
  4: 'text-base font-medium',
  5: 'text-sm font-medium',
  6: 'text-xs font-medium uppercase tracking-wider',
};

export const MarkdownDisplay: React.FC<MarkdownDisplayProps> = ({ section, className }) => {
  const lines = section.displayContent.split('\n');

  return (
    <div className={cn('select-none', className)}>
      {lines.map((line, i) => {
        const level = headingLevel(line);

        if (level) {
          const text = line.replace(/^#{1,6}\s+/, '');
          const style = HEADING_STYLES[level] ?? HEADING_STYLES[1];
          return (
            <div
              key={i}
              className={cn('text-foreground', style)}
              style={{ lineHeight: `${SECTION_LINE_HEIGHT}px`, minHeight: SECTION_LINE_HEIGHT }}
            >
              {text}
            </div>
          );
        }

        return (
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
        );
      })}
    </div>
  );
};
