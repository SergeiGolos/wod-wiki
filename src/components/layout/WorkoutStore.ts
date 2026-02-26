import { create } from 'zustand';
import { WodBlock, WodBlockState } from '../../markdown-editor/types';

interface WorkoutState {
  blocks: WodBlock[];
  activeBlockId: string | null;
  
  // Actions
  setBlocks: (blocks: WodBlock[]) => void;
  updateBlock: (id: string, updates: Partial<WodBlock>) => void;
  setActiveBlockId: (id: string | null) => void;
  setBlockState: (id: string, state: WodBlockState) => void;
}

export const useWorkoutStore = create<WorkoutState>((set) => ({
  blocks: [],
  activeBlockId: null,

  setBlocks: (blocks) => set({ blocks }),
  
  updateBlock: (id, updates) => set((state) => ({
    blocks: state.blocks.map(b => b.id === id ? { ...b, ...updates } : b)
  })),

  setActiveBlockId: (id) => set({ activeBlockId: id }),

  setBlockState: (id, state) => set((s) => ({
    blocks: s.blocks.map(b => b.id === id ? { ...b, state } : b)
  }))
}));
