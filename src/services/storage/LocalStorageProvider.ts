import { WodResult, WodResultMetadata } from '../../core/models/StorageModels';

const RESULT_PREFIX = 'wodwiki:results:';
const DOC_PREFIX = 'wodwiki:docs:'; // Reserved for future document storage feature

/**
 * LocalStorage implementation of storage provider.
 * Follows the architecture plan in docs/plan/local-storage-architecture.md
 * 
 * Note: Methods are kept async for future extensibility (e.g., switching to IndexedDB).
 * The current localStorage implementation is synchronous but wrapped in async for API consistency.
 */
export class LocalStorageProvider {

  /**
   * Validates that a parsed object conforms to the WodResult interface.
   */
  private validateWodResult(data: unknown): data is WodResult {
    if (typeof data !== 'object' || data === null) return false;
    const obj = data as Record<string, unknown>;
    return (
      typeof obj.id === 'string' &&
      typeof obj.documentId === 'string' &&
      typeof obj.documentTitle === 'string' &&
      typeof obj.timestamp === 'number' &&
      typeof obj.duration === 'number' &&
      Array.isArray(obj.logs) &&
      typeof obj.schemaVersion === 'number'
    );
  }

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
      const parsed = JSON.parse(data);
      if (!this.validateWodResult(parsed)) {
        console.error('Invalid WodResult structure in localStorage', id);
        return null;
      }
      return parsed;
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
            const parsed = JSON.parse(item);
            // Validate the result structure
            if (!this.validateWodResult(parsed)) {
              console.warn(`Invalid WodResult structure at key ${key}`);
              continue;
            }
            const result = parsed as WodResult;
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
