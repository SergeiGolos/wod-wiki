import type { Command, CommandStrategy } from '../types';
import type { IContentProvider } from '@/types/content-provider';
import type { HistoryEntry } from '@/types/history';
import { extractWodBlocks, normalizeDialect, type WodBlockExtract } from '@/lib/wodBlockExtract';

type SetStrategy = (strategy: CommandStrategy | null) => void;
type OnInsert = (blocks: WodBlockExtract[]) => void;

// ─── Level 2: Block selection from a history entry ───────────────────────────

class HistoryBlockSelectStrategy implements CommandStrategy {
  id = 'history-import-block';
  placeholder: string;
  private cachedCommands: Command[] | null = null;

  // Stubs required by CommandStrategy interface — this strategy uses getCommands instead
  getResults = () => [];
  onSelect = () => {};

  constructor(
    private entry: HistoryEntry,
    private onInsert: OnInsert,
    private setStrategy: SetStrategy,
    private parentStrategy: CommandStrategy,
  ) {
    this.placeholder = `Select block from "${entry.title}"…`;
  }

  getCommands(): Command[] {
    if (this.cachedCommands) return this.cachedCommands;

    const backCommand: Command = {
      id: '__back__',
      label: '← Back',
      group: '─',
      keepOpen: true,
      action: () => this.setStrategy(this.parentStrategy),
    };

    const blocks = extractWodBlocks(this.entry.rawContent ?? '');

    if (blocks.length === 0) {
      this.cachedCommands = [backCommand, {
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
      return this.cachedCommands;
    }

    this.cachedCommands = [backCommand, ...blocks.map(block => ({
      id: block.id,
      label: block.label,
      group: this.entry.title,
      keywords: [block.dialect],
      action: () => {
        this.onInsert([{ ...block, dialect: normalizeDialect(block.dialect) }]);
        this.setStrategy(null);
      },
    }))];
    return this.cachedCommands;
  }
}

// ─── Level 1: Entry selection ─────────────────────────────────────────────────

export class HistoryImportStrategy implements CommandStrategy {
  id = 'history-import';
  placeholder = 'Import from workout history… (type to filter)';
  private entries: HistoryEntry[] = [];

  // Stubs required by CommandStrategy interface — this strategy uses getCommands instead
  getResults = () => [];
  onSelect = () => {};

  constructor(
    private provider: IContentProvider,
    private onInsert: OnInsert,
    private setStrategy: SetStrategy,
  ) {}

  async init() {
    // Pre-load entries; use extractWodBlocks for robust dialect matching (case-insensitive, trailing info)
    const all = await this.provider.getEntries();
    this.entries = all.filter(e =>
      e.type !== 'template' &&
      extractWodBlocks(e.rawContent ?? '').length > 0
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
        keepOpen: true,
        action: () => {
          this.setStrategy(
            new HistoryBlockSelectStrategy(entry, this.onInsert, this.setStrategy, this)
          );
        },
      };
    });
  }
}
