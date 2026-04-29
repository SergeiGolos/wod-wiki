# Collection Import (Pull) Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add a pull mechanism so users can import WOD blocks from any collection *or* any existing history entry into the current journal note via the command palette (Cmd+K), without leaving the editor.

**Architecture:**
- Three-level command palette flow using strategy-swapping: Collection/Source → Workout/Entry → WOD Block → import
- New `extractWodBlocks()` utility parses raw markdown for ` ```wod ``` ` fences
- New `CollectionImportStrategy` and `HistoryImportStrategy` classes implement `CommandStrategy`
- `PlanPanel` (journal editor) registers a keyboard shortcut (`Cmd+Shift+I`) that opens the palette with the import strategy active
- History entries are treated as first-class sources identical to collection items

**Tech Stack:** TypeScript, React, `cmdk`, existing `CommandStrategy` interface, `getWodCollections()`, `IContentProvider`

**Branch:** `feat/collection-import-pull` off `main`

---

## Setup

### Task 0: Create the branch

```bash
cd /home/serge/projects/wod-wiki/wod-wiki
git checkout main && git pull origin main
git checkout -b feat/collection-import-pull
```

Verify: `git branch --show-current` → `feat/collection-import-pull`

---

## Phase 1 — WOD Block Extraction Utility

### Task 1: Create `extractWodBlocks` utility

**Objective:** Parse raw markdown and return each ` ```wod ``` ` fenced block as a structured object.

**Files:**
- Create: `wod-wiki-e2e/src/lib/wodBlockExtract.ts`
- Create: `wod-wiki-e2e/src/lib/wodBlockExtract.test.ts`

**Step 1: Write the failing test**

```ts
// wod-wiki-e2e/src/lib/wodBlockExtract.test.ts
import { extractWodBlocks } from './wodBlockExtract';

const FRAN_MD = `
# Fran

Classic CrossFit benchmark.

\`\`\`wod
21-15-9
Thrusters 95/65lb
Pull-ups
\`\`\`
`;

const MULTI_MD = `
# Two WODs

\`\`\`wod
10 rounds
10 push-ups
\`\`\`

Some text.

\`\`\`crossfit
3 rounds
400m run
\`\`\`
`;

describe('extractWodBlocks', () => {
  it('extracts a single block', () => {
    const blocks = extractWodBlocks(FRAN_MD);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].dialect).toBe('wod');
    expect(blocks[0].content).toContain('Thrusters');
  });

  it('labels block from preceding heading', () => {
    const blocks = extractWodBlocks(FRAN_MD);
    expect(blocks[0].label).toBe('Fran');
  });

  it('extracts multiple blocks with different dialects', () => {
    const blocks = extractWodBlocks(MULTI_MD);
    expect(blocks).toHaveLength(2);
    expect(blocks[1].dialect).toBe('crossfit');
  });

  it('returns empty array for markdown with no wod fences', () => {
    expect(extractWodBlocks('# Just text\nNo blocks here.')).toHaveLength(0);
  });
});
```

**Step 2: Run to verify failure**

```bash
cd /home/serge/projects/wod-wiki/wod-wiki-e2e
bun test src/lib/wodBlockExtract.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement**

