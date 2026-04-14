import type React from 'react';

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
}

/**
 * A single action that can be performed on a list item.
 * Actions are supplied by the host via an `actions` prop, not stored on items,
 * so they can depend on ambient state/permissions.
 */
export interface IItemAction<TPayload = unknown> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** Render as the primary (filled) call-to-action */
  isPrimary?: boolean;
  onClick: (item: IListItem<TPayload>) => void;
  /** Optional secondary split-action (e.g. copy-to-clipboard) */
  splitIcon?: React.ReactNode;
  onSplitClick?: (item: IListItem<TPayload>) => void | Promise<void>;
}

/**
 * Context passed to renderItem overrides so custom renderers can access
 * the host's state without prop-drilling.
 */
export interface ListItemContext<TPayload = unknown> {
  isSelected: boolean;
  isActive: boolean;
  depth: number;
  actions: IItemAction<TPayload>[];
  onSelect: () => void;
}
