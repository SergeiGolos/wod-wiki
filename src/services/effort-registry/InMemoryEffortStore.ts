import type { EffortRecord, IEffortStore } from './types';
import { assertValidEffortBatch, assertValidEffortRecord } from './validation';

interface InMemoryEffortStoreOptions {
  bundled?: readonly EffortRecord[];
  user?: readonly EffortRecord[];
}

export class InMemoryEffortStore implements IEffortStore {
  private readonly bundled: EffortRecord[];
  private readonly user = new Map<string, EffortRecord>();

  constructor(options: InMemoryEffortStoreOptions = {}) {
    const bundled = [...(options.bundled ?? [])];
    const user = [...(options.user ?? [])];

    assertValidEffortBatch(bundled, 'bundled');
    assertValidEffortBatch(user, 'user');

    this.bundled = bundled;
    user.forEach(effort => {
      this.user.set(effort.slug, effort);
    });
  }

  async loadBundled(): Promise<readonly EffortRecord[]> {
    return [...this.bundled];
  }

  async loadUser(): Promise<readonly EffortRecord[]> {
    return Array.from(this.user.values());
  }

  async writeUser(effort: EffortRecord): Promise<void> {
    assertValidEffortRecord(effort, 'effort');
    this.user.set(effort.slug, effort);
  }

  async removeUser(slug: string): Promise<void> {
    this.user.delete(slug);
  }
}