```ts
// wod-wiki-e2e/src/lib/wodBlockExtract.ts

export interface WodBlockExtract {
  /** Index-based ID, e.g. "block-0" */
  id: string;
  /** Nearest preceding heading, or "Block N" if none found */
  label: string;
  /** Fence dialect: "wod", "crossfit", etc. */
  dialect: string;
  /** Inner content of the fenced block (trimmed) */
  content: string;
}

const WOD_DIALECTS = ['wod', 'crossfit', 'amrap', 'emom', 'tabata'];

/**
 * Parse raw markdown and extract all WOD fenced code blocks.
 * Supports dialects: wod, crossfit, amrap, emom, tabata.
 */
export function extractWodBlocks(markdown: string): WodBlockExtract[] {
  const lines = markdown.split('\n');
  const blocks: WodBlockExtract[] = [];
  let lastHeading = '';
  let inFence = false;
  let fenceDialect = '';
  let fenceLines: string[] = [];
  let blockIndex = 0;

  for (const line of lines) {
    if (!inFence) {
      // Track the last heading we saw
      const headingMatch = line.match(/^#{1,6}\s+(.+)/);
      if (headingMatch) {
        lastHeading = headingMatch[1].trim();
        continue;
      }

      // Detect opening fence
      const fenceOpen = line.match(/^```(\w+)\s*$/);
      if (fenceOpen && WOD_DIALECTS.includes(fenceOpen[1].toLowerCase())) {
        inFence = true;
        fenceDialect = fenceOpen[1].toLowerCase();
        fenceLines = [];
        continue;
      }
    } else {
      // Detect closing fence
      if (line.trim() === '```') {
        blocks.push({
          id: `block-${blockIndex++}`,
          label: lastHeading || `Block ${blockIndex}`,
          dialect: fenceDialect,
          content: fenceLines.join('\n').trim(),
        });
        inFence = false;
        fenceDialect = '';
        fenceLines = [];
      } else {
        fenceLines.push(line);
      }
    }
  }

  return blocks;
}
```

**Step 4: Run to verify pass**

```bash
bun test src/lib/wodBlockExtract.test.ts
```

Expected: 4 tests pass.

**Step 5: Commit**

```bash
git add wod-wiki-e2e/src/lib/wodBlockExtract.ts wod-wiki-e2e/src/lib/wodBlockExtract.test.ts
git commit -m "feat: add extractWodBlocks utility for parsing wod fence blocks from markdown"
```

---

## Phase 2 — Collection Import Strategy

### Task 2: Create `CollectionImportStrategy`

**Objective:** Three-level command strategy — select collection → select workout → select WOD block → inserts block into current note.

**Files:**
- Create: `wod-wiki-e2e/src/components/command-palette/strategies/CollectionImportStrategy.ts`

**Key design:** Uses `setStrategy` from `CommandContextType` to push the next level when the user selects an item. The `onInsert` callback is injected at construction time and called when a block is selected.

```ts
// wod-wiki-e2e/src/components/command-palette/strategies/CollectionImportStrategy.ts
import type { Command, CommandStrategy } from '../types';
import { getWodCollections, WodCollectionItem } from '@/repositories/wod-collections';
import { extractWodBlocks, WodBlockExtract } from '@/lib/wodBlockExtract';

type SetStrategy = (strategy: CommandStrategy | null) => void;
type OnInsert = (blocks: WodBlockExtract[]) => void;

// ─── Level 3: Block selection ─────────────────────────────────────────────────

class WodBlockSelectStrategy implements CommandStrategy {
  id = 'collection-import-block';
  placeholder: string;

  constructor(
    private item: WodCollectionItem,
    private collectionName: string,
    private onInsert: OnInsert,
    private setStrategy: SetStrategy,
  ) {
    this.placeholder = `Select block from "${item.name}"…`;
  }

  getCommands(): Command[] {
    const blocks = extractWodBlocks(this.item.content);

    if (blocks.length === 0) {
      // Fallback: import the whole item as a plain block
      return [{
        id: 'import-whole',
        label: `Import entire "${this.item.name}"`,
        group: 'Import',
        action: () => {
          this.onInsert([{
            id: 'block-0',
            label: this.item.name,
            dialect: 'wod',
            content: this.item.content,
          }]);
          this.setStrategy(null);
        },
      }];
    }

    return blocks.map((block) => ({
      id: block.id,
      label: block.label,
      group: `${this.collectionName} › ${this.item.name}`,
      keywords: [block.dialect, block.content.slice(0, 60)],
      action: () => {
        this.onInsert([block]);
        this.setStrategy(null);
      },
    }));
  }
}

// ─── Level 2: Workout selection ───────────────────────────────────────────────

class WodWorkoutSelectStrategy implements CommandStrategy {
  id = 'collection-import-workout';
  placeholder: string;

  constructor(
    private collectionId: string,
    private collectionName: string,
    private onInsert: OnInsert,
    private setStrategy: SetStrategy,
  ) {
    this.placeholder = `Select workout from "${collectionName}"…`;
  }

  getCommands(): Command[] {
    const collections = getWodCollections();
    const col = collections.find(c => c.id === this.collectionId);
    if (!col) return [];

    return col.items.map(item => ({
      id: item.id,
      label: item.name,
      group: col.name,
      keywords: [item.id],
      action: () => {
        this.setStrategy(
          new WodBlockSelectStrategy(item, col.name, this.onInsert, this.setStrategy)
        );
      },
    }));
  }
}

