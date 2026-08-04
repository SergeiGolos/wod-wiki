/**
 * ComposerRegistry — custom slot plugin registry (issue #830).
 *
 * Asserts:
 *   1. registerSlot / getSlot / getAllSlots round-trip a definition.
 *   2. Duplicate type ids throw; the returned unregister removes the slot.
 *   3. Subscribers are notified on register/unregister (React reactivity).
 *   4. Type safety: registerSlot<TValue> ties editor, wqlGenerator,
 *      suggestions, and validate to one generic (compile-time; the typed
 *      usages below would fail typecheck on a mismatch).
 */

import { describe, expect, it } from 'bun:test';

import {
  ComposerRegistry,
  type CustomSlotDefinition,
  type CustomSlotEditorProps,
} from './ComposerRegistry';

interface Weight { value: number; unit: 'kg' | 'lb' }

const weightSlot = (): CustomSlotDefinition<Weight> => ({
  type: 'weight',
  label: 'Weight',
  icon: '🏋',
  placeholder: 'Pick a weight...',
  placeholderText: 'weight: [value_unit]',
  Editor: (_props: CustomSlotEditorProps<Weight>) => null,
  wqlGenerator: w => `weight:${w.value}${w.unit}`,
  formatValue: w => `${w.value}${w.unit}`,
  parseValue: raw => {
    const m = /^(\d+)(kg|lb)$/.exec(raw);
    return m ? { value: Number(m[1]), unit: m[2] as 'kg' | 'lb' } : undefined;
  },
  suggestions: query =>
    [{ value: 100, unit: 'kg' as const }].filter(s => `${s.value}${s.unit}`.includes(query)),
  validate: w => (w.value > 0 ? null : 'Weight must be positive'),
});

describe('ComposerRegistry', () => {
  it('registers and retrieves slot definitions', () => {
    const registry = new ComposerRegistry();
    const def = weightSlot();
    registry.registerSlot(def);

    expect(registry.getSlot<Weight>('weight')).toBe(def);
    expect(registry.getAllSlots()).toEqual([def]);
    expect(registry.getSlot('missing')).toBeUndefined();
  });

  it('recovers the typed value through the generic getter', () => {
    const registry = new ComposerRegistry();
    registry.registerSlot(weightSlot());

    const def = registry.getSlot<Weight>('weight')!;
    const parsed = def.parseValue('100kg');
    expect(parsed).toEqual({ value: 100, unit: 'kg' });
    // wqlGenerator is typed: passing anything but Weight fails typecheck.
    expect(def.wqlGenerator(parsed!)).toBe('weight:100kg');
  });

  it('throws on duplicate type ids and unregisters via the returned handle', () => {
    const registry = new ComposerRegistry();
    const unregister = registry.registerSlot(weightSlot());

    expect(() => registry.registerSlot(weightSlot())).toThrow(/already registered/);

    unregister();
    expect(registry.getSlot('weight')).toBeUndefined();
    expect(registry.getAllSlots()).toEqual([]);

    // Type id is free again after unregister.
    registry.registerSlot(weightSlot());
    expect(registry.getSlot('weight')).toBeDefined();
  });

  it('notifies subscribers on register and unregister', () => {
    const registry = new ComposerRegistry();
    const events: number[] = [];
    const unsubscribe = registry.subscribe(() => events.push(registry.getVersion()));

    const unregister = registry.registerSlot(weightSlot());
    unregister();
    unsubscribe();
    registry.registerSlot(weightSlot());

    expect(events).toEqual([1, 2]);
  });
});
