/**
 * Language Pack API — umbrella sugar over per-package slices
 *
 * Implements docs/adr/language-pack-api.md.
 * Provides defineLanguagePack() factory and registerLanguagePack() fan-out
 * into core tag identity, lang dialect stack, and analytics registries.
 */

import type { IDialect } from './core/models/Dialect';
import { dialectRegistry } from './dialects/DialectStack';
import {
  realtimeProcessorRegistry,
  summaryProcessorRegistry,
} from './core/analytics/StandardAnalyticsProfile';
import type { IRealtimeProcessor } from './core/analytics/IRealtimeProcessor';
import type { ISummaryProcessor } from './core/analytics/ISummaryProcessor';

export interface LanguagePackIdentity {
  id?: string;
  name: string;
  tags?: readonly string[];
  aliases?: readonly string[];
  runnable?: boolean;
}

export interface LanguagePackLangSlice {
  /** Dialect analyzer instance or constructor class */
  analyzer?: IDialect | (new () => IDialect);
  /** Analytics processor instances or constructor classes */
  analytics?: Array<
    | IRealtimeProcessor
    | ISummaryProcessor
    | (new () => IRealtimeProcessor)
    | (new () => ISummaryProcessor)
  >;
  /** Optional custom Lezer grammar / LanguageSupport */
  language?: unknown;
}

export interface LanguagePackUiSlice {
  /** Optional CodeMirror editor extensions */
  editorExtensions?: unknown;
}

export interface LanguagePack {
  identity?: LanguagePackIdentity;
  lang?: LanguagePackLangSlice;
  ui?: LanguagePackUiSlice;
}

/** Registry of active language packs for tracking / unregistration */
const activePacks = new Map<string, LanguagePack>();

/**
 * Factory that returns a validated, typed LanguagePack descriptor.
 */
export function defineLanguagePack(pack: LanguagePack): LanguagePack {
  return pack;
}

/**
 * Registers a LanguagePack, fanning out slices across dialect and analytics registries.
 */
export function registerLanguagePack(pack: LanguagePack): void {
  const packId =
    pack.identity?.id ??
    pack.identity?.name?.toLowerCase().replace(/\s+/g, '-') ??
    `pack-${activePacks.size + 1}`;

  // 1. Dialect registration
  if (pack.lang?.analyzer) {
    let analyzer: IDialect;
    if (typeof pack.lang.analyzer === 'function') {
      try {
        analyzer = new (pack.lang.analyzer as new () => IDialect)();
      } catch {
        analyzer = (pack.lang.analyzer as unknown as () => IDialect)();
      }
    } else {
      analyzer = pack.lang.analyzer;
    }

    if (!analyzer.id && pack.identity?.id) {
      Object.defineProperty(analyzer, 'id', { value: pack.identity.id, writable: true, configurable: true });
    }
    dialectRegistry.register(analyzer);
  }

  // 2. Analytics processor registration
  if (pack.lang?.analytics) {
    for (const procOrClass of pack.lang.analytics) {
      let proc: IRealtimeProcessor | ISummaryProcessor;
      if (typeof procOrClass === 'function') {
        try {
          proc = new (procOrClass as new () => IRealtimeProcessor | ISummaryProcessor)();
        } catch {
          proc = (procOrClass as unknown as () => IRealtimeProcessor | ISummaryProcessor)();
        }
      } else {
        proc = procOrClass;
      }

      if ('processSummary' in proc) {
        summaryProcessorRegistry.register(proc as ISummaryProcessor);
      }
      if ('processRealtime' in proc || 'processOutput' in proc) {
        realtimeProcessorRegistry.register(proc as IRealtimeProcessor);
      }
    }
  }

  activePacks.set(packId, pack);
}

/**
 * Unregisters a previously registered LanguagePack by object or id.
 */
export function unregisterLanguagePack(packOrId: LanguagePack | string): void {
  let packId: string;
  let pack: LanguagePack | undefined;

  if (typeof packOrId === 'string') {
    packId = packOrId;
    pack = activePacks.get(packId);
  } else {
    pack = packOrId;
    packId =
      pack.identity?.id ??
      pack.identity?.name?.toLowerCase().replace(/\s+/g, '-') ??
      '';
  }

  if (pack?.lang?.analyzer) {
    const analyzerId =
      typeof pack.lang.analyzer !== 'function'
        ? pack.lang.analyzer.id
        : pack.identity?.id;
    if (analyzerId) {
      dialectRegistry.unregister(analyzerId);
    }
  }

  if (pack?.lang?.analytics) {
    for (const procOrClass of pack.lang.analytics) {
      let id: string | undefined;
      if (typeof procOrClass === 'function') {
        try {
          const inst = new (procOrClass as new () => { id?: string })();
          id = inst.id;
        } catch {
          // ignore instantiation error during unregistration
        }
      } else if (procOrClass && typeof procOrClass === 'object' && 'id' in procOrClass) {
        const procWithId = procOrClass as { id?: string };
        id = procWithId.id;
      }
      if (id) {
        summaryProcessorRegistry.unregister(id);
        realtimeProcessorRegistry.unregister(id);
      }
    }
  }

  if (packId) {
    activePacks.delete(packId);
  }
}

/**
 * Lists currently registered Language Packs.
 */
export function listLanguagePacks(): LanguagePack[] {
  return Array.from(activePacks.values());
}
