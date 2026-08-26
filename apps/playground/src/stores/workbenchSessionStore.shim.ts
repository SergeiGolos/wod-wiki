/**
 * workbenchSessionStore.shim — static surface for the Workbench Session.
 *
 * Some call sites (cast bridge, runtime lifecycle, workbench sync-from-event)
 * need imperative access to the active store (`.getState()` / `.setState()` /
 * `.subscribe()`) without rendering a component. This module re-exports
 * `getActiveWorkbenchSessionStore` as `useWorkbenchSessionStore` for that
 * purpose. Component code should keep using `useWorkbenchSession(selector)`.
 */
import { getActiveWorkbenchSessionStore, type WorkbenchSessionStore } from './workbenchSessionStore';

interface UseWorkbenchSessionStoreFn {
  getState(): WorkbenchSessionStore;
  setState(
    partial:
      | Partial<WorkbenchSessionStore>
      | ((s: WorkbenchSessionStore) => Partial<WorkbenchSessionStore>),
    replace?: false,
  ): void;
  subscribe(listener: (s: WorkbenchSessionStore) => void): () => void;
}

const useWorkbenchSessionStore: UseWorkbenchSessionStoreFn = {
  getState: () => getActiveWorkbenchSessionStore().getState(),
  setState: (partial, replace) => {
    const api = getActiveWorkbenchSessionStore();
    if (typeof partial === 'function') {
      api.setState(partial(api.getState()) as Partial<WorkbenchSessionStore>, replace);
    } else {
      api.setState(partial, replace);
    }
  },
  subscribe: (listener) => getActiveWorkbenchSessionStore().subscribe(listener),
};

export { useWorkbenchSessionStore };
