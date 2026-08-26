import { describe, expect, it } from 'bun:test';
import { parseDashboardNote } from './parser';

describe('parseDashboardNote', () => {
  it('parses a basic dashboard note', () => {
    const raw = `---
dashboard: true
title: Test Dashboard
---

# My Dashboard
Welcome to my dashboard.

\`\`\`query:bar-2
sum:totalVolume{}
\`\`\`
`;
    const { meta, sections } = parseDashboardNote(raw);
    expect(meta.dashboard).toBe('true');
    expect(sections).toHaveLength(3);
    
    expect(sections[0].type).toBe('markdown');
    expect(sections[0].subtype).toBe('heading');
    
    expect(sections[1].type).toBe('markdown');
    expect(sections[1].subtype).toBe('paragraph');
    
    expect(sections[2].type).toBe('query');
    expect(sections[2].widgetType).toBe('bar');
    expect(sections[2].spanCols).toBe(2);
    expect(sections[2].content).toBe('sum:totalVolume{}');
    expect(sections[2].startLine).toBe(8);
    expect(sections[2].endLine).toBe(10);
  });
});
