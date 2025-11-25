/**
 * Inline Widget Card System - Type Definitions
 * 
 * This module defines the core types for the unified inline widget card system
 * that provides consistent preview/edit behavior for various content types
 * in the Monaco editor.
 */

import { Range } from 'monaco-editor';
import { ICodeStatement } from '../../core/types/core';

/** Supported card types */
export type CardType = 
  | 'heading' 
  | 'blockquote' 
  | 'image' 
  | 'youtube' 
  | 'frontmatter' 
  | 'wod-block';

/** Display modes for cards */
export type CardDisplayMode = 
  | 'full-preview'   // Preview widget takes full width
  | 'side-by-side'   // Edit panel + Preview panel
  | 'edit-only';     // No card UI, just Monaco text

/** Content model for headings */
export interface HeadingContent {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  prefixLength: number; // Length of "# " prefix
}

/** Content model for blockquotes */
export interface BlockquoteContent {
  type: 'blockquote';
  text: string;
  prefixLength: number; // Length of "> " prefix
}

/** Content model for images */
export interface ImageContent {
  type: 'image';
  url: string;
  alt: string;
  rawMarkdown: string;
}

/** Content model for YouTube embeds */
export interface YouTubeContent {
  type: 'youtube';
  videoId: string;
  embedUrl: string;
  rawUrl: string;
}

/** Content model for front matter */
export interface FrontMatterContent {
  type: 'frontmatter';
  properties: Record<string, string>;
  rawYaml: string;
}

/** Content model for WOD blocks */
export interface WodBlockContent {
  type: 'wod-block';
  statements: ICodeStatement[];
  rawCode: string;
  parseState: 'parsed' | 'error' | 'pending';
}

/** Union of all content types */
export type CardContent = 
  | HeadingContent 
  | BlockquoteContent 
  | ImageContent 
  | YouTubeContent 
  | FrontMatterContent 
  | WodBlockContent;

/** Height information for a card */
export interface CardHeights {
  /** Height of preview widget in pixels */
  previewPx: number;
  /** Height of source text in lines */
  sourceLines: number;
  /** Final card height in pixels (calculated) */
  cardPx: number;
}

/** The main card interface */
export interface InlineWidgetCard<T extends CardContent = CardContent> {
  /** Unique identifier (e.g., "heading-5" for heading on line 5) */
  id: string;
  
  /** Content type */
  cardType: CardType;
  
  /** Range of source text in editor (1-indexed Monaco lines) */
  sourceRange: Range;
  
  /** Parsed content */
  content: T;
  
  /** Current display mode */
  displayMode: CardDisplayMode;
  
  /** Mode to use when cursor enters the card */
  editBehavior: 'side-by-side' | 'edit-only';
  
  /** Calculated heights */
  heights: CardHeights;
}

/** Callback props for card components */
export interface CardCallbacks {
  /** Called when user clicks to edit the card */
  onEdit: () => void;
  /** Called for card-specific actions (e.g., "start-workout") */
  onAction: (action: string, payload?: unknown) => void;
}

/** Props passed to all card preview components */
export interface CardPreviewProps<T extends CardContent = CardContent> {
  card: InlineWidgetCard<T>;
  callbacks: CardCallbacks;
}

/** Type helper for specific card props */
export type HeadingCardProps = CardPreviewProps<HeadingContent>;
export type BlockquoteCardProps = CardPreviewProps<BlockquoteContent>;
export type ImageCardProps = CardPreviewProps<ImageContent>;
export type YouTubeCardProps = CardPreviewProps<YouTubeContent>;
export type FrontMatterCardProps = CardPreviewProps<FrontMatterContent>;
export type WodBlockCardProps = CardPreviewProps<WodBlockContent>;
