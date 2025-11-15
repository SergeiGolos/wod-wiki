import { ExerciseSearchEngine, SearchOptions } from './ExerciseSearchEngine';
import { ExerciseIndexManager } from './ExerciseIndexManager';
import { ExercisePathEntry } from '../tools/ExercisePathIndexer';
import type * as monaco from 'monaco-editor';
import { editor, languages, IPosition } from 'monaco-editor';

/**
 * Monaco CompletionItemProvider for exercise suggestions
 * 
 * Provides intelligent exercise name suggestions with:
 * - Debounced search (150ms delay)
 * - Exercise metadata (equipment, muscles, variations)
 * - Relevance-based ranking
 * - Context-aware filtering (future enhancement)
 */
export class ExerciseSuggestionProvider {
  private searchEngine: ExerciseSearchEngine | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the suggestion provider
   * Loads exercise index and creates search engine
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      const indexManager = ExerciseIndexManager.getInstance();
      
      // Check if provider is configured
      if (!indexManager.hasProvider()) {
        console.warn('[ExerciseSuggestionProvider] No exercise provider configured, suggestions will be disabled');
        return;
      }
      
      this.searchEngine = new ExerciseSearchEngine(indexManager);
    })();

    return this.initPromise;
  }

  /**
   * Provide completion suggestions for exercises
   * Implements Monaco's CompletionItemProvider interface
   */
  async provideCompletionItems(
    model: editor.ITextModel,
    position: IPosition,
    _context: languages.CompletionContext,
    _token: monaco.CancellationToken
  ): Promise<languages.CompletionList | null> {
    // Ensure search engine is initialized
    if (!this.searchEngine) {
      await this.initialize();
    }

    if (!this.searchEngine) {
      return null;
    }

    // Get the current word being typed
    const word = model.getWordUntilPosition(position);
    const query = word.word;

    // If word is too short, don't provide suggestions
    if (query.length < 2) {
      return null;
    }

    // Extract current line for context analysis (future: context-aware suggestions)
    // const lineContent = model.getLineContent(position.lineNumber);
    // const linePrefix = lineContent.substring(0, position.column - 1);

    // Determine search options based on context (future: filter by context)
    const options: SearchOptions = {
      limit: 20 // Show top 20 suggestions
    };

    // Search for exercises
    return new Promise((resolve) => {
      this.searchEngine!.search(query, options, (results) => {
        // Map exercise entries to Monaco completion items
        const suggestions = results.map(entry => 
          this.createCompletionItem(entry, word, position)
        );

        resolve({
          suggestions,
          incomplete: false // We have all results
        });
      });
    });
  }

  /**
   * Create a Monaco CompletionItem from an exercise entry
   */
  private createCompletionItem(
    entry: ExercisePathEntry,
    word: editor.IWordAtPosition,
    position: IPosition
  ): languages.CompletionItem {
    // Format exercise name for display with variation count
    const displayName = this.formatDisplayName(entry);

    // Extract metadata from search terms
    const equipment = this.extractEquipment(entry.searchTerms);
    const muscles = this.extractMuscles(entry.searchTerms);
    const difficulty = this.extractDifficulty(entry.searchTerms);

    // Build detail string with icons (shown to the right of suggestion)
    const detailParts: string[] = [];
    if (equipment) detailParts.push(this.formatEquipment(equipment));
    if (muscles) detailParts.push(this.formatMuscles(muscles));
    if (difficulty) detailParts.push(this.formatDifficulty(difficulty));
    const detail = detailParts.join(' • ');

    // Build documentation (shown in detail panel)
    const docParts: string[] = [
      `**${displayName}**`,
      ''
    ];
    if (equipment) docParts.push(`🏋️ Equipment: ${equipment}`);
    if (muscles) docParts.push(`💪 Muscles: ${muscles}`);
    if (difficulty) docParts.push(`${this.getDifficultyIcon(difficulty)} Difficulty: ${difficulty}`);
    const documentation = docParts.join('\n');

    return {
      label: displayName,
      kind: languages.CompletionItemKind.Function,
      detail: detail || undefined,
      documentation: {
        value: documentation,
        isTrusted: true
      },
      insertText: entry.name, // Insert plain name without variation count
      range: {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      },
      sortText: `0${entry.name}` // Ensure alphabetical ordering within relevance
    };
  }

  /**
   * Format display name with variation count if applicable
   */
  private formatDisplayName(entry: ExercisePathEntry): string {
    // TODO: Detect if this is an exercise group with variations
    // For now, just return the name
    // Future: Load exercise data and check for variations
    return entry.name;
  }

  /**
   * Format equipment with icon
   */
  private formatEquipment(equipment: string): string {
    const icon = this.getEquipmentIcon(equipment);
    return `${icon} ${equipment}`;
  }

  /**
   * Format muscles with icon
   */
  private formatMuscles(muscles: string): string {
    return `💪 ${muscles}`;
  }

  /**
   * Format difficulty with icon
   */
  private formatDifficulty(difficulty: string): string {
    const icon = this.getDifficultyIcon(difficulty);
    return `${icon} ${difficulty}`;
  }

  /**
   * Get icon for equipment type
   */
  private getEquipmentIcon(equipment: string): string {
    const lower = equipment.toLowerCase();
    if (lower.includes('barbell')) return '🏋️';
    if (lower.includes('dumbbell')) return '🏋️';
    if (lower.includes('kettlebell')) return '🏋️';
    if (lower.includes('cable')) return '🔗';
    if (lower.includes('machine')) return '⚙️';
    if (lower.includes('bodyweight')) return '🧍';
    if (lower.includes('band')) return '🎗️';
    return '🏋️'; // Default
  }

  /**
   * Get icon for difficulty level
   */
  private getDifficultyIcon(difficulty: string): string {
    const lower = difficulty.toLowerCase();
    if (lower === 'beginner') return '⭐';
    if (lower === 'intermediate') return '⭐⭐';
    if (lower === 'advanced') return '⭐⭐⭐';
    return '⭐'; // Default
  }

  /**
   * Extract equipment from search terms
   * Looks for common equipment keywords
   */
  private extractEquipment(searchTerms: string[]): string | null {
    const equipmentKeywords = ['barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 'bodyweight', 'band'];
    const found = searchTerms.filter(term => 
      equipmentKeywords.some(keyword => term.toLowerCase().includes(keyword))
    );
    return found.length > 0 ? found[0] : null;
  }

  /**
   * Extract muscle groups from search terms
   * Looks for common muscle keywords
   */
  private extractMuscles(searchTerms: string[]): string | null {
    const muscleKeywords = [
      'chest', 'back', 'shoulders', 'arms', 'biceps', 'triceps',
      'legs', 'quadriceps', 'hamstrings', 'glutes', 'calves',
      'core', 'abs', 'obliques'
    ];
    const found = searchTerms.filter(term =>
      muscleKeywords.some(keyword => term.toLowerCase() === keyword)
    );
    return found.length > 0 ? found.slice(0, 2).join(', ') : null;
  }

  /**
   * Extract difficulty from search terms
   * Looks for difficulty level keywords
   */
  private extractDifficulty(searchTerms: string[]): string | null {
    const difficultyKeywords = ['beginner', 'intermediate', 'advanced'];
    const found = searchTerms.find(term =>
      difficultyKeywords.includes(term.toLowerCase())
    );
    return found || null;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.searchEngine) {
      this.searchEngine.cancelPending();
      this.searchEngine.clearCache();
    }
  }
}
