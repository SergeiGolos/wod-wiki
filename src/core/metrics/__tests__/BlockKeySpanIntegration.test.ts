import { describe, test, expect } from 'vitest';
import { ResultSpanBuilder } from '../ResultSpanBuilder';
import { BlockKey } from '../../BlockKey';
import { RuntimeSpan } from '../../RuntimeSpan';

describe('BlockKey to string integration with ResultSpanBuilder', () => {
  test('should handle BlockKey objects in getSpansByBlockKey', () => {
    // Arrange
    const builder = new ResultSpanBuilder();
    
    // Create a BlockKey
    const blockKey = new BlockKey();
    blockKey.push([{ id: 1 }, { id: 2 }] as any, 0);
    const blockKeyString = blockKey.toString();
    
    // Create a RuntimeSpan with string blockKey
    const span = new RuntimeSpan();
    span.blockKey = blockKeyString;
    span.metrics = [];
    
    // Register the span
    builder.registerSpan(span);
    
    // Act & Assert
    // Test with BlockKey object
    const spansWithBlockKey = builder.getSpansByBlockKey(blockKey);
    expect(spansWithBlockKey).toHaveLength(1);
    
    // Test with string
    const spansWithString = builder.getSpansByBlockKey(blockKeyString);
    expect(spansWithString).toHaveLength(1);
  });
  
  test('should handle string blockKey in getSpansByBlockKey', () => {
    // Arrange
    const builder = new ResultSpanBuilder();
    
    // Create a RuntimeSpan with string blockKey
    const span = new RuntimeSpan();
    span.blockKey = '1,2(0)';
    span.metrics = [];
    
    // Register the span
    builder.registerSpan(span);
    
    // Act & Assert
    // Test with string
    const spansWithString = builder.getSpansByBlockKey('1,2(0)');
    expect(spansWithString).toHaveLength(1);
    
    // Test with BlockKey object
    const blockKey = BlockKey.fromString('1,2(0)');
    const spansWithBlockKey = builder.getSpansByBlockKey(blockKey);
    expect(spansWithBlockKey).toHaveLength(1);
  });
  
  test('should handle BlockKey objects in createHierarchicalView', () => {
    // Arrange
    const builder = new ResultSpanBuilder();
    
    // Create BlockKeys
    const rootBlockKey = new BlockKey();
    rootBlockKey.push([{ id: 1 }] as any, 0);
    const rootBlockKeyString = rootBlockKey.toString();
    
    const childBlockKey = new BlockKey();
    childBlockKey.push([{ id: 2 }] as any, 0);
    const childBlockKeyString = childBlockKey.toString();
    
    // Create a root RuntimeSpan with string blockKey
    const rootSpan = new RuntimeSpan();
    rootSpan.blockKey = rootBlockKeyString;
    rootSpan.metrics = [];
    rootSpan.children = [childBlockKeyString];
    
    // Create a child RuntimeSpan with string blockKey
    const childSpan = new RuntimeSpan();
    childSpan.blockKey = childBlockKeyString;
    childSpan.metrics = [];
    
    // Register the spans
    builder.registerSpan(rootSpan);
    builder.registerSpan(childSpan);
    
    // Act
    // Test with BlockKey object
    const hierarchyWithBlockKey = builder.createHierarchicalView(rootBlockKey);
    
    // Test with string
    const hierarchyWithString = builder.createHierarchicalView(rootBlockKeyString);
    
    // Assert
    expect(hierarchyWithBlockKey.children).toHaveLength(1);
    expect(hierarchyWithString.children).toHaveLength(1);
    
    // Check child nodes
    expect(hierarchyWithBlockKey.children[0].children).toHaveLength(1);
    expect(hierarchyWithString.children[0].children).toHaveLength(1);
  });
  
  test('should convert between BlockKey and string seamlessly', () => {
    // Arrange
    const originalBlockKey = new BlockKey();
    originalBlockKey.push([{ id: 10 }, { id: 20 }] as any, 5);
    
    const stringRepresentation = originalBlockKey.toString();
    const recreatedBlockKey = BlockKey.fromString(stringRepresentation);
    
    // Act
    const builder = new ResultSpanBuilder();
    
    // Create spans with different representations of the same BlockKey as strings
    const spanWithOriginalKey = new RuntimeSpan();
    spanWithOriginalKey.blockKey = originalBlockKey.toString();
    
    const spanWithStringKey = new RuntimeSpan();
    spanWithStringKey.blockKey = stringRepresentation;
    
    const spanWithRecreatedKey = new RuntimeSpan();
    spanWithRecreatedKey.blockKey = recreatedBlockKey.toString();
    
    builder.registerSpan(spanWithOriginalKey);
    
    // Assert - all should match the original key
    expect(builder.getSpansByBlockKey(originalBlockKey)).toHaveLength(1);
    expect(builder.getSpansByBlockKey(stringRepresentation)).toHaveLength(1);
    expect(builder.getSpansByBlockKey(recreatedBlockKey)).toHaveLength(1);
  });
});