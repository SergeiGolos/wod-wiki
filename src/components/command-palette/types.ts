export interface Command {
  id: string;
  label: string;
  action: () => void;
  shortcut?: string[];
  context?: string; // 'global', 'editor', 'timer', etc.
  group?: string;
  keywords?: string[]; // For fuzzy search
}

export interface CommandStrategy {
  id: string;
  /**
   * Returns the list of commands available in this strategy.
   * Can be dynamic based on the current state.
   */
  getCommands: () => Command[];
  
  /**
   * Optional: Handles text input when the user types in the palette.
   * If provided, the palette acts as an input field (e.g. for editing text).
   * Returns true if the input was handled and the palette should close.
   */
  handleInput?: (text: string) => boolean | Promise<boolean>;
  
  /**
   * Optional: Placeholder text for the input field.
   */
  placeholder?: string;

  /**
   * Optional: Initial value for the input field.
   */
  initialInputValue?: string;
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
