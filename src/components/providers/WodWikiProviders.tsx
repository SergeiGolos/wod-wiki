import React, { ReactNode } from 'react';
import { SoundProvider } from '@/core/contexts/SoundContext';

interface WodWikiProvidersProps {
  children: ReactNode;
}

/**
 * Wrapper component that provides all necessary contexts for wod-wiki components
 */
export const WodWikiProviders: React.FC<WodWikiProvidersProps> = ({ children }) => {
  return (
    <SoundProvider>
      {children}
    </SoundProvider>
  );
};
