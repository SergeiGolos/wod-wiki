import '@testing-library/jest-dom';
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import crossfitJournal from '../../../packages/wql/fixtures/corpus/crossfit-multi-week.json';
import {
  QueryService,
  inMemoryEventStore,
  createParser,
  getHints,
  hintsToContainer,
  defineLanguagePack,
  registerLanguagePack,
  unregisterLanguagePack,
  dialectRegistry,
  type IDialect,
  type ICodeStatement,
  type DialectAnalysis,
  type LanguagePack,
} from '@bitcobblers/wod-wiki-engine';
import { LanguageWorkbench } from '../src/LanguageWorkbench.stories';

const DEMO_PACK_ID = 'demo-pack';

class DemoPackDialect implements IDialect {
  id = DEMO_PACK_ID;
  name = 'Demo Pack';
  priority = 10;
  analyze(statement: ICodeStatement): DialectAnalysis {
    const raw = (statement.meta as { raw?: string })?.raw ?? '';
    if (/benchmark/i.test(raw)) {
      return { metrics: hintsToContainer(['demo.pack']) };
    }
    return {};
  }
}

const demoPack: LanguagePack = defineLanguagePack({
  identity: {
    id: DEMO_PACK_ID,
    name: 'Demo Pack',
  },
  lang: {
    analyzer: new DemoPackDialect(),
  },
});

describe('LanguageWorkbench in apps/storybook', () => {
  beforeAll(() => {
    if (typeof window !== 'undefined') {
      if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = (cb: FrameRequestCallback) =>
          setTimeout(() => cb(Date.now()), 16) as unknown as number;
      }
      if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = (id: number) => clearTimeout(id);
      }
      if (typeof Range !== 'undefined') {
        if (!Range.prototype.getClientRects) {
          Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
        }
        if (!Range.prototype.getBoundingClientRect) {
          Range.prototype.getBoundingClientRect = () => ({
            top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => {},
          } as DOMRect);
        }
      }
    }
  });

  beforeEach(() => {
    unregisterLanguagePack(demoPack);
    dialectRegistry.unregister(DEMO_PACK_ID);
  });

  afterEach(() => {
    unregisterLanguagePack(demoPack);
    dialectRegistry.unregister(DEMO_PACK_ID);
  });

  it('loads the crossfit corpus journal with 60 records', () => {
    expect(crossfitJournal.kind).toBe('event-journal');
    expect(crossfitJournal.records).toHaveLength(60);
  });

  it('evaluates WQL queries against inMemoryEventStore in real time', async () => {
    const store = inMemoryEventStore(crossfitJournal.records as any);
    const service = new QueryService(store);

    const newest = Math.max(...crossfitJournal.records.map((f) => f.timestamp));
    const result = await service.runQuery('sum:totalVolume{} by {week}', {
      rangeEnd: newest,
      preferredUnit: 'lb',
    });

    expect(result.series).toBeDefined();
    expect(result.series.length).toBeGreaterThan(0);
    // 6 weeks of volume facts
    const totalVolumePoints = result.series[0].points;
    expect(totalVolumePoints.length).toBe(6);
    const sumTotal = totalVolumePoints.reduce((acc, p) => acc + p.value, 0);
    expect(sumTotal).toBeGreaterThan(50000);
  });

  it('parses Whiteboard Script and extracts hints', () => {
    const parser = createParser();
    const scriptText = [
      '// benchmark: Fran',
      '(21-15-9)',
      '  Thrusters @95lb',
      '  Pull-ups',
    ].join('\n');

    const script = parser.read(scriptText);
    expect(script.statements.length).toBeGreaterThanOrEqual(1);

    const hints = script.statements.flatMap((s) => getHints(s));
    // Default stack does not include demo.pack
    expect(hints).not.toContain('demo.pack');
  });

  it('dynamically registers Language Pack at runtime without server restart', () => {
    const parser = createParser();
    const scriptText = [
      '// benchmark: Fran',
      '(21-15-9)',
      '  Thrusters @95lb',
      '  Pull-ups',
    ].join('\n');

    // 1. Before registration: no demo.pack hint
    let script = parser.read(scriptText);
    let hints = script.statements.flatMap((s) => getHints(s));
    expect(hints).not.toContain('demo.pack');

    // 2. Register demo pack dynamically
    registerLanguagePack(demoPack);
    expect(dialectRegistry.has(DEMO_PACK_ID)).toBe(true);

    // 3. Immediately re-parse: demo.pack hint appears
    script = parser.read(scriptText);
    hints = script.statements.flatMap((s) => getHints(s));
    expect(hints).toContain('demo.pack');

    // 4. Unregister demo pack: demo.pack hint disappears
    unregisterLanguagePack(demoPack);
    expect(dialectRegistry.has(DEMO_PACK_ID)).toBe(false);

    script = parser.read(scriptText);
    hints = script.statements.flatMap((s) => getHints(s));
    expect(hints).not.toContain('demo.pack');
  });

  it('renders LanguageWorkbench UI and responds to interactive pack registration', async () => {
    render(<LanguageWorkbench />);

    expect(screen.getByTestId('language-workbench')).toBeInTheDocument();
    expect(screen.getByTestId('statement-count')).toHaveTextContent(/^[1-9]\d*$/);

    const toggleBtn = screen.getByTestId('toggle-demo-pack');
    expect(toggleBtn).toHaveTextContent('register demo pack');

    // Click to register demo pack
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    expect(toggleBtn).toHaveTextContent('✓ demo pack registered');
    expect(screen.getByTestId('hint-keys')).toHaveTextContent('demo.pack');

    // Click to unregister demo pack
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    expect(toggleBtn).toHaveTextContent('register demo pack');
    expect(screen.getByTestId('hint-keys')).not.toHaveTextContent('demo.pack');
  });
});
