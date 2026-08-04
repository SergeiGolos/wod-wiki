/**
 * ComposerRegistry — singleton registry for custom WQL composer slot types
 * (issue #830, decision #825).
 *
 * A page registers a `CustomSlotDefinition<TValue>` during initialization:
 * metadata (label / icon / placeholder guidance), a custom editor widget, a
 * WQL fragment generator, and optional suggestion + validation logic. The
 * `WqlComposer` queries the registry to list registered slots in its
 * add-filter menu, render their custom editors in the clause popover, and
 * compile their WQL fragments alongside the built-in clauses.
 *
 * Type safety: `registerSlot<TValue>` ties the editor's value type to the
 * WQL generator, suggestion source, and validator via one generic — a
 * mismatch between any of them is a compile error.
 *
 * Custom slot type ids MUST NOT collide with the built-in `ClauseType`
 * union ('target', 'scope', 'text', 'catalog', 'tag', 'effort',
 * 'discipline', 'type', 'has', 'time', 'where') — built-ins always win
 * metadata lookup, so a colliding custom slot would be shadowed.
 */
import { useMemo, useSyncExternalStore } from 'react'
import type { ComponentType } from 'react'

// ── Contract ─────────────────────────────────────────────────────────────────

/** Props passed to a custom slot's editor widget. */
export interface CustomSlotEditorProps<TValue> {
  /** Current typed value, or undefined when the clause is still empty. */
  value: TValue | undefined
  /** Commit a new value — the composer serializes it onto the clause. */
  onChange: (value: TValue) => void
  /** Dismiss the popover without committing. */
  onClose: () => void
}

/**
 * Definition of a page-supplied custom slot type.
 *
 * The clause model stores values as strings (`QueryClause.value`), so a
 * definition must bridge its typed value to that string in both directions:
 * `formatValue` for storage/display, `parseValue` to reopen the editor and
 * feed `wqlGenerator`.
 */
export interface CustomSlotDefinition<TValue = unknown> {
  /** Unique slot type id (e.g. 'date-range'). Must not collide with built-ins. */
  type: string
  /** Display label in the add-filter menu and pill prefix. */
  label: string
  /** Emoji icon, matching the built-in clause style. */
  icon: string
  /** Editor input placeholder (guidance inside the popover). */
  placeholder: string
  /** Empty-pill placeholder guidance (e.g. 'daterange: [start_end]'). */
  placeholderText: string
  /** Optional description shown in menus. */
  description?: string
  /** Custom editor widget rendered inside the clause popover. */
  Editor: ComponentType<CustomSlotEditorProps<TValue>>
  /** Generates the WQL fragment (a `{...}` filter entry) for a typed value. */
  wqlGenerator: (value: TValue) => string
  /** Serializes a typed value onto `QueryClause.value` (display + storage). */
  formatValue: (value: TValue) => string
  /** Parses the stored string back into a typed value; undefined when invalid/empty. */
  parseValue: (raw: string) => TValue | undefined
  /** Optional typeahead suggestion source for the editor. */
  suggestions?: (query: string) => TValue[]
  /** Optional validator; return an error message, or null when valid. */
  validate?: (value: TValue) => string | null
}

// ── Registry ─────────────────────────────────────────────────────────────────

export class ComposerRegistry {
  // TValue is erased at storage and recovered per-call-site via typed getters.
  private slots = new Map<string, CustomSlotDefinition<any>>()
  private listeners = new Set<() => void>()
  private version = 0

  /**
   * Register a custom slot type. Returns an unregister function (useful for
   * page teardown and tests).
   * @throws when a slot with the same type id is already registered.
   */
  registerSlot<TValue>(definition: CustomSlotDefinition<TValue>): () => void {
    if (this.slots.has(definition.type)) {
      throw new Error(`ComposerRegistry: slot type "${definition.type}" is already registered`)
    }
    this.slots.set(definition.type, definition)
    this.emit()
    return () => this.unregisterSlot(definition.type)
  }

  /** Remove a previously registered slot type. No-op when absent. */
  unregisterSlot(type: string): void {
    if (this.slots.delete(type)) this.emit()
  }

  /** Look up a slot definition by type id. */
  getSlot<TValue = unknown>(type: string): CustomSlotDefinition<TValue> | undefined {
    return this.slots.get(type) as CustomSlotDefinition<TValue> | undefined
  }

  /** All registered slot definitions, in registration order. */
  getAllSlots(): CustomSlotDefinition<any>[] {
    return [...this.slots.values()]
  }

  /** React subscription hook (useSyncExternalStore contract). */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Monotonic snapshot counter for useSyncExternalStore. */
  getVersion = (): number => this.version

  private emit(): void {
    this.version += 1
    for (const listener of this.listeners) listener()
  }
}

/** Process-wide singleton — pages register against this instance. */
export const composerRegistry = new ComposerRegistry()

/** Reactive view of the registered custom slots (re-renders on register/unregister). */
export function useComposerSlots(registry: ComposerRegistry = composerRegistry): CustomSlotDefinition<any>[] {
  const version = useSyncExternalStore(registry.subscribe, registry.getVersion)
  return useMemo(() => registry.getAllSlots(), [registry, version])
}
