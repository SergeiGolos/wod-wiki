import { describe, test, expect } from 'vitest';
import { BlockKey } from '../BlockKey';
import { BlockKeyFragment } from '../BlockKeyFragment';

describe('BlockKey', () => {
  test('toString should format BlockKey correctly', () => {
    // Arrange
    const blockKey = new BlockKey();
    blockKey.push([{ id: 1 }, { id: 2 }] as any, 0);
    blockKey.push([{ id: 3 }] as any, 1);

    // Act
    const result = blockKey.toString();

    // Assert
    expect(result).toBe('1,2(0)|3(1)');
  });

  test('should create BlockKey from string representation', () => {
    // Arrange
    const blockKeyString = '1,2(0)|3(1)';

    // Act
    const blockKey = BlockKey.fromString(blockKeyString);

    // Assert
    expect(blockKey).toBeInstanceOf(BlockKey);
    expect(blockKey.key).toHaveLength(2);
    expect(blockKey.key[0].ids).toEqual([1, 2]);
    expect(blockKey.key[0].index).toBe(0);
    expect(blockKey.key[1].ids).toEqual([3]);
    expect(blockKey.key[1].index).toBe(1);
  });

  test('should handle empty string for fromString', () => {
    // Act
    const blockKey = BlockKey.fromString('');

    // Assert
    expect(blockKey).toBeInstanceOf(BlockKey);
    expect(blockKey.key).toHaveLength(0);
  });

  test('should handle invalid format gracefully', () => {
    // Act
    const blockKey = BlockKey.fromString('invalid_format');

    // Assert
    expect(blockKey).toBeInstanceOf(BlockKey);
    expect(blockKey.key).toHaveLength(0);
  });

  test('should convert BlockKey to string and back to BlockKey', () => {
    // Arrange
    const originalBlockKey = new BlockKey();
    originalBlockKey.push([{ id: 10 }, { id: 20 }] as any, 5);
    originalBlockKey.push([{ id: 30 }, { id: 40 }] as any, 6);

    // Act
    const blockKeyString = originalBlockKey.toString();
    const recreatedBlockKey = BlockKey.fromString(blockKeyString);

    // Assert
    expect(recreatedBlockKey.key).toHaveLength(originalBlockKey.key.length);
    
    // Compare each fragment
    for (let i = 0; i < originalBlockKey.key.length; i++) {
      expect(recreatedBlockKey.key[i].ids).toEqual(originalBlockKey.key[i].ids);
      expect(recreatedBlockKey.key[i].index).toEqual(originalBlockKey.key[i].index);
    }
  });
});