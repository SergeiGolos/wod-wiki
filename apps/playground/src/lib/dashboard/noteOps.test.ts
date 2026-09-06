import { describe, expect, it } from 'bun:test';

import { buildDashboardDocument } from './model';
import { parseDashboardNote } from './parser';
import {
  appendWidget,
  duplicateWidget,
  moveWidget,
  removeWidget,
  resizeWidget,
  updateWidget,
  widgetBodyLine,
  widgetFenceTag,
  type WidgetSpec,
} from './noteOps';

const RAW = `---
dashboard: true
title: Training
---

## Weekly Volume
How much work per week?

\`\`\`query:timeseries
sum:totalVolume{} rollup:1w
\`\`\`

Some prose between widgets stays put.

## Top Efforts

\`\`\`query:toplist-2
sum:totalVolume{} by {effort}
\`\`\`
`;

function docOf(raw: string) {
  const { meta, sections } = parseDashboardNote(raw);
  return buildDashboardDocument(sections, meta);
}

const SPEC: WidgetSpec = {
  title: 'New Widget',
  question: 'A question?',
  type: 'bar',
  wql: 'avg:tis{}',
};

describe('widgetFenceTag / widgetBodyLine', () => {
  it('builds the locked fence vocabulary', () => {
    expect(widgetFenceTag({ type: '' })).toBe('```query');
    expect(widgetFenceTag({ type: 'timeseries' })).toBe('```query:timeseries');
    expect(widgetFenceTag({ type: 'bar', spanCols: 2 })).toBe('```query:bar-2');
    expect(widgetFenceTag({ type: 'bar', spanFull: true })).toBe('```query:bar-full');
  });

  it('keeps params trailing after the query', () => {
    expect(widgetBodyLine({ wql: 'sum:totalVolume{}', params: ['300'] })).toBe('sum:totalVolume{} / 300');
    expect(widgetBodyLine({ wql: 'sum:totalVolume{}' })).toBe('sum:totalVolume{}');
  });
});

describe('appendWidget', () => {
  it('appends a group at the end, preserving frontmatter and body', () => {
    const next = appendWidget(RAW, SPEC);
    const doc = docOf(next);
    expect(doc.widgets).toHaveLength(3);
    const added = doc.widgets[2];
    expect(added.title).toBe('New Widget');
    expect(added.question).toBe('A question?');
    expect(added.type).toBe('bar');
    expect(added.query).toBe('avg:tis{}');
    expect(next.startsWith('---\ndashboard: true')).toBe(true);
    expect(next).toContain('Some prose between widgets stays put.');
  });
});

describe('updateWidget', () => {
  it('replaces title, question, type, span and WQL in place', () => {
    const next = updateWidget(RAW, 'w0', 'sum:totalVolume{} rollup:1w', {
      ...SPEC,
      type: 'value',
      spanFull: true,
      wql: 'max:power{}',
    })!;
    const doc = docOf(next);
    expect(doc.widgets).toHaveLength(2);
    expect(doc.widgets[0].title).toBe('New Widget');
    expect(doc.widgets[0].type).toBe('value');
    expect(doc.widgets[0].spanFull).toBe(true);
    expect(doc.widgets[0].query).toBe('max:power{}');
    // Second widget untouched, prose intact.
    expect(doc.widgets[1].title).toBe('Top Efforts');
    expect(next).toContain('Some prose between widgets stays put.');
  });

  it('returns null and writes nothing when the body guard fails', () => {
    expect(updateWidget(RAW, 'w0', 'sum:WRONG{}', SPEC)).toBeNull();
    expect(updateWidget(RAW, 'w9', 'sum:totalVolume{} rollup:1w', SPEC)).toBeNull();
  });
});

describe('duplicateWidget', () => {
  it('copies the whole group directly below the original', () => {
    const next = duplicateWidget(RAW, 'w0', 'sum:totalVolume{} rollup:1w')!;
    const doc = docOf(next);
    expect(doc.widgets).toHaveLength(3);
    expect(doc.widgets[0].title).toBe('Weekly Volume');
    expect(doc.widgets[1].title).toBe('Weekly Volume');
    expect(doc.widgets[1].query).toBe(doc.widgets[0].query);
    expect(doc.widgets[2].title).toBe('Top Efforts');
  });
});

