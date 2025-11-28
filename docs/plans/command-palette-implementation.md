# Command Palette Implementation Plan

## Overview
This document outlines the design and implementation plan for a context-aware Command Palette for the WOD Wiki editor. The system will provide intelligent actions based on the user's current context (Monaco focus, WodBlock presence, specific line content) and streamline workflows for inserting templates, modifying lines, and editing workout blocks.

## Design Goals
- **Context Awareness**: Actions are relevant to the cursor position and content.
- **Visual Excellence**: Premium, dark-mode aesthetic with glassmorphism and smooth animations.
- **Keyboard Centric**: Full keyboard navigation and shortcuts for power users.
- **Extensibility**: A provider-based architecture to easily add new commands.

## Architecture

### 1. Core Components
- **`CommandPaletteContext`**: React Context to manage the visibility, current query, active provider, and selected item.
- **`CommandPaletteService`**: A singleton service responsible for:
    - Detecting context (Monaco focus, WodBlock, Line content).
    - Aggregating commands from registered providers.
    - Handling global keybindings (e.g., `Ctrl+K`, `Ctrl+Shift+P`).
- **`CommandPaletteOverlay`**: The main UI component rendered at the root of the editor layout.

### 2. Context Engine
The system needs to derive the following state from Monaco and the WodParser:
- `isMonacoFocused`: Boolean.
- `cursorLine`: Number (1-based).
- `cursorColumn`: Number.
- `lineContent`: String.
- `isWodBlock`: Boolean (is the cursor inside a `wod` code block?).
- `codeStatement`: `ICodeStatement | undefined` (the parsed statement for the current line, if applicable).

### 3. Provider System
We will define a `CommandProvider` interface. Providers will be registered with the service and queried when the palette opens or context changes.

```typescript
interface CommandProvider {
  id: string;
  provideCommands(context: CommandContext): Command[] | Promise<Command[]>;
}

interface Command {
  id: string;
  label: string;
  detail?: string;
  icon?: React.ReactNode;
  action: () => void | Promise<void>;
  // If the command opens a secondary view
  view?: 'template-search' | 'modify-block' | 'default'; 
}
```

## Detailed Requirements & Providers

### A. General Context (Monaco Focused)
**Provider**: `GeneralEditorProvider`
- **Triggers**: Always active when Monaco is focused.
- **UI Elements**:
    - Header: Shows "Line {N}: {Content}".
    - Footer: Cursor position.
- **Commands**:
    - "Insert Template": Opens the Template Search view.
    - "Update Line": Contextual hints based on line content.

### B. Update Line Provider
**Provider**: `UpdateLineProvider`
- **Triggers**: specific line patterns.
- **Functionality**:
    - Returns a "Hint Card" command.
    - **Actions**:
        - Toggle Heading (`###`): `Ctrl+1` -> `Ctrl+9`.
        - Wrap in Block (`wod`): `Ctrl+W` (or similar).
        - Frontmatter Toggle (`---`): `Ctrl+M`.
    - **Implementation**:
        - Uses Regex to detect current line state.
        - `monaco.editor.executeEdits` to apply changes.

### C. Modify Block Provider
**Provider**: `ModifyBlockProvider`
- **Triggers**: `isWodBlock` is true AND `codeStatement` is present.
- **UI**: "Modify Block" view (Specialized UI).
- **Functionality**:
    - Parses `ICodeStatement.fragments`.
    - Renders interactive "Chips" for each fragment (Reps, Movement, Weight, etc.).
    - **Interaction**:
        - Tab/Arrow keys to navigate fragments.
        - Typing searches for replacements (e.g., changing "pushups" -> searches movement database).
    - **Default Search**: Finds "Efforts" to replace the entire block if no fragment is selected.

### D. Insert Block Provider
**Provider**: `InsertBlockProvider`
- **Triggers**: `isWodBlock` is true AND (Line is empty OR Line is only indented).
- **UI**: "Insert Block" view (similar to Modify Block but starts empty).
- **Functionality**:
    - Allows building a statement from scratch.
    - **Default Search**: Finds "Efforts" to insert.

### E. Insert Template Provider
**Provider**: `InsertTemplateProvider`
- **Triggers**: Selected from General Palette.
- **UI**: "Template Search" view (Secondary Palette).
- **Functionality**:
    - Returns a single entry point in the main palette.
    - When active, shows a search bar and grid of templates (e.g., "Cindy", "Fran").
    - **Action**: Inserts the selected template text into the editor at the cursor.

## UI/UX Design (Mockups)

### 1. General & Modify Block Views
*See attached artifact: `command_palette_states.png`*
- **Left**: General view showing line context and basic actions.
- **Right**: Modify Block view showing the "Chip" editor for a parsed statement.

### 2. Template Search View
*See attached artifact: `template_search_palette.png`*
- A secondary view focused on searching and previewing workout templates.

## Implementation Steps

### Phase 1: Foundation
1.  Create `CommandPaletteContext` and `CommandPaletteOverlay` component.
2.  Implement basic visibility toggling and global keybinding (`Ctrl+K`).
3.  Style the modal using Tailwind (Dark mode, glassmorphism).

### Phase 2: Context & General Provider
1.  Implement `CommandPaletteService` to listen to Monaco events.
2.  Connect `WodParser` to the service to provide `ICodeStatement`.
3.  Implement `GeneralEditorProvider` to show line info and basic commands.

### Phase 3: Specialized Providers
1.  **Update Line**: Implement logic to toggle markdown features (headers, blocks).
2.  **Modify Block**: Create the "Fragment Chip" UI. Map `ICodeFragment` types to UI components. Implement the "replace fragment" logic.
3.  **Insert Template**: Create the secondary search UI and mock template data.

### Phase 4: Polish
1.  Add animations (Framer Motion or CSS transitions).
2.  Ensure keyboard navigation is robust (focus trapping, arrow keys).
3.  Verify "Premium" aesthetic (colors, spacing, typography).

## Keybindings Strategy
- **Global**: `Ctrl+K` (Toggle Palette).
- **In-Palette**:
    - `Up/Down`: Navigate list.
    - `Enter`: Select/Execute.
    - `Esc`: Close.
    - `Tab`: Navigate fragments (in Modify Block view).
- **Shortcuts (registered by Update Line)**:
    - `Ctrl+1`...`Ctrl+6`: Toggle Headings.
    - `Ctrl+S`: Save/Update (if applicable).
