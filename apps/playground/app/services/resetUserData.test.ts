import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

/**
 * resetUserData is a thin orchestrator over three stores: the primary DB
 * (via indexedDBService.wipe), localStorage, and sessionStorage.
 *
 * We mock @/services/db/IndexedDBService (registered BEFORE the resetUserData
 * import, which pulls it in at load time) so the test never touches the real
 * singleton. This avoids the cross-file stub leakage documented in
 * tests/run-isolated.ts. The real close+deleteDatabase behaviour of wipe() is
 * covered by src/services/db/IndexedDBService.test.ts in the library suite.
 */
const wipeMock = mock(() => Promise.resolve());
mock.module('@/services/db/IndexedDBService', () => ({
  indexedDBService: { wipe: wipeMock },
}));

import { resetUserData } from './resetUserData';

beforeEach(() => {
  wipeMock.mockReset();
  wipeMock.mockImplementation(() => Promise.resolve());
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('resetUserData', () => {
  it('clears localStorage and sessionStorage', async () => {
    localStorage.setItem('wodwiki.profile.v1', '{"x":1}');
    localStorage.setItem('debugMode', 'true');
    sessionStorage.setItem('spa-redirect', '/journal');

    await resetUserData();

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('delegates the primary store to indexedDBService.wipe()', async () => {
    await resetUserData();
    expect(wipeMock).toHaveBeenCalledTimes(1);
  });

  it('still clears the secondary stores when wipe rejects', async () => {
    wipeMock.mockImplementation(() => Promise.reject(new Error('simulated delete failure')));
    localStorage.setItem('debugMode', 'true');

    await resetUserData();

    expect(localStorage.length).toBe(0);
  });
});
