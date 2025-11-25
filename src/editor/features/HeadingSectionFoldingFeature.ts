/**
 * HeadingSectionFoldingFeature - Provides folding for markdown heading sections
 * 
 * This feature enables Monaco's native folding for markdown sections defined by
 * # and ## headings. Each heading creates a foldable region that extends to the
 * next heading of the same or higher level.
 * 
 * Key behaviors:
 * - # headings fold everything until the next # heading
 * - ## headings fold until the next # or ## heading
 * - WOD blocks within folded sections remain independently foldable
 * - Click on heading line gutter to fold/unfold
 */

import { editor, languages } from 'monaco-editor';
import type { Monaco } from '@monaco-editor/react';

export interface HeadingSection {
  level: number;
  startLine: number;
  endLine: number;
  title: string;
}

export interface WodBlockRange {
  startLine: number;
  endLine: number;
}

/**
 * Parse markdown content to find WOD blocks (```wod ... ```)
 */
export function parseWodBlocks(content: string): WodBlockRange[] {
  const lines = content.split('\n');
  const blocks: WodBlockRange[] = [];
  let inWodBlock = false;
  let blockStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i + 1; // 1-indexed

    if (line === '```wod') {
      inWodBlock = true;
      blockStartLine = lineNumber;
    } else if (inWodBlock && line === '```') {
      blocks.push({
        startLine: blockStartLine,
        endLine: lineNumber
      });
      inWodBlock = false;
    }
  }

  return blocks;
}

/**
 * Parse markdown content to find heading sections
 * 
 * Each heading folds to the line before the next heading of ANY level.
 * This creates an "index view" when all sections are collapsed - you see
 * only the heading lines creating a table of contents.
 */
export function parseHeadingSections(content: string): HeadingSection[] {
  const lines = content.split('\n');
  const sections: HeadingSection[] = [];
  
  // First, find all headings with their line numbers
  const headings: { level: number; lineNumber: number; title: string }[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    
    if (headingMatch) {
      headings.push({
        level: headingMatch[1].length,
        lineNumber: i + 1, // 1-indexed
        title: headingMatch[2].trim()
      });
    }
  }
  
  // Each heading folds to the line before the next heading (of any level)
  for (let i = 0; i < headings.length; i++) {
    const current = headings[i];
    const next = headings[i + 1];
    
    // End line is either the line before the next heading, or end of document
    const endLine = next ? next.lineNumber - 1 : lines.length;
    
    // Only create foldable section if there's content to fold
    if (endLine > current.lineNumber) {
      sections.push({
        level: current.level,
        startLine: current.lineNumber,
        endLine: endLine,
        title: current.title
      });
    }
  }

  return sections;
}

/**
 * Create a folding range provider for markdown headings and WOD blocks
 */
export function createHeadingFoldingProvider(): languages.FoldingRangeProvider {
  return {
    provideFoldingRanges(model: editor.ITextModel): languages.FoldingRange[] {
      const content = model.getValue();
      const ranges: languages.FoldingRange[] = [];
      
      // Add heading section folding ranges
      const sections = parseHeadingSections(content);
      for (const section of sections) {
        if (section.endLine > section.startLine) {
          ranges.push({
            start: section.startLine,
            end: section.endLine,
            kind: languages.FoldingRangeKind.Region
          });
        }
      }
      
      // Add WOD block folding ranges (independent of headings)
      const wodBlocks = parseWodBlocks(content);
      for (const block of wodBlocks) {
        if (block.endLine > block.startLine) {
          ranges.push({
            start: block.startLine,
            end: block.endLine,
            kind: languages.FoldingRangeKind.Region
          });
        }
      }
      
      return ranges;
    }
  };
}

/**
 * Register the heading folding provider with Monaco
 */
export function registerHeadingFolding(monaco: Monaco): void {
  // Register for markdown language
  monaco.languages.registerFoldingRangeProvider('markdown', createHeadingFoldingProvider());
  
  console.log('[HeadingSectionFolding] Registered folding provider for markdown');
}

