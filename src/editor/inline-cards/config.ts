/**
 * Inline Widget Card System - Configuration
 * 
 * Configuration for each card type including display behavior,
 * height defaults, and feature flags.
 */

import { CardType } from './types';

/** Configuration for each card type */
export interface CardTypeConfig {
  /** Unique identifier for the card type */
  type: CardType;
  
  /** Human readable name */
  displayName: string;
  
  /** What happens when cursor enters */
  editBehavior: 'side-by-side' | 'edit-only';
  
  /** Whether to hide source lines when showing preview */
  hideSourceInPreview: boolean;
  
  /** Minimum height in pixels */
  minHeight: number;
  
  /** Default preview height when content-based calculation fails */
  defaultPreviewHeight: number;
  
  /** Whether this card type uses ViewZones (true) or just decorations (false) */
  usesViewZone: boolean;
}

/** Default configurations for all card types */
export const CARD_TYPE_CONFIGS: Record<CardType, CardTypeConfig> = {
  heading: {
    type: 'heading',
    displayName: 'Heading',
    editBehavior: 'edit-only',
    hideSourceInPreview: false, // Headings use inline decoration, not hidden areas
    minHeight: 24,
    defaultPreviewHeight: 32,
    usesViewZone: false, // Uses decorations only
  },
  
  blockquote: {
    type: 'blockquote',
    displayName: 'Blockquote',
    editBehavior: 'edit-only',
    hideSourceInPreview: false, // Blockquotes use inline decoration
    minHeight: 24,
    defaultPreviewHeight: 32,
    usesViewZone: false, // Uses decorations only
  },
  
  image: {
    type: 'image',
    displayName: 'Image',
    editBehavior: 'edit-only',
    hideSourceInPreview: true,
    minHeight: 100,
    defaultPreviewHeight: 200,
    usesViewZone: true,
  },
  
  youtube: {
    type: 'youtube',
    displayName: 'YouTube Video',
    editBehavior: 'edit-only',
    hideSourceInPreview: true,
    minHeight: 200,
    defaultPreviewHeight: 315, // 16:9 aspect for 560px width
    usesViewZone: true,
  },
  
  frontmatter: {
    type: 'frontmatter',
    displayName: 'Front Matter',
    editBehavior: 'side-by-side',
    hideSourceInPreview: true,
    minHeight: 60,
    defaultPreviewHeight: 100,
    usesViewZone: true,
  },
  
  'wod-block': {
    type: 'wod-block',
    displayName: 'Workout Block',
    editBehavior: 'side-by-side',
    hideSourceInPreview: true,
    minHeight: 100,
    defaultPreviewHeight: 200,
    usesViewZone: true,
  },
};

/** Card system configuration constants */
export const CARD_SYSTEM_CONFIG = {
  /** Enable debug logging */
  debug: true,
  
  /** Debounce time for content parsing in ms */
  parseDebounceMs: 150,
  
  /** Enable smooth transitions between modes */
  enableTransitions: true,
};
