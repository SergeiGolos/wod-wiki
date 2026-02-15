import { create } from 'zustand';

export type TutorialType = 'history' | 'plan' | 'track' | 'review';

interface TutorialState {
    activeTutorial: TutorialType | null;
    run: boolean;
    startTutorial: (name: TutorialType) => void;
    stopTutorial: () => void;
}

export const useTutorialStore = create<TutorialState>((set) => ({
    activeTutorial: null,
    run: false,
    startTutorial: (name) => set({ activeTutorial: name, run: true }),
    stopTutorial: () => set({ activeTutorial: null, run: false }),
}));
