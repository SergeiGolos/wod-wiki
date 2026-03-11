/**
 * FrontMatterDisplay
 * 
 * Read-only renderer for frontmatter sections (YAML between --- delimiters).
 * Default: renders as a 2-column key-value table.
 * Typed: dispatches to embed renderers for youtube, strava, or file subtypes.
 * 
 * Line numbers are aligned with the source: line 1 = opening ---, last line = closing ---.
 */

import React from 'react';
import type { Section, FrontMatterSubtype } from '../../types/section';
import { SECTION_LINE_HEIGHT } from '../SectionContainer';
import { YouTubeEmbed } from './embeds/YouTubeEmbed';
import { StravaEmbed } from './embeds/StravaEmbed';
import { FilePreviewEmbed } from './embeds/FilePreviewEmbed';

export interface FrontMatterDisplayProps {
  section: Section;
  className?: string;
  startLineNumber?: number;
  gutterWidth?: number;
}

/** Gutter cell matching the line-number style used in MarkdownDisplay */
const GutterCell: React.FC<{ lineNum: number | null; gutterWidth: number }> = ({ lineNum, gutterWidth }) => {
  if (lineNum === null) return null;
  return (
    <div
      className="flex-shrink-0 text-right pr-3 text-muted-foreground/30 font-mono text-xs select-none pointer-events-none"
      style={{ width: `${gutterWidth + 2}ch`, minWidth: `${gutterWidth + 2}ch`, lineHeight: `${SECTION_LINE_HEIGHT}px` }}
    >
      {lineNum}
    </div>
  );
};

/** Default key-value table renderer */
const DefaultFrontMatter: React.FC<FrontMatterDisplayProps> = ({
  section,
  startLineNumber,
  gutterWidth = 0,
}) => {
  const rawLines = section.rawContent.split('\n');

  return (
    <div className="select-none">
      {rawLines.map((line, i) => {
        const lineNum = startLineNumber !== undefined ? startLineNumber + i : null;
        const trimmed = line.trim();
        const isDivider = trimmed === '---';
        const kvMatch = !isDivider ? line.match(/^([^:]+):\s*(.*)$/) : null;

        return (
          <div key={i} className="flex group/line">
            <GutterCell lineNum={lineNum} gutterWidth={gutterWidth} />
            <div
              className="flex-1 min-w-0 flex"
              style={{ lineHeight: `${SECTION_LINE_HEIGHT}px`, minHeight: SECTION_LINE_HEIGHT }}
            >
              {isDivider ? (
                <span className="text-xs font-mono text-muted-foreground/40">---</span>
              ) : kvMatch ? (
                <div className="flex gap-4 w-full">
                  <span className="text-xs font-semibold text-muted-foreground min-w-[8rem] text-right pr-2">
                    {kvMatch[1].trim()}
                  </span>
                  <span className="text-sm text-foreground/90 flex-1 min-w-0 truncate">
                    {kvMatch[2].trim() || '\u00A0'}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-foreground/70 font-mono">
                  {line || '\u00A0'}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Dispatch to typed embed or default table */
export const FrontMatterDisplay: React.FC<FrontMatterDisplayProps> = (props) => {
  const { section, startLineNumber, gutterWidth = 0 } = props;
  const subtype: FrontMatterSubtype = section.frontmatterType ?? 'default';

  if (subtype === 'default') {
    return <DefaultFrontMatter {...props} />;
  }

  // Typed front matter: show the embed with the --- lines as gutter-only rows
  const rawLines = section.rawContent.split('\n');

  return (
    <div className="select-none">
      {/* Opening --- */}
      <div className="flex group/line">
        <GutterCell lineNum={startLineNumber ?? null} gutterWidth={gutterWidth} />
        <div
          className="flex-1 min-w-0 text-xs font-mono text-muted-foreground/40"
          style={{ lineHeight: `${SECTION_LINE_HEIGHT}px`, minHeight: SECTION_LINE_HEIGHT }}
        >
          ---
        </div>
      </div>

      {/* Inner property lines with the embed overlay */}
      <div className="flex">
        {/* Gutter for inner lines */}
        <div className="flex-shrink-0 flex flex-col">
          {rawLines.slice(1, -1).map((_, i) => (
            <GutterCell
              key={i}
              lineNum={startLineNumber !== undefined ? startLineNumber + 1 + i : null}
              gutterWidth={gutterWidth}
            />
          ))}
        </div>

        {/* Embed renderer */}
        <div className="flex-1 min-w-0">
          {subtype === 'youtube' && (
            <YouTubeEmbed properties={section.properties ?? {}} lineCount={rawLines.length - 2} />
          )}
          {subtype === 'strava' && (
            <StravaEmbed properties={section.properties ?? {}} lineCount={rawLines.length - 2} />
          )}
          {subtype === 'file' && (
            <FilePreviewEmbed properties={section.properties ?? {}} lineCount={rawLines.length - 2} />
          )}
        </div>
      </div>

      {/* Closing --- */}
      <div className="flex group/line">
        <GutterCell
          lineNum={startLineNumber !== undefined ? startLineNumber + rawLines.length - 1 : null}
          gutterWidth={gutterWidth}
        />
        <div
          className="flex-1 min-w-0 text-xs font-mono text-muted-foreground/40"
          style={{ lineHeight: `${SECTION_LINE_HEIGHT}px`, minHeight: SECTION_LINE_HEIGHT }}
        >
          ---
        </div>
      </div>
    </div>
  );
};