/**
 * HeadingSectionFoldingManager - Manages heading section folding in Monaco
 * 
 * Provides methods to fold/unfold all sections, creating an "index view"
 * when all are collapsed (showing only heading lines like a table of contents).
 */
export class HeadingSectionFoldingManager {
  private editor: editor.IStandaloneCodeEditor;
  private disposables: { dispose(): void }[] = [];
  private _isAllFolded: boolean = false;
  private onFoldStateChangeCallbacks: ((isAllFolded: boolean) => void)[] = [];

  constructor(editorInstance: editor.IStandaloneCodeEditor, monaco: Monaco) {
    this.editor = editorInstance;

    // Enable folding in editor options
    this.editor.updateOptions({
      folding: true,
      foldingStrategy: 'auto',
      showFoldingControls: 'always',
      foldingHighlight: true,
    });

    // Register folding provider
    const provider = monaco.languages.registerFoldingRangeProvider('markdown', createHeadingFoldingProvider());
    this.disposables.push(provider);

    // Add click handler for folding on heading lines
    this.setupClickToFold(monaco);

    console.log('[HeadingSectionFoldingManager] Initialized');
  }

  private setupClickToFold(monaco: Monaco): void {
    const handler = this.editor.onMouseDown((e) => {
      // Check if click is on the folding gutter or on heading text
      const target = e.target;
      
      if (target.type === monaco.editor.MouseTargetType.GUTTER_LINE_DECORATIONS ||
          target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS) {
        const lineNumber = target.position?.lineNumber;
        if (lineNumber) {
          const model = this.editor.getModel();
          const lineContent = model?.getLineContent(lineNumber);
          
          // Check if it's a heading line or WOD block start
          if (lineContent?.match(/^#{1,6}\s+/) || lineContent?.trim() === '```wod') {
            this.editor.setPosition({ lineNumber, column: 1 });
            this.editor.getAction('editor.toggleFold')?.run();
          }
        }
      }
    });
    
    this.disposables.push(handler);
  }

  /**
   * Get whether all sections are currently folded
   */
  public get isAllFolded(): boolean {
    return this._isAllFolded;
  }

  /**
   * Subscribe to fold state changes
   */
  public onFoldStateChange(callback: (isAllFolded: boolean) => void): { dispose(): void } {
    this.onFoldStateChangeCallbacks.push(callback);
    return {
      dispose: () => {
        const index = this.onFoldStateChangeCallbacks.indexOf(callback);
        if (index >= 0) {
          this.onFoldStateChangeCallbacks.splice(index, 1);
        }
      }
    };
  }

  private notifyFoldStateChange(): void {
    this.onFoldStateChangeCallbacks.forEach(cb => cb(this._isAllFolded));
  }

  /**
   * Fold all sections at a specific level
   */
  public foldLevel(level: number): void {
    this.editor.getAction(`editor.foldLevel${level}`)?.run();
  }

  /**
   * Unfold all sections - shows full document
   */
  public unfoldAll(): void {
    this.editor.getAction('editor.unfoldAll')?.run();
    this._isAllFolded = false;
    this.notifyFoldStateChange();
  }

  /**
   * Fold all sections - creates "index view" showing only headings
   */
  public foldAll(): void {
    this.editor.getAction('editor.foldAll')?.run();
    this._isAllFolded = true;
    this.notifyFoldStateChange();
  }

  /**
   * Toggle between folded (index view) and unfolded (full document)
   * @returns The new state - true if all folded, false if all unfolded
   */
  public toggleFoldAll(): boolean {
    if (this._isAllFolded) {
      this.unfoldAll();
    } else {
      this.foldAll();
    }
    return this._isAllFolded;
  }

  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    this.onFoldStateChangeCallbacks = [];
    console.log('[HeadingSectionFoldingManager] Disposed');
  }
}
