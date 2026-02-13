/**
 * SectionContainer
 * 
 * Wrapper component that provides a line number gutter and click target
 * for each section. Renders children (display or edit view) alongside
 * a consistent left-margin line number column.
 */

import React, { useRef, useCallback } from 'react';
import type { Section } from '../types/section';
import { cn } from '@/lib/utils';

/** Shared line height constant — must match across all renderers */
export const SECTION_LINE_HEIGHT = 22;

export interface SectionContainerProps {
  /** The section data */
  section: Section;
  /** 1-indexed start line number for display */
  startLineNumber: number;
  /** Width of gutter in characters (computed from total doc line count) */
  gutterWidth: number;
  /** Whether this section is the active (editing) section */
  isActive: boolean;
  /** Click handler — reports section ID and approximate click position */
  onClick?: (sectionId: string, clickPosition: { line: number; column: number }) => void;
  /** Content to render (display or edit view) */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export const SectionContainer: React.FC<SectionContainerProps> = ({
  section,
  startLineNumber,
  gutterWidth,
  isActive,
  onClick,
  children,
  className,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!onClick || !contentRef.current) return;

    const rect = contentRef.current.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const lineWithinSection = Math.floor(relativeY / SECTION_LINE_HEIGHT);
    const clampedLine = Math.max(0, Math.min(lineWithinSection, section.lineCount - 1));

    onClick(section.id, {
      line: clampedLine,
      column: 0,
    });
  }, [onClick, section.id, section.lineCount]);

  // Generate line numbers for the gutter
  const lineNumbers: number[] = [];
  for (let i = 0; i < section.lineCount; i++) {
    lineNumbers.push(startLineNumber + i);
  }

  // Gutter width in ch units + padding
  const gutterStyle: React.CSSProperties = {
    width: `${gutterWidth + 2}ch`,
    minWidth: `${gutterWidth + 2}ch`,
  };

  return (
    <div
      id={`section-${section.id}`}
      className={cn(
        'flex group',
        isActive && 'bg-accent/5',
        className,
      )}
    >
      {/* Line number gutter */}
      <div
        className={cn(
          'flex-shrink-0 select-none text-right pr-3 pt-0',
          'text-muted-foreground/50 font-mono text-xs',
          isActive && 'text-muted-foreground/70',
        )}
        style={gutterStyle}
        aria-hidden="true"
      >
        {lineNumbers.map((num) => (
          <div
            key={num}
            className="leading-[22px]"
            style={{ height: SECTION_LINE_HEIGHT }}
          >
            {num}
          </div>
        ))}
      </div>

      {/* Content area */}
      <div
        ref={contentRef}
        className={cn(
          'flex-1 min-w-0 cursor-text',
          'border-l-2 pl-3',
          isActive ? 'border-primary/50' : 'border-transparent hover:border-muted-foreground/20',
        )}
        onClick={handleClick}
      >
        {children}
      </div>
    </div>
  );
};
