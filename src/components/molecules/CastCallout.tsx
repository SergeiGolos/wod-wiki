import React, { useState, useEffect } from 'react'
import { Cast, ArrowUpRight } from 'lucide-react'
import { ChromecastSdk } from '@/hooks/useCastSignaling'

export function CastCallout() {
  const [isCasting, setIsCasting] = useState(() => ChromecastSdk.isSessionActive());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsub = ChromecastSdk.on('state-changed', (newState) => {
      setIsCasting(newState === 'session-active');
    });
    
    // Delay showing to make it feel like an intro
    const timer = setTimeout(() => setIsVisible(true), 1500);
    
    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, []);

  if (isCasting || !isVisible) return null;

  return (
    <div className="absolute top-6 right-6 sm:top-12 sm:right-12 z-20 flex flex-col items-end gap-3 animate-in fade-in slide-in-from-top-8 duration-1000 pointer-events-none">
      <div className="bg-primary text-primary-foreground px-5 py-4 sm:px-8 sm:py-6 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative border border-white/10 backdrop-blur-sm">
        <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2.5">
          <Cast size={14} className="sm:size-4" />
          Try Big Screen Mode
        </div>
        <p className="text-[10px] sm:text-[13px] font-bold opacity-90 max-w-[160px] sm:max-w-[220px] leading-snug text-right">
          Click the cast icon in the top right corner!
        </p>
        {/* Pointer arrow for the bubble */}
        <div className="absolute -top-2.5 right-8 sm:right-12 border-[10px] border-transparent border-b-primary" />
      </div>
    </div>
  )
}
