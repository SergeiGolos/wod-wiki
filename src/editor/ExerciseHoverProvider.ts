import { ExerciseIndexManager } from './ExerciseIndexManager';
import type * as monaco from 'monaco-editor';
import { editor, languages, IPosition, IRange } from 'monaco-editor';
import { Exercise } from '../exercise';

/**
 * Monaco HoverProvider for exercises
 * 
 * Provides rich hover documentation when users hover over exercise names:
 * - Exercise name and description
 * - Equipment requirements
 * - Primary and secondary muscles
 * - Difficulty level
 * - Instructions (if available)
 */
export class ExerciseHoverProvider {
  private indexManager: ExerciseIndexManager | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the hover provider
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      this.indexManager = await ExerciseIndexManager.getInstance();
    })();

    return this.initPromise;
  }

  /**
   * Provide hover information for exercises
   * Implements Monaco's HoverProvider interface
   */
  async provideHover(
    model: editor.ITextModel,
    position: IPosition,
    _token: monaco.CancellationToken
  ): Promise<languages.Hover | null> {
    // Ensure index manager is initialized
    if (!this.indexManager) {
      await this.initialize();
    }

    if (!this.indexManager) {
      return null;
    }

    // Get the word at the hover position
    const word = model.getWordAtPosition(position);
    if (!word || word.word.length < 2) {
      return null;
    }

    // Search for exercises matching this word
    const results = this.indexManager.searchExercises(word.word, 5);
    
    // If no exact or close match, don't show hover
    if (results.length === 0) {
      return null;
    }

    // Check if first result is a close enough match
    const firstResult = results[0];
    const wordLower = word.word.toLowerCase();
    const nameLower = firstResult.name.toLowerCase();
    
    // Only show hover for exact match or if word is start of name
    if (nameLower !== wordLower && !nameLower.startsWith(wordLower)) {
      return null;
    }

    // Try to load full exercise data
    let exercise: Exercise | null = null;
    try {
      exercise = await this.indexManager.loadExerciseData(firstResult.path);
    } catch (error) {
      // If loading fails, show basic info from index
      console.warn('[ExerciseHoverProvider] Failed to load exercise data:', error);
    }

    // Build hover content
    const content = this.buildHoverContent(firstResult.name, exercise, firstResult.searchTerms);

    // Define hover range (the word being hovered)
    const range: IRange = {
      startLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endLineNumber: position.lineNumber,
      endColumn: word.endColumn
    };

    return {
      contents: [{ value: content, isTrusted: true }],
      range
    };
  }

  /**
   * Build hover content markdown
   */
  private buildHoverContent(name: string, exercise: Exercise | null, searchTerms: string[]): string {
    const parts: string[] = [];

    // Title
    parts.push(`### 🏋️ ${name}`);
    parts.push('');

    if (exercise) {
      // Full exercise data available
      if (exercise.primaryMuscles && exercise.primaryMuscles.length > 0) {
        parts.push(`**Primary Muscles**: ${exercise.primaryMuscles.join(', ')}`);
      }

      if (exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0) {
        parts.push(`**Secondary Muscles**: ${exercise.secondaryMuscles.join(', ')}`);
      }

      if (exercise.equipment) {
        // Equipment is an enum value
        parts.push(`**Equipment**: ${exercise.equipment}`);
      }

      if (exercise.level) {
        const icon = this.getDifficultyIcon(exercise.level);
        parts.push(`**Difficulty**: ${icon} ${exercise.level}`);
      }

      if (exercise.category) {
        parts.push(`**Category**: ${exercise.category}`);
      }

      parts.push('');

      if (exercise.instructions && exercise.instructions.length > 0) {
        parts.push(`**Instructions**:`);
        exercise.instructions.slice(0, 3).forEach((instruction, index) => {
          parts.push(`${index + 1}. ${instruction}`);
        });
        if (exercise.instructions.length > 3) {
          parts.push(`   _...and ${exercise.instructions.length - 3} more steps_`);
        }
      }
    } else {
      // Fallback to search terms metadata
      const equipment = this.extractEquipment(searchTerms);
      const muscles = this.extractMuscles(searchTerms);
      const difficulty = this.extractDifficulty(searchTerms);

      if (equipment) parts.push(`**Equipment**: ${equipment}`);
      if (muscles) parts.push(`**Muscles**: ${muscles}`);
      if (difficulty) {
        const icon = this.getDifficultyIcon(difficulty);
        parts.push(`**Difficulty**: ${icon} ${difficulty}`);
      }

      parts.push('');
      parts.push('_Loading full exercise details..._');
    }

    return parts.join('\n');
  }

  /**
   * Extract equipment from search terms
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
   */
  private extractDifficulty(searchTerms: string[]): string | null {
    const difficultyKeywords = ['beginner', 'intermediate', 'advanced'];
    const found = searchTerms.find(term =>
      difficultyKeywords.includes(term.toLowerCase())
    );
    return found || null;
  }

  /**
   * Get icon for difficulty level
   */
  private getDifficultyIcon(difficulty: string): string {
    const lower = difficulty.toLowerCase();
    if (lower === 'beginner') return '⭐';
    if (lower === 'intermediate') return '⭐⭐';
    if (lower === 'advanced' || lower === 'expert') return '⭐⭐⭐';
    return '⭐';
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    // Nothing to dispose currently
  }
}
