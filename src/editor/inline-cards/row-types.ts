/**
 * Row Override Card System - Type Definitions
 * 
 * New architecture where cards are collections of row override rules
 * instead of full content replacement.
 */

import { Range } from 'monaco-editor';
import { ICodeStatement } from '../../core/types/core';
import { ReactNode } from 'react';

// =============================================================================
// Row Override Types
// =============================================================================

/** Types of row overrides */
export type RowOverrideType = 
  | 'header'          // Card header decoration (replaces line with header UI)
  | 'footer'          // Card footer decoration (replaces line with footer UI)
  | 'styled'          // Apply CSS styling to Monaco line (no replacement)
  | 'overlay'         // Add overlay next to line(s) - can span multiple rows
  | 'grouped-content' // Part of a spanning overlay (child rows)
  | 'full-card'       // Complete card replacement (for media)
  | 'hidden-area'     // Hide specific line(s) using setHiddenAreas
  | 'view-zone';      // Insert ViewZone DOM element (for headers/footers that replace hidden lines)

/** Display mode for overlays */
export type OverlayDisplayMode = 
  | 'beside'          // Overlay appears next to content
  | 'half-screen';    // Content slides, overlay takes half

// =============================================================================
// Row Rule Definitions
// =============================================================================

/** Base row rule interface */
export interface BaseRowRule {
  lineNumber: number;
  overrideType: RowOverrideType;
}

/** Header row rule - replaces line with card header */
export interface HeaderRowRule extends BaseRowRule {
  overrideType: 'header';
  cardType: CardType;
  title?: string;
  icon?: string;
  className?: string;
}

/** Footer row rule - replaces line with card footer */
export interface FooterRowRule extends BaseRowRule {
  overrideType: 'footer';
  cardType: CardType;
  actions?: FooterAction[];
  className?: string;
}

/** Footer action button */
export interface FooterAction {
  id: string;
  label: string;
  icon?: string;
  variant?: 'default' | 'primary' | 'secondary';
  onClick?: () => void;
}

/** Styled row rule - applies CSS to Monaco line */
export interface StyledRowRule extends BaseRowRule {
  overrideType: 'styled';
  className: string;
  /** Optional decoration options */
  decoration?: {
    hidePrefix?: boolean;        // Hide markdown prefix (e.g., "# ")
    prefixLength?: number;       // Length of prefix to hide
    isWholeLine?: boolean;       // Apply to whole line
    inlineClassName?: string;    // Inline text styling
    beforeContentClassName?: string;
    afterContentClassName?: string;
  };
}

/** Overlay row rule - adds overlay next to one or more lines */
export interface OverlayRowRule extends BaseRowRule {
  overrideType: 'overlay';
  /** Overlay position relative to text */
  position: 'right' | 'below' | 'floating';
  /** 
   * Lines this overlay spans (inclusive). 
   * If not provided, overlay covers only the lineNumber.
   * This allows one overlay to group multiple rows.
   */
  spanLines?: {
    startLine: number;
    endLine: number;
  };
  /** Unique overlay ID for multi-line overlays */
  overlayId?: string;
  /** Content to render in overlay */
  renderOverlay: (props: OverlayRenderProps) => ReactNode;
  /** Width of overlay (for right position) */
  overlayWidth?: number | string;
  /** Height behavior for multi-line spans */
  heightMode?: 'auto' | 'match-lines' | 'fixed';
  /** Fixed height in pixels (when heightMode is 'fixed') */
  fixedHeight?: number;
  /** 
   * Vertical offset in pixels to shift overlay position.
   * Negative values move overlay up (useful to align with header ViewZones).
   */
  topOffset?: number;
}

/** Props passed to overlay render function */
export interface OverlayRenderProps {
  /** Primary line number (first line if spanning multiple) */
  lineNumber: number;
  /** Source text (single line or joined multi-line) */
  sourceText: string;
  /** All source lines if spanning multiple rows */
  sourceLines?: string[];
  /** Line range covered by this overlay */
  lineRange?: { startLine: number; endLine: number };
  isEditing: boolean;
  /** Current cursor line (if editing within span) */
  cursorLine?: number;
  onEdit: (lineNumber?: number) => void;
  onAction: (action: string, payload?: unknown) => void;
}

/** 
 * Grouped content row rule - marks line as part of a spanning overlay.
 * Lines with this rule contribute to a parent overlay's span.
 */
export interface GroupedContentRowRule extends BaseRowRule {
  overrideType: 'grouped-content';
  /** ID of the parent overlay this belongs to */
  parentOverlayId: string;
  /** Vertical centering margins for this line */
  marginTop?: number;
  marginBottom?: number;
  /** Optional per-line styling within the group */
  lineClassName?: string;
}

/** Full card row rule - complete replacement with card UI */
export interface FullCardRowRule extends BaseRowRule {
  overrideType: 'full-card';
  cardType: CardType;
  /** Render the card content */
  renderCard: (props: CardRenderProps) => ReactNode;
  /** Height in pixels */
  heightPx: number;
}

/** 
 * Hidden area rule - hides specific line(s) using Monaco's setHiddenAreas 
 * Used for delimiter lines (---, ```, # prefix) that should be folded
 */
