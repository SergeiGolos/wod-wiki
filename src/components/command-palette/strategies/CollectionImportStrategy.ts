import type { Command, CommandStrategy } from '../types';
import type { WodCollectionItem } from '@/repositories/wod-collections';
import { getWodCollections } from '@/repositories/wod-collections';
import { extractWodBlocks, normalizeDialect, type WodBlockExtract } from '@/lib/wodBlockExtract';

type SetStrategy = (strategy: CommandStrategy | null) => void;
type OnInsert = (blocks: WodBlockExtract[]) => void;

// ─── Level 3: Block selection ─────────────────────────────────────────────────

class WodBlockSelectStrategy implements CommandStrategy {
  id = 'collection-import-block';
  placeholder: string;
  private cachedCommands: Command[] | null = null;

  // Stubs required by CommandStrategy interface — this strategy uses getCommands instead
  getResults = () => [];
  onSelect = () => {};

  constructor(
    private item: WodCollectionItem,
    private collectionName: string,
    private onInsert: OnInsert,
    private setStrategy: SetStrategy,
    private parentStrategy: CommandStrategy,
  ) {
    this.placeholder = `Select block from "${item.name}"…`;
  }

  getCommands(): Command[] {
    if (this.cachedCommands) return this.cachedCommands;

    const blocks = extractWodBlocks(this.item.content);
    const backCommand: Command = {
      id: '__back__',
      label: '← Back',
      group: '─',
      keepOpen: true,
      action: () => this.setStrategy(this.parentStrategy),
    };

    if (blocks.length === 0) {
      // Fallback: import the whole item as a plain wod block
      this.cachedCommands = [backCommand, {
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
      return this.cachedCommands;
    }

    this.cachedCommands = [backCommand, ...blocks.map((block) => ({
      id: block.id,
      label: block.label,
      group: `${this.collectionName} › ${this.item.name}`,
      keywords: [block.dialect, block.content.slice(0, 60)],
      action: () => {
        this.onInsert([{ ...block, dialect: normalizeDialect(block.dialect) }]);
        this.setStrategy(null);
      },
    }))];
    return this.cachedCommands;
  }
}

// ─── Level 2: Workout selection ───────────────────────────────────────────────

class WodWorkoutSelectStrategy implements CommandStrategy {
  id = 'collection-import-workout';
  placeholder: string;

  // Stubs required by CommandStrategy interface — this strategy uses getCommands instead
  getResults = () => [];
  onSelect = () => {};

  constructor(
    private collectionId: string,
    collectionName: string,
    private onInsert: OnInsert,
    private setStrategy: SetStrategy,
    private parentStrategy: CommandStrategy,
  ) {
    this.placeholder = `Select workout from "${collectionName}"…`;
  }

  getCommands(): Command[] {
    const collections = getWodCollections();
    const col = collections.find(c => c.id === this.collectionId);
    if (!col) return [];

    const backCommand: Command = {
      id: '__back__',
      label: '← Back',
      group: '─',
      keepOpen: true,
      action: () => this.setStrategy(this.parentStrategy),
    };

    return [backCommand, ...col.items.map(item => ({
      id: item.id,
      label: item.name,
      group: col.name,
      keywords: [item.id],
      keepOpen: true,
      action: () => {
        this.setStrategy(
          new WodBlockSelectStrategy(item, col.name, this.onInsert, this.setStrategy, this)
        );
      },
    }))];
  }
}

// ─── Level 1: Collection selection ───────────────────────────────────────────

export class CollectionImportStrategy implements CommandStrategy {
  id = 'collection-import';
  placeholder = 'Import from collection… (type to filter)';

  // Stubs required by CommandStrategy interface — this strategy uses getCommands instead
  getResults = () => [];
  onSelect = () => {};

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
      keepOpen: true,
      action: () => {
        this.setStrategy(
          new WodWorkoutSelectStrategy(col.id, col.name, this.onInsert, this.setStrategy, this)
        );
      },
    }));
  }
}
