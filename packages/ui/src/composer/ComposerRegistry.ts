import { useMemo, useSyncExternalStore } from 'react';
import type { ComponentType } from 'react';

export interface CustomSlotEditorProps<TValue> {
  value: TValue | undefined;
  onChange: (value: TValue) => void;
  onClose: () => void;
}

export interface CustomSlotDefinition<TValue = unknown> {
  type: string;
  label: string;
  icon: string;
  placeholder: string;
  placeholderText: string;
  description: string;
  Editor: ComponentType<CustomSlotEditorProps<TValue>>;
  wqlGenerator: (value: TValue) => string;
  formatValue?: (value: TValue) => string;
  parseValue?: (raw: string) => TValue | undefined;
  validate?: (value: TValue) => string | null;
  wqlValidator?: (wql: string) => string | null;
  plane?: 'content' | 'metrics' | 'both';
}

/**
 * Heterogeneous slot store: `Editor` components are invariant in `TValue`
 * (`onChange: (value: TValue) => void`), so no concrete generic unifies
 * every registered slot. The store uses the `any` escape at this single
 * internal boundary; the public per-slot API stays generic.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
type StoredSlot = CustomSlotDefinition<any>;

export class ComposerRegistry {
  private readonly slots = new Map<string, StoredSlot>();
  private readonly listeners = new Set<() => void>();
  private cachedList: StoredSlot[] = [];

  registerSlot<TValue>(def: CustomSlotDefinition<TValue>): () => void {
    this.slots.set(def.type, def);
    this.cachedList = Array.from(this.slots.values());
    this.notify();
    return () => this.unregisterSlot(def.type);
  }

  unregisterSlot(type: string): void {
    if (this.slots.delete(type)) {
      this.cachedList = Array.from(this.slots.values());
      this.notify();
    }
  }

  getSlot(type: string): CustomSlotDefinition | undefined {
    return this.slots.get(type);
  }

  listSlots(): CustomSlotDefinition[] {
    return this.cachedList;
  }
  getAllSlots(): CustomSlotDefinition[] {
    return this.cachedList;
  }


  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const composerRegistry = new ComposerRegistry();

export function useComposerSlots(registry: ComposerRegistry = composerRegistry): CustomSlotDefinition[] {
  const slots = useSyncExternalStore(
    (cb) => registry.subscribe(cb),
    () => registry.listSlots(),
  );
  return useMemo(() => slots, [slots]);
}
