import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SoundService } from '../components/syncs/services/SoundService';

interface SoundContextType {
  soundEnabled: boolean;
  toggleSound: () => void;
  playSound: (soundType: 'start' | 'complete' | 'countdown' | 'tick') => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

interface SoundProviderProps {
  children: ReactNode;
}

export const SoundProvider: React.FC<SoundProviderProps> = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const soundService = SoundService.getInstance();

  // Load sound preference from localStorage on initial mount
  useEffect(() => {
    const savedPreference = localStorage.getItem('wod-wiki-sound-enabled');
    const initialState = savedPreference === 'true';
    setSoundEnabled(initialState);
    soundService.setEnabled(initialState);
  }, []);

  // Save preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('wod-wiki-sound-enabled', soundEnabled.toString());
    soundService.setEnabled(soundEnabled);
  }, [soundEnabled]);

  const toggleSound = () => {
    setSoundEnabled(prev => !prev);
  };

  const playSound = (soundType: 'start' | 'complete' | 'countdown' | 'tick') => {
    soundService.play(soundType);
  };

  return (
    <SoundContext.Provider value={{ soundEnabled, toggleSound, playSound }}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = (): SoundContextType => {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
};