// ─── Level 1: Collection selection ───────────────────────────────────────────

export class CollectionImportStrategy implements CommandStrategy {
  id = 'collection-import';
  placeholder = 'Import from collection… (type to filter)';

  constructor(
    private onInsert: OnInsert,
    private setStrategy: SetStrategy,
  ) {}

  getCommands(): Command[] {
    const collections = getWodCollections();

    return collections.map(col => ({
      id: col.id,
      label: col.name,
      group: 'Collections',
      keywords: [col.id, ...col.categories],
      action: () => {
        this.setStrategy(
          new WodWorkoutSelectStrategy(col.id, col.name, this.onInsert, this.setStrategy)
        );
      },
    }));
  }
}
```

**Verify (manual):** TypeScript compile — no errors.

```bash
cd /home/serge/projects/wod-wiki/wod-wiki-e2e
bun x tsc --noEmit 2>&1 | head -30
```

**Commit:**

```bash
git add wod-wiki-e2e/src/components/command-palette/strategies/CollectionImportStrategy.ts
git commit -m "feat: add CollectionImportStrategy — 3-level collection → workout → block selection"
```

---

### Task 3: Create `HistoryImportStrategy`

**Objective:** Same 3-level flow but sources from `provider.getEntries()` instead of static collections. Treats any journal note with WOD blocks as an importable source.

**Files:**
- Create: `wod-wiki-e2e/src/components/command-palette/strategies/HistoryImportStrategy.ts`

```ts
// wod-wiki-e2e/src/components/command-palette/strategies/HistoryImportStrategy.ts
import type { Command, CommandStrategy } from '../types';
import type { IContentProvider } from '@/types/content-provider';
import type { HistoryEntry } from '@/types/history';
import { extractWodBlocks, WodBlockExtract } from '@/lib/wodBlockExtract';

type SetStrategy = (strategy: CommandStrategy | null) => void;
type OnInsert = (blocks: WodBlockExtract[]) => void;

// ─── Level 2: Block selection from a history entry ───────────────────────────

class HistoryBlockSelectStrategy implements CommandStrategy {
  id = 'history-import-block';
  placeholder: string;

  constructor(
    private entry: HistoryEntry,
    private onInsert: OnInsert,
    private setStrategy: SetStrategy,
  ) {
    this.placeholder = `Select block from "${entry.title}"…`;
  }

  getCommands(): Command[] {
    const blocks = extractWodBlocks(this.entry.rawContent ?? '');

    if (blocks.length === 0) {
      return [{
        id: 'import-whole',
        label: `Import entire note`,
        group: this.entry.title,
        action: () => {
          this.onInsert([{
            id: 'block-0',
            label: this.entry.title,
            dialect: 'wod',
            content: this.entry.rawContent ?? '',
          }]);
          this.setStrategy(null);
        },
      }];
    }

    return blocks.map(block => ({
      id: block.id,
      label: block.label,
      group: this.entry.title,
      keywords: [block.dialect],
      action: () => {
        this.onInsert([block]);
        this.setStrategy(null);
      },
    }));
  }
}

// ─── Level 1: Entry selection ─────────────────────────────────────────────────

export class HistoryImportStrategy implements CommandStrategy {
  id = 'history-import';
  placeholder = 'Import from workout history… (type to filter)';
  private entries: HistoryEntry[] = [];

  constructor(
    private provider: IContentProvider,
    private onInsert: OnInsert,
    private setStrategy: SetStrategy,
  ) {}