export interface HiddenAreaRule extends BaseRowRule {
  overrideType: 'hidden-area';
  /** Optional: end line for multi-line hidden areas (defaults to lineNumber) */
  endLineNumber?: number;
}

/**
 * ViewZone rule - inserts a DOM element between lines
 * Used to replace hidden delimiter lines with card headers/footers
 */
export interface ViewZoneRule extends BaseRowRule {
  overrideType: 'view-zone';
  /** Card type for styling */
  cardType: CardType;
  /** Zone position: 'header' (after line) or 'footer' (before line) */
  zonePosition: 'header' | 'footer';
  /** Height in pixels */
  heightInPx: number;
  /** Title for the zone (optional) */
  title?: string;
  /** Icon identifier (optional) */
  icon?: string;
  /** CSS class name */
  className?: string;
  /** Footer actions (only for footer zones) */
  actions?: FooterAction[];
  /** Custom render function (optional, for advanced use) */
  renderContent?: (props: ViewZoneRenderProps) => ReactNode;
  /** 
   * Explicit afterLineNumber for ViewZone positioning.
   * When set, overrides the auto-calculated position.
   * Use this when the auto-calculation would reference a hidden line.
   */
  afterLineNumber?: number;
}

/** Props for ViewZone render function */
export interface ViewZoneRenderProps {
  cardType: CardType;
  lineNumber: number;
  title?: string;
  icon?: string;
  actions?: FooterAction[];
  onAction?: (actionId: string) => void;
}

/** Props passed to card render function */
export interface CardRenderProps {
  sourceRange: Range;
  sourceText: string;
  displayMode: OverlayDisplayMode;
  isEditing: boolean;
  onEdit: () => void;
  onAction: (action: string, payload?: unknown) => void;
}

/** Union of all row rule types */
export type RowRule = 
  | HeaderRowRule 
  | FooterRowRule 
  | StyledRowRule 
  | OverlayRowRule 
  | GroupedContentRowRule 
  | FullCardRowRule
  | HiddenAreaRule
  | ViewZoneRule;

// =============================================================================
// Card Types
// =============================================================================

/** Supported card types */
export type CardType = 
  | 'heading' 
  | 'blockquote' 
  | 'image' 
  | 'youtube' 
  | 'frontmatter' 
  | 'wod-block';

// =============================================================================
// Grouped Overlay Configuration
// =============================================================================

/** Configuration for overlays spanning multiple lines */
export interface GroupedOverlayConfig {
  /** Unique group identifier */
  groupId: string;
  /** Card type for styling */
  cardType: CardType;
  /** Lines covered by this group */
  lineRange: {
    startLine: number;
    endLine: number;
  };
  /** Render the overlay content */
  renderOverlay: (props: GroupedOverlayRenderProps) => ReactNode;
  /** Position of overlay */
  position: 'right' | 'floating';
  /** Width when position is 'right' */
  overlayWidth?: number | string;
}

/** Props for grouped overlay render */
export interface GroupedOverlayRenderProps {
  lineRange: { startLine: number; endLine: number };
  sourceLines: string[];
  isEditing: boolean;
  cursorLine: number | null;
  onEdit: (lineNumber: number) => void;
  onAction: (action: string, payload?: unknown) => void;
}

// =============================================================================
// Inline Card (New Architecture)
// =============================================================================

/** Card as a collection of row rules */
export interface InlineCard {
  /** Unique identifier */
  id: string;
  
  /** Card type */
  cardType: CardType;
  
  /** Source range in editor (1-indexed Monaco lines) */
  sourceRange: Range;
  
  /** Collection of row rules */
  rules: RowRule[];
  
  /** Grouped overlay configuration (if applicable) */
  groupedOverlay?: GroupedOverlayConfig;
  
  /** Parsed content for reference */
  content: CardContent;
  
  /** Whether cursor is currently in this card */
  isEditing: boolean;
}

// =============================================================================
// Card Content Types (from original types.ts)
// =============================================================================

/** Content model for headings */
export interface HeadingContent {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  prefixLength: number;
}

/** Content model for blockquotes */
export interface BlockquoteContent {
  type: 'blockquote';
  text: string;
  prefixLength: number;
  /** Multi-line blockquote lines */
  lines?: string[];
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

// =============================================================================
// Card Callbacks
// =============================================================================

/** Callbacks for card interactions */
export interface CardCallbacks {
  /** Focus editor on specific line */
  onEdit: (lineNumber?: number) => void;
  /** Handle card-specific action */
  onAction: (action: string, payload?: unknown) => void;
}

// =============================================================================
// Rule Generator Interface
// =============================================================================

/** Interface for card-specific rule generators */
export interface CardRuleGenerator<T extends CardContent = CardContent> {
  /** Card type this generator handles */
  cardType: CardType;
  
  /** Generate row rules for parsed content */
  generateRules(
    content: T, 
    sourceRange: Range, 
    isEditing: boolean
  ): RowRule[];
  
  /** Generate grouped overlay config if applicable */
  generateGroupedOverlay?(
    content: T,
    sourceRange: Range,
    isEditing: boolean
  ): GroupedOverlayConfig | null;
}