describe('removeWidget', () => {
  it('removes the group including its heading and question', () => {
    const next = removeWidget(RAW, 'w0', 'sum:totalVolume{} rollup:1w')!;
    const doc = docOf(next);
    expect(doc.widgets).toHaveLength(1);
    expect(doc.widgets[0].title).toBe('Top Efforts');
    expect(next).toContain('Some prose between widgets stays put.');
  });

  it('keeps a bare block removable (no heading/question)', () => {
    const raw = `---
dashboard: true
---

\`\`\`query
sum:reps{}
\`\`\`
`;
    const next = removeWidget(raw, 'w0', 'sum:reps{}')!;
    expect(docOf(next).widgets).toHaveLength(0);
  });
});

describe('moveWidget', () => {
  it('moves a group with its heading and question past its neighbor', () => {
    const next = moveWidget(RAW, 'w0', 'sum:totalVolume{} rollup:1w', 1)!;
    const doc = docOf(next);
    expect(doc.widgets.map((w) => w.title)).toEqual(['Top Efforts', 'Weekly Volume']);
    expect(doc.widgets[1].question).toBe('How much work per week?');
    // Prose between the widgets was not part of either group — it stays.
    expect(next).toContain('Some prose between widgets stays put.');
  });

  it('moves a group back up', () => {
    const moved = moveWidget(RAW, 'w0', 'sum:totalVolume{} rollup:1w', 1)!;
    const back = moveWidget(moved, 'w1', 'sum:totalVolume{} rollup:1w', -1)!;
    expect(docOf(back).widgets.map((w) => w.title)).toEqual(['Weekly Volume', 'Top Efforts']);
  });

  it('is a no-op at the edges', () => {
    expect(moveWidget(RAW, 'w0', 'sum:totalVolume{} rollup:1w', -1)).toBe(RAW);
    expect(moveWidget(RAW, 'w1', 'sum:totalVolume{} by {effort}', 1)).toBe(RAW);
  });
});

describe('resizeWidget', () => {
  it('rewrites only the fence tag, preserving body and params', () => {
    const raw = `---
dashboard: true
---

\`\`\`query:value
sum:totalVolume{} / 300
\`\`\`
`;
    const next = resizeWidget(raw, 'w0', 'sum:totalVolume{} / 300', { spanCols: 2 })!;
    expect(next).toContain('```query:value-2');
    expect(next).toContain('sum:totalVolume{} / 300');
    expect(docOf(next).widgets[0].spanCols).toBe(2);
  });

  it('full span replaces a column span', () => {
    const next = resizeWidget(RAW, 'w1', 'sum:totalVolume{} by {effort}', { spanFull: true })!;
    expect(next).toContain('```query:toplist-full');
    expect(next).not.toContain('```query:toplist-2');
  });

  it('rejects out-of-range spans and stale bodies', () => {
    expect(resizeWidget(RAW, 'w0', 'sum:totalVolume{} rollup:1w', { spanCols: 5 })).toBeNull();
    expect(resizeWidget(RAW, 'w0', 'stale{}', { spanCols: 2 })).toBeNull();
  });
});

describe('identity guard across reorder', () => {
  it('a key+body pair still written after an unrelated reorder resolves to the same widget', () => {
    const moved = moveWidget(RAW, 'w0', 'sum:totalVolume{} rollup:1w', 1)!;
    // After the move the same physical widget is now w1 with the same body.
    const updated = updateWidget(moved, 'w1', 'sum:totalVolume{} rollup:1w', {
      ...SPEC,
      wql: 'sum:totalVolume{discipline:strength}',
    })!;
    const doc = docOf(updated);
    expect(doc.widgets[1].query).toBe('sum:totalVolume{discipline:strength}');
  });
});