  async init() {
    // Pre-load entries; filter to only those with wod blocks
    const all = await this.provider.getEntries();
    this.entries = all.filter(e =>
      e.type !== 'template' &&
      e.rawContent &&
      /```(wod|crossfit|amrap|emom|tabata)/.test(e.rawContent)
    );
  }

  getCommands(): Command[] {
    return this.entries.map(entry => {
      const date = new Date(entry.targetDate).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      return {
        id: entry.id,
        label: entry.title,
        group: 'Workout History',
        keywords: [date, entry.id],
        action: () => {
          this.setStrategy(
            new HistoryBlockSelectStrategy(entry, this.onInsert, this.setStrategy)
          );
        },
      };
    });
  }
}
```

**Commit:**

```bash
git add wod-wiki-e2e/src/components/command-palette/strategies/HistoryImportStrategy.ts
git commit -m "feat: add HistoryImportStrategy — import WOD blocks from any past journal entry"
```

---

## Phase 3 — Wire Import Into the Editor

### Task 4: Add `useCollectionImport` hook

**Objective:** Encapsulate the logic for opening the import palette from within the journal editor. Returns an `openImport` function that the editor toolbar can call.

**Files:**
- Create: `wod-wiki-e2e/src/hooks/useCollectionImport.ts`

```ts
// wod-wiki-e2e/src/hooks/useCollectionImport.ts
import { useCallback } from 'react';
import { useCommandPalette } from '@/components/command-palette/CommandContext';
import { CollectionImportStrategy } from '@/components/command-palette/strategies/CollectionImportStrategy';
import { HistoryImportStrategy } from '@/components/command-palette/strategies/HistoryImportStrategy';
import type { WodBlockExtract } from '@/lib/wodBlockExtract';
import type { IContentProvider } from '@/types/content-provider';

interface UseCollectionImportOptions {
  onInsert: (blocks: WodBlockExtract[]) => void;
  provider?: IContentProvider;
}

export function useCollectionImport({ onInsert, provider }: UseCollectionImportOptions) {
  const { setIsOpen, setStrategy } = useCommandPalette();

  const openCollectionImport = useCallback(() => {
    const strategy = new CollectionImportStrategy(onInsert, setStrategy);
    setStrategy(strategy);
    setIsOpen(true);
  }, [onInsert, setStrategy, setIsOpen]);

  const openHistoryImport = useCallback(async () => {
    if (!provider) return;
    const strategy = new HistoryImportStrategy(provider, onInsert, setStrategy);
    await strategy.init();
    setStrategy(strategy);
    setIsOpen(true);
  }, [provider, onInsert, setStrategy, setIsOpen]);

  return { openCollectionImport, openHistoryImport };
}
```

**Commit:**

```bash
git add wod-wiki-e2e/src/hooks/useCollectionImport.ts
git commit -m "feat: add useCollectionImport hook for opening import palette from editor"
```

---

### Task 5: Wire import into `PlanPanel`

**Objective:** Add an "Import WOD" button to the plan panel toolbar and bind `Cmd+Shift+I` keyboard shortcut. When triggered, opens collection import palette. The `onInsert` callback appends the selected block as a ` ```wod``` ` fence to the current note content.

**Files:**
- Modify: `wod-wiki-e2e/src/panels/plan-panel.tsx`

**Step 1: Read the current file fully**

```bash
cat /home/serge/projects/wod-wiki/wod-wiki-e2e/src/panels/plan-panel.tsx
```

**Step 2: Apply changes**

Add imports at top:
```ts
import { useEffect, useCallback } from 'react';
import { useCollectionImport } from '@/hooks/useCollectionImport';
import type { WodBlockExtract } from '@/lib/wodBlockExtract';
import type { IContentProvider } from '@/types/content-provider';
import { Download } from 'lucide-react';
```

Add `provider` to `PlanPanelProps` (remove `@deprecated` — we're re-enabling it for import):
```ts
/** Content provider — used for history import */
provider?: IContentProvider;
```

Inside `PlanPanel` component body, add:

```ts
// Build insert handler — appends block as wod fence to current content
const handleInsert = useCallback((blocks: WodBlockExtract[]) => {
  const appended = blocks
    .map(b => `\n\n\`\`\`${b.dialect}\n${b.content.trim()}\n\`\`\``)
    .join('');
  setContent((prev: string) => prev.trimEnd() + appended);
}, [setContent]);

const { openCollectionImport, openHistoryImport } = useCollectionImport({
  onInsert: handleInsert,
  provider,
});

// Keyboard shortcut: Cmd+Shift+I → collection import, Cmd+Shift+H → history import
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      openCollectionImport();
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'H') {
      e.preventDefault();
      openHistoryImport();
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [openCollectionImport, openHistoryImport]);
```

Add import toolbar above the `NoteEditor` in the JSX:
```tsx
{/* Import toolbar */}
<div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 border-b border-border/40 bg-muted/30">
  <button
    type="button"
    onClick={openCollectionImport}
    className="flex items-center gap-1.5 text-xs px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    title="Import from collection (Cmd+Shift+I)"
  >
    <Download className="h-3 w-3" />
    <span>From Collection</span>
  </button>
  {provider && (
    <button
      type="button"
      onClick={openHistoryImport}
      className="flex items-center gap-1.5 text-xs px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      title="Import from history (Cmd+Shift+H)"
    >
      <Download className="h-3 w-3" />
      <span>From History</span>
    </button>
  )}
