// src/components/cast/CastButton.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useCastManager } from '@/hooks/useCastManager';
import { Cast, Tv, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CastButtonProps {
    script: string;
    displayState: any; // IDisplayStackState
}

export function CastButton({ script, displayState }: CastButtonProps) {
  const { isConnected, availableReceivers, activeSession, startCast, stopCast, discoverTargets, sendStateUpdate } = useCastManager();
  const [isOpen, setIsOpen] = useState(false);
  const sequenceRef = useRef(0);

  useEffect(() => {
    if (activeSession && displayState) {
        sequenceRef.current += 1;
        sendStateUpdate(displayState, sequenceRef.current);
    } else {
        sequenceRef.current = 0;
    }
  }, [activeSession, displayState, sendStateUpdate]);

  const handleOpenChange = (open: boolean) => {
      setIsOpen(open);
      if (open && isConnected) {
          discoverTargets();
      }
  };

  if (activeSession) {
    return (
      <Button variant="default" onClick={stopCast} className="bg-blue-600 hover:bg-blue-700">
        <Tv className="h-4 w-4 mr-2 animate-pulse" />
        <span>Casting</span>
      </Button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={!isConnected}>
            <Cast className={`h-4 w-4 ${isConnected ? '' : 'opacity-50'}`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Cast to Device</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableReceivers.length === 0 ? (
            <div className="p-2 text-sm text-gray-500 flex items-center justify-center">
                {isConnected ? 'Searching...' : 'Disconnected'}
            </div>
        ) : (
            availableReceivers.map((target) => (
                <DropdownMenuItem
                    key={target.targetId}
                    onClick={() => startCast(target.targetId, script)}
                    className="cursor-pointer"
                >
                    <Tv className="h-4 w-4 mr-2" />
                    <span>{target.name}</span>
                </DropdownMenuItem>
            ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
