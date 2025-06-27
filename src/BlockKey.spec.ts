import { describe, it, expect } from 'vitest';
import { BlockKey } from './BlockKey';

describe('BlockKey', () => {
    // ... existing tests ...

    describe('uniqueness', () => {
        it('should generate unique traceId for each instance', () => {
            const key1 = new BlockKey('block1');
            const key2 = new BlockKey('block1');
            expect(key1.traceId).not.toBe(key2.traceId);
        });
    });

    describe('toString', () => {
        // ... existing tests ...

        it('should update string when index changes', () => {
            const key = new BlockKey('block1');
            const initialString = key.toString();
            
            key.add(5);
            const updatedString = key.toString();
            
            expect(updatedString).not.toBe(initialString);
            expect(updatedString).toContain(':5');
        });

        it('should include blockId and traceId in string representation', () => {
            const key = new BlockKey('block1');
            const str = key.toString();
            
            expect(str.startsWith('block1:')).toBe(true);
            expect(str.includes(key.traceId)).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should handle empty blockId', () => {
            const key = new BlockKey('');
            expect(key.blockId).toBe('');
            expect(key.toString().startsWith(':')).toBe(true);
        });
        
        it('should handle special characters in blockId', () => {
            const specialBlockId = 'block@#$%^&*()';
            const key = new BlockKey(specialBlockId);
            expect(key.blockId).toBe(specialBlockId);
            expect(key.toString().startsWith(specialBlockId + ':')).toBe(true);
        });
        
        it('should handle large number of children', () => {
            const largeChildren = Array.from({ length: 100 }, (_, i) => `child${i}`);
            const key = new BlockKey('block1', [], largeChildren);
            expect(key.children.length).toBe(100);
            
            key.add(150);
            expect(key.round).toBe(1); // 150 / 100 = 1.5, Math.floor = 1
            
            const next = key.nextChild();
            expect(next.index).toBe(50); // 150 % 100 = 50
            expect(next.id).toBe('child50');
        });
        
        it('should handle very large index values', () => {
            const key = new BlockKey('block1', [], ['child1', 'child2']);
            const largeValue = 1000000;
            key.add(largeValue);
            
            expect(key.index).toBe(largeValue);
            expect(key.round).toBe(largeValue / 2 | 0);
            
            const next = key.nextChild();
            expect(next.index).toBe(largeValue % 2);
        });
    });

    describe('complex workflows', () => {
        it('should correctly track a multi-round sequence of operations', () => {
            const key = new BlockKey('workout1', [], ['exercise1', 'exercise2', 'exercise3']);
            
            // First round
            expect(key.round).toBe(0);
            
            let next = key.nextChild();
            expect(next.id).toBe('exercise1');
            key.add(1);
            
            next = key.nextChild();
            expect(next.id).toBe('exercise2');
            key.add(1);
            
            next = key.nextChild();
            expect(next.id).toBe('exercise3');
            key.add(1);
            
            // Second round
            expect(key.round).toBe(1);
            
            next = key.nextChild();
            expect(next.id).toBe('exercise1');
            key.add(1);
            
            // Skip to end of second round
            key.add(2);
            
            // Third round
            expect(key.round).toBe(2);
            
            next = key.nextChild();
            expect(next.id).toBe('exercise1');
        });
    });

    describe('sourceIds behavior', () => {
        it('should store sourceIds as provided', () => {
            const sourceIds = ['src1', 'src2', 'src3'];
            const key = new BlockKey('block1', sourceIds);
            expect(key.sourceIds).toEqual(sourceIds);
            expect(key.sourceIds).not.toBe(sourceIds); // Should be a copy, not the same reference
        });
    });

    describe('immutability', () => {
      it('should not allow direct modification of children array', () => {
        const key = new BlockKey('block1', [], ['child1']);
        // This test verifies runtime behavior - TypeScript would prevent this at compile time
        const originalLength = key.children.length;
        
        // Attempt to modify (should be prevented or ignored)
        try {
            // @ts-ignore - deliberately testing runtime behavior
            key.children.push('child2');
        } catch (e) {
            // Some implementations throw on modification attempts
        }
        
        // Children should remain unchanged
        expect(key.children.length).toBe(originalLength);
        expect(key.children).toEqual(['child1']);
      });
    });
  });