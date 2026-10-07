/** ProfileService: local bootstrap/update/persistence, API adapter against
 *  the shared storage singleton, and resizeImageToDataUrl validation. */
import { describe, expect, it } from 'bun:test';

import { DEFAULT_MEMBERSHIP_ID } from '@bitcobblers/wod-wiki-storage';
import { ApiProfileService, LocalStorageProfileService, resizeImageToDataUrl } from './index';
import { InMemoryBackend, LocalStore } from '../storage/LocalStore';
import { InMemoryStorage, resetStorageForTesting, setStorageForTesting } from '../storage';

const localService = () => new LocalStorageProfileService(new LocalStore('', new InMemoryBackend()));

describe('LocalStorageProfileService', () => {
  it('bootstraps the default membership on first current() and persists it', async () => {
    const backend = new InMemoryBackend();
    const service = new LocalStorageProfileService(new LocalStore('', backend));
    const membership = await service.current();
    expect(membership.id).toBe(DEFAULT_MEMBERSHIP_ID);
    expect(membership.createdAt).toBeGreaterThan(0);
    // A fresh instance over the same backend reads the persisted row — no re-bootstrap.
    const reread = await new LocalStorageProfileService(new LocalStore('', backend)).current();
    expect(reread).toEqual(membership);
  });

  it('update merges the patch, sets updatedAt, and persists', async () => {
    const backend = new InMemoryBackend();
    const service = new LocalStorageProfileService(new LocalStore('', backend));
    await service.current();

    const updated = await service.update({ displayName: 'Serge', weight: 75, weightUnit: 'kg' });
    expect(updated.displayName).toBe('Serge');
    expect(updated.weight).toBe(75);
    expect(updated.updatedAt).toBeGreaterThan(0);

    const reread = await new LocalStorageProfileService(new LocalStore('', backend)).current();
    expect(reread.displayName).toBe('Serge');
    expect(reread.weightUnit).toBe('kg');
  });

  it('currentSync returns the cached copy, undefined before bootstrap', async () => {
    const service = localService();
    expect(service.currentSync()).toBeUndefined();
    await service.current();
    expect(service.currentSync()?.id).toBe(DEFAULT_MEMBERSHIP_ID);
  });

  it('concurrent updates compose instead of racing last-write-wins', async () => {
    const backend = new InMemoryBackend();
    const service = new LocalStorageProfileService(new LocalStore('', backend));
    await service.current();
    await Promise.all([
      service.update({ weight: 82, weightUnit: 'kg' }),
      service.update({ height: 179, heightUnit: 'cm' }),
    ]);
    // The final state carries every patch, not whichever write finished last.
    const persisted = await new LocalStorageProfileService(new LocalStore('', backend)).current();
    expect(persisted.weight).toBe(82);
    expect(persisted.height).toBe(179);
  });
});

describe('ApiProfileService', () => {
  it('bootstraps into and updates through the memberships store', async () => {
    const mem = new InMemoryStorage();
    setStorageForTesting(mem);
    try {
      const service = new ApiProfileService();
      const membership = await service.current();
      expect(membership.id).toBe(DEFAULT_MEMBERSHIP_ID);
      // Miss bootstrapped a persisted default row.
      expect(await mem.readonly('memberships').get(DEFAULT_MEMBERSHIP_ID)).toEqual(membership);

      const updated = await service.update({ displayName: 'Api User' });
      expect(updated.displayName).toBe('Api User');
      expect((await mem.readonly('memberships').get(DEFAULT_MEMBERSHIP_ID))?.displayName).toBe('Api User');
      expect(service.currentSync()?.displayName).toBe('Api User');

      // Concurrent patches compose: each merges into the previous result.
      await Promise.all([
        service.update({ weight: 82, weightUnit: 'kg' }),
        service.update({ height: 179, heightUnit: 'cm' }),
      ]);
      const persisted = await mem.readonly('memberships').get(DEFAULT_MEMBERSHIP_ID);
      expect(persisted?.weight).toBe(82);
      expect(persisted?.height).toBe(179);
      expect(persisted?.displayName).toBe('Api User');
    } finally {
      resetStorageForTesting();
    }
  });
});

describe('resizeImageToDataUrl', () => {
  it('rejects non-image files', async () => {
    const file = new File(['not an image'], 'notes.txt', { type: 'text/plain' });
    expect(resizeImageToDataUrl(file)).rejects.toThrow('Not an image file');
  });
});
