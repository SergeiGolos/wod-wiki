import { describe, expect, it } from 'vitest';
import { parseWqlSuffixes } from '../src/wqlSuffix';

describe('WQL Stored Source binding and references', () => {
  it('parses stored source assignment (=> @sourceName)', () => {
    const parsed = parseWqlSuffixes('find:segment{effort:snatch} last 12w => @snatches');
    expect(parsed.primaryText).toBe('find:segment{effort:snatch}');
    expect(parsed.window).toEqual({ kind: 'relative', size: 12, unit: 'w', raw: 'last 12w' });
    expect(parsed.storedAs).toBe('@snatches');
  });

  it('parses stored source assignment without @ symbol', () => {
    const parsed = parseWqlSuffixes('find:session{plane:load} last 8w => mesoVolume');
    expect(parsed.primaryText).toBe('find:session{plane:load}');
    expect(parsed.storedAs).toBe('@mesoVolume');
  });

  it('parses pipeline source reference prefix (@source | ...)', () => {
    const parsed = parseWqlSuffixes('@snatches | sum:totalVolume by {week}');
    expect(parsed.sourceRef).toBe('@snatches');
    expect(parsed.primaryText).toBe('sum:totalVolume');
    expect(parsed.groupBy).toEqual(['week']);
  });

  it('parses arrow source reference prefix (@source => ...)', () => {
    const parsed = parseWqlSuffixes('@snatches => max:resistance by {week}');
    expect(parsed.sourceRef).toBe('@snatches');
    expect(parsed.primaryText).toBe('max:resistance');
    expect(parsed.groupBy).toEqual(['week']);
  });

  it('parses downstream in @source clause', () => {
    const parsed = parseWqlSuffixes('sum:totalVolume in @snatches by {week}');
    expect(parsed.sourceRef).toBe('@snatches');
    expect(parsed.primaryText).toBe('sum:totalVolume');
    expect(parsed.groupBy).toEqual(['week']);
  });

  it('flags duplicate => assignment clauses as conflicts', () => {
    const parsed = parseWqlSuffixes('find:note{} => @srcA => @srcB');
    expect(parsed.conflicts).toEqual([
      "Duplicate '=>' clause: '=> @srcA' conflicts with '=> @srcB'",
    ]);
  });
});
