import { describe, it, expect, afterEach } from 'vitest';
import {
  defineLanguagePack,
  registerLanguagePack,
  unregisterLanguagePack,
  listLanguagePacks,
  createParser,
  getHints,
  hintsToContainer,
  dialectRegistry,
  realtimeProcessorRegistry,
  summaryProcessorRegistry,
  type IDialect,
  type ICodeStatement,
  type DialectAnalysis,
  type IRealtimeProcessor,
  type ISummaryProcessor,
} from '../src/index';

const SWIM_DIALECT_ID = 'test-swim';

class SwimDialect implements IDialect {
  id = SWIM_DIALECT_ID;
  name = 'Swimming Dialect';
  priority = 10;
  analyze(statement: ICodeStatement): DialectAnalysis {
    const raw = statement.meta?.raw ?? '';
    if (/freestyle|butterfly|breaststroke/i.test(raw)) {
      return { metrics: hintsToContainer(['swim.stroke', 'sport.swimming']) };
    }
    return {};
  }
}

class TestRealtimeProcessor implements IRealtimeProcessor {
  id = 'test-realtime-proc';
  name = 'Test Realtime Processor';
  processOutput() {}
  process(output: any) { return output; }
}

class TestSummaryProcessor implements ISummaryProcessor {
  id = 'test-summary-proc';
  name = 'Test Summary Processor';
  processSummary() {}
  summarize() { return []; }
}

describe('Language Pack API', () => {
  afterEach(() => {
    unregisterLanguagePack(SWIM_DIALECT_ID);
    unregisterLanguagePack('test-swim-pack');
    dialectRegistry.unregister(SWIM_DIALECT_ID);
    realtimeProcessorRegistry.unregister('test-realtime-proc');
    summaryProcessorRegistry.unregister('test-summary-proc');
  });

  it('defines and registers a Language Pack with dialect slice', () => {
    const pack = defineLanguagePack({
      identity: { id: 'test-swim-pack', name: 'Swimming Pack', tags: ['swim'] },
      lang: { analyzer: SwimDialect },
    });

    expect(pack.identity?.name).toBe('Swimming Pack');
    registerLanguagePack(pack);

    expect(dialectRegistry.has(SWIM_DIALECT_ID)).toBe(true);

    // Verify live parse honors registered pack immediately
    const parser = createParser();
    const script = parser.read('100m Freestyle');
    const hints = script.statements.flatMap((s) => getHints(s));

    expect(hints).toContain('swim.stroke');
    expect(hints).toContain('sport.swimming');
  });

  it('registers and unregisters analytics processors in the Language Pack', () => {
    const pack = defineLanguagePack({
      identity: { id: 'test-analytics-pack', name: 'Analytics Pack' },
      lang: {
        analytics: [TestRealtimeProcessor, TestSummaryProcessor],
      },
    });

    registerLanguagePack(pack);
    expect(realtimeProcessorRegistry.has('test-realtime-proc')).toBe(true);
    expect(summaryProcessorRegistry.has('test-summary-proc')).toBe(true);

    unregisterLanguagePack(pack);
    expect(realtimeProcessorRegistry.has('test-realtime-proc')).toBe(false);
    expect(summaryProcessorRegistry.has('test-summary-proc')).toBe(false);
  });

  it('lists active Language Packs', () => {
    const pack = defineLanguagePack({
      identity: { id: 'test-swim-pack', name: 'Swimming Pack' },
      lang: { analyzer: SwimDialect },
    });

    registerLanguagePack(pack);
    const packs = listLanguagePacks();
    expect(packs.some((p) => p.identity?.id === 'test-swim-pack')).toBe(true);
  });
});
