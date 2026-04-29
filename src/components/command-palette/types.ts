export interface Command {
  id: string;
  label: string;
  action: () => void;
  shortcut?: string[];
  context?: string; // 'global', 'editor', 'timer', etc.
  group?: string;
  keywords?: string[]; // For fuzzy search
  /**
   * When true, the command palette stays open after this command is executed.
   * Useful for navigation strategies that swap to a sub-level (e.g. collection → workout → block).
   */
  keepOpen?: boolean;
}

export interface CommandPaletteResult {
  id: string;
  name: string;
  category: string;
  content?: string;
  type?: 'workout' | 'result' | 'action' | 'statement-part' | 'route';
  subtitle?: string;
  payload?: any;
}

export interface CommandStrategy {
  id: string;
  placeholder?: string;
  initialInputValue?: string;
  
  /**
   * Optional: Custom header element to render below the search bar but before results.
   * Useful for "Statement Builder" contextual info.
   */
  renderHeader?: () => React.ReactNode;

  /**
   * Returns results based on the search query.
   */
  getResults: (query: string) => CommandPaletteResult[] | Promise<CommandPaletteResult[]>;

  /**
   * Handles selection of a result.
   */
  onSelect: (result: CommandPaletteResult) => void;

  /**
   * Returns standard commands for this strategy.
   */
  getCommands?: () => Command[];
  
  /**
   * Optional: Handles raw text input (e.g. Enter key).
   */
  handleInput?: (text: string) => boolean | Promise<boolean>;

  /**
   * Optional: Global keydown handler when the palette is open.
   */
  onKeyDown?: (e: React.KeyboardEvent | KeyboardEvent) => void;
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
  
  /**
   * The current active strategy for the command palette.
   * If set, this overrides the default command list behavior.
   */
  activeStrategy: CommandStrategy | null;
  setStrategy: (strategy: CommandStrategy | null) => void;
}
