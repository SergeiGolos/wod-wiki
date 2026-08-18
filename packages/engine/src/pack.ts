/**
 * Language Pack API — umbrella sugar over per-package slices
 *
 * Implements docs/adr/language-pack-api.md.
 * Provides defineLanguagePack() factory and registerLanguagePack() fan-out
 * into core tag identity, lang dialect stack, and analytics registries.
 */

import type { IDialect } from '@wod-wiki/core';
import type { IRealtimeProcessor, ISummaryProcessor } from '@wod-wiki/lang';
import {
  dialectRegistry,
  realtimeProcessorRegistry,
  summaryProcessorRegistry,
} from '@wod-wiki/lang';

export interface LanguagePackIdentity {
  id?: string;
  name: string;
  tags?: readonly string[];
  aliases?: readonly string[];
  runnable?: boolean;
}

export interface LanguagePackLangSlice {
  analyzer?: new () => IDialect;
  analytics?: ReadonlyArray<new () => IRealtimeProcessor | ISummaryProcessor>;
}

export interface LanguagePackUiSlice {
  widgetBlock?: unknown;
}

export interface LanguagePack {
  identity?: LanguagePackIdentity;
  lang?: LanguagePackLangSlice;
  ui?: LanguagePackUiSlice;
}

const activePacks = new Map<string, LanguagePack>();

export function defineLanguagePack(pack: LanguagePack): LanguagePack {
  return pack;
}

export function registerLanguagePack(pack: LanguagePack): void {
  const packId = pack.identity?.id ?? pack.identity?.name ?? 'anonymous-pack';
  activePacks.set(packId, pack);

  if (pack.lang?.analyzer) {
    const AnalyzerCtor = pack.lang.analyzer;
    const instance = new AnalyzerCtor();
    dialectRegistry.register(instance);
  }

  if (pack.lang?.analytics) {
    for (const ProcessorCtor of pack.lang.analytics) {
      const instance = new ProcessorCtor();
      if ('processOutput' in instance) {
        realtimeProcessorRegistry.register(instance as IRealtimeProcessor);
      }
      if ('processSummary' in instance) {
        summaryProcessorRegistry.register(instance as ISummaryProcessor);
      }
    }
  }
}

export function unregisterLanguagePack(packOrId: LanguagePack | string): void {
  const packId = typeof packOrId === 'string'
    ? packOrId
    : (packOrId.identity?.id ?? packOrId.identity?.name ?? 'anonymous-pack');

  const pack = activePacks.get(packId);
  activePacks.delete(packId);

  if (pack?.lang?.analyzer) {
    const instance = new pack.lang.analyzer();
    dialectRegistry.unregister(instance.id);
  } else if (typeof packOrId === 'string') {
    dialectRegistry.unregister(packOrId);
  }

  if (pack?.lang?.analytics) {
    for (const ProcessorCtor of pack.lang.analytics) {
      const instance = new ProcessorCtor();
      if ('processOutput' in instance) {
        realtimeProcessorRegistry.unregister((instance as IRealtimeProcessor).id);
      }
      if ('processSummary' in instance) {
        summaryProcessorRegistry.unregister((instance as ISummaryProcessor).id);
      }
    }
  }
}

export function listLanguagePacks(): LanguagePack[] {
  return Array.from(activePacks.values());
}

export function getRegisteredLanguagePacks(): LanguagePack[] {
  return Array.from(activePacks.values());
}