</div>
```

**Step 3: Verify TypeScript**

```bash
cd /home/serge/projects/wod-wiki/wod-wiki-e2e
bun x tsc --noEmit 2>&1 | head -30
```

Expected: No errors (or only pre-existing errors).

**Commit:**

```bash
git add wod-wiki-e2e/src/panels/plan-panel.tsx
git commit -m "feat: add import toolbar and Cmd+Shift+I shortcut to PlanPanel for collection/history import"
```

---

## Phase 4 — Fix CollectionsPage Preview

### Task 6: Fix preview panel visibility in `CollectionsPage`

**Objective:** Replace the dynamic `createHistoryView` panel layout with a stable two-column div so the preview panel appears when a workout is selected.

**Files:**
- Modify: `wod-wiki-e2e/src/app/pages/CollectionsPage.tsx`

**Read the full file first:**

```bash
cat /home/serge/projects/wod-wiki/wod-wiki-e2e/src/app/pages/CollectionsPage.tsx
```

**Find this block** (around line 174–194):
```tsx
// Using createHistoryView with our constructed panels matches the layout system
const historyView = createHistoryView(mainPanel, previewPanel);
const layoutState = { ... };

return (
  <HistoryLayout>
    <PanelGrid ... />
  </HistoryLayout>
);
```

**Replace with:**
```tsx
return (
  <div className="flex h-full w-full overflow-hidden">
    {/* Left: filter + list (full width when nothing selected, half when preview open) */}
    <div className={cn(
      "flex flex-col h-full transition-all duration-200",
      entryToShow ? "w-1/2 border-r border-border" : "w-full"
    )}>
      {mainPanel}
    </div>

    {/* Right: preview panel (only rendered when an entry is selected) */}
    {entryToShow && (
      <div className="w-1/2 h-full overflow-hidden">
        {previewPanel}
      </div>
    )}
  </div>
);
```

Remove the unused `createHistoryView`, `HistoryLayout`, `PanelGrid`, `PanelSpan`, `layoutState` imports/declarations if they are no longer used after this change.

**Verify:**
1. `bun x tsc --noEmit` — no errors
2. Visit `https://playground.forest-adhara.ts.net/collections/crossfit-girls`
3. Click FRAN → right panel appears with preview
4. Click another workout → preview updates

**Commit:**

```bash
git add wod-wiki-e2e/src/app/pages/CollectionsPage.tsx
git commit -m "fix: replace dynamic PanelGrid layout in CollectionsPage with stable two-column split"
```

---

### Task 7: Fix "New" in collections context to seed from selected item

**Objective:** When a collection workout is selected in `CollectionsPage`, the "New" / `onClone` action should seed the new entry from that item's content, not from a blank template.

**File:** `wod-wiki-e2e/src/app/pages/CollectionsPage.tsx`

The `onClone` handler in the `ListOfNotes` already uses `entry.rawContent`. The problem is the "New" toolbar button calls the page-level `useCreateWorkoutEntry` which ignores the selected entry.

**Change:** In `CollectionsPage`, remove or hide the generic "New" toolbar button when a collection entry is selected. Let `onClone` / `onAddToPlan` on `NotePreview` be the action surface instead. Add a tooltip or instruction text in the empty state: "Select a workout to add it to your journal."

This is a conservative fix — no new code, just a UX clarification.

```tsx
// In the empty state of listPanel (when no entry selected), add guidance:
{!selectedId && (
  <div className="px-4 py-2 text-xs text-muted-foreground italic">
    Select a workout to preview and add it to your journal.
  </div>
)}
```

**Commit:**

