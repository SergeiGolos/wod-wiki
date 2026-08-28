import { describe, expect, it } from 'vitest';

import { parseFixtureFile } from './fixtureFile';

const HAPPY = [
  '---',
  'title: "Basic timers"',
  'sport: climb',
  '---',
  '',
  '## Script',
  '',
  '```wod',
  '5:00 Run',
  '```',
  '',
  '## Expected',
  '',
  '### Line 1',
  '- Duration 5:00 @parser',
  '- Effort "Run" @parser',
  '',
].join('\n');

describe('parseFixtureFile', () => {
  it('parses frontmatter, script fence, and expected statement blocks', () => {
    const fx = parseFixtureFile(HAPPY, 'basic.md');
    expect(fx.title).toBe('Basic timers');
    expect(fx.match).toBe('closed');
    expect(fx.options).toEqual({ sport: 'climb' });
    expect(fx.script).toBe('5:00 Run');
    expect(fx.statements).toHaveLength(1);
    expect(fx.statements[0].line).toBe(1);
    expect(fx.statements[0].metrics.map((m) => m.source)).toEqual([
      '- Duration 5:00 @parser',
      '- Effort "Run" @parser',
    ]);
  });

  it('defaults match to closed and options to empty', () => {
    const minimal = HAPPY.replace('title: "Basic timers"', 'title: Minimal').replace('\nsport: climb', '');
    const fx = parseFixtureFile(minimal, 'minimal.md');
    expect(fx.match).toBe('closed');
    expect(fx.options).toEqual({});
  });

  it('accepts withoutDialects: true', () => {
    const raw = HAPPY.replace('sport: climb', 'withoutDialects: true');
    expect(parseFixtureFile(raw, 'wd.md').options).toEqual({ withoutDialects: true });
  });

  it('accepts an Errors section instead of Expected', () => {
    const raw = HAPPY.slice(0, HAPPY.indexOf('## Expected'))
      + '## Errors\n\n- line 3: "bad timer"\n';
    const fx = parseFixtureFile(raw, 'err.md');
    expect(fx.errors).toEqual([{ line: 3, message: 'bad timer' }]);
    expect(fx.statements).toEqual([]);
  });

  it('diagnoses: missing title', () => {
    const raw = HAPPY.replace('title: "Basic timers"\n', '');
    expect(() => parseFixtureFile(raw, 'x.md')).toThrow(/x\.md.*frontmatter.*title/i);
  });

  it('diagnoses: unknown frontmatter key', () => {
    const raw = HAPPY.replace('sport: climb', 'bogus: 1');
    expect(() => parseFixtureFile(raw, 'x.md')).toThrow(/x\.md.*frontmatter.*bogus/i);
  });

  it('diagnoses: missing Script section', () => {
    const raw = HAPPY.slice(0, HAPPY.indexOf('## Script')) + HAPPY.slice(HAPPY.indexOf('## Expected'));
    expect(() => parseFixtureFile(raw, 'x.md')).toThrow(/x\.md.*## Script.*missing/i);
  });

  it('diagnoses: missing wod fence inside Script', () => {
    const raw = HAPPY.replace('```wod\n5:00 Run\n```', 'no fence here');
    expect(() => parseFixtureFile(raw, 'x.md')).toThrow(/x\.md.*## Script.*wod fence/i);
  });

  it('diagnoses: Expected and Errors together', () => {
    const raw = HAPPY + '\n## Errors\n\n- line 1: "x"\n';
    expect(() => parseFixtureFile(raw, 'x.md')).toThrow(/x\.md.*mutually exclusive/i);
  });

  it('diagnoses malformed metric lines with the real file line number', () => {
    const raw = HAPPY.replace('- Duration 5:00 @parser', '- Duration');
    // `- Duration` sits on file line 15 (1-based) in HAPPY.
    expect(() => parseFixtureFile(raw, 'x.md')).toThrow(/x\.md \[line 15\]/);
  });

  it('diagnoses unknown sections', () => {
    const raw = HAPPY + '\n## Mystery\n\ncontent\n';
    expect(() => parseFixtureFile(raw, 'x.md')).toThrow(/x\.md.*unknown section.*Mystery/i);
  });

  it('flags hasExpected true for an empty Expected section', () => {
    const raw = HAPPY.slice(0, HAPPY.indexOf('## Expected')) + '## Expected\n';
    const fx = parseFixtureFile(raw, 'empty.md');
    expect(fx.hasExpected).toBe(true);
    expect(fx.statements).toEqual([]);
  });

  it('diagnoses duplicate sections', () => {
    const raw = HAPPY + '\n## Script\n\n```wod\nx\n```\n';
    expect(() => parseFixtureFile(raw, 'x.md')).toThrow(/duplicate section "## Script"/);
  });

  it('diagnoses a bogus match value', () => {
    const raw = HAPPY.replace('sport: climb', 'match: fuzzy');
    expect(() => parseFixtureFile(raw, 'x.md')).toThrow(/match must be "subset" or "closed"/);
  });
});
