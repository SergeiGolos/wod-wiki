export interface Command {
  id: string;
  label: string;
  action: () => void;
  shortcut?: string[];
  context?: string; // 'global', 'editor', 'timer', etc.
  group?: string;
  keywords?: string[]; // For fuzzy search
}

export interface CommandContextType {
  registerCommand: (command: Command) => () => void;
  commands: Command[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeContext: string;
  setActiveContext: (context: string) => void;
  search: string;
  setSearch: (search: string) => void;
}
