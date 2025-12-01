import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { audioService } from '../../services/AudioService';

interface AudioContextType {
    isEnabled: boolean;
    toggleAudio: () => void;
    playTestSound: () => void;
}

// Named WodAudioContext to avoid conflict with Web Audio API's native AudioContext
const WodAudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
    const [isEnabled, setIsEnabled] = useState(audioService.isEnabled());

    useEffect(() => {
        // Sync service state with component state
        audioService.setEnabled(isEnabled);
    }, [isEnabled]);

    const toggleAudio = useCallback(() => {
        const newState = !isEnabled;
        setIsEnabled(newState);
        // Note: useEffect syncs the service state, no need to call setEnabled here

        if (newState) {
            audioService.playSound('beep');
        }
    }, [isEnabled]);

    const playTestSound = useCallback(() => {
        if (isEnabled) {
            audioService.playSound('chime');
        }
    }, [isEnabled]);

    return (
        <WodAudioContext.Provider value={{ isEnabled, toggleAudio, playTestSound }}>
            {children}
        </WodAudioContext.Provider>
    );
}

export function useAudio() {
    const context = useContext(WodAudioContext);
    if (context === undefined) {
        throw new Error('useAudio must be used within an AudioProvider');
    }
    return context;
}
