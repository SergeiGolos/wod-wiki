import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { audioService } from '../../services/AudioService';

interface AudioContextType {
    isEnabled: boolean;
    toggleAudio: () => void;
    playTestSound: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
    const [isEnabled, setIsEnabled] = useState(audioService.isEnabled());

    useEffect(() => {
        // Sync service state with component state
        audioService.setEnabled(isEnabled);
    }, [isEnabled]);

    const toggleAudio = useCallback(() => {
        const newState = !isEnabled;
        setIsEnabled(newState);
        audioService.setEnabled(newState);

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
        <AudioContext.Provider value={{ isEnabled, toggleAudio, playTestSound }}>
            {children}
        </AudioContext.Provider>
    );
}

export function useAudio() {
    const context = useContext(AudioContext);
    if (context === undefined) {
        throw new Error('useAudio must be used within an AudioProvider');
    }
    return context;
}
