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
    // If already open, dismiss the previous call before starting a new one.
    get()._resolve?.({ dismissed: true });

    return new Promise<PaletteResponse>((resolve) => {
      set({ isOpen: true, request, _resolve: resolve });
    });
  },

  _select(item) {
    const { _resolve } = get();
    set({ isOpen: false, request: null, _resolve: null });
    _resolve?.({ dismissed: false, item });
  },

  _dismiss() {
    const { _resolve } = get();
    set({ isOpen: false, request: null, _resolve: null });
    _resolve?.({ dismissed: true });
  },
}));
