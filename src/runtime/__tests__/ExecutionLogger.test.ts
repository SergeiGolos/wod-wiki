import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionLogger } from '../ExecutionLogger';
import { IRuntimeMemory } from '../IRuntimeMemory';
import { ExecutionRecord } from '../models/ExecutionRecord';

describe('ExecutionLogger', () => {
  let memory: IRuntimeMemory;
  let logger: ExecutionLogger;

  beforeEach(() => {
    // Mock memory interface
    const store = new Map<string, any>();
    memory = {
      allocate: vi.fn((type, ownerId, data, visibility) => {
        const id = `${type}-${ownerId}-${Date.now()}`;
        const ref = { id, type, ownerId, visibility };
        store.set(id, { ...data, id }); // Store data with ID
        return ref;
      }),
      search: vi.fn((query) => {
        // Simple mock search implementation
        const results: any[] = [];
        store.forEach((value, key) => {
            // Match ownerId if provided, or return all if null
            if ((query.ownerId === null || value.blockId === query.ownerId) && query.type === 'execution-record') {
                results.push({ id: key, type: 'execution-record', ownerId: value.blockId });
            }
        });
        return results;
      }),
      get: vi.fn((ref) => store.get(ref.id)),
      set: vi.fn((ref, data) => store.set(ref.id, data)),
      release: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    } as unknown as IRuntimeMemory;

    logger = new ExecutionLogger(memory);
  });

  it('starts execution tracking', () => {
    const record = logger.startExecution('block-1', 'Timer', 'My Timer', null, []);

    expect(memory.allocate).toHaveBeenCalledWith(
      'execution-record',
      'block-1',
      expect.objectContaining({
        blockId: 'block-1',
        type: 'Timer',
        label: 'My Timer',
        status: 'active'
      }),
      'public'
    );
    expect(record.blockId).toBe('block-1');
    expect(record.status).toBe('active');
  });

  it('completes execution tracking', () => {
    // Start first
    logger.startExecution('block-1', 'Timer', 'My Timer', null, []);

    // Then complete
    logger.completeExecution('block-1');

    // Verify memory was updated
    const activeRef = logger.getActiveRecordId('block-1');
    // Note: getActiveRecordId returns null because it's now completed
    expect(activeRef).toBeNull();

    // Check logs
    const logs = logger.getLog();
    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe('completed');
    expect(logs[0].endTime).toBeDefined();
  });

  it('retrieves active record ID', () => {
    logger.startExecution('block-1', 'Timer', 'My Timer', null, []);

    const id = logger.getActiveRecordId('block-1');
    expect(id).not.toBeNull();
    expect(id).toContain('block-1');
  });
});
