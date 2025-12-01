import { WodResult, WodResultMetadata } from '../../core/models/StorageModels';
import { v4 as uuidv4 } from 'uuid';

const RESULT_PREFIX = 'wodwiki:results:';
const DOC_PREFIX = 'wodwiki:docs:';

/**
 * LocalStorage implementation of storage provider.
 * Follows the architecture plan in docs/plan/local-storage-architecture.md
 */
export class LocalStorageProvider {

  // --- Result Operations ---

  async saveResult(result: WodResult): Promise<void> {
    try {
      const key = `${RESULT_PREFIX}${result.id}`;
      localStorage.setItem(key, JSON.stringify(result));
    } catch (e) {
      console.error('Failed to save result to localStorage', e);
      throw e;
    }
  }

  async getResult(id: string): Promise<WodResult | null> {
    const key = `${RESULT_PREFIX}${id}`;
    const data = localStorage.getItem(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as WodResult;
    } catch (e) {
      console.error('Failed to parse result from localStorage', e);
      return null;
    }
  }

  async listResults(documentId?: string): Promise<WodResultMetadata[]> {
    const results: WodResultMetadata[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(RESULT_PREFIX)) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const result = JSON.parse(item) as WodResult;
            // Filter by documentId if provided
            if (documentId && result.documentId !== documentId) {
                continue;
            }
            // Create metadata (omit logs)
            const { logs, ...metadata } = result;
            results.push(metadata);
          }
        } catch (e) {
          console.warn(`Failed to parse result at key ${key}`, e);
        }
      }
    }
    // Sort by timestamp descending (newest first)
    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  async deleteResult(id: string): Promise<void> {
    const key = `${RESULT_PREFIX}${id}`;
    localStorage.removeItem(key);
  }

  /**
   * Helper to get the most recent result (useful for hydration).
   */
  async getLatestResult(): Promise<WodResult | null> {
    const all = await this.listResults();
    if (all.length === 0) return null;
    return this.getResult(all[0].id);
  }
}

export const localStorageProvider = new LocalStorageProvider();
