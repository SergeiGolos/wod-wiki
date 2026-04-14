import React, { useEffect, useCallback } from 'react';
import { Command } from 'cmdk';
import * as Dialog from '@radix-ui/react-dialog';
import { useCommandPalette } from './CommandContext';
import { Search } from 'lucide-react';
import { commandToListItem } from '@/components/list';

export const CommandPalette: React.FC = () => {
  const { isOpen, setIsOpen, commands, activeContext, search, setSearch, activeStrategy } = useCommandPalette();

  useEffect(() => {
    if (isOpen && activeStrategy?.initialInputValue) {
      setSearch(activeStrategy.initialInputValue);
    } else if (!isOpen) {
      setSearch('');
    }
  }, [isOpen, activeStrategy, setSearch]);

  const displayedCommands = activeStrategy
    ? (activeStrategy.getCommands?.() ?? [])
    : commands.filter(cmd => !cmd.context || cmd.context === 'global' || cmd.context === activeContext);

  // Normalise to IListItem then re-group for cmdk rendering
  const listItems = displayedCommands.map(commandToListItem);
  const groups = listItems.reduce((acc, item) => {
    const group = item.group || 'General';
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<string, typeof listItems>);

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && activeStrategy?.handleInput) {
      e.preventDefault();
      const shouldClose = await activeStrategy.handleInput(search);
      if (shouldClose) setIsOpen(false);
    }
  }, [activeStrategy, search, setIsOpen]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-[50%] top-[20%] z-50 w-full max-w-lg translate-x-[-50%] outline-none p-0 shadow-lg">
          <Dialog.Title className="sr-only">Global Command Menu</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search for commands, sessions, or navigate the application.
          </Dialog.Description>

          <Command className="w-full overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground flex flex-col">
            <div className="flex items-center border-b border-border px-3" cmdk-input-wrapper="">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                onKeyDown={activeStrategy?.handleInput ? handleKeyDown : undefined}
                placeholder={activeStrategy?.placeholder || 'Type a command or search...'}
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
              />
            </div>

            <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </Command.Empty>

              {Object.entries(groups).map(([group, items]) => (
                <Command.Group
                  key={group}
                  heading={group}
                  className="overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
                >
                  {items.map((item) => (
                    <Command.Item
                      key={item.id}
                      value={`${item.id} ${item.label} ${item.keywords?.join(' ') ?? ''}`}
                      onSelect={() => {
                        item.payload.action();
                        setIsOpen(false);
                      }}
                      onPointerDown={(e) => e.preventDefault()}
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[selected='true']:bg-accent data-[selected='true']:text-accent-foreground data-[disabled='true']:pointer-events-none data-[disabled='true']:opacity-50"
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span className="ml-auto text-xs tracking-widest text-muted-foreground">
                          {item.shortcut.join('+')}
                        </span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
