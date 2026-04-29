import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { audioService } from '@/hooks/useBrowserServices';
import { useWorkbenchSyncStore } from '../layout/workbenchSyncStore';

interface AudioContextType {
    isEnabled: boolean;
    toggleAudio: () => void;
    playTestSound: () => void;
    playSound: (name: string, volume?: number) => void;
    playClick: () => void;
}

// Named WodAudioContext to avoid conflict with Web Audio API's native AudioContext
const WodAudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
    const [isEnabled, setIsEnabled] = useState(audioService.isEnabled());
    const castTransport = useWorkbenchSyncStore(s => s.castTransport);

    useEffect(() => {
        // Sync service state with component state
        audioService.setEnabled(isEnabled);
    }, [isEnabled]);

    const playSound = useCallback((name: string, volume: number = 1.0) => {
        if (!isEnabled) return;

        if (castTransport?.connected) {
            console.log(`[AudioContext] Routing sound '${name}' to cast receiver`);
            try {
                castTransport.send({
                    type: 'rpc-audio',
                    name,
                    volume
                });
            } catch (err) {
                console.error('[AudioContext] Failed to send rpc-audio', err);
                // Fallback to local if cast send fails
                audioService.playSound(name, volume);
            }
        } else {
            audioService.playSound(name, volume);
        }
    }, [isEnabled, castTransport]);

    const toggleAudio = useCallback(() => {
        const newState = !isEnabled;
        setIsEnabled(newState);
        // Note: useEffect syncs the service state, no need to call setEnabled here

        if (newState) {
            // Local beep to confirm toggle
            audioService.playSound('beep');
        }
    }, [isEnabled]);

    const playTestSound = useCallback(() => {
        playSound('chime');
    }, [playSound]);

    const playClick = useCallback(() => {
        playSound('click', 0.5);
    }, [playSound]);

    const value = useMemo(() => ({
        isEnabled,
        toggleAudio,
        playTestSound,
        playSound,
        playClick
    }), [isEnabled, toggleAudio, playTestSound, playSound, playClick]);

    return (
        <WodAudioContext.Provider value={value}>
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
