import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { Command } from './types';

interface CommandContextType {
  registerCommand: (command: Command) => () => void;
  commands: Command[];
  activeContext: string;
  setActiveContext: (context: string) => void;
}

const CommandContext = createContext<CommandContextType | undefined>(undefined);

export const CommandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [commands, setCommands] = useState<Command[]>([]);
  const [activeContext, setActiveContext] = useState('global');

  const registerCommand = useCallback((command: Command) => {
    setCommands((prev) => {
      if (prev.some(c => c.id === command.id)) return prev;
      return [...prev, command];
    });
    return () => {
      setCommands((prev) => prev.filter((c) => c.id !== command.id));
    };
  }, []);

  // Use a ref so the keyboard handler always sees current state without re-attaching.
  const stateRef = useRef({ commands, activeContext });
  useEffect(() => {
    stateRef.current = { commands, activeContext };
  }, [commands, activeContext]);

  // Global keyboard shortcut dispatcher for registered Command shortcuts.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { commands, activeContext } = stateRef.current;
      const modifiers = {
        meta: e.metaKey,
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
      };

      commands.forEach(cmd => {
        if (!cmd.shortcut?.length) return;
        const cmdKey = cmd.shortcut[cmd.shortcut.length - 1].toLowerCase();
        const cmdMods = cmd.shortcut.slice(0, -1).map(s => s.toLowerCase());

        const match =
          cmdMods.includes('meta') === modifiers.meta &&
          cmdMods.includes('ctrl') === modifiers.ctrl &&
          cmdMods.includes('alt') === modifiers.alt &&
          cmdMods.includes('shift') === modifiers.shift &&
          e.key.toLowerCase() === cmdKey;

        if (match) {
          const inContext =
            !cmd.context || cmd.context === 'global' || cmd.context === activeContext;
          if (inContext) {
            e.preventDefault();
            cmd.action();
          }
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const value = React.useMemo(
    () => ({ registerCommand, commands, activeContext, setActiveContext }),
    [registerCommand, commands, activeContext]
  );

  return (
    <CommandContext.Provider value={value}>
      {children}
    </CommandContext.Provider>
  );
};

export const useCommandContext = () => {
  const ctx = useContext(CommandContext);
  if (!ctx) throw new Error('useCommandContext must be used within a CommandProvider');
  return ctx;
};

/** @deprecated Use useCommandContext instead */
export const useCommandPalette = useCommandContext;
