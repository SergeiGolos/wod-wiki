import type React from 'react';
import type { INavAction } from '@/nav/navTypes';

/**
 * Shared view-model for any selectable list item.
 *
 * Domain types are never made to implement this directly — use adapter
 * functions in ./adapters/ to map domain objects to IListItem<T>.
 */
export interface IListItem<TPayload = unknown> {
  /** Stable unique identifier */
  id: string;
  /** Primary display text */
  label: string;
  /** Secondary display text (date, category, subtitle) */
  subtitle?: string;
  /** Leading icon */
  icon?: React.ReactNode;
  /** Grouping key — rendered as a group header when ListView grouped=true */
  group?: string;
  /** Extra search terms beyond label/subtitle */
  keywords?: string[];
  /** Keyboard shortcut tokens, e.g. ['meta', 'k'] */
  shortcut?: string[];
  /** Badge text or count displayed trailing */
  badge?: string | number;
  /** Nesting depth for indented lists (0 = root) */
  depth?: number;
  /** Whether this item is pre-selected / highlighted */
  isActive?: boolean;
  /** Whether this item is non-interactive */
  isDisabled?: boolean;
  /** Strongly-typed original domain object — never cast to unknown */
  payload: TPayload;
  /**
   * Item-owned actions. Escape hatch for when actions are naturally
   * part of the domain object (e.g. from adapters). Host-provided
   * `actions(item)` is merged on top at render time.
   *
   * 0 actions = host `onSelect` is the only interaction.
   * ≥1 actions = shown as buttons; `isPrimary` action fires on keyboard Enter.
   */
  actions?: IItemAction[];
}

/**
 * A single action that can be performed on a list item.
 *
 * Uses `INavAction` so actions compose with the app's navigation system —
 * route changes, callbacks, pipelines — without raw `onClick` coupling.
 * Actions are payload-independent; handlers capture context via closure.
 */
export interface IItemAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** Render as the primary call-to-action; also triggered by keyboard Enter. */
  isPrimary?: boolean;
  action: INavAction;
}

/**
 * Context passed to renderItem overrides so custom renderers can access
 * the host's state without prop-drilling.
 */
export interface ListItemContext {
  isSelected: boolean;
  isActive: boolean;
  depth: number;
  /** Merged item-owned + host-provided actions */
  actions: IItemAction[];
  /** Fires when item is activated with no primary action (row click / keyboard Enter) */
  onSelect: () => void;
  /** Execute a nav action using surface-injected deps (navigate, setQueryParam, etc.) */
  executeAction: (action: INavAction) => void;
}
