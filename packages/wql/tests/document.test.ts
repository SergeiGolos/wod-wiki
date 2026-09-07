import { describe, expect, it } from 'vitest';
import { parseDocument, serializeDocument } from '../src/document';

describe('ticket 17 — query documents', () => {
  it('single-query blocks parse as a degenerate document (zero behavior change)', () => {
    const { doc, diagnostics } = parseDocument('sum:totalVolume{} last 4w');
    expect(diagnostics).toEqual([]);
    expect(doc.degenerate).toBe(true);
    expect(doc.assignments).toHaveLength(1);
    expect(doc.assignments[0]!.name).toBe('query');
    expect(doc.show).toEqual(['query']);
    // Round-trips losslessly.
    expect(serializeDocument(doc)).toBe('sum:totalVolume{} last 4w');
  });

  it('parses defaults, named assignments, and show', () => {
    const text = [
      'defaults by {week} last 4w',
      'distance = sum:distance{}',
      'elapsed = sum:elapsed{}',
      'speed = distance / elapsed -> min/km',
      'show distance, speed',
    ].join('\n');
    const { doc, diagnostics } = parseDocument(text);
    expect(diagnostics).toEqual([]);
    expect(doc.defaults?.groupBy).toEqual(['week']);
    expect(doc.defaults?.window).toEqual({ kind: 'relative', size: 4, unit: 'w' });
    expect(doc.assignments.map((a) => a.name)).toEqual(['distance', 'elapsed', 'speed']);
    expect(doc.assignments[2]!.kind).toBe('formula');
    expect(doc.assignments[2]!.formula?.unit).toBe('min/km');
    expect(doc.show).toEqual(['distance', 'speed']);
  });

  it('detects reference cycles as a document-level diagnostic', () => {
    const { diagnostics } = parseDocument('a = b + 1\nb = a + 1\nshow a');
    expect(diagnostics.some((d) => d.toLowerCase().includes('cycle'))).toBe(true);
  });

  it('flags unknown show names', () => {
    const { diagnostics } = parseDocument('a = sum:x{}\nshow a, nope');
    expect(diagnostics.length).toBeGreaterThan(0);
  });

  it('forward references are allowed (evaluation order follows the reference graph)', () => {
    const text = 'speed = distance / elapsed\ndistance = sum:distance{}\nelapsed = sum:elapsed{}\nshow speed';
    const { diagnostics, doc } = parseDocument(text);
    expect(diagnostics).toEqual([]);
    expect(doc.assignments.map((a) => a.name)).toEqual(['speed', 'distance', 'elapsed']);
  });
});
