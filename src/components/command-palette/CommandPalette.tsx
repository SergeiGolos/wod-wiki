import React from 'react';
import { Command } from 'cmdk';
import { useCommandPalette } from './CommandContext';
import { Search } from 'lucide-react';



export const CommandPalette: React.FC = () => {
  const { isOpen, setIsOpen, commands, activeContext, search, setSearch } = useCommandPalette();

  // Filter commands based on context
  const filteredCommands = commands.filter(cmd => 
    !cmd.context || cmd.context === 'global' || cmd.context === activeContext
  );

  // Group commands
  const groups = filteredCommands.reduce((acc, cmd) => {
    const group = cmd.group || 'General';
    if (!acc[group]) acc[group] = [];
    acc[group].push(cmd);
    return acc;
  }, {} as Record<string, typeof commands>);

  return (
    <Command.Dialog
      open={isOpen}
      onOpenChange={setIsOpen}
      label="Global Command Menu"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
    >
      <div className="fixed inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
      
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border bg-white shadow-2xl dark:bg-gray-900 dark:border-gray-800">
        <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Type a command or search..."
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-100"
          />
        </div>
        
        <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
          <Command.Empty className="py-6 text-center text-sm text-gray-500">
            No results found.
          </Command.Empty>
          
          {Object.entries(groups).map(([group, groupCommands]) => (
            <Command.Group key={group} heading={group} className="overflow-hidden p-1 text-gray-700 dark:text-gray-200 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-500">
              {groupCommands.map((cmd) => (
                <Command.Item
                  key={cmd.id}
                  value={`${cmd.label} ${cmd.keywords?.join(' ') || ''}`}
                  onSelect={() => {
                    cmd.action();
                    setIsOpen(false);
                  }}
                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-gray-100 aria-selected:text-gray-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:aria-selected:bg-gray-800 dark:aria-selected:text-gray-100"
                >
                  <span>{cmd.label}</span>
                  {cmd.shortcut && (
                    <span className="ml-auto text-xs tracking-widest text-gray-500">
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
