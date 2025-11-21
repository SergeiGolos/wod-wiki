import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Command, CommandContextType, CommandStrategy } from './types';

const CommandContext = createContext<CommandContextType | undefined>(undefined);

export const CommandProvider: React.FC<{ children: React.ReactNode; initialIsOpen?: boolean }> = ({ children, initialIsOpen = false }) => {
  const [commands, setCommands] = useState<Command[]>([]);
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [activeContext, setActiveContext] = useState('global');
  const [search, setSearch] = useState('');
  const [activeStrategy, setStrategy] = useState<CommandStrategy | null>(null);

  const registerCommand = useCallback((command: Command) => {
    setCommands((prev) => {
      // Avoid duplicates by ID
      if (prev.some(c => c.id === command.id)) return prev;
      return [...prev, command];
    });

    return () => {
      setCommands((prev) => prev.filter((c) => c.id !== command.id));
    };
  }, []);

  // Use refs for state accessed in event handlers to avoid re-attaching listeners
  const stateRef = useRef({ commands, isOpen, activeContext, activeStrategy });
  useEffect(() => {
    stateRef.current = { commands, isOpen, activeContext, activeStrategy };
  }, [commands, isOpen, activeContext, activeStrategy]);

  // Handle global keyboard shortcut to open palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle command shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { isOpen, commands, activeContext, activeStrategy } = stateRef.current;
      
      if (!isOpen) { 
         // Check shortcuts
         // If a strategy is active, we might want to delegate to it, but for now let's keep global shortcuts working
         // unless the strategy explicitly consumes them (not implemented yet)
         
         commands.forEach(cmd => {
            if (cmd.shortcut && cmd.shortcut.length > 0) {
                const modifiers = {
                    meta: e.metaKey,
                    ctrl: e.ctrlKey,
                    alt: e.altKey,
                    shift: e.shiftKey
                };
                
                // Check if modifiers match
                const cmdModifiers = cmd.shortcut.slice(0, -1).map(s => s.toLowerCase());
                const cmdKey = cmd.shortcut[cmd.shortcut.length - 1].toLowerCase();
                
                const matchMeta = cmdModifiers.includes('meta') === modifiers.meta;
                const matchCtrl = cmdModifiers.includes('ctrl') === modifiers.ctrl;
                const matchAlt = cmdModifiers.includes('alt') === modifiers.alt;
                const matchShift = cmdModifiers.includes('shift') === modifiers.shift;
                
                if (matchMeta && matchCtrl && matchAlt && matchShift && e.key.toLowerCase() === cmdKey) {
                    // Check context
                    if (!cmd.context || cmd.context === 'global' || cmd.context === activeContext) {
                        e.preventDefault();
                        cmd.action();
                    }
                }
            }
         });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Empty dependency array - only attach once

  const contextValue = React.useMemo(() => ({
    registerCommand,
    commands,
    isOpen,
    setIsOpen,
    activeContext,
    setActiveContext,
    search,
    setSearch,
    activeStrategy,
    setStrategy
  }), [registerCommand, commands, isOpen, activeContext, search, activeStrategy]);

  return (
    <CommandContext.Provider value={contextValue}>
      {children}
    </CommandContext.Provider>
  );
};

export const useCommandPalette = () => {
  const context = useContext(CommandContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandProvider');
  }
  return context;
};

export const useRegisterCommand = (command: Command) => {
    const { registerCommand } = useCommandPalette();
    useEffect(() => {
        return registerCommand(command);
    }, [registerCommand, command.id, command.label, command.action, command.context]);
};
