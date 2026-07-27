import { create } from 'zustand';
import { ScriptBlock, ScriptBlockState } from '@/components/Editor/types';

interface WorkoutState {
  blocks: ScriptBlock[];
  activeBlockId: string | null;
  
  // Actions
  setBlocks: (blocks: ScriptBlock[]) => void;
  updateBlock: (id: string, updates: Partial<ScriptBlock>) => void;
  setActiveBlockId: (id: string | null) => void;
  setBlockState: (id: string, state: ScriptBlockState) => void;
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
