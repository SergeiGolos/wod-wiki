import React, { useEffect } from 'react';
import { Command } from 'cmdk';
import { useCommandPalette } from './CommandContext';
import { Search } from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const { isOpen, setIsOpen, commands, activeContext, search, setSearch, activeStrategy } = useCommandPalette();

  // Initialize search value from strategy if available
  useEffect(() => {
    if (isOpen && activeStrategy?.initialInputValue) {
      setSearch(activeStrategy.initialInputValue);
    } else if (!isOpen) {
      setSearch('');
    }
  }, [isOpen, activeStrategy, setSearch]);

  // Determine which commands to show
  const displayedCommands = activeStrategy 
    ? activeStrategy.getCommands()
    : commands.filter(cmd => !cmd.context || cmd.context === 'global' || cmd.context === activeContext);

  // Group commands
  const groups = displayedCommands.reduce((acc, cmd) => {
    const group = cmd.group || 'General';
    if (!acc[group]) acc[group] = [];
    acc[group].push(cmd);
    return acc;
  }, {} as Record<string, typeof displayedCommands>);

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && activeStrategy?.handleInput) {
      e.preventDefault();
      const shouldClose = await activeStrategy.handleInput(search);
      if (shouldClose) {
        setIsOpen(false);
      }
    }
  };

  return (
    <Command.Dialog
      open={isOpen}
      onOpenChange={setIsOpen}
      label="Global Command Menu"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-[20vh]"
    >
      <div className="fixed inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
      
      <div className="relative w-full max-w-lg mx-2 md:mx-0 overflow-hidden rounded-xl border border-border bg-popover shadow-2xl text-popover-foreground">
        <div className="flex items-center border-b border-border px-3" cmdk-input-wrapper="">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            onKeyDown={handleKeyDown}
            placeholder={activeStrategy?.placeholder || "Type a command or search..."}
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
          />
        </div>
        
        <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            No results found.
          </Command.Empty>
          
          {Object.entries(groups).map(([group, groupCommands]) => (
            <Command.Group key={group} heading={group} className="overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
              {groupCommands.map((cmd) => (
                <Command.Item
                  key={cmd.id}
                  value={`${cmd.label} ${cmd.keywords?.join(' ') || ''}`}
                  onSelect={() => {
                    cmd.action();
                    setIsOpen(false);
                  }}
                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <span>{cmd.label}</span>
                  {cmd.shortcut && (
                    <span className="ml-auto text-xs tracking-widest text-muted-foreground">
                      {cmd.shortcut.join('+')}
                    </span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </div>
    </Command.Dialog>
  );
};
