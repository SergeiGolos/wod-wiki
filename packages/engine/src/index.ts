/**
 * @wod-wiki/engine
 * Umbrella re-export facade for Whiteboard Language & WQL engine.
 */

export * from '@wod-wiki/core';
export * from '@wod-wiki/lang';
export * from '@wod-wiki/wql';

export interface LanguagePack {
  name: string;
  dialects?: string[];
  version?: string;
}

const activePacks: Map<string, LanguagePack> = new Map();

export function defineLanguagePack(pack: LanguagePack): LanguagePack {
  return pack;
}

export function registerLanguagePack(pack: LanguagePack): void {
  activePacks.set(pack.name, pack);
}

export function getRegisteredLanguagePacks(): LanguagePack[] {
  return Array.from(activePacks.values());
}
