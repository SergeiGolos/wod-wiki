import { indexedDBService } from '@/services/db/IndexedDBService';

import { BUNDLED_EFFORTS } from './bundledEfforts';
import type { EffortRecord, IEffortStore } from './types';
import { assertValidEffortBatch, assertValidEffortRecord } from './validation';

interface EffortStorage {
  getAllEfforts(): Promise<EffortRecord[]>;
  saveEffort(effort: EffortRecord): Promise<string>;
  deleteEffort(slug: string): Promise<void>;
}

export class IndexedDbEffortStore implements IEffortStore {
  constructor(
    private readonly storage: EffortStorage = indexedDBService,
    private readonly bundledEfforts: readonly EffortRecord[] = BUNDLED_EFFORTS,
  ) {}

  async loadBundled(): Promise<readonly EffortRecord[]> {
    const bundled = [...this.bundledEfforts];
    assertValidEffortBatch(bundled, 'bundledEfforts');
    return bundled;
  }

  async loadUser(): Promise<readonly EffortRecord[]> {
    const userEfforts = await this.storage.getAllEfforts();
    assertValidEffortBatch(userEfforts, 'userEfforts');
    return userEfforts;
  }

  async writeUser(effort: EffortRecord): Promise<void> {
    assertValidEffortRecord(effort, 'effort');
    await this.storage.saveEffort(effort);
  }

  async removeUser(slug: string): Promise<void> {
    await this.storage.deleteEffort(slug);
  }
}
