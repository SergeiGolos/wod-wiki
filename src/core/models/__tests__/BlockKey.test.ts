import { describe, expect, it } from 'vitest';
import { BlockKey } from '../BlockKey';
import { validate as uuidValidate } from 'uuid';

describe('BlockKey', () => {
    it('generates a new unique ID (UUID) when no value is passed', () => {
        const key1 = new BlockKey();
        const key2 = new BlockKey();

        expect(key1.value).toBeDefined();
        expect(key2.value).toBeDefined();
        expect(key1.value).not.toBe(key2.value);
        expect(uuidValidate(key1.value)).toBe(true);
        expect(uuidValidate(key2.value)).toBe(true);
    });

    it('uses the provided value when one is passed', () => {
        const customValue = 'my-custom-key';
        const key = new BlockKey(customValue);

        expect(key.value).toBe(customValue);
    });

    it('returns the value when toString is called', () => {
        const key = new BlockKey('test-key');
        expect(key.toString()).toBe('test-key');
    });

    it('returns the value when valueOf is called', () => {
        const key = new BlockKey('test-key');
        expect(key.valueOf()).toBe('test-key');
    });

    it('checks equality correctly', () => {
        const key1 = new BlockKey('same-key');
        const key2 = new BlockKey('same-key');
        const key3 = new BlockKey('different-key');

        expect(key1.equals(key2)).toBe(true);
        expect(key1.equals(key3)).toBe(false);
    });
});
