/**
 * Page Shell Types
 *
 * Core type definitions for page shell components.
 * Page shells compose existing panel primitives with scoped runtime contexts.
 */

import type React from 'react';
import type { IRuntimeFactory } from '@/runtime/compiler/RuntimeFactory';

/**
 * Section layout variants for page shells.
 * Each layout type has specific rendering and scroll behavior.
 */
export type ShellSectionLayout = 'parallax' | 'sticky' | 'scroll' | 'hero' | 'tabbed';

/**
 * A section within a page shell.
 * Each section can optionally bind to a scoped runtime.
 */
export interface ShellSection {
  /** Unique section identifier */
  id: string;

  /** Layout mode for this section */
  layout: ShellSectionLayout;

  /** Optional scoped runtime binding identifier */
  runtimeId?: string;

  /** Section content */
  children: React.ReactNode;
}

/**
 * A documentation section for use with DocsPageShell.
 * Sections with a runtimeFactory get wrapped in a ScopedRuntimeProvider.
 */
export interface DocsSection {
  /** Unique section identifier */
  id: string;

  /** Navigation label displayed in sticky nav */
  label: string;

  /** Section content */
  content: React.ReactNode;

  /** Optional runtime factory for interactive demos */
  runtimeFactory?: IRuntimeFactory;
}

/**
 * Tab descriptor for CalendarPageShell detail area.
 */
export interface CalendarTab {
  /** Unique tab identifier */
  id: string;

  /** Display label */
  label: string;

  /** Tab icon */
  icon?: React.ReactNode;

  /** Tab content */
  content: React.ReactNode;
}
