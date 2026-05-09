import { create } from 'zustand';
import type { PaletteRequest, PaletteResponse, PaletteItem } from './palette-types';

interface PaletteStore {
  isOpen: boolean;
  request: PaletteRequest | null;
  /** Internal: the resolver for the current open() call. */
  _resolve: ((response: PaletteResponse) => void) | null;

  /**
   * Open the palette with the given request.
   * Returns a Promise that resolves when the user selects an item or dismisses.
   *
   * Usage (anywhere — React, CodeMirror keymap, event listener):
   *   const result = await usePaletteStore.getState().open({ sources: [...] });
   *   if (!result.dismissed) { handle(result.item); }
   */
  open: (request: PaletteRequest) => Promise<PaletteResponse>;

  /** Called by PaletteShell when the user picks an item. */
  _select: (item: PaletteItem) => void;

  /** Called by PaletteShell when the user dismisses (Escape / overlay click). */
  _dismiss: () => void;
}

export const usePaletteStore = create<PaletteStore>((set, get) => ({
  isOpen: false,
  request: null,
  _resolve: null,

  open(request) {
    // If there's a pending resolver (previous step), clear it — we're
    // replacing the step, not dismissing. Don't resolve it as dismissed.
    // (The caller already has its result and is chaining to the next step.)
    const { _resolve: existing } = get();
    if (existing) {
      // Shouldn't normally be non-null here; guard just in case.
      set({ _resolve: null });
    }

    return new Promise<PaletteResponse>((resolve) => {
      // Keep isOpen: true if already open — swapping the request in-place
      // keeps the dialog visible so the Radix animation never fires between steps.
      set({ isOpen: true, request, _resolve: resolve });
    });
  },

  _select(item) {
    const { _resolve } = get();

    // Clear the resolver immediately so open() knows no step is pending.
    set({ _resolve: null });

    // Resolve the caller's awaited promise.
    _resolve?.({ dismissed: false, item });

    // Schedule a close. This fires AFTER all microtasks — including the
    // async-function continuation that may call open() for the next step.
    // If open() arrives first, _resolve will be non-null and we skip the close.
    setTimeout(() => {
      if (!get()._resolve) {
        set({ isOpen: false, request: null });
      }
    }, 0);
  },

  _dismiss() {
    const { _resolve } = get();
    set({ isOpen: false, request: null, _resolve: null });
    _resolve?.({ dismissed: true });
  },
}));