```bash
git add wod-wiki-e2e/src/app/pages/CollectionsPage.tsx
git commit -m "fix: add selection guidance to CollectionsPage empty state"
```

---

## Phase 5 — Clean Up Dead UI

### Task 8: Wire or remove `+ Plan a workout` stub

**Objective:** Find the rendered "Plan a workout" button and either wire it to `openCollectionImport` or remove it.

**Step 1: Find it**

```bash
grep -rn "Plan a workout\|plan.*workout\|planAWorkout" \
  /home/serge/projects/wod-wiki/wod-wiki-e2e/src --include="*.tsx" --include="*.ts"
```

**Step 2:** If found, wire `onClick` to open the collection import palette using `useCollectionImport`.  
If it's in a static string / HeroBanner widget with no live handler, remove it from the template.

**Commit:**

```bash
git commit -m "fix: wire or remove dead 'Plan a workout' UI stub"
```

---

## Phase 6 — Integration Smoke Test

### Task 9: Manual end-to-end verification

**Steps:**
1. Navigate to `https://playground.forest-adhara.ts.net/`
2. Open or create a journal entry for today
3. Press `Cmd+Shift+I` → command palette opens with "Collections" group
4. Type "cross" → CrossFit Girls appears
5. Select it → level 2: list of workouts (FRAN, HELEN, etc.)
6. Select FRAN → level 3: list of blocks ("Fran" block)
7. Select block → palette closes, ` ```wod\n21-15-9\n...\n``` ` appended to editor
8. Press `Cmd+Shift+H` → palette opens with "Workout History" group
9. Select a past entry with a WOD block → block list shown → select → inserted
10. Navigate to Collections → click CrossFit Girls → click FRAN → preview panel appears on the right

**Commit (if any cleanup needed):**

```bash
git commit -m "fix: integration cleanup from smoke test"
```

---

## Phase 7 — PR

### Task 10: Open PR

```bash
cd /home/serge/projects/wod-wiki/wod-wiki
git push -u origin feat/collection-import-pull

gh pr create \
  --title "feat: collection import pull — Cmd+Shift+I imports WOD blocks from collections and history" \
  --body "## Summary

Adds a pull mechanism for importing WOD blocks from any collection or past journal entry into the current note.

## Changes

- **\`extractWodBlocks\`** — new utility to parse \`\`\`wod\`\`\` fences from raw markdown
- **\`CollectionImportStrategy\`** — 3-level command palette: collection → workout → WOD block
- **\`HistoryImportStrategy\`** — same flow but sources from past journal entries with WOD blocks
- **\`useCollectionImport\`** — hook wiring import strategies into the editor
- **\`PlanPanel\`** — adds 'From Collection' / 'From History' toolbar buttons + Cmd+Shift+I / H shortcuts
- **\`CollectionsPage\`** — fixes invisible preview panel (stable 2-column layout)
- **\`CollectionsPage\`** — adds selection guidance in empty state

## UX Flow

\`Cmd+Shift+I\` → type collection name → select workout → select WOD block → block appended to current note as \`\`\`wod\`\`\` fence.

Closes dogfood issues: #1 (no pull mechanism), #3 (command palette wrong source), #4 (preview invisible), #6 (dead Plan a workout stub)

## Test Plan
- [ ] \`extractWodBlocks\` unit tests pass (\`bun test src/lib/wodBlockExtract.test.ts\`)
- [ ] TypeScript: \`bun x tsc --noEmit\` — clean
- [ ] Manual: import from collection works end-to-end
- [ ] Manual: import from history works end-to-end
- [ ] Manual: Collections preview panel visible after click"
```

---

## File Summary

| File | Status |
|------|--------|
| `src/lib/wodBlockExtract.ts` | Create |
| `src/lib/wodBlockExtract.test.ts` | Create |
| `src/components/command-palette/strategies/CollectionImportStrategy.ts` | Create |
| `src/components/command-palette/strategies/HistoryImportStrategy.ts` | Create |
| `src/hooks/useCollectionImport.ts` | Create |
| `src/panels/plan-panel.tsx` | Modify |
| `src/app/pages/CollectionsPage.tsx` | Modify (×2) |

**No new dependencies required.** All primitives (`cmdk`, `CommandStrategy`, `IContentProvider`) already exist.
