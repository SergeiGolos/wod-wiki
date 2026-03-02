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
  startLineNumber?: number;
  gutterWidth?: number;
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

export const MarkdownDisplay: React.FC<MarkdownDisplayProps> = ({ 
  section, 
  className,
  startLineNumber,
  gutterWidth = 0
}) => {
  const lines = section.displayContent.split('\n');

  return (
    <div className={cn('select-none', className)}>
      {lines.map((line, i) => {
        const level = headingLevel(line);
        const currentLineNum = startLineNumber !== undefined ? startLineNumber + i : null;
        
        const gutterCell = currentLineNum !== null && (
          <div 
            className="flex-shrink-0 text-right pr-3 text-muted-foreground/30 font-mono text-xs select-none pointer-events-none"
            style={{ width: `${gutterWidth + 2}ch`, minWidth: `${gutterWidth + 2}ch`, lineHeight: `${SECTION_LINE_HEIGHT}px` }}
          >
            {currentLineNum}
          </div>
        );

        if (level) {
          const text = line.replace(/^#{1,6}\s+/, '');
          const style = HEADING_STYLES[level] ?? HEADING_STYLES[1];
          return (
            <div key={i} className="flex group/line">
              {gutterCell}
              <div
                className={cn('text-foreground flex-1 min-w-0', style)}
                style={{ lineHeight: `${SECTION_LINE_HEIGHT}px`, minHeight: SECTION_LINE_HEIGHT }}
              >
                {text}
              </div>
            </div>
          );
        }

        return (
          <div key={i} className="flex group/line">
            {gutterCell}
            <div
              className={cn(
                'text-sm text-foreground/80 font-mono flex-1 min-w-0',
                line.trim() === '' && 'h-0',
              )}
              style={{
                lineHeight: `${SECTION_LINE_HEIGHT}px`,
                minHeight: SECTION_LINE_HEIGHT,
              }}
            >
              {line || '\u00A0'}
            </div>
          </div>
        );
      })}
    </div>
  );
};
